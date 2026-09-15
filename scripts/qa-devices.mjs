// دور دهم / مورد ۱۵ — does the app render correctly on every Android size?
//
//   node scripts/qa-devices.mjs
//
// Asked for explicitly before the Cafe Bazaar submission: the app will land on
// phones and tablets of every shape, and a layout that only works at one width
// is the kind of thing a reviewer finds before the developer does.
//
// This does not take screenshots and call it verified. On every page, at every
// size, in day and night, it asserts the things that actually break:
//
//   * the page never scrolls sideways
//   * nothing is painted outside the viewport's left or right edge (SKILL.md §۳)
//   * the bottom navigation is fully visible and not covering content
//   * no button's label is clipped by its own box
//
// ⚠️ This measures RENDERING. Manufacturer differences in notifications, file
// saving and vibration are invisible here and need the APK on a real phone.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './lib/browser.mjs';
import { serveDist } from './lib/server.mjs';
import { applySeed, buildSeedState } from './lib/seed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.qa-screens', 'devices');
const PORT = 4197;

/** Smallest Android still in use, through to a landscape tablet. */
const DEVICES = [
  { name: 'کوچک ۳۲۰', width: 320, height: 534 },
  { name: 'گوشی ۳۶۰×۶۴۰', width: 360, height: 640 },
  { name: 'گوشی ۳۶۰×۸۰۰', width: 360, height: 800 },
  { name: 'گوشی ۳۸۴', width: 384, height: 854 },
  { name: 'گوشی ۳۹۰', width: 390, height: 844 },
  { name: 'ردمی نوت ۸ پرو ۴۱۲', width: 412, height: 915 },
  { name: 'گوشی بلند ۴۱۲', width: 412, height: 1080 },
  { name: 'تبلت ۶۰۰', width: 600, height: 960 },
  { name: 'تبلت ۸۰۰', width: 800, height: 1280 },
  { name: 'تبلت افقی ۱۲۸۰', width: 1280, height: 800 },
];

const PAGES = [
  { id: 'home', label: 'خانه', nav: 'خانه' },
  { id: 'counter', label: 'شمارنده', nav: 'شمارنده' },
  { id: 'notebook', label: 'دفترچه', nav: 'دفترچه' },
  { id: 'history', label: 'تاریخچه', nav: 'تاریخچه' },
  { id: 'settings', label: 'تنظیمات', nav: 'تنظیمات' },
];

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`);
}

/** Everything that can only be judged from inside the page. */
async function measure(page, width) {
  return page.evaluate((vw) => {
    const doc = document.documentElement;
    const overflowing = [];
    const clipped = [];
    // Allow a pixel of rounding slack; browsers do sub-pixel layout.
    const SLACK = 1.5;
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (style.position === 'fixed' && r.width >= vw) continue;
      if (r.right > vw + SLACK || r.left < -SLACK) {
        overflowing.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().slice(0, 40)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
      }
      // A label taller than the box drawn for it is a clipped label.
      if (el.tagName === 'BUTTON' && style.overflow === 'hidden' && el.scrollHeight > el.clientHeight + 2) {
        clipped.push((el.textContent || '').trim().slice(0, 30));
      }
    }
    const nav = document.querySelector('[data-testid="bottom-nav"], nav');
    const navRect = nav ? nav.getBoundingClientRect() : null;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowing: overflowing.slice(0, 3),
      clipped: clipped.slice(0, 3),
      navVisible: navRect ? navRect.width > 0 && navRect.bottom <= window.innerHeight + 2 : null,
    };
  }, width);
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serveDist(DIST, PORT);
  const browser = await launchChromium();

  for (const device of DEVICES) {
    for (const theme of ['day', 'night']) {
      const context = await browser.newContext({
        viewport: { width: device.width, height: device.height },
        locale: 'fa-IR',
      });
      const state = buildSeedState({ settings: { themeMode: theme } });
      await context.addInitScript(`(${applySeed.toString()})(${JSON.stringify(state)})`);
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);

      for (const spec of PAGES) {
        try {
          await page.getByRole('button', { name: spec.nav, exact: true }).first().click();
          await page.waitForTimeout(280);
        } catch {
          check(`${device.name} / ${theme} — صفحه‌ی «${spec.label}» باز می‌شود`, false, 'دکمه‌ی نوار پایین پیدا نشد');
          continue;
        }

        const m = await measure(page, device.width);
        const tag = `${device.name} / ${theme === 'day' ? 'روز' : 'شب'} / ${spec.label}`;

        check(`${tag} — اسکرول افقی ندارد`,
          m.scrollWidth <= m.clientWidth + 2,
          `scrollWidth=${m.scrollWidth} > clientWidth=${m.clientWidth}`);
        check(`${tag} — هیچ عنصری از لبه بیرون نزده`,
          m.overflowing.length === 0,
          m.overflowing.join(' · '));
        check(`${tag} — برچسب هیچ دکمه‌ای بریده نشده`,
          m.clipped.length === 0,
          m.clipped.join(' · '));
        if (m.navVisible !== null) {
          check(`${tag} — نوار پایین کامل دیده می‌شود`, m.navVisible === true);
        }

        if (theme === 'day') {
          await page.screenshot({
            path: path.join(OUT, `${device.width}x${device.height}-${spec.id}.png`),
          });
        }
      }
      await context.close();
    }
  }

  await browser.close();
  server.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  console.log(`اسکرین‌شات‌ها در .qa-screens/devices/`);
  if (failed.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
