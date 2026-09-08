import { toPersianDigits } from './persian';

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

export function getHijriMonthName(month: number): string {
  return HIJRI_MONTH_NAMES[month - 1] || '';
}

/**
 * Approximate Hijri (lunar) date using the browser's Intl calendar conversion.
 * Accurate within ~1 day around moon-sighting boundaries — acceptable for
 * showing "nearby" religious occasions, not for religious ruling purposes.
 */
export function getHijriDateInfo(date = new Date()): HijriDateInfo {
  try {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(date);

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

export function formatHijriDate(info: HijriDateInfo): string {
  return `${toPersianDigits(info.day)} ${getHijriMonthName(info.month)} ${toPersianDigits(info.year)}`;
}

export function parseFaDigitsToInt(str: string): number {
  const latin = str.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS_LOOKUP.indexOf(d)));
  return parseInt(latin, 10) || 0;
}
