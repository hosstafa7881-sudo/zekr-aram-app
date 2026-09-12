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

function hijriOf(date) {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
    year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(date);
  const get = (t) => parseInt(parts.find((p) => p.type === t)?.value || '0', 10);
  return { month: get('month'), day: get('day') };
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
  const texts = await page.locator('.fixed.top-3 > div').allTextContents();
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

    // روزی با دو مناسبت هم‌نوع — ۲۵ رجب (شهادت امام صادق و امام کاظم)
    const rajab25 = findHijriDate(7, 25);
    notices = await noticesOn(browser, rajab25);
    check('مورد۲۱ دو مناسبت هم‌نوع با «و» در یک اعلان ترکیب می‌شوند',
      notices.some((t) => t.includes(' و ') && t.endsWith('تسلیت می‌گم 🖤')),
      notices.join(' | ') || 'no notice');

    // روزی با هم غم و هم شادی — ۳ ربیع‌الاول
    const rabi3 = findHijriDate(3, 3);
    notices = await noticesOn(browser, rabi3);
    check('مورد۲۱ روز دارای هر دو نوع: یک اعلان تسلیت و یک اعلان تبریک جدا',
      notices.some((t) => t.endsWith('تسلیت می‌گم 🖤')) && notices.some((t) => t.endsWith('تبریک می‌گم ❤️')),
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
    check('مورد۲۱ روز رسمی غیرمذهبی: قالب «امروز … است 📅»',
      notices.some((t) => t === 'امروز پیروزی انقلاب اسلامی ایران است 📅'),
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
