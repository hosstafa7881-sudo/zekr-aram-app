// دور هشتم / مورد ۱۰ — resolving occasions onto real calendar days.
//
// WHAT CHANGED AND WHY:
//
//  * «آخرین روز ماه» is now real. Two occasions (شهادت امام رضا (ع) و شهادت
//    امام محمد تقی (ع)) fall on the last day of a lunar month, which is 29 or
//    30 depending on the year, so they can never be a fixed number.
//
//  * The upcoming list is EXACT. It used to estimate with a 29.53-day average
//    month, which put roughly-nearby occasions on plainly wrong Shamsi dates
//    and gave two different occasions the same «[N] روز دیگر». Now each day
//    from today forward is converted for real and matched, so the day count
//    and the Shamsi label are the actual ones.
//
// The Intl formatters are built once at module load: constructing one is the
// expensive part, and scanning a year of days would otherwise build hundreds.

import { RELIGIOUS_OCCASIONS, ReligiousOccasion } from '../data/religiousOccasions';
import { NATIONAL_HOLIDAYS, NationalHoliday } from '../data/nationalHolidays';
import { HijriDateInfo, getHijriDateInfo } from '../utils/hijri';
import { getShamsiDateInfo, toPersianDigits } from '../utils/persian';

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setHours(12, 0, 0, 0); // midday, so a DST shift can never move the day
  return new Date(d.getTime() + days * DAY_MS);
}

/**
 * True when `date` is the final day of its own lunar month — i.e. tomorrow
 * already belongs to the next one. This is what makes «آخرین روز ماه» land on
 * day 29 in a 29-day year and day 30 in a 30-day one, without the table ever
 * naming a number.
 */
function isLastDayOfHijriMonth(date: Date, hijri: HijriDateInfo): boolean {
  return getHijriDateInfo(addDays(date, 1)).month !== hijri.month;
}

function lunarMatches(occasion: ReligiousOccasion, date: Date, hijri: HijriDateInfo): boolean {
  if (occasion.hijriMonth !== hijri.month) return false;
  if (occasion.hijriDay === 'last') return isLastDayOfHijriMonth(date, hijri);
  return occasion.hijriDay === hijri.day;
}

/** Every lunar occasion falling on this exact calendar day. */
export function getOccasionsOnDate(date = new Date()): ReligiousOccasion[] {
  const hijri = getHijriDateInfo(date);
  return RELIGIOUS_OCCASIONS.filter((o) => lunarMatches(o, date, hijri));
}

/**
 * Kept for the callers that already hold today's Hijri date. The 'last day of
 * month' entries need the real date too, so it is derived from `now`.
 */
export function getTodaysOccasions(_today: HijriDateInfo, now = new Date()): ReligiousOccasion[] {
  return getOccasionsOnDate(now);
}

/** Official Iranian holidays on today's SOLAR (Jalali) date. */
export function getTodaysNationalHolidays(date = new Date()): NationalHoliday[] {
  const shamsi = getShamsiDateInfo(date);
  return NATIONAL_HOLIDAYS.filter(
    (h) => h.jalaliMonth === shamsi.month && h.jalaliDay === shamsi.day
  );
}

export interface UpcomingOccasion extends ReligiousOccasion {
  daysUntil: number;
  shamsiLabel: string;
}

/** How far ahead the upcoming list looks — a little over one lunar year. */
const SCAN_DAYS = 380;

/**
 * The next `count` occasions, in the order they actually arrive, each with its
 * real day count and real Shamsi date. Today counts as 0 days away.
 */
export function getUpcomingOccasions(
  _today: HijriDateInfo,
  count = 8,
  from = new Date()
): UpcomingOccasion[] {
  const found: UpcomingOccasion[] = [];
  const seen = new Set<string>();

  for (let offset = 0; offset < SCAN_DAYS && found.length < count; offset++) {
    const date = addDays(from, offset);
    const matches = getOccasionsOnDate(date);
    if (matches.length === 0) continue;

    const shamsi = getShamsiDateInfo(date);
    for (const occasion of matches) {
      // One lunar year can contain the same occasion twice at the edges of the
      // scan window; only the first arrival is of interest.
      if (seen.has(occasion.id)) continue;
      seen.add(occasion.id);
      found.push({
        ...occasion,
        daysUntil: offset,
        shamsiLabel: `${toPersianDigits(shamsi.day)} ${shamsi.monthName}`,
      });
      if (found.length >= count) break;
    }
  }

  return found;
}

/**
 * The exact Gregorian date of one occasion inside a given Shamsi year — used
 * by the verification script that proves the table and the converter agree.
 */
export function findOccasionDateInShamsiYear(
  occasionId: string,
  shamsiYear: number
): Date | null {
  const occasion = RELIGIOUS_OCCASIONS.find((o) => o.id === occasionId);
  if (!occasion) return null;

  // Walk the whole Shamsi year from its first day.
  let cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  // Jump roughly to the right year first, then correct day by day.
  const yearsAway = shamsiYear - getShamsiDateInfo(cursor).year;
  cursor = addDays(cursor, Math.round(yearsAway * 365.2422));
  while (getShamsiDateInfo(cursor).year > shamsiYear) cursor = addDays(cursor, -1);
  while (getShamsiDateInfo(cursor).year < shamsiYear) cursor = addDays(cursor, 1);
  while (!(getShamsiDateInfo(cursor).month === 1 && getShamsiDateInfo(cursor).day === 1)) {
    cursor = addDays(cursor, -1);
  }

  for (let offset = 0; offset < 366; offset++) {
    const date = addDays(cursor, offset);
    if (getShamsiDateInfo(date).year !== shamsiYear) break;
    const hijri = getHijriDateInfo(date);
    if (lunarMatches(occasion, date, hijri)) return date;
  }
  return null;
}

const OCCASION_NOTICE_KEY = 'zikraram_occasion_notified_v1';

export function wasOccasionNoticeShownToday(dateKey: string): boolean {
  try {
    return localStorage.getItem(OCCASION_NOTICE_KEY) === dateKey;
  } catch {
    return false;
  }
}

export function markOccasionNoticeShownToday(dateKey: string) {
  try {
    localStorage.setItem(OCCASION_NOTICE_KEY, dateKey);
  } catch {
    // Ignore
  }
}
