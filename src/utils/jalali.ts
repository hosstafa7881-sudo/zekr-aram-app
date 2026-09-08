import { getShamsiDateInfo } from './persian';

function addDays(d: Date, days: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Finds the Gregorian Date for a given Jalali (jy, jm, jd) by estimating a
 * nearby Gregorian date and walking day-by-day until the Intl-based
 * Gregorian→Jalali conversion (already used and trusted elsewhere in this
 * app) matches the target. This avoids re-implementing the Jalali leap-year
 * break-table by hand — it reuses the one conversion direction the platform
 * already gives us reliably.
 */
function findGregorianForJalali(jy: number, jm: number, jd: number): Date {
  const approxGregorianYear = jy + 621;
  let candidate = new Date(approxGregorianYear, 2, 20, 12, 0, 0);
  const dayOfYearEstimate = (jm - 1) * 30 + jd;
  candidate = addDays(candidate, dayOfYearEstimate - 1);

  for (let i = 0; i < 60; i++) {
    const info = getShamsiDateInfo(candidate);
    if (info.year === jy && info.month === jm && info.day === jd) return candidate;
    const isBefore =
      info.year < jy ||
      (info.year === jy && info.month < jm) ||
      (info.year === jy && info.month === jm && info.day < jd);
    candidate = addDays(candidate, isBefore ? 1 : -1);
  }
  return candidate;
}

export interface JalaliMonthDay {
  gregorianDate: Date;
  dateKey: string;
  jalaliDay: number;
}

/** Builds the list of days for a given Jalali (year, month), each mapped to its Gregorian dateKey. */
export function getJalaliMonthDays(jy: number, jm: number): JalaliMonthDay[] {
  const firstDay = findGregorianForJalali(jy, jm, 1);
  const days: JalaliMonthDay[] = [];
  let cursor = firstDay;
  let jalaliDay = 1;

  while (jalaliDay <= 31) {
    const info = getShamsiDateInfo(cursor);
    if (info.year !== jy || info.month !== jm) break;
    days.push({ gregorianDate: cursor, dateKey: toDateKey(cursor), jalaliDay });
    cursor = addDays(cursor, 1);
    jalaliDay += 1;
  }
  return days;
}

/** Weekday index (0=شنبه..6=جمعه) of the 1st day of the Jalali month, used for grid padding. */
export function getJalaliMonthStartWeekday(jy: number, jm: number): number {
  const firstDay = findGregorianForJalali(jy, jm, 1);
  return getShamsiDateInfo(firstDay).weekdayIndex;
}

export function shiftJalaliMonth(jy: number, jm: number, delta: number): { jy: number; jm: number } {
  let total = jm - 1 + delta;
  let newYear = jy + Math.floor(total / 12);
  let newMonth = (((total % 12) + 12) % 12) + 1;
  return { jy: newYear, jm: newMonth };
}
