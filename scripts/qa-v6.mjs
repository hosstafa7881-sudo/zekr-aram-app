// دور ششم — behaviour sweep for the eleven round-six items.
//
//   node scripts/qa-v6.mjs
//
// Every check below maps to one numbered item of the round-six prompt. Items
// that can only be judged on a real phone (the OS share sheet, a real file
// download, vibration, a real notification) are verified here as far as the
// browser allows — the payload handed to navigator.share, the bytes of the
// generated PNG — and are called out as "needs manual phone testing" in the
// report.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './lib/browser.mjs';
import { serveDist } from './lib/server.mjs';
import { applySeed, buildSeedState, patchActiveDhikr } from './lib/seed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.qa-screens');
const PORT = 4188;
const VIEWPORT = { width: 390, height: 844 };
const VIEWPORTS = [
  { name: '360', width: 360, height: 780 },
  { name: '390', width: 390, height: 844 },
  { name: '412', width: 412, height: 915 },
  { name: 'tablet-768', width: 768, height: 1024 },
];

fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

/** Replaces navigator.share/canShare so the exact payload can be inspected. */
function stubWebShare() {
  window.__shares = [];
  navigator.canShare = () => true;
  navigator.share = async (data) => {
    window.__shares.push({
      text: data.text || '',
      title: data.title || '',
      files: (data.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size })),
    });
  };
}

async function open(browser, state, opts = {}) {
  const context = await browser.newContext({
    viewport: opts.viewport || VIEWPORT,
    locale: 'fa-IR',
    permissions: opts.permissions || ['clipboard-read', 'clipboard-write'],
    acceptDownloads: true,
  });
  await context.addInitScript(`(${applySeed.toString()})(${JSON.stringify(state)})`);
  if (opts.share) await context.addInitScript(`(${stubWebShare.toString()})()`);
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(`(${patchActiveDhikr.toString()})(${JSON.stringify(state)})`);
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
  return { context, page };
}

const clip = (page) => page.evaluate(() => navigator.clipboard.readText());
const lastShare = (page) => page.evaluate(() => window.__shares[window.__shares.length - 1]);
const referralUsed = (page) =>
  page.evaluate(() => localStorage.getItem('zikraram_referral_last_used_v1'));
const freeExtension = (page) =>
  page.evaluate(() => localStorage.getItem('zikraram_free_extension_until_v1'));

async function goTab(page, name) {
  await page.getByRole('button', { name, exact: true }).first().click();
  await page.waitForTimeout(300);
}

async function openLast30Days(page) {
  await goTab(page, 'تاریخچه');
  await page.getByText('ریزآمار روزهای گذشته').click();
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: /۳۰ روز اخیر/ }).first().click();
  await page.waitForTimeout(450);
}

const STAR_BADGE_LINE = '⭐ ۲۲ ستاره | 🥉 مدال برنز';

// ---------------------------------------------------------------------------
// مورد ۱ — the star/medal line in all three day-share places
// ---------------------------------------------------------------------------
async function testDayShareStars(browser) {
  // 2200 lifetime dhikr = ۲۲ ستاره + مدال برنز
  const state = buildSeedState({ lifetimeTotal: 2200 });
  const { context, page } = await open(browser, state);

  // --- الف) کارت‌های «۳۰ روز اخیر»
  await openLast30Days(page);
  const bothCard = page.locator('[data-testid="day-card"]').first();
  await bothCard.getByLabel('اشتراک‌گذاری').click();
  await page.waitForTimeout(350);
  await page.getByTestId('day-share-option-dhikr').click();
  await page.getByTestId('day-share-submit').click();
  await page.waitForTimeout(400);
  const t30dhikr = await clip(page);
  fs.writeFileSync(path.join(OUT, 'v6-day-30d-dhikr.txt'), t30dhikr);
  check('مورد۱ «۳۰ روز اخیر» / فقط ذکرها: خط ستاره و مدال هست',
    t30dhikr.includes(STAR_BADGE_LINE), t30dhikr.split('\n').filter(Boolean).slice(-1)[0]);
  check('مورد۱ خط ستاره بعد از «مجموع» و در بلوک جدا',
    /مجموع: [۰-۹,]+ ذکر\n\n⭐ ۲۲ ستاره \| 🥉 مدال برنز/.test(t30dhikr));

  await bothCard.getByLabel('اشتراک‌گذاری').click();
  await page.waitForTimeout(350);
  await page.getByTestId('day-share-option-both').click();
  await page.getByTestId('day-share-submit').click();
  await page.waitForTimeout(400);
  const t30both = await clip(page);
  fs.writeFileSync(path.join(OUT, 'v6-day-30d-both.txt'), t30both);
  check('مورد۱ «۳۰ روز اخیر» / ذکرها و دفترچه: خط ستاره و مدال هست',
    t30both.includes(STAR_BADGE_LINE));
  check('مورد۱ خط ستاره پیش از بلوک دفترچه می‌آید',
    t30both.indexOf(STAR_BADGE_LINE) < t30both.indexOf('📔 دفترچه‌ی کارهای خوب ('));

  await bothCard.getByLabel('اشتراک‌گذاری').click();
  await page.waitForTimeout(350);
  await page.getByTestId('day-share-option-notebook').click();
  await page.getByTestId('day-share-submit').click();
  await page.waitForTimeout(400);
  const t30nb = await clip(page);
  fs.writeFileSync(path.join(OUT, 'v6-day-30d-notebook.txt'), t30nb);
  check('مورد۱ «فقط دفترچه» خط ستاره و مدال ندارد',
    !t30nb.includes('⭐') && !t30nb.includes('مدال'));

  // --- ب) مودال خلاصه‌ی تقویم و صفحه‌ی «جزئیات بیشتر»
  // Back out of the ۳۰-day list to the «ریزآمار» detail page, which is where
  // the «جست‌وجوی تاریخچه» calendar lives.
  // Two «بازگشت» buttons exist (the detail page's, and the ۳۰-day overlay's on
  // top of it) — the overlay's is the last one in the DOM.
  await page.getByRole('button', { name: 'بازگشت' }).last().click();
  await page.waitForTimeout(500);
  await page.getByText('جست‌وجوی تاریخچه (تقویم شمسی)').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  // The calendar renders Persian digits; pick a day that has the data dot.
  const dayCells = page.locator('.grid.grid-cols-7 > button');
  const cellCount = await dayCells.count();
  let opened = false;
  for (let i = 0; i < cellCount; i++) {
    const cell = dayCells.nth(i);
    if ((await cell.locator('span.rounded-full').count()) > 0) {
      await cell.click();
      opened = true;
      break;
    }
  }
  check('سناریوی آزمایشی: روزی با داده در تقویم پیدا شد', opened);
  await page.waitForTimeout(400);

  // مودال خلاصه‌ی تقویم (variant 'summary')
  await page.getByRole('button', { name: 'اشتراک‌گذاری' }).first().click();
  await page.waitForTimeout(350);
  if ((await page.getByTestId('day-share-submit').count()) > 0) {
    await page.getByTestId('day-share-option-dhikr').click();
    await page.getByTestId('day-share-submit').click();
  }
  await page.waitForTimeout(400);
  const tSummary = await clip(page);
  fs.writeFileSync(path.join(OUT, 'v6-day-calendar-summary.txt'), tSummary);
  check('مورد۱ مودال خلاصه‌ی تقویم: خط ستاره و مدال هست',
    tSummary.includes(STAR_BADGE_LINE), tSummary.replace(/\n/g, ' | '));
  check('مورد۱ متن خلاصه همچنان خلاصه است (شروع با «آمار ذکر من در»)',
    tSummary.startsWith('آمار ذکر من در '));

  // جزئیات بیشتر
  await page.getByRole('button', { name: /جزئیات بیشتر/ }).first().click();
  await page.waitForTimeout(450);
  await page.locator('[data-testid="day-card"]').first().getByLabel('اشتراک‌گذاری').click();
  await page.waitForTimeout(350);
  if ((await page.getByTestId('day-share-submit').count()) > 0) {
    await page.getByTestId('day-share-option-dhikr').click();
    await page.getByTestId('day-share-submit').click();
  }
  await page.waitForTimeout(400);
  const tFull = await clip(page);
  fs.writeFileSync(path.join(OUT, 'v6-day-fulldetail.txt'), tFull);
  check('مورد۱ صفحه‌ی «جزئیات بیشتر»: خط ستاره و مدال هست',
    tFull.includes(STAR_BADGE_LINE), tFull.split('\n')[0]);

  await context.close();

  // --- بدون ستاره و بدون مدال: خط اصلاً نباید بیاید
  const poorState = buildSeedState({ lifetimeTotal: 40, activeCount: 12 });
  const { context: c2, page: p2 } = await open(browser, poorState);
  await openLast30Days(p2);
  await p2.locator('[data-testid="day-card"]').first().getByLabel('اشتراک‌گذاری').click();
  await p2.waitForTimeout(400);
  if ((await p2.getByTestId('day-share-submit').count()) > 0) {
    await p2.getByTestId('day-share-option-dhikr').click();
    await p2.getByTestId('day-share-submit').click();
    await p2.waitForTimeout(350);
  }
  const poorText = await clip(p2);
  fs.writeFileSync(path.join(OUT, 'v6-day-no-stars.txt'), poorText);
  check('مورد۱ بدون ستاره و مدال: هیچ خطی (و هیچ خط خالی اضافه‌ای) نمی‌آید',
    !poorText.includes('⭐') && !poorText.includes('مدال') && !/\n\n\n/.test(poorText),
    poorText.replace(/\n/g, ' | '));
  await c2.close();

  // --- فقط ستاره، بدون مدال (۱۰۰ تا ۱۹۹۹ ذکر)
  const starOnly = buildSeedState({ lifetimeTotal: 500, activeCount: 60 });
  const { context: c3, page: p3 } = await open(browser, starOnly);
  await openLast30Days(p3);
  await p3.locator('[data-testid="day-card"]').first().getByLabel('اشتراک‌گذاری').click();
  await p3.waitForTimeout(400);
  if ((await p3.getByTestId('day-share-submit').count()) > 0) {
    await p3.getByTestId('day-share-option-dhikr').click();
    await p3.getByTestId('day-share-submit').click();
    await p3.waitForTimeout(350);
  }
  const starOnlyText = await clip(p3);
  fs.writeFileSync(path.join(OUT, 'v6-day-star-only.txt'), starOnlyText);
  check('مورد۱ فقط ستاره (بدون مدال): فقط بخش ستاره می‌آید',
    starOnlyText.includes('⭐ ۵ ستاره') && !starOnlyText.includes('مدال') &&
    !starOnlyText.includes('⭐ ۵ ستاره |'),
    (starOnlyText.match(/⭐.*/) || [''])[0]);
  await c3.close();
}

// ---------------------------------------------------------------------------
// مورد ۳ / ۴ب — the message that travels WITH each generated image
// ---------------------------------------------------------------------------
async function testImageCaptions(browser) {
  const state = buildSeedState({ lifetimeTotal: 2200 });
  const { context, page } = await open(browser, state, { share: true });

  // مورد ۳ — story image: caption must NOT repeat the custom text.
  await page.getByRole('button', { name: /کد تخفیف ۱۰۰ درصدی/ }).click();
  await page.waitForTimeout(600);
  const CUSTOM = 'من هر شب با این برنامه تسبیحات حضرت زهرا (س) می‌گم';
  await page.getByTestId('story-custom-text').fill(CUSTOM);
  await page.waitForTimeout(700);
  await page.getByTestId('story-share-button').click();
  await page.waitForTimeout(2500);
  const storyShare = await lastShare(page);
  fs.writeFileSync(path.join(OUT, 'v6-story-caption.txt'), storyShare.text);
  check('مورد۳ پیام همراه تصویر استوری متن دلخواه را تکرار نمی‌کند',
    !storyShare.text.includes(CUSTOM), storyShare.text.replace(/\n/g, ' | '));
  check('مورد۳ پیام همراه دقیقاً جمله‌ی معرفی است (بدون لینک، چون فروشگاهی لینک ندارد)',
    storyShare.text === 'من با برنامه‌ی «ذکرآرام» ذکر می‌گم 🌿 تو هم می‌تونی امتحانش کنی.',
    JSON.stringify(storyShare.text));
  check('مورد۳ فایل تصویر واقعاً همراه پیام فرستاده می‌شود',
    storyShare.files.length === 1 && storyShare.files[0].size > 20000,
    `${storyShare.files[0]?.name} ${Math.round((storyShare.files[0]?.size || 0) / 1024)}KB`);

  await page.getByLabel('بستن').first().click();
  await page.waitForTimeout(300);

  // مورد ۴ب — counter image: caption must be the FULL «ذکرهای امروز» text.
  await goTab(page, 'شمارنده');
  await page.getByTestId('counter-share-icon').click();
  await page.waitForTimeout(250);
  await page.getByTestId('counter-share-option-image').click();
  await page.getByTestId('counter-share-submit').click();
  await page.waitForTimeout(3000);
  const counterShare = await lastShare(page);
  fs.writeFileSync(path.join(OUT, 'v6-counter-caption.txt'), counterShare.text);
  check('مورد۴ب پیام همراه تصویر شمارش = متن کامل «ذکرهای امروز»',
    counterShare.text.startsWith('📿 ذکرهای امروز من — ') &&
    counterShare.text.includes('مجموع: ') &&
    counterShare.text.includes(STAR_BADGE_LINE) &&
    counterShare.text.includes('من با برنامه‌ی «ذکرآرام» ذکر می‌گم 🌿'),
    counterShare.text.split('\n')[0]);
  check('مورد۴ب تصویر شمارش همراه همان پیام فرستاده می‌شود',
    counterShare.files.length === 1 && counterShare.files[0].name === 'zekraram-counter.png');

  await context.close();
}

// ---------------------------------------------------------------------------
// مورد ۵ — ONLY «معرفی کردم، فعالش کن» may activate the ۱۰۰٪ code
// ---------------------------------------------------------------------------
async function testNoAccidentalActivation(browser) {
  const state = buildSeedState({ trialStartedDaysAgo: 1 });
  const { context, page } = await open(browser, state, { share: true });

  check('مورد۵ شروع: کد فعال نیست', (await referralUsed(page)) === null);

  await page.getByRole('button', { name: /کد تخفیف ۱۰۰ درصدی/ }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'v6-referral-before.png'), fullPage: true });

  // ۱) دکمه‌ی «دانلود تصویر آماده»
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 40000 }),
    page.getByTestId('story-download-button').click(),
  ]);
  await dl.saveAs(path.join(OUT, 'v6-story-download.png'));
  await page.waitForTimeout(1500);
  check('مورد۵ بعد از «دانلود تصویر آماده»: کد فعال نشد',
    (await referralUsed(page)) === null && (await freeExtension(page)) === null);
  check('مورد۵ بعد از دانلود، پنجره هنوز در حالت «قبل از فعال‌سازی» است',
    (await page.getByTestId('referral-state-before').count()) === 1);

  // ۲) دکمه‌ی «اشتراک‌گذاری مستقیم»
  await page.getByTestId('story-share-button').click();
  await page.waitForTimeout(2500);
  check('مورد۵ بعد از «اشتراک‌گذاری مستقیم»: کد فعال نشد',
    (await referralUsed(page)) === null && (await freeExtension(page)) === null);
  check('مورد۵ بعد از اشتراک‌گذاری، پنجره هنوز در حالت «قبل از فعال‌سازی» است',
    (await page.getByTestId('referral-state-before').count()) === 1);

  // ۳) بستن و باز کردن دوباره‌ی پنجره
  await page.getByLabel('بستن').first().click();
  await page.waitForTimeout(400);
  check('مورد۵ بعد از بستن پنجره: کد فعال نشد', (await referralUsed(page)) === null);
  await page.getByRole('button', { name: /کد تخفیف ۱۰۰ درصدی/ }).click();
  await page.waitForTimeout(500);
  check('مورد۵ بعد از باز کردن دوباره: کد فعال نشد', (await referralUsed(page)) === null);

  // ۴) برگشت به برنامه بعد از اشتراک‌گذاری (شبیه‌سازی visibilitychange)
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('pageshow'));
  });
  await page.waitForTimeout(600);
  check('مورد۵ بعد از برگشت به برنامه (visibilitychange/focus): کد فعال نشد',
    (await referralUsed(page)) === null);

  // ۵) و حالا دکمه‌ی واقعی
  await page.waitForTimeout(1100); // stray-tap guard window
  await page.getByTestId('referral-claim-button').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'v6-referral-after.png'), fullPage: true });
  check('مورد۵ فقط با «معرفی کردم، فعالش کن» کد فعال می‌شود',
    (await referralUsed(page)) !== null && (await freeExtension(page)) !== null);
  check('مورد۵ پنجره به حالت «فعال‌شده» می‌رود',
    (await page.getByTestId('referral-state-activated').count()) === 1);

  await context.close();
}

// ---------------------------------------------------------------------------
// مورد ۶ — every time label agrees after the ۱۰۰٪ code is activated
// ---------------------------------------------------------------------------
async function testTrialLabels(browser) {
  // روز دوم دوره‌ی آزمایشی → ۲۹ روز باقی مانده، +۳۰ = ۵۹
  const state = buildSeedState({ trialStartedDaysAgo: 1, lifetimeTotal: 2200 });
  const { context, page } = await open(browser, state);

  await page.getByRole('button', { name: /کد تخفیف ۱۰۰ درصدی/ }).click();
  await page.waitForTimeout(600);
  await page.getByTestId('referral-claim-button').click();
  await page.waitForTimeout(600);
  const freeDays = await page.getByTestId('referral-free-days').textContent();
  check('مورد۶ پنجره‌ی کد ۱۰۰٪: ۵۹ روز', freeDays.includes('۵۹ روز دیگه'), freeDays.trim());
  await page.getByLabel('بستن').first().click();
  await page.waitForTimeout(400);

  const EXPECT = '۵۹ روز دیگه رایگانه';

  // بنر دفترچه‌ی کارهای خوب
  await goTab(page, 'دفترچه');
  await page.waitForTimeout(400);
  const banner = await page.getByTestId('notebook-trial-banner').textContent();
  await page.screenshot({ path: path.join(OUT, 'v6-label-notebook.png'), fullPage: true });
  check('مورد۶ بنر دفترچه عدد جمع‌شده را نشان می‌دهد',
    banner.includes(EXPECT) && banner.includes('تا وقت داری، ازش لذت ببر! 🌿'), banner.trim());

  // تنظیمات → ظاهر و شخصی‌سازی
  await goTab(page, 'تنظیمات');
  await page.waitForTimeout(350);
  const settingsText = await page.locator('main').textContent();
  await page.screenshot({ path: path.join(OUT, 'v6-label-settings.png'), fullPage: true });
  check('مورد۶ برچسب «ظاهر و شخصی‌سازی» در تنظیمات',
    settingsText.includes(EXPECT), (settingsText.match(/[۰-۹]+ روز (دیگه )?رایگانه/) || [''])[0]);

  // تاریخچه → کارت «ریزآمار روزهای گذشته»
  await goTab(page, 'تاریخچه');
  await page.waitForTimeout(350);
  const historyText = await page.locator('main').textContent();
  await page.screenshot({ path: path.join(OUT, 'v6-label-history.png'), fullPage: true });
  check('مورد۶ برچسب کارت «ریزآمار روزهای گذشته»',
    historyText.includes(EXPECT), (historyText.match(/[۰-۹]+ روز (دیگه )?رایگانه/) || [''])[0]);

  // کتابخانه‌ی ذکر → تسبیحات قفل‌شونده (از دکمه‌ی صفحه‌ی خانه)
  await goTab(page, 'خانه');
  await page.locator('[data-tour="home-library"]').click();
  await page.waitForTimeout(500);
  const libText = await page.locator('main').textContent();
  await page.screenshot({ path: path.join(OUT, 'v6-label-library.png'), fullPage: true });
  check('مورد۶ برچسب ذکرهای قفل‌شونده در کتابخانه',
    libText.includes(EXPECT), (libText.match(/[۰-۹]+ روز (دیگه )?رایگانه/) || [''])[0]);

  // صفحه‌ی اشتراک — از کارت «تهیه اشتراک» در صفحه‌ی خانه
  await goTab(page, 'خانه');
  await page.getByRole('button', { name: /تهیه اشتراک|اشتراک ماهانه/ }).first().click();
  await page.waitForTimeout(500);
  const paywallText = await page.locator('main').textContent();
  await page.screenshot({ path: path.join(OUT, 'v6-label-paywall.png'), fullPage: true });
  check('مورد۶ بنر صفحه‌ی اشتراک',
    paywallText.includes(EXPECT), (paywallText.match(/[۰-۹]+ روز (دیگه )?رایگانه/) || [''])[0]);

  // هیچ‌جای برنامه نباید «۳۰ روز رایگانه» مانده باشد
  const anyStale = await page.evaluate(() => document.body.innerText.includes('۳۰ روز رایگانه'));
  check('مورد۶ هیچ برچسبی «۳۰ روز رایگانه» نمانده', !anyStale);

  await context.close();
}

/** مورد ۶ — the number really ticks down day by day. */
async function testTrialCountdown(browser) {
  const state = buildSeedState({ trialStartedDaysAgo: 1 });
  const { context, page } = await open(browser, state);
  await page.getByRole('button', { name: /کد تخفیف ۱۰۰ درصدی/ }).click();
  await page.waitForTimeout(500);
  await page.getByTestId('referral-claim-button').click();
  await page.waitForTimeout(500);
  // Rewind the stored end date by 5 days = five days have passed.
  await page.evaluate(() => {
    const key = 'zikraram_free_extension_until_v1';
    const until = parseInt(localStorage.getItem(key), 10);
    localStorage.setItem(key, String(until - 5 * 24 * 60 * 60 * 1000));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(500);
  await goTab(page, 'دفترچه');
  await page.waitForTimeout(400);
  const banner = await page.getByTestId('notebook-trial-banner').textContent();
  check('مورد۶ عدد با گذشت روزها کم می‌شود (۵۹ ← ۵۴ بعد از ۵ روز)',
    banner.includes('۵۴ روز دیگه رایگانه'), banner.trim());

  // فعال‌سازی دوباره‌ی کد ۳۰ روز به عدد فعلی اضافه می‌کند
  await page.evaluate(() => localStorage.removeItem('zikraram_referral_last_used_v1'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /کد تخفیف ۱۰۰ درصدی/ }).click();
  await page.waitForTimeout(500);
  await page.getByTestId('referral-claim-button').click();
  await page.waitForTimeout(500);
  await page.getByLabel('بستن').first().click();
  await goTab(page, 'دفترچه');
  await page.waitForTimeout(400);
  const banner2 = await page.getByTestId('notebook-trial-banner').textContent();
  check('مورد۶ فعال‌سازی دوباره ۳۰ روز به عدد فعلی اضافه می‌کند (۵۴ ← ۸۴)',
    banner2.includes('۸۴ روز دیگه رایگانه'), banner2.trim());
  await context.close();
}

// ---------------------------------------------------------------------------
// موارد ۷ / ۸ / ۹ — the reminder tab
// ---------------------------------------------------------------------------
async function testReminderTab(browser) {
  // A brand-new user: no seeded settings at all, so DEFAULT_SETTINGS applies.
  const context = await browser.newContext({
    viewport: VIEWPORT,
    locale: 'fa-IR',
    permissions: ['notifications'],
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  // Dismiss the first-run tour so the bell is reachable.
  for (let i = 0; i < 8; i++) {
    const closeTour = page.getByLabel('بستن راهنما');
    if ((await closeTour.count()) > 0) {
      await closeTour.click();
      break;
    }
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(400);

  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('zikraram_settings_v1') || '{}')
  );
  check('مورد۷ کاربر جدید: reminderEnabled در تنظیمات ذخیره‌شده true است',
    stored.reminderEnabled === true, `reminderEnabled=${stored.reminderEnabled}`);

  await page.getByLabel('اعلانات و مناسبت‌ها').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'v6-reminder-default.png'), fullPage: true });

  const switchOn = await page
    .getByRole('switch', { name: 'یادآوری روزانه' })
    .getAttribute('aria-checked');
  check('مورد۷ سوییچ یادآوری برای کاربر جدید پیش‌فرض روشن است',
    switchOn === 'true', `aria-checked=${switchOn}`);
  check('مورد۷ بقیه‌ی بخش‌ها (ساعت، پیام، دکمه‌ها) از همان اول دیده می‌شوند',
    (await page.getByTestId('reminder-body').count()) === 1);

  // مورد ۸
  check('مورد۸ کادر متن دلخواه بدون هیچ کلیکی باز است',
    (await page.getByTestId('reminder-custom-input').count()) === 1 &&
    (await page.getByTestId('reminder-custom-input').isVisible()));
  check('مورد۸ «نوشتن پیام دلخواه» یک عنوان ساده است، نه دکمه',
    (await page.getByTestId('reminder-custom-heading').count()) === 1 &&
    (await page.getByTestId('reminder-custom-heading').evaluate((el) => el.tagName)) === 'DIV');
  const ph = await page.getByTestId('reminder-custom-input').getAttribute('placeholder');
  check('مورد۸ placeholder دقیقاً مطابق پرامپت',
    ph === 'پیام یادآوری خودت رو اینجا بنویس… 😊', ph);
  const maxLen = await page.getByTestId('reminder-custom-input').getAttribute('maxlength');
  check('مورد۸ حداکثر ۱۰۰ حرف', maxLen === '100', `maxlength=${maxLen}`);
  check('مورد۸ «↺ برگشت به پیام پیش‌فرض» سر جایش هست',
    (await page.getByTestId('reminder-custom-reset').count()) === 1);
  await page.getByTestId('reminder-custom-input').fill('یادت نره امشب صلوات بفرستی 🌿');
  await page.waitForTimeout(350);
  const preview = await page.getByTestId('reminder-preview').textContent();
  check('مورد۸ کادر «پیامی که روی گوشیت می‌بینی» زنده به‌روز می‌شود',
    preview.includes('یادت نره امشب صلوات بفرستی 🌿'), preview.trim());

  // مورد ۹ — with the switch ON
  const guideOn = await page.getByTestId('reminder-permission-guide').textContent();
  check('مورد۹ کادر راهنما با سوییچ روشن دیده می‌شود و متنش دقیق است',
    guideOn.includes('🔔 برای اینکه یادآوری روزانه واقعاً به گوشیت برسه، باید اعلان‌های «ذکرآرام» توی گوشیت روشن باشه.') &&
    guideOn.includes('اگه هنوز روشن نکردی: تنظیمات گوشی ⟵ اعلان‌ها ⟵ ذکرآرام ⟵ روشن کردن اعلان.') &&
    guideOn.includes('(مسیر دقیق ممکنه بسته به مدل گوشی کمی فرق کنه.)'),
    guideOn.replace(/\s+/g, ' ').trim());

  // مورد ۹ — and with the switch OFF
  await page.getByRole('switch', { name: 'یادآوری روزانه' }).click();
  await page.waitForTimeout(400);
  check('مورد۹ کادر راهنما با سوییچ خاموش هم دیده می‌شود',
    (await page.getByTestId('reminder-permission-guide').isVisible()) &&
    (await page.getByTestId('reminder-body').count()) === 0);
  await page.screenshot({ path: path.join(OUT, 'v6-reminder-switch-off.png'), fullPage: true });

  // مورد ۷ — after a full reset the switch is on again
  await page.getByLabel('بستن').first().click();
  await page.waitForTimeout(300);
  await goTab(page, 'تنظیمات');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'پاک کردن کامل داده‌ها...' }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'بله، پاک شود' }).first().click();
  await page.waitForTimeout(1200);
  const afterReset = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('zikraram_settings_v1') || '{}')
  );
  check('مورد۷ بعد از «بازنشانی کامل» هم سوییچ روشن است',
    afterReset.reminderEnabled === true, `reminderEnabled=${afterReset.reminderEnabled}`);

  await context.close();
}

// ---------------------------------------------------------------------------
// مورد ۱۰ — the tour's icons are literally the home page's icons
// ---------------------------------------------------------------------------
async function testTourIcons(browser) {
  const state = buildSeedState({ settings: { onboardingSeen: false } });
  const { context, page } = await open(browser, state);
  await page.waitForTimeout(600);

  // Capture the home page's own three icons first (behind the tour overlay).
  const homeIcons = await page.evaluate(() => {
    const host = document.querySelector('[data-tour="home-actions"]');
    return Array.from(host.querySelectorAll('svg')).map((svg) => ({
      cls: svg.getAttribute('class'),
      d: Array.from(svg.children)
        .map((c) => c.tagName + ':' + (c.getAttribute('d') || c.getAttribute('cx') || ''))
        .join('|'),
    }));
  });
  check('سناریوی آزمایشی: صفحه‌ی خانه سه آیکون دارد', homeIcons.length === 3);
  await page.screenshot({ path: path.join(OUT, 'v6-tour-step1.png') });

  // Step 2 of the tour.
  await page.getByRole('button', { name: 'بعدی' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'v6-tour-step2.png') });
  const tourIcons = await page.evaluate(() => {
    const host = document.querySelector('[data-testid="tour-icon-lines"]');
    if (!host) return null;
    return Array.from(host.querySelectorAll('svg')).map((svg) => ({
      cls: svg.getAttribute('class'),
      d: Array.from(svg.children)
        .map((c) => c.tagName + ':' + (c.getAttribute('d') || c.getAttribute('cx') || ''))
        .join('|'),
    }));
  });
  check('مورد۱۰ مرحله‌ی دوم تور، به‌جای ایموجی، آیکون واقعی دارد',
    Array.isArray(tourIcons) && tourIcons.length === 3, `icons=${tourIcons?.length}`);

  // Home order is Share2, HeartHandshake, Bell; the tour lists Bell, Heart, Share2.
  const homeShapes = homeIcons.map((i) => i.d);
  const tourShapes = (tourIcons || []).map((i) => i.d);
  check('مورد۱۰ شکل آیکون اشتراک‌گذاری در تور دقیقاً همان صفحه‌ی خانه است',
    tourShapes[2] === homeShapes[0], tourShapes[2] === homeShapes[0] ? 'identical' : 'DIFFERENT');
  check('مورد۱۰ شکل آیکون قلب در تور دقیقاً همان صفحه‌ی خانه است',
    tourShapes[1] === homeShapes[1]);
  check('مورد۱۰ شکل آیکون زنگوله در تور دقیقاً همان صفحه‌ی خانه است',
    tourShapes[0] === homeShapes[2]);

  const colors = await page.evaluate(() => {
    const host = document.querySelector('[data-testid="tour-icon-lines"]');
    const homeHost = document.querySelector('[data-tour="home-actions"]');
    const get = (el) => getComputedStyle(el).color;
    return {
      tour: Array.from(host.querySelectorAll('svg')).map(get),
      home: Array.from(homeHost.querySelectorAll('svg')).map(get),
    };
  });
  check('مورد۱۰ رنگ هر سه آیکون تور با صفحه‌ی خانه یکی است',
    colors.tour[0] === colors.home[2] &&
    colors.tour[1] === colors.home[1] &&
    colors.tour[2] === colors.home[0],
    `tour=${colors.tour.join(',')} home=${colors.home.join(',')}`);

  const stepText = await page.locator('[role="dialog"]').textContent();
  check('مورد۱۰ هیچ ایموجی 🔗/🔔/❤️ در مرحله‌ی دوم نمانده',
    !stepText.includes('🔗') && !stepText.includes('🔔') && !stepText.includes('❤️'));

  await context.close();
}

// ---------------------------------------------------------------------------
// مورد ۱۱ — version number
// ---------------------------------------------------------------------------
async function testVersion(browser) {
  const state = buildSeedState();
  const { context, page } = await open(browser, state);
  await goTab(page, 'تنظیمات');
  await page.waitForTimeout(400);
  const text = await page.locator('main').textContent();
  check('مورد۱۱ پایین صفحه‌ی تنظیمات «نسخه‌ی ۶» است',
    text.includes('نسخه‌ی ۶'), (text.match(/نسخه‌ی [۰-۹]+/) || [''])[0]);
  await page.screenshot({ path: path.join(OUT, 'v6-settings-version.png'), fullPage: true });

  const served = await page.evaluate(() =>
    fetch('version.json', { cache: 'no-store' }).then((r) => r.json())
  );
  check('مورد۱۱ public/version.json هم ۶ است و با کد هماهنگ است',
    served.version === 6, `version.json=${served.version}`);

  // مورد ۱۱ — the auto-updater: pretend the server published version 7 and
  // confirm the app really reloads itself (a REAL navigation, observed by
  // Playwright, not a stubbed function).
  await page.route('**/version.json*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ version: 7 }),
    })
  );
  let navigated = false;
  page.once('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navigated = true;
  });
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(4000);
  check('مورد۱۱ مکانیزم به‌روزرسانی خودکار با انتشار نسخه‌ی بالاتر، برنامه را تازه می‌کند',
    navigated === true, `navigated=${navigated}`);
  await page.unroute('**/version.json*');

  await context.close();
}

// ---------------------------------------------------------------------------
// Multi-size sweep: nothing falls outside the viewport at any tested width
// ---------------------------------------------------------------------------
async function testViewports(browser) {
  for (const vp of VIEWPORTS) {
    const state = buildSeedState({ lifetimeTotal: 2200, trialStartedDaysAgo: 1 });
    const { context, page } = await open(browser, state, {
      viewport: { width: vp.width, height: vp.height },
    });

    // ۱۰۰٪ code window
    await page.getByRole('button', { name: /کد تخفیف ۱۰۰ درصدی/ }).click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `v6-${vp.name}-referral.png`), fullPage: true });
    const claimBox = await page.getByTestId('referral-claim-button').boundingBox();
    check(`ریسپانسیو ${vp.name}: دکمه‌ی فعال‌سازی داخل عرض صفحه است`,
      claimBox && claimBox.x >= 0 && claimBox.x + claimBox.width <= vp.width + 1,
      claimBox ? `x=${Math.round(claimBox.x)} w=${Math.round(claimBox.width)}` : 'missing');
    const previewBox = await page.getByTestId('story-preview-box').boundingBox();
    check(`ریسپانسیو ${vp.name}: جعبه‌ی پیش‌نمایش تصویر جای ثابت دارد`,
      previewBox && previewBox.height > 150, `h=${Math.round(previewBox?.height || 0)}`);
    await page.getByLabel('بستن').first().click();
    await page.waitForTimeout(300);

    // Reminder tab
    await page.getByLabel('اعلانات و مناسبت‌ها').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `v6-${vp.name}-reminder.png`), fullPage: true });
    const guide = await page.getByTestId('reminder-permission-guide').boundingBox();
    check(`ریسپانسیو ${vp.name}: کادر راهنمای اعلان کامل داخل عرض صفحه است`,
      guide && guide.x >= 0 && guide.x + guide.width <= vp.width + 1,
      guide ? `x=${Math.round(guide.x)} w=${Math.round(guide.width)}` : 'missing');
    await page.getByLabel('بستن').first().click();
    await page.waitForTimeout(300);

    // Notebook banner
    await goTab(page, 'دفترچه');
    await page.waitForTimeout(400);
    const bannerBox = await page.getByTestId('notebook-trial-banner').boundingBox();
    check(`ریسپانسیو ${vp.name}: بنر دفترچه داخل عرض صفحه است`,
      bannerBox && bannerBox.x >= 0 && bannerBox.x + bannerBox.width <= vp.width + 1,
      bannerBox ? `x=${Math.round(bannerBox.x)} w=${Math.round(bannerBox.width)}` : 'missing');
    await page.screenshot({ path: path.join(OUT, `v6-${vp.name}-notebook.png`), fullPage: true });

    // No horizontal overflow anywhere on the page
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth);
    check(`ریسپانسیو ${vp.name}: صفحه اسکرول افقی ندارد`,
      overflow <= vp.width + 1, `scrollWidth=${overflow}`);

    await context.close();
  }
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serveDist(DIST, PORT);
  const browser = await launchChromium();
  const scenarios = [
    ['day share stars', testDayShareStars],
    ['image captions', testImageCaptions],
    ['no accidental activation', testNoAccidentalActivation],
    ['trial labels', testTrialLabels],
    ['trial countdown', testTrialCountdown],
    ['reminder tab', testReminderTab],
    ['tour icons', testTourIcons],
    ['version', testVersion],
    ['viewports', testViewports],
  ];
  try {
    for (const [name, fn] of scenarios) {
      try {
        await fn(browser);
      } catch (e) {
        check(`اجرای سناریوی «${name}»`, false, String(e).split('\n').slice(0, 4).join(' / '));
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('\nFAILED:');
    failed.forEach((f) => console.log(`  - ${f.name}${f.detail ? ' — ' + f.detail : ''}`));
    process.exitCode = 1;
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
