// دور هشتم / مورد ۱۰ — proves the replaced occasion table and the Hijri→Shamsi
// converter agree, by printing the real Shamsi date of five occasions in ۱۴۰۵
// and ۱۴۰۶.
//
//   node scripts/qa-occasion-dates.mjs
//
// دور نهم — this used to re-implement the conversion with `Intl` inside a
// browser page. That was honest while the app itself used `Intl`; it is not any
// more, because the app now converts through the published Iranian calendar and
// the two differ by a day in most months. A check that re-implements the thing
// it is checking will happily print wrong dates and report PASS, so this now
// bundles and runs the app's OWN modules.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadAppModules } from './lib/appModules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.qa-screens');

const SHAMSI_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const HIJRI_MONTHS = ['محرم','صفر','ربیع‌الاول','ربیع‌الثانی','جمادی‌الاول','جمادی‌الثانی','رجب','شعبان','رمضان','شوال','ذی‌القعده','ذی‌الحجه'];
const DAY = 86_400_000;
const fa = (n) => String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

/** id → what the approved table says it is, for the printed check. */
const CASES = [
  { id: 'veladat-abolfazl', label: 'ولادت حضرت ابوالفضل العباس (ع)', expect: '۴ شعبان' },
  { id: 'ashura', label: 'عاشورای حسینی', expect: '۱۰ محرم' },
  { id: 'eid-fitr', label: 'عید سعید فطر', expect: '۱ شوال' },
  { id: 'shahadat-fatemeh', label: 'شهادت حضرت فاطمه زهرا (س)', expect: '۳ جمادی‌الثانی' },
  { id: 'shahadat-imam-reza', label: 'شهادت امام رضا (ع)', expect: 'آخرین روز صفر' },
];

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const app = await loadAppModules([
  { names: ['getHijriDateInfo'], from: 'src/utils/hijri' },
  { names: ['getOccasionsOnDate'], from: 'src/lib/occasions' },
]);

const shamsiFmt = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC',
});
function shamsiOf(d) {
  const out = {};
  for (const p of shamsiFmt.formatToParts(d)) {
    if (p.type === 'year' || p.type === 'month' || p.type === 'day') out[p.type] = parseInt(p.value, 10);
  }
  return out;
}

/** First day of a Shamsi year, as a local Date at noon. */
function nowruzOf(year) {
  let cursor = new Date(year + 621, 2, 15, 12);
  for (let i = 0; i < 40; i++) {
    const s = shamsiOf(cursor);
    if (s.year === year && s.month === 1 && s.day === 1) return cursor;
    cursor = new Date(cursor.getTime() + DAY);
  }
  throw new Error(`could not find ۱ فروردین ${year}`);
}

fs.mkdirSync(OUT, { recursive: true });

const table = [];
for (const year of [1405, 1406]) {
  const start = nowruzOf(year);
  for (const c of CASES) {
    let found = null;
    for (let i = 0; i < 366; i++) {
      const d = new Date(start.getTime() + i * DAY);
      if (shamsiOf(d).year !== year) break;
      if (!app.getOccasionsOnDate(d).some((o) => o.id === c.id)) continue;
      const s = shamsiOf(d);
      const h = app.getHijriDateInfo(d);
      found = {
        shamsi: `${fa(s.day)} ${SHAMSI_MONTHS[s.month - 1]} ${fa(s.year)}`,
        hijri: `${fa(h.day)} ${HIJRI_MONTHS[h.month - 1]} ${fa(h.year)}`,
      };
      break;
    }
    table.push({ id: c.id, year, ...(found || {}) });
  }
}

const lines = ['| مناسبت | تاریخ قمری | سال ۱۴۰۵ | سال ۱۴۰۶ |', '|---|---|---|---|'];
for (const c of CASES) {
  const y5 = table.find((r) => r.id === c.id && r.year === 1405);
  const y6 = table.find((r) => r.id === c.id && r.year === 1406);
  check(`مورد۱۰ ${c.label} در هر دو سال پیدا شد`, !!y5?.shamsi && !!y6?.shamsi);
  console.log(`      ۱۴۰۵: ${y5?.shamsi} (${y5?.hijri}) · ۱۴۰۶: ${y6?.shamsi} (${y6?.hijri})`);
  lines.push(`| ${c.label} | ${c.expect} | ${y5?.shamsi || '—'} | ${y6?.shamsi || '—'} |`);
}

// The whole point of round eight: Abbas must be in شعبان, never ربیع‌الثانی.
const abbas05 = table.find((r) => r.id === 'veladat-abolfazl' && r.year === 1405);
check('مورد۱۰ ولادت ابوالفضل (ع) روی ۴ شعبان است، نه ۴ ربیع‌الثانی',
  abbas05?.hijri?.startsWith('۴ شعبان'), abbas05?.hijri || '—');
const fitr = table.find((r) => r.id === 'eid-fitr' && r.year === 1405);
check('مورد۱۰ عید فطر روی ۱ شوال است', fitr?.hijri?.startsWith('۱ شوال'), fitr?.hijri || '—');
const reza = table.find((r) => r.id === 'shahadat-imam-reza' && r.year === 1405);
check('مورد۱۰ شهادت امام رضا (ع) روی آخرین روز صفر است (۲۹ یا ۳۰)',
  /^(۲۹|۳۰) صفر/.test(reza?.hijri || ''), reza?.hijri || '—');

// دور نهم — and against the published Iranian calendar the user supplied.
// ۱۴۰۵ contains عید فطر twice — ۱ شوال ۱۴۴۷ on its first day and ۱ شوال ۱۴۴۸
// on ۱۹ اسفند — and the scan above stops at the first. Check the second here.
const secondFitr = (() => {
  const start = nowruzOf(1405);
  for (let i = 1; i < 366; i++) {
    const d = new Date(start.getTime() + i * DAY);
    if (shamsiOf(d).year !== 1405) break;
    if (!app.getOccasionsOnDate(d).some((o) => o.id === 'eid-fitr')) continue;
    const s = shamsiOf(d);
    return `${fa(s.day)} ${SHAMSI_MONTHS[s.month - 1]} ${fa(s.year)}`;
  }
  return null;
})();
check('مورد۵ عید فطر دوم سال ۱۴۰۵ روی ۱۹ اسفند است (تقویم رسمی)',
  secondFitr === '۱۹ اسفند ۱۴۰۵', secondFitr || '—');
check('مورد۵ عید فطر اول سال ۱۴۰۵ روی ۱ فروردین است (تقویم رسمی)',
  fitr?.shamsi === '۱ فروردین ۱۴۰۵', fitr?.shamsi || '—');
check('مورد۵ عاشورای ۱۴۰۵ روی ۴ تیر است (تقویم رسمی)',
  table.find((r) => r.id === 'ashura' && r.year === 1405)?.shamsi === '۴ تیر ۱۴۰۵');
check('مورد۵ شهادت حضرت فاطمه (س) ۱۴۰۵ روی ۲۲ آبان است (تقویم رسمی)',
  table.find((r) => r.id === 'shahadat-fatemeh' && r.year === 1405)?.shamsi === '۲۲ آبان ۱۴۰۵');
check('مورد۵ شهادت امام رضا (ع) ۱۴۰۵ روی ۲۲ مرداد است (تقویم رسمی)',
  table.find((r) => r.id === 'shahadat-imam-reza' && r.year === 1405)?.shamsi === '۲۲ مرداد ۱۴۰۵');

fs.writeFileSync(path.join(OUT, 'v8-occasion-dates.md'), lines.join('\n') + '\n');
console.log(`\nجدول در .qa-screens/v8-occasion-dates.md نوشته شد`);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
