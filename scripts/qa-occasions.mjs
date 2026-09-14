// مورد ۲۱ — verifies the occasion notice wording on real calendar days by
// running the app with the clock moved to each target date.
//
//   node scripts/qa-occasions.mjs

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './lib/browser.mjs';
import { serveDist } from './lib/server.mjs';
import { applySeed, buildSeedState } from './lib/seed.mjs';
import { loadAppModules } from './lib/appModules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.qa-screens');
const PORT = 4188;
const DAY_MS = 24 * 60 * 60 * 1000;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

// دور نهم — the app no longer converts qamari dates with `Intl`; it uses the
// published Iranian calendar, and the two differ by a day in most months. A
// check that picked its target day with `Intl` would land one day off the day
// the app marks, see no notice, and report a failure that isn't there — which
// is exactly what happened. So the target days come from the app's own
// converter.
const appHijri = await loadAppModules([
  { names: ['getHijriDateInfo'], from: 'src/utils/hijri' },
]);

function hijriOf(date) {
  const { month, day } = appHijri.getHijriDateInfo(date);
  return { month, day };
}

function jalaliOf(date) {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(date);
  const get = (t) => parseInt(parts.find((p) => p.type === t)?.value || '0', 10);
  return { month: get('month'), day: get('day') };
}

/** Finds the next date (within two years) whose Hijri month/day match. */
function findHijriDate(month, day) {
  for (let i = 0; i < 760; i++) {
    const d = new Date(Date.now() + i * DAY_MS);
    d.setHours(12, 0, 0, 0);
    const h = hijriOf(d);
    if (h.month === month && h.day === day) return d;
  }
  throw new Error(`no date found for hijri ${month}/${day}`);
}

function findJalaliDate(month, day) {
  for (let i = 0; i < 400; i++) {
    const d = new Date(Date.now() + i * DAY_MS);
    d.setHours(12, 0, 0, 0);
    const j = jalaliOf(d);
    if (j.month === month && j.day === day) return d;
  }
  throw new Error(`no date found for jalali ${month}/${day}`);
}

async function noticesOn(browser, date, settings = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' });
  await context.clock.install({ time: date });
  const state = buildSeedState({ settings });
  // The once-per-day guard is keyed on today's date — clear it so the notice
  // is allowed to appear on the simulated day.
  state.todayKey = '1970-01-01';
  await context.addInitScript(`(${applySeed.toString()})(${JSON.stringify(state)})`);
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.waitForTimeout(200);
  await context.clock.runFor(1500);
  await page.waitForTimeout(400);
  const texts = await page.locator('[data-testid="toast"]').allTextContents();
  await context.close();
  return texts.map((t) => t.trim());
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serveDist(DIST, PORT);
  const browser = await launchChromium();
  try {
    // غم — عاشورا (۱۰ محرم)
    const ashura = findHijriDate(1, 10);
    let notices = await noticesOn(browser, ashura);
    check('مورد۲۱ مناسبت غم: قالب «امروز … است، تسلیت می‌گم 🖤»',
      notices.some((t) => t.startsWith('امروز') && t.endsWith('است، تسلیت می‌گم 🖤')),
      notices.join(' | ') || 'no notice');

    // شادی — عید غدیر (۱۸ ذی‌الحجه)
    const ghadir = findHijriDate(12, 18);
    notices = await noticesOn(browser, ghadir);
    check('مورد۲۱ مناسبت شادی: قالب «امروز … است، تبریک می‌گم ❤️»',
      notices.some((t) => t === 'امروز عید سعید غدیر خم است، تبریک می‌گم ❤️'),
      notices.join(' | ') || 'no notice');

    // دور هشتم / مورد ۱۰ — ۲۵ رجب و ۲۵ شوال دیگر یک روز نیستند. این دقیقاً
    // همان باگی است که کاربر گزارش کرد: در جدول قبلی هر دو شهادت روی ۲۵ رجب
    // نشسته بودند.
    const rajab25 = findHijriDate(7, 25);
    notices = await noticesOn(browser, rajab25);
    check('مورد۱۰ ۲۵ رجب فقط شهادت امام موسی کاظم (ع) است',
      notices.length === 1 && notices[0] === 'امروز شهادت امام موسی کاظم (ع) است، تسلیت می‌گم 🖤',
      notices.join(' | ') || 'no notice');

    const shawwal25 = findHijriDate(10, 25);
    notices = await noticesOn(browser, shawwal25);
    // Not asserting the COUNT here: the next ۲۵ شوال also happens to fall on
    // ۱۳ فروردین, so a second, neutral notice legitimately appears beside it
    // (only غم+شادی merge into one neutral notice — غم+خنثی stay separate).
    // What matters is that امام صادق (ع) now has his own day, apart from
    // امام کاظم (ع).
    check('مورد۱۰ ۲۵ شوال شهادت امام جعفر صادق (ع) است، جدا از امام کاظم (ع)',
      notices.some((t) => t === 'امروز شهادت امام جعفر صادق (ع) است، تسلیت می‌گم 🖤') &&
        !notices.some((t) => t.includes('امام موسی کاظم')),
      notices.join(' | ') || 'no notice');

    // مورد۱۰ — «هیچ موردی را خودت اضافه نکن»: دو روزی که در جدول قبلی مناسبت
    // داشتند و در جدول تأییدشده ندارند، باید واقعاً هیچ اعلانی ندهند.
    const rabi3 = findHijriDate(3, 3);
    notices = await noticesOn(browser, rabi3);
    check('مورد۱۰ ۳ ربیع‌الاول در جدول تأییدشده مناسبتی ندارد',
      notices.length === 0, notices.join(' | ') || 'بدون اعلان (درست)');

    const rajab7 = findHijriDate(7, 7);
    notices = await noticesOn(browser, rajab7);
    check('مورد۱۰ ۷ رجب در جدول تأییدشده مناسبتی ندارد',
      notices.length === 0, notices.join(' | ') || 'بدون اعلان (درست)');

    // مورد۲۱ — دو مناسبت هم‌دسته در یک روز با «و» ترکیب می‌شوند. با جدول
    // تأییدشده، تنها روزی که در افق سه‌ساله این حالت را دارد ۱۴ خرداد ۱۴۰۷ است:
    // عاشورای حسینی و رحلت امام خمینی (ره) هر دو در دسته‌ی غم.
    const twoSameMood = new Date('2028-06-03T12:00:00Z');
    notices = await noticesOn(browser, twoSameMood);
    check('مورد۲۱ دو مناسبت هم‌دسته با «و» در یک اعلان ترکیب می‌شوند',
      notices.length === 1 &&
        notices[0].includes(' و ') &&
        notices[0].endsWith('تسلیت می‌گم 🖤'),
      notices.join(' | ') || 'no notice');

    // نوروز — اول فروردین
    const nowruz = findJalaliDate(1, 1);
    notices = await noticesOn(browser, nowruz);
    check('مورد۲۱ پیام ویژه‌ی نوروز در اول فروردین',
      notices.some((t) => t.startsWith('سال نو مبارک 🌸 یا مُحَوِّلَ الحَولِ وَالأحوال')),
      notices.join(' | ') || 'no notice');

    // ۲ فروردین — هیچ اعلان تبریکی ندارد
    const nowruz2 = findJalaliDate(1, 2);
    notices = await noticesOn(browser, nowruz2);
    check('مورد۲۱ روز دوم فروردین اعلان جداگانه ندارد',
      !notices.some((t) => t.includes('سال نو مبارک') || t.includes('عید نوروز')),
      notices.join(' | ') || 'no notice');

    // رحلت امام خمینی (ره) — ۱۴ خرداد، دسته‌ی غم
    const khordad14 = findJalaliDate(3, 14);
    notices = await noticesOn(browser, khordad14);
    check('مورد۲۱ رحلت امام خمینی (ره) در دسته‌ی غم (تسلیت)',
      notices.some((t) => t.includes('رحلت امام خمینی (ره)') && t.endsWith('تسلیت می‌گم 🖤')),
      notices.join(' | ') || 'no notice');

    // روز رسمی غیرمذهبی — ۲۲ بهمن
    const bahman22 = findJalaliDate(11, 22);
    notices = await noticesOn(browser, bahman22);
    // مورد۱۰ — در جدول تأییدشده، ۲۲ بهمن دسته‌ی «شادی» است (نه خنثی) و
    // عنوانش «پیروزی انقلاب اسلامی».
    check('مورد۱۰ ۲۲ بهمن: شادی، با عنوان جدول تأییدشده',
      notices.some((t) => t === 'امروز پیروزی انقلاب اسلامی است، تبریک می‌گم ❤️'),
      notices.join(' | ') || 'no notice');

    // قالب خنثی «امروز … است 📅» روی یک روز رسمیِ خنثی در همان جدول.
    const farvardin12 = findJalaliDate(1, 12);
    notices = await noticesOn(browser, farvardin12);
    check('مورد۲۱ روز خنثی: قالب «امروز … است 📅»',
      notices.some((t) => t === 'امروز روز جمهوری اسلامی ایران است 📅'),
      notices.join(' | ') || 'no notice');

    // سوییچ‌ها
    notices = await noticesOn(browser, ashura, { occasionReligiousNotifyEnabled: false });
    check('مورد۲۱ب خاموش کردن سوییچ مذهبی، اعلان مذهبی را حذف می‌کند',
      !notices.some((t) => t.includes('تسلیت می‌گم')), notices.join(' | ') || 'no notice');

    notices = await noticesOn(browser, bahman22, { occasionNationalNotifyEnabled: false });
    check('مورد۲۱ب خاموش کردن سوییچ روزهای رسمی، اعلان رسمی را حذف می‌کند',
      !notices.some((t) => t.includes('پیروزی انقلاب')), notices.join(' | ') || 'no notice');
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
