// دور هشتم — the two items that CAN be verified in a browser.
//
//   مورد ۹  — a toast must never overlap a header or banner, at any width.
//   مورد ۱۱ — a weekday dhikr must be named in history and in shared text.
//
// Everything else this round is native (share, vibration, real notifications,
// saving to the gallery, the splash, the launcher icon) and is unverifiable
// here by definition — it needs the APK on a real phone.
//
//   node scripts/qa-v8.mjs

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './lib/browser.mjs';
import { serveDist } from './lib/server.mjs';
import { applySeed, buildSeedState, patchActiveDhikr } from './lib/seed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.qa-screens');
const PORT = 4194;

const VIEWPORTS = [
  { name: 'گوشی ۳۶۰', width: 360, height: 740 },
  { name: 'گوشی ۳۹۰', width: 390, height: 844 },
  { name: 'گوشی ۴۱۲ (ردمی نوت ۸ پرو)', width: 412, height: 892 },
  { name: 'تبلت ۸۰۰', width: 800, height: 1280 },
];

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

function overlaps(a, b) {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
}

async function openApp(browser, vp, mutateState) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    locale: 'fa-IR',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const state = buildSeedState();
  // The seed init script re-runs on EVERY navigation, so a record written
  // after load is wiped by the next reload. It has to go into the seed itself.
  if (mutateState) mutateState(state);
  await context.addInitScript(`(${applySeed.toString()})(${JSON.stringify(state)})`);
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(`(${patchActiveDhikr.toString()})(${JSON.stringify(state)})`);
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  return { context, page };
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serveDist(path.join(ROOT, 'dist'), PORT);
  const browser = await launchChromium();

  try {
    // ── مورد ۹ — toast vs. the sticky header of a full-screen view ────────
    for (const vp of VIEWPORTS) {
      const { context, page } = await openApp(browser, vp);

      await page.getByRole('button', { name: 'تاریخچه', exact: true }).first().click();
      await page.waitForTimeout(400);
      await page.getByRole("button", { name: /ریزآمار روزهای گذشته/ }).first().click();
      await page.waitForTimeout(500);
      // The «۳۰ روز اخیر» card on the stats page opens the full-screen list —
      // the view whose sticky header the toast used to land on.
      await page.getByRole('button', { name: /۳۰ روز اخیر/ }).first().click();
      await page.waitForTimeout(600);

      // The share icon on the first day card raises a toast (no Web Share in
      // headless Chromium, so it falls back to the clipboard and says so).
      await page.locator('button[aria-label*="اشتراک"]').first().click();
      await page.waitForTimeout(400);
      // The day-share popup's own submit button, by test id — a generic
      // name match hits a button behind the modal overlay.
      await page.getByTestId('day-share-submit').click();

      const toast = page.locator('[data-testid="toast"]').first();
      await toast.waitFor({ state: 'visible', timeout: 6000 });
      await page.waitForTimeout(700);

      const toastBox = await toast.boundingBox();
      check(`مورد۹ (${vp.name}) toast کامل داخل صفحه است`,
        !!toastBox && toastBox.x >= 0 && toastBox.y >= 0 &&
          toastBox.x + toastBox.width <= vp.width + 0.5 &&
          toastBox.y + toastBox.height <= vp.height + 0.5,
        toastBox ? `y=${Math.round(toastBox.y)} h=${Math.round(toastBox.h || toastBox.height)}` : 'پیدا نشد');

      // The sticky header of the full-screen view — the thing it used to land on.
      const header = page.locator('div.sticky.top-0').first();
      const headerBox = await header.boundingBox();
      check(`مورد۹ (${vp.name}) toast روی هدر صفحه نمی‌افتد`,
        !!toastBox && !!headerBox && !overlaps(toastBox, headerBox),
        headerBox && toastBox
          ? `هدر ${Math.round(headerBox.y)}..${Math.round(headerBox.y + headerBox.height)} · toast ${Math.round(toastBox.y)}..${Math.round(toastBox.y + toastBox.height)}`
          : '—');

      // And it must be opaque, or the page shows straight through the words.
      const opaque = await toast.evaluate((el) => {
        const bg = getComputedStyle(el).backgroundColor;
        const m = bg.match(/rgba?\(([^)]+)\)/);
        if (!m) return false;
        const parts = m[1].split(',').map((v) => parseFloat(v));
        return parts.length < 4 || parts[3] >= 0.99;
      });
      check(`مورد۹ (${vp.name}) پس‌زمینه‌ی toast مات است`, opaque);

      if (vp.width === 390) {
        await page.screenshot({ path: path.join(OUT, 'v8-toast-no-overlap.png') });
      }
      await context.close();
    }

    // ── مورد ۱۱ — the weekday dhikr is named ──────────────────────────────
    {
      const { context, page } = await openApp(browser, VIEWPORTS[1], (state) => {
        // Deliberately WITHOUT arabicText — an OLD record, which is exactly
        // the case the recovery-by-id path exists for.
        const today = state.logs[0];
        today.breakdown['weekday-0-saturday'] = { title: 'ذکر روز شنبه', count: 100 };
        today.totalCount = Object.values(today.breakdown).reduce((sum, i) => sum + i.count, 0);
      });

      await page.getByRole('button', { name: 'تاریخچه', exact: true }).first().click();
      await page.waitForTimeout(400);
      await page.getByRole("button", { name: /ریزآمار روزهای گذشته/ }).first().click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /۳۰ روز اخیر/ }).first().click();
      await page.waitForTimeout(600);

      const body = await page.locator('body').innerText();
      const ARABIC = 'يَا رَبَّ الْعَالَمِينَ';
      check('مورد۱۱ نام واقعی ذکر روز شنبه در تاریخچه دیده می‌شود',
        body.includes('ذکر روز شنبه') && body.includes(ARABIC),
        body.includes(ARABIC) ? 'نام عربی هست' : 'نام عربی نیست');
      check('مورد۱۱ رکورد قدیمی (بدون متن ذخیره‌شده) هم نامش بازیابی شد',
        body.includes(ARABIC));

      await page.screenshot({ path: path.join(OUT, 'v8-weekday-dhikr-name.png') });

      // And in the shared text.
      await page.locator('button[aria-label*="اشتراک"]').first().click();
      await page.waitForTimeout(400);
      await page.getByTestId('day-share-submit').click();
      await page.waitForTimeout(700);
      const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
      check('مورد۱۱ متن اشتراک‌گذاری هم نام واقعی ذکر را دارد',
        clip.includes(ARABIC), clip ? clip.split('\n').find((l) => l.includes('شنبه')) || clip.slice(0, 60) : 'حافظه‌ی موقت خالی');

      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exitCode = 1;
}

run().catch((e) => { console.error(e); process.exit(1); });
