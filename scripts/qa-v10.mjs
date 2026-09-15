// دور دهم — the items that CAN be verified in a browser.
//
//   node scripts/qa-v10.mjs
//
//   مورد ۱۱ — the first star after a full wipe must announce itself
//   مورد ۱۲ — the wipe clears the user's data AND preserves the subscription keys
//   مورد ۱۴ — «کد تخفیف ۱۰۰ درصدی» is switched off for the Cafe Bazaar submission
//
// The reminder's clock is guarded by qa-v10-clock (it needs two disagreeing
// timezone databases and cannot be reproduced here); the caption and image
// layout by qa-storelinks; rendering across devices by qa-devices.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './lib/browser.mjs';
import { serveDist } from './lib/server.mjs';
import { applySeed, buildSeedState } from './lib/seed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.qa-screens');
const PORT = 4199;

const CLEARED = [
  'zikraram_gamification_v1',
  'zikraram_daily_logs_v1',
  'zikraram_notebook_entries_v1',
  'zikraram_count_discount_state_v1',
  'zikraram_occasion_notified_v1',
  'zikraram_trial_warning_shown_v1',
];
const PRESERVED = [
  'zikraram_trial_start_v1',
  'zikraram_free_extension_until_v1',
  'zikraram_referral_last_used_v1',
];

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function open(browser, { width = 390, height = 844, state } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, locale: 'fa-IR' });
  if (state) await context.addInitScript(`(${applySeed.toString()})(${JSON.stringify(state)})`);
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
  await dismissTour(page);
  return { context, page };
}

async function wipe(page) {
  await page.getByRole('button', { name: 'تنظیمات', exact: true }).first().click();
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: /پاک کردن کامل داده‌ها/ }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'بله، پاک شود' }).click();
  await page.waitForTimeout(700);
  // The wipe resets settings, so `onboardingSeen` goes false and the tour opens
  // over everything — correct behaviour for a fresh install, in the way here.
  await dismissTour(page);
}

async function dismissTour(page) {
  const close = page.getByLabel('بستن راهنما');
  if (await close.count()) {
    await close.first().click();
    await page.waitForTimeout(400);
  }
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serveDist(DIST, PORT);
  const browser = await launchChromium();

  // ── مورد ۱۴ — the ۱۰۰٪ code is off ──────────────────────────────────────
  {
    const { context, page } = await open(browser, { state: buildSeedState() });
    check('مورد۱۴ دکمه‌ی «کد تخفیف ۱۰۰ درصدی» دیده نمی‌شود',
      (await page.getByTestId('discount-referral-button').count()) === 0);
    check('مورد۱۴ دکمه‌ی «کد تخفیف ۳۰ و ۵۰ درصدی» سر جایش هست',
      (await page.getByRole('button', { name: /کد تخفیف ۳۰ و ۵۰ درصدی/ }).count()) >= 1);
    check('مورد۱۴ متن «۱۰۰ درصدی» هیچ‌جای صفحه‌ی خانه نیست',
      !(await page.locator('body').innerText()).includes('۱۰۰ درصدی'));
    await context.close();
  }

  // ── مورد ۱۲ — what the wipe clears, and what it must not ────────────────
  {
    const { context, page } = await open(browser, { state: buildSeedState() });
    // Give every key a value so "cleared" is a real transition, not a no-op.
    await page.evaluate(
      ([cleared, preserved]) => {
        for (const k of [...cleared, ...preserved]) localStorage.setItem(k, '"seeded"');
      },
      [CLEARED, PRESERVED]
    );
    const before = await page.evaluate(
      (keys) => keys.filter((k) => localStorage.getItem(k) !== null).length,
      [...CLEARED, ...PRESERVED]
    );
    check('مورد۱۲ قبل از پاک‌کردن، همه‌ی کلیدها مقدار دارند (شرط آزمون)',
      before === CLEARED.length + PRESERVED.length, `${before} کلید`);

    await wipe(page);

    // A key the app re-saves at its default right after the reset (React
    // persists the emptied state) is fine — what must not survive is the
    // user's DATA. So: absent, or holding nothing.
    const leftover = await page.evaluate((keys) => {
      const empty = (v) => v === null || v === '' || v === '[]' || v === '{}' || v === 'null';
      return keys.filter((k) => !empty(localStorage.getItem(k)));
    }, CLEARED);
    check('مورد۱۲ هیچ داده‌ی کاربری از پاک‌کردن جان سالم به‌در نبرد',
      leftover.length === 0, leftover.join('، '));

    const kept = await page.evaluate(
      (keys) => keys.filter((k) => localStorage.getItem(k) !== null),
      PRESERVED
    );
    check('مورد۱۲ سه کلید اشتراک عمداً دست‌نخورده ماندند',
      kept.length === PRESERVED.length,
      `مانده: ${kept.join('، ') || 'هیچ'}`);
    await context.close();
  }

  // ── مورد ۱۱ — the first star after a wipe announces itself ──────────────
  {
    // The exact shape the user hit: a gamification state that already said
    // «ستاره ۱» before the wipe. Without the fix, the first star afterwards is
    // also 1, `1 > 1` is false, and nothing is announced.
    const state = buildSeedState({ lifetimeTotal: 100, suppressCelebrations: false });
    const { context, page } = await open(browser, { state });
    await page.evaluate(() =>
      localStorage.setItem(
        'zikraram_gamification_v1',
        JSON.stringify({
          lastSeenStarCount: 1,
          lastSeenBadges: [],
          lastStreakCelebratedDateKey: null,
          lastRecordCelebratedDateKey: null,
          badgeThresholdVersion: 2,
        })
      )
    );
    await wipe(page);
    const after = await page.evaluate(() => localStorage.getItem('zikraram_gamification_v1'));
    check('مورد۱۱ بعد از پاک‌کردن، حافظه‌ی ستاره صفر شده',
      after === null || JSON.parse(after).lastSeenStarCount === 0,
      after || 'null');

    // Now earn a star and confirm the message really appears.
    await page.getByRole('button', { name: 'شمارنده', exact: true }).first().click();
    await page.waitForTimeout(400);
    const area = page.getByRole('button', { name: /صفحه شمارش ذکر/ });
    for (let i = 0; i < 100; i++) {
      await area.click({ position: { x: 40, y: 40 } });
    }
    await page.waitForTimeout(700);
    const body = await page.locator('body').innerText();
    check('مورد۱۱ پیام اولین ستاره نشان داده می‌شود',
      /ستاره‌ی جدید گرفتی/.test(body),
      body.split('\n').find((l) => l.includes('ستاره')) || 'پیامی پیدا نشد');
    await page.screenshot({ path: path.join(OUT, 'v10-first-star.png') });
    await context.close();
  }

  await browser.close();
  server.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
