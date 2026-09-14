// دور نهم / مورد ۵ — the calendar, checked against the published Iranian one.
//
//   node scripts/qa-v9-calendar.mjs
//
// The user reported three occasions landing a day early, and supplied 31
// screenshots of the «باحساب» calendar covering the whole of ۱۴۰۵ as the
// reference. This script checks the app's OWN conversion — the real
// src/utils/hijri.ts and src/lib/occasions.ts, bundled with esbuild and run
// here, not a re-implementation — against every lunar occasion that calendar
// lists for ۱۴۰۵.
//
// It also re-checks the two things the table itself has to get right: the first
// day of each qamari month, and the length of each one.

import { loadAppModules } from './lib/appModules.mjs';

const HIJRI_MONTHS = ['محرم','صفر','ربیع‌الاول','ربیع‌الثانی','جمادی‌الاول','جمادی‌الثانی','رجب','شعبان','رمضان','شوال','ذی‌القعده','ذی‌الحجه'];
const SHAMSI_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

// ── the reference, read off the «باحساب» screenshots ──────────────────────

// ۱ فروردین ۱۴۰۵ is 21 March 2026; ۱۴۰۵ runs 31/31/31/31/31/31/30/30/30/30/30/29.
const NOWRUZ_1405 = Date.UTC(2026, 2, 21, 12);
const SHAMSI_1405_LENGTHS = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

function shamsiToDate(month, day) {
  let doy = day;
  for (let i = 0; i < month - 1; i++) doy += SHAMSI_1405_LENGTHS[i];
  return new Date(NOWRUZ_1405 + (doy - 1) * 86_400_000);
}

/** Each qamari month of ۱۴۰۵ and the Shamsi day it starts on. */
const MONTH_STARTS = [
  [1, 1, 1447, 10], [1, 30, 1447, 11], [2, 28, 1447, 12], [3, 26, 1448, 1],
  [4, 25, 1448, 2], [5, 23, 1448, 3], [6, 22, 1448, 4], [7, 20, 1448, 5],
  [8, 20, 1448, 6], [9, 20, 1448, 7], [10, 20, 1448, 8], [11, 19, 1448, 9],
  [12, 19, 1448, 10],
];

/** Every occasion the «باحساب» lists for ۱۴۰۵ that this app also carries. */
const OCCASIONS = [
  ['eid-fitr', 1, 1], ['eid-fitr-2', 1, 2],
  ['veladat-imam-reza', 2, 9],
  ['ezdevaj-ali-fatemeh', 2, 28],
  ['shahadat-imam-baqir', 3, 3], ['rooz-arafe', 3, 5], ['eid-ghorban', 3, 6],
  ['veladat-imam-hadi', 3, 11], ['eid-ghadir', 3, 14], ['rooz-mobahele', 3, 20],
  ['aghaz-sal-ghamari', 3, 26],
  ['tasua', 4, 3], ['ashura', 4, 4], ['shahadat-imam-sajjad', 4, 6],
  ['arbaeen', 5, 13], ['rehlat-payambar-shahadat-imam-hassan', 5, 21],
  ['shahadat-imam-reza', 5, 22], ['shahadat-imam-askari', 5, 30],
  ['milad-payambar-ahle-sonnat', 6, 3], ['veladat-payambar-imam-sadiq', 6, 8],
  ['veladat-imam-askari', 6, 29], ['vafat-masoumeh', 6, 31],
  ['veladat-zeinab', 7, 24],
  ['shahadat-fatemeh', 8, 22],
  ['vafat-ommolbanin', 9, 2], ['veladat-fatemeh', 9, 9],
  ['veladat-imam-baqir', 9, 20], ['shahadat-imam-hadi', 9, 22],
  ['veladat-imam-taqi', 9, 29],
  ['veladat-imam-ali', 10, 2], ['vafat-zeinab', 10, 4],
  ['shahadat-imam-kazim', 10, 14], ['mabath', 10, 16],
  ['veladat-imam-hossein', 10, 22], ['veladat-abolfazl', 10, 23],
  ['veladat-imam-sajjad', 10, 24], ['veladat-ali-akbar', 10, 30],
  ['veladat-mahdi', 11, 4], ['aghaz-ramazan', 11, 19],
  ['veladat-imam-hassan', 12, 3], ['zarbat-imam-ali', 12, 7],
  ['shahadat-imam-ali', 12, 9],
];

// ── run the app's own modules ─────────────────────────────────────────────

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`);
}

const app = await loadAppModules([
  { names: ['getHijriDateInfo', 'isHijriDateExact'], from: 'src/utils/hijri' },
  { names: ['getOccasionsOnDate'], from: 'src/lib/occasions' },
  { names: ['RELIGIOUS_OCCASIONS'], from: 'src/data/religiousOccasions' },
]);

// 1. Every qamari month of ۱۴۰۵ starts on the day the published calendar says.
for (const [sm, sd, hy, hm] of MONTH_STARTS) {
  const date = shamsiToDate(sm, sd);
  const got = app.getHijriDateInfo(date);
  check(
    `مورد۵ ${sd} ${SHAMSI_MONTHS[sm - 1]} ۱۴۰۵ = ۱ ${HIJRI_MONTHS[hm - 1]} ${hy}`,
    got.day === 1 && got.month === hm && got.year === hy,
    `${got.day} ${HIJRI_MONTHS[got.month - 1]} ${got.year}`
  );
  // And the day before it is the LAST day of the previous month — this is what
  // «شهادت امام رضا (ع)» (آخرین روز صفر) and «شهادت امام محمد تقی (ع)» ride on.
  const before = app.getHijriDateInfo(new Date(date.getTime() - 86_400_000));
  check(
    `مورد۵ روز قبلش آخرین روز ماه قبل است (${HIJRI_MONTHS[hm - 1]})`,
    before.day === 29 || before.day === 30,
    `${before.day} ${HIJRI_MONTHS[before.month - 1]}`
  );
}

// 2. The whole year converts day by day with no gap and no repeat.
let previous = null;
let walked = 0;
let broken = '';
for (let m = 1; m <= 12; m++) {
  for (let d = 1; d <= SHAMSI_1405_LENGTHS[m - 1]; d++) {
    const info = app.getHijriDateInfo(shamsiToDate(m, d));
    if (previous) {
      const sameMonth = info.month === previous.month && info.year === previous.year;
      const ok = sameMonth ? info.day === previous.day + 1 : info.day === 1 && (previous.day === 29 || previous.day === 30);
      if (!ok && !broken) {
        broken = `${d} ${SHAMSI_MONTHS[m - 1]}: ${previous.day} ${HIJRI_MONTHS[previous.month - 1]} → ${info.day} ${HIJRI_MONTHS[info.month - 1]}`;
      }
    }
    previous = info;
    walked++;
  }
}
check('مورد۵ کل سال ۱۴۰۵ روزبه‌روز پشت‌سرهم است (بدون پرش یا تکرار)', !broken && walked === 365, broken || `${walked} روز`);

// 3. Every occasion lands on the day the published calendar lists.
const known = new Map(app.RELIGIOUS_OCCASIONS.map((o) => [o.id, o.title]));
for (const [id, sm, sd] of OCCASIONS) {
  const title = known.get(id);
  if (!title) {
    check(`مورد۵ مناسبت «${id}» در جدول برنامه هست`, false, 'شناسه پیدا نشد');
    continue;
  }
  const date = shamsiToDate(sm, sd);
  const onDay = app.getOccasionsOnDate(date).map((o) => o.id);
  check(
    `مورد۵ ${title} روی ${sd} ${SHAMSI_MONTHS[sm - 1]} ۱۴۰۵`,
    onDay.includes(id),
    `آن روز: ${onDay.join('، ') || 'هیچ'}`
  );
}

// 4. The table's own reach is reported honestly.
check('مورد۵ تاریخ امروز داخل تقویم رسمی است', app.isHijriDateExact(new Date()));
check('مورد۵ تاریخ خارج از جدول، «قطعی» گزارش نمی‌شود', !app.isHijriDateExact(new Date(Date.UTC(2028, 0, 1, 12))));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
