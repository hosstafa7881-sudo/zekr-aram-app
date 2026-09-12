// Behaviour verification for the round-five items that are about what the app
// DOES rather than how it looks (دستور نهایی #2).
//
//   node scripts/qa-flows.mjs
//
// Where a real device would open the OS share sheet, headless Chromium has no
// navigator.share, so the shared module falls back to the clipboard / a file
// download — which is exactly what lets us assert the EXACT share text and
// capture the generated images here.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './lib/browser.mjs';
import { serveDist } from './lib/server.mjs';
import { applySeed, buildSeedState, patchActiveDhikr } from './lib/seed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.qa-screens');
const PORT = 4185;
const VIEWPORT = { width: 390, height: 844 };
const DAY_MS = 24 * 60 * 60 * 1000;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function open(browser, { state, extraInit } = {}) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    locale: 'fa-IR',
    permissions: ['clipboard-read', 'clipboard-write'],
    acceptDownloads: true,
  });
  if (state) await context.addInitScript(`(${applySeed.toString()})(${JSON.stringify(state)})`);
  if (extraInit) await context.addInitScript(extraInit);
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  if (state) {
    await page.evaluate(`(${patchActiveDhikr.toString()})(${JSON.stringify(state)})`);
    await page.reload({ waitUntil: 'load' });
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
  return { context, page };
}

const readClipboard = (page) => page.evaluate(() => navigator.clipboard.readText());
const counterValue = (page) =>
  page.locator('.text-6xl, .sm\\:text-7xl').first().textContent();

async function tapCounter(page, times) {
  const area = page.getByRole('button', { name: /صفحه شمارش ذکر/ });
  for (let i = 0; i < times; i++) {
    await area.click({ position: { x: 40, y: 40 } });
    await page.waitForTimeout(60);
  }
}

async function gotoCounter(page) {
  await page.getByRole('button', { name: 'شمارنده', exact: true }).first().click();
  await page.waitForTimeout(350);
}

// ---------------------------------------------------------------------------

async function testFreshCounter(browser) {
  const { context, page } = await open(browser, { state: buildSeedState({ lifetimeTotal: 0, activeCount: 0 }) });
  await gotoCounter(page);
  check('مورد۱۰ کادر «هنوز ستاره…» برای کاربر جدید پنهان است',
    (await page.getByTestId('counter-achievements').count()) === 0);
  check('مورد۷ آیکون اشتراک‌گذاری کنار مدال‌ها حذف شده',
    (await page.locator('[data-testid="counter-achievements"] button').count()) === 0);
  check('مورد۶ آیکون اشتراک‌گذاری بالای کادر شمارش هست',
    (await page.getByTestId('counter-share-icon').count()) === 1);

  await page.getByTestId('counter-share-icon').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'counter-share-popup.png') });
  const textSelected = await page.getByTestId('counter-share-option-text').getAttribute('aria-pressed');
  check('مورد۶ گزینه‌ی «ذکرهای امروز (متن)» پیش‌فرض انتخاب‌شده است', textSelected === 'true');
  await context.close();
}

async function testCounterShareTextAndImage(browser) {
  const state = buildSeedState({ lifetimeTotal: 2200, activeCount: 330 });
  const { context, page } = await open(browser, { state });
  await gotoCounter(page);
  await page.getByTestId('counter-share-icon').click();
  await page.waitForTimeout(250);
  await page.getByTestId('counter-share-submit').click();
  await page.waitForTimeout(500);
  const text = await readClipboard(page);
  fs.writeFileSync(path.join(OUT, 'share-text-counter.txt'), text);
  check('مورد۶ متن «ذکرهای امروز» با قالب درست', text.startsWith('📿 ذکرهای امروز من — '), text.split('\n')[0]);
  check('مورد۶ خط مجموع در متن هست', /\nمجموع: .* ذکر/.test(text));
  check('مورد۶ خط ستاره و مدال (فقط بالاترین)', text.includes('⭐ ۲۲ ستاره | 🥉 مدال برنز'));
  check('مورد۴ بدون لینک فروشگاه، جمله با نقطه تمام می‌شود',
    text.trim().endsWith('تو هم می‌تونی امتحانش کنی.'));

  // Generated counter image — captured through the download fallback.
  await page.getByTestId('counter-share-icon').click();
  await page.waitForTimeout(250);
  await page.getByTestId('counter-share-option-image').click();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    page.getByTestId('counter-share-submit').click(),
  ]);
  const file = path.join(OUT, 'generated-counter-image.png');
  await download.saveAs(file);
  check('مورد۶ تصویر صفحه‌ی شمارش ساخته شد', fs.existsSync(file) && fs.statSync(file).size > 10000,
    `${Math.round(fs.statSync(file).size / 1024)}KB`);
  await context.close();
}

async function testMedalFlow(browser) {
  const state = buildSeedState({ lifetimeTotal: 1990, activeCount: 330 });
  const { context, page } = await open(browser, { state });
  await gotoCounter(page);
  const before = await counterValue(page);
  await tapCounter(page, 10); // 1990 → 2000 = مدال برنز
  await page.waitForTimeout(250);
  const popupVisible = await page.getByTestId('medal-earned-modal').isVisible();
  check('مورد۸ رسیدن به ۲۰۰۰ ذکر پاپ‌آپ مدال برنز را باز می‌کند', popupVisible);
  // Checked FIRST, because the one-second guard is what we're measuring.
  const earlyDisabled = await page.getByTestId('medal-share-button').isDisabled();
  check('مورد۸ دکمه‌ها در لحظه‌ی اول غیرفعال‌اند (محافظت ۱ ثانیه‌ای)', earlyDisabled);
  await page.screenshot({ path: path.join(OUT, 'medal-popup.png') });

  const countAtPopup = await counterValue(page);
  // Taps while the popup is open must not be counted at all.
  for (let i = 0; i < 6; i++) {
    await page.mouse.click(VIEWPORT.width / 2, VIEWPORT.height / 2);
    await page.waitForTimeout(50);
  }
  const countAfterTaps = await counterValue(page);
  check('مورد۸ ضربه‌ها هنگام باز بودن پاپ‌آپ شمرده نمی‌شوند',
    countAtPopup === countAfterTaps, `${countAtPopup} → ${countAfterTaps}`);

  await page.waitForTimeout(1200);
  const armed = !(await page.getByTestId('medal-share-button').isDisabled());
  check('مورد۸ دکمه‌ها بعد از ۱ ثانیه فعال می‌شوند', armed);

  await page.getByTestId('medal-share-button').click();
  await page.waitForTimeout(400);
  const text = await readClipboard(page);
  fs.writeFileSync(path.join(OUT, 'share-text-medal.txt'), text);
  check('مورد۸ متن اشتراک‌گذاری مدال با «🏅 امروز مدال برنز رو گرفتم!» شروع می‌شود',
    text.startsWith('🏅 امروز مدال برنز رو گرفتم!'), text.split('\n')[0]);
  check('مورد۸ ادامه‌ی متن همان قالب «ذکرهای امروز» است', text.includes('📿 ذکرهای امروز من — '));
  check('مورد۸ برای مدال هیچ toast جداگانه‌ای نمایش داده نمی‌شود',
    (await page.locator('text=مدال برنز رو گرفتی').count()) === 0);
  check('شمارش قبل از پاپ‌آپ درست پیش رفته بود', before !== countAtPopup, `${before} → ${countAtPopup}`);
  await context.close();
}

async function testSilverReplacesBronze(browser) {
  const state = buildSeedState({ lifetimeTotal: 9990, activeCount: 330 });
  const { context, page } = await open(browser, { state });
  await gotoCounter(page);
  await tapCounter(page, 10); // → ۱۰۰۰۰ = مدال نقره
  await page.waitForTimeout(600);
  check('مورد۹ رسیدن به ۱۰۰۰۰ پاپ‌آپ مدال نقره را باز می‌کند',
    (await page.locator('[data-testid="medal-earned-modal"]:has-text("مدال نقره")').count()) === 1);
  await page.waitForTimeout(1200);
  await page.getByTestId('medal-later-button').click();
  await page.waitForTimeout(300);

  const counterBadges = await page.getByTestId('counter-achievements').textContent();
  check('مورد۹ در صفحه‌ی شمارش فقط مدال نقره دیده می‌شود',
    counterBadges.includes('🥈') && !counterBadges.includes('🥉'), counterBadges.trim());
  await page.screenshot({ path: path.join(OUT, 'silver-counter.png') });

  await page.getByRole('button', { name: 'خانه', exact: true }).first().click();
  await page.waitForTimeout(300);
  const homeText = await page.locator('main').textContent();
  check('مورد۹ در صفحه‌ی خانه فقط مدال نقره دیده می‌شود',
    homeText.includes('🥈') && !homeText.includes('🥉'));

  await page.getByRole('button', { name: 'تاریخچه', exact: true }).first().click();
  await page.waitForTimeout(250);
  await page.getByText('ریزآمار روزهای گذشته').click();
  await page.waitForTimeout(400);
  const statsText = await page.getByTestId('stats-achievements').textContent();
  check('مورد۹ در ریزآمار فقط مدال نقره دیده می‌شود',
    statsText.includes('🥈') && !statsText.includes('🥉'), statsText.trim());
  await context.close();
}

async function testStarFlow(browser) {
  const state = buildSeedState({ lifetimeTotal: 99, activeCount: 10 });
  const { context, page } = await open(browser, { state });
  await gotoCounter(page);
  await tapCounter(page, 1); // → ۱۰۰ ذکر = یک ستاره
  await page.waitForTimeout(500);
  check('مورد۸ ستاره فقط toast می‌دهد و پاپ‌آپ باز نمی‌کند',
    (await page.getByTestId('medal-earned-modal').count()) === 0);
  check('مورد۸ toast ستاره نمایش داده می‌شود',
    (await page.locator('text=یک ستاره‌ی جدید گرفتی').count()) > 0);
  await page.screenshot({ path: path.join(OUT, 'star-toast.png') });
  await context.close();
}

async function testStreakAndRecordText(browser) {
  // Streak: seed several consecutive days but let the streak toast fire today.
  const state = buildSeedState({ lifetimeTotal: 2200, suppressCelebrations: false });
  state.gamification.lastSeenStarCount = 22;
  state.gamification.lastSeenBadges = ['bronze'];
  const { context, page } = await open(browser, { state });
  await page.waitForTimeout(800);
  const body = await page.locator('body').textContent();
  check('مورد۱۱ متن روزهای پیاپی دقیقاً مطابق پرامپت',
    /آفرین، [۰-۹]+ روز پیاپی ذکر گفتی! همین‌طور ادامه بده 🌹/.test(body),
    (body.match(/آفرین،[^\n]{0,60}/) || [''])[0]);
  await page.screenshot({ path: path.join(OUT, 'streak-toast.png') });
  await context.close();

  // Record broken: today's count must exceed the best previous day.
  const state2 = buildSeedState({ lifetimeTotal: 2200, activeCount: 330 });
  state2.gamification.lastRecordCelebratedDateKey = null;
  state2.logs[0].totalCount = 5000; // today beats every previous day
  const { context: c2, page: p2 } = await open(browser, { state: state2 });
  await p2.waitForTimeout(800);
  const body2 = await p2.locator('body').textContent();
  check('مورد۱۲ متن شکستن رکورد دقیقاً مطابق پرامپت',
    body2.includes('تبریک می‌گم! امروز رکورد ذکر گفتنت رو شکستی 😍'));
  await p2.screenshot({ path: path.join(OUT, 'record-modal.png') });
  await c2.close();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serveDist(DIST, PORT);
  const browser = await launchChromium();
  const tests = [
    ['fresh counter', testFreshCounter],
    ['counter share', testCounterShareTextAndImage],
    ['medal', testMedalFlow],
    ['silver', testSilverReplacesBronze],
    ['star', testStarFlow],
    ['streak/record', testStreakAndRecordText],
  ];
  try {
    for (const [name, fn] of tests) {
      try {
        await fn(browser);
      } catch (err) {
        check(`اجرای سناریوی «${name}»`, false, String(err).split('\n')[0]);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
