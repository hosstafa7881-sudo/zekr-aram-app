import { toPersianDigits } from './persian';
import { HIJRI_MONTH_STARTS } from '../data/hijriMonthStarts';

const PERSIAN_DIGITS_LOOKUP = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export interface HijriDateInfo {
  year: number;
  month: number; // 1-12
  day: number; // 1-30
}

const HIJRI_MONTH_NAMES = [
  'محرم',
  'صفر',
  'ربیع‌الاول',
  'ربیع‌الثانی',
  'جمادی‌الاول',
  'جمادی‌الثانی',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذی‌القعده',
  'ذی‌الحجه',
];

// دور نهم / مورد ۵ — the conversion no longer comes from `Intl`.
//
// `Intl`'s islamic calendar is arithmetically fine, it simply is not the
// calendar Iran uses: Iran's official qamari dates follow the crescent as seen
// from Tehran, and across ۱۴۰۵ the two disagree by a day in ten months out of
// thirteen. Every occasion in this app was therefore landing a day early —
// which is precisely what the user reported, three separate times.
//
// So the primary source is now HIJRI_MONTH_STARTS, a table of the days on which
// each qamari month really begins, read off the published Iranian calendar.
// `Intl` survives only as the fallback for dates the table does not reach
// (a future year's calendar has not been decided yet by anyone), shifted by the
// one day that matched the official calendar in ten of those thirteen months.
// `isHijriDateExact()` tells them apart.

/** Midnight-local timestamp, so a day is compared as a day and never as an instant. */
function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function parseIsoDay(iso: string): number {
  const [y, m, d] = iso.split('-').map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

const MS_PER_DAY = 86_400_000;

/** The table, pre-parsed to timestamps. Built once — the occasion scan walks a year of days. */
let tableCache: { at: number; year: number; month: number }[] | null = null;
function getTable() {
  if (!tableCache) {
    tableCache = HIJRI_MONTH_STARTS.map((m) => ({
      at: parseIsoDay(m.gregorian),
      year: m.year,
      month: m.month,
    })).sort((a, b) => a.at - b.at);
  }
  return tableCache;
}

/** True when this date is covered by the published Iranian calendar rather than estimated. */
export function isHijriDateExact(date = new Date()): boolean {
  const table = getTable();
  if (table.length === 0) return false;
  const t = startOfDay(date);
  // The final entry starts a month whose length is not published yet, so only
  // days strictly before it are certain.
  return t >= table[0].at && t < table[table.length - 1].at;
}

// دور هشتم / مورد ۱۰ — built once. The upcoming-occasions scan converts a
// year of days, and CONSTRUCTING an Intl.DateTimeFormat is the expensive part;
// formatting with an existing one is cheap.
let hijriFormatter: Intl.DateTimeFormat | null = null;
function getHijriFormatter(): Intl.DateTimeFormat {
  if (!hijriFormatter) {
    hijriFormatter = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  }
  return hijriFormatter;
}

export function getHijriMonthName(month: number): string {
  return HIJRI_MONTH_NAMES[month - 1] || '';
}

/** The estimate used beyond the published table — `Intl`, moved back one day. */
function estimateHijriDateInfo(date: Date): HijriDateInfo {
  try {
    const shifted = new Date(date.getTime() - MS_PER_DAY);
    const parts = getHijriFormatter().formatToParts(shifted);

    let year = 1446;
    let month = 1;
    let day = 1;

    for (const part of parts) {
      if (part.type === 'year') year = parseInt(part.value, 10) || year;
      if (part.type === 'month') month = parseInt(part.value, 10) || month;
      if (part.type === 'day') day = parseInt(part.value, 10) || day;
    }

    return { year, month, day };
  } catch {
    return { year: 1446, month: 1, day: 1 };
  }
}

/**
 * The Hijri (qamari) date as Iran's official calendar has it.
 *
 * Exact for every day the published table covers; an estimate outside it, which
 * `isHijriDateExact()` reports.
 */
export function getHijriDateInfo(date = new Date()): HijriDateInfo {
  const table = getTable();
  const t = startOfDay(date);
  if (table.length === 0 || t < table[0].at) return estimateHijriDateInfo(date);

  // The last month the table starts has no published end, so a date inside it
  // still gets its day number from the table — the month is known, only its
  // length is not.
  let idx = -1;
  for (let i = table.length - 1; i >= 0; i--) {
    if (t >= table[i].at) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return estimateHijriDateInfo(date);

  const start = table[idx];
  const day = Math.round((t - start.at) / MS_PER_DAY) + 1;

  // Past the end of the table's reach, a month cannot run beyond 30 days; hand
  // those days to the estimate rather than inventing a ۳۱ ذی‌الحجه.
  if (day > 30) return estimateHijriDateInfo(date);

  return { year: start.year, month: start.month, day };
}

export function formatHijriDate(info: HijriDateInfo): string {
  return `${toPersianDigits(info.day)} ${getHijriMonthName(info.month)} ${toPersianDigits(info.year)}`;
}

export function parseFaDigitsToInt(str: string): number {
  const latin = str.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS_LOOKUP.indexOf(d)));
  return parseInt(latin, 10) || 0;
}
