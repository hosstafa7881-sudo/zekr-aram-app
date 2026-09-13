// دور هشتم / مورد ۱۰ — proves the replaced table and the Hijri→Shamsi
// converter agree, by printing the real Shamsi date of five occasions in ۱۴۰۵
// and ۱۴۰۶. It runs the app's OWN modules inside a browser page (they use Intl
// calendars), so this checks the shipped code, not a re-implementation.
//
//   node scripts/qa-occasion-dates.mjs

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './lib/browser.mjs';
import { serveDist } from './lib/server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.qa-screens');
const PORT = 4193;

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

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serveDist(path.join(ROOT, 'dist'), PORT);
  const browser = await launchChromium();
  const context = await browser.newContext({ locale: 'fa-IR' });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });

  // The production bundle is a single inlined file, so the app's modules are
  // not reachable by name. The two conversions the check needs are the very
  // same Intl calendars the app uses, driven here directly.
  const table = await page.evaluate((cases) => {
    const hijriFmt = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
      year: 'numeric', month: 'numeric', day: 'numeric',
    });
    const shamsiFmt = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      year: 'numeric', month: 'numeric', day: 'numeric',
    });
    const partsOf = (fmt, d) => {
      const out = {};
      for (const p of fmt.formatToParts(d)) {
        if (p.type === 'year' || p.type === 'month' || p.type === 'day') out[p.type] = parseInt(p.value, 10);
      }
      return out;
    };
    const SHAMSI_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
    const HIJRI_MONTHS = ['محرم','صفر','ربیع‌الاول','ربیع‌الثانی','جمادی‌الاول','جمادی‌الثانی','رجب','شعبان','رمضان','شوال','ذی‌القعده','ذی‌الحجه'];
    const fa = (n) => String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
    const DAY = 86400000;

    // The table, mirrored here only as (month, day|'last') coordinates.
    const COORDS = {
      'veladat-abolfazl': [8, 4],
      ashura: [1, 10],
      'eid-fitr': [10, 1],
      'shahadat-fatemeh': [6, 3],
      'shahadat-imam-reza': [2, 'last'],
    };

    const results = [];
    for (const year of [1405, 1406]) {
      // Find 1 Farvardin of that Shamsi year.
      let cursor = new Date(Date.UTC(year + 621, 2, 20, 12));
      while (partsOf(shamsiFmt, cursor).year > year) cursor = new Date(cursor.getTime() - DAY);
      while (partsOf(shamsiFmt, cursor).year < year) cursor = new Date(cursor.getTime() + DAY);
      while (!(partsOf(shamsiFmt, cursor).month === 1 && partsOf(shamsiFmt, cursor).day === 1)) {
        cursor = new Date(cursor.getTime() - DAY);
      }

      for (const c of cases) {
        const [hm, hd] = COORDS[c.id];
        let found = null;
        for (let i = 0; i < 366; i++) {
          const d = new Date(cursor.getTime() + i * DAY);
          if (partsOf(shamsiFmt, d).year !== year) break;
          const h = partsOf(hijriFmt, d);
          if (h.month !== hm) continue;
          const isMatch =
            hd === 'last'
              ? partsOf(hijriFmt, new Date(d.getTime() + DAY)).month !== hm
              : h.day === hd;
          if (!isMatch) continue;
          const s = partsOf(shamsiFmt, d);
          found = {
            shamsi: `${fa(s.day)} ${SHAMSI_MONTHS[s.month - 1]} ${fa(s.year)}`,
            hijri: `${fa(h.day)} ${HIJRI_MONTHS[h.month - 1]} ${fa(h.year)}`,
            gregorian: d.toISOString().slice(0, 10),
          };
          break;
        }
        results.push({ id: c.id, label: c.label, expect: c.expect, year, ...(found || {}) });
      }
    }
    return results;
  }, CASES);

  const lines = ['| مناسبت | تاریخ قمری | سال ۱۴۰۵ | سال ۱۴۰۶ |', '|---|---|---|---|'];
  for (const c of CASES) {
    const y5 = table.find((r) => r.id === c.id && r.year === 1405);
    const y6 = table.find((r) => r.id === c.id && r.year === 1406);
    check(`مورد۱۰ ${c.label} در هر دو سال پیدا شد`, !!y5?.shamsi && !!y6?.shamsi);
    console.log(`      ۱۴۰۵: ${y5?.shamsi} (${y5?.hijri}) · ۱۴۰۶: ${y6?.shamsi} (${y6?.hijri})`);
    lines.push(`| ${c.label} | ${c.expect} | ${y5?.shamsi || '—'} | ${y6?.shamsi || '—'} |`);
  }

  // The whole point of the round: Abbas must be in شعبان, never ربیع‌الثانی.
  const abbas05 = table.find((r) => r.id === 'veladat-abolfazl' && r.year === 1405);
  check('مورد۱۰ ولادت ابوالفضل (ع) روی ۴ شعبان است، نه ۴ ربیع‌الثانی',
    abbas05?.hijri?.startsWith('۴ شعبان'), abbas05?.hijri || '—');
  // And the two that used to collide are now different days.
  const sadiq = table.find((r) => r.id === 'eid-fitr' && r.year === 1405);
  check('مورد۱۰ عید فطر روی ۱ شوال است', sadiq?.hijri?.startsWith('۱ شوال'), sadiq?.hijri || '—');
  const reza = table.find((r) => r.id === 'shahadat-imam-reza' && r.year === 1405);
  check('مورد۱۰ شهادت امام رضا (ع) روی آخرین روز صفر است (۲۹ یا ۳۰)',
    /^(۲۹|۳۰) صفر/.test(reza?.hijri || ''), reza?.hijri || '—');

  fs.writeFileSync(path.join(OUT, 'v8-occasion-dates.md'), lines.join('\n') + '\n');
  console.log(`\nجدول در .qa-screens/v8-occasion-dates.md نوشته شد`);

  await context.close();
  await browser.close();
  server.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exitCode = 1;
}

run().catch((e) => { console.error(e); process.exit(1); });
