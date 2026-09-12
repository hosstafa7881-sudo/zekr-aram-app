// Layout verification sweep (دستور نهایی #2): every page at four widths, plus
// the top-gap check (مورد ۱), the version line (مورد ۲), and all six tour
// steps (مورد ۲۲).
//
//   node scripts/qa-layout.mjs
//
// Writes screenshots to .qa-screens/ and prints a PASS/FAIL line per check.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './lib/browser.mjs';
import { serveDist } from './lib/server.mjs';
import { applySeed, buildSeedState } from './lib/seed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.qa-screens');
const PORT = 4184;

const VIEWPORTS = [
  { name: '360', width: 360, height: 780 },
  { name: '390', width: 390, height: 844 },
  { name: '412', width: 412, height: 915 },
  { name: 'tablet-768', width: 768, height: 1024 },
];

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function newPage(browser, viewport, { seed = true, settings = {} } = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    locale: 'fa-IR',
  });
  if (seed) {
    const state = buildSeedState({ settings });
    await context.addInitScript(`(${applySeed.toString()})(${JSON.stringify(state)})`);
  } else {
    await context.addInitScript(
      `localStorage.setItem('zikraram_settings_v1', JSON.stringify(${JSON.stringify({
        ...settings,
        onboardingSeen: true,
        themeMode: 'day',
        colorPalette: 'green',
      })}))`
    );
  }
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
  return { context, page };
}

const TABS = [
  { id: 'home', label: 'خانه' },
  { id: 'counter', label: 'شمارنده' },
  { id: 'notebook', label: 'دفترچه' },
  { id: 'history', label: 'تاریخچه' },
  { id: 'settings', label: 'تنظیمات' },
];

async function sweep(browser) {
  for (const viewport of VIEWPORTS) {
    const { context, page } = await newPage(browser, viewport);
    for (const tab of TABS) {
      await page.getByRole('button', { name: tab.label, exact: true }).first().click();
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(OUT, `${viewport.name}-${tab.id}.png`) });

      // مورد ۱ — nothing above the page's own first element except its own
      // small padding. `main` must start at y = 0 (no leftover header strip).
      const mainTop = await page.evaluate(() => {
        const main = document.querySelector('main');
        return main ? Math.round(main.getBoundingClientRect().top) : -1;
      });
      check(`مورد۱ بدون فضای خالی بالا — ${tab.id} @${viewport.name}`, mainTop === 0, `main.top=${mainTop}px`);

      // No horizontal overflow at any width.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      check(`بدون اسکرول افقی — ${tab.id} @${viewport.name}`, overflow <= 0, `overflow=${overflow}px`);
    }

    // مورد ۲الف — version line in Settings.
    await page.getByRole('button', { name: 'تنظیمات', exact: true }).first().click();
    await page.waitForTimeout(250);
    const version = await page.getByTestId('app-version-label').textContent();
    check(`مورد۲الف شماره‌ی نسخه @${viewport.name}`, version?.trim() === 'نسخه‌ی ۵', `«${version?.trim()}»`);

    await context.close();
  }
}

async function tourSteps(browser) {
  const viewport = VIEWPORTS[1];
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, locale: 'fa-IR' });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);

  for (let step = 1; step <= 6; step++) {
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `tour-step-${step}.png`) });
    const counter = await page.locator('.tabular-nums-fa').last().textContent();
    const spotlight = await page.locator('.onboarding-spotlight').boundingBox();
    const target = await page.evaluate(() => {
      const sel = [
        '[data-tour="home-start-button"]',
        '[data-tour="home-actions"]',
        '[data-tour="home-library"]',
        '[data-tour="nav-notebook"]',
        '[data-tour="nav-history"]',
        '[data-tour="nav-settings"]',
      ];
      const active = document.querySelector('.onboarding-spotlight');
      if (!active) return null;
      const rect = active.getBoundingClientRect();
      const match = sel
        .map((s) => {
          const el = document.querySelector(s);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { s, dx: Math.abs(r.left - 6 - rect.left), dy: Math.abs(r.top - 6 - rect.top) };
        })
        .filter(Boolean)
        .sort((a, b) => a.dx + a.dy - (b.dx + b.dy))[0];
      return match;
    });
    check(
      `مورد۲۲ مرحله ${step} — هایلایت روی المان درست`,
      !!spotlight && !!target && target.dx < 2 && target.dy < 2,
      `${target?.s} Δx=${target?.dx?.toFixed(1)} Δy=${target?.dy?.toFixed(1)} · شمارنده=${counter?.trim()}`
    );
    if (step < 6) {
      await page.getByRole('button', { name: 'بعدی' }).click();
    }
  }
  // Step 2's three lines
  await context.close();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serveDist(DIST, PORT);
  const browser = await launchChromium();
  try {
    await sweep(browser);
    await tourSteps(browser);
  } finally {
    await browser.close();
    server.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
