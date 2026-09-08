import { RELIGIOUS_OCCASIONS, ReligiousOccasion } from '../data/religiousOccasions';
import { HijriDateInfo } from '../utils/hijri';
import { getShamsiDateInfo, toPersianDigits } from '../utils/persian';

const APPROX_HIJRI_YEAR_LENGTH = 354.36;

function approxDayOfYear(month: number, day: number): number {
  return (month - 1) * 29.53 + day;
}

export function getTodaysOccasions(today: HijriDateInfo): ReligiousOccasion[] {
  return RELIGIOUS_OCCASIONS.filter((o) => o.hijriMonth === today.month && o.hijriDay === today.day);
}

export interface UpcomingOccasion extends ReligiousOccasion {
  daysUntil: number;
  shamsiLabel: string;
}

/** Sorted by circular proximity to today's Hijri date. daysUntil/shamsiLabel are approximate. */
export function getUpcomingOccasions(today: HijriDateInfo, count = 8): UpcomingOccasion[] {
  const todayDOY = approxDayOfYear(today.month, today.day);
  return RELIGIOUS_OCCASIONS.map((o) => {
    const occDOY = approxDayOfYear(o.hijriMonth, o.hijriDay);
    let diff = occDOY - todayDOY;
    if (diff < 0) diff += APPROX_HIJRI_YEAR_LENGTH;
    const daysUntil = Math.round(diff);
    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + daysUntil);
    const shamsiInfo = getShamsiDateInfo(projectedDate);
    const shamsiLabel = `${toPersianDigits(shamsiInfo.day)} ${shamsiInfo.monthName}`;
    return { ...o, daysUntil, shamsiLabel };
  })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, count);
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
