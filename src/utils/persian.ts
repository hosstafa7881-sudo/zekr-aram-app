const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(value: number | string): string {
  if (value === null || value === undefined) return '۰';
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

export function formatPersianNumber(value: number): string {
  try {
    return new Intl.NumberFormat('fa-IR').format(value);
  } catch {
    return toPersianDigits(value);
  }
}

export interface ShamsiDateInfo {
  year: number;
  month: number;
  day: number;
  monthName: string;
  weekdayName: string;
  weekdayIndex: number; // 0 = شنبه (Saturday), 1 = یکشنبه, ..., 6 = جمعه (Friday)
  formattedFull: string; // e.g. "جمعه ۲۹ فروردین ۱۴۰۴"
  dateKey: string; // YYYY-MM-DD (Gregorian key for sorting daily logs)
}

const SHAMSI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const PERSIAN_WEEKDAYS = [
  'یکشنبه', // JS getDay() = 0
  'دوشنبه', // 1
  'سه‌شنبه', // 2
  'چهارشنبه', // 3
  'پنجشنبه', // 4
  'جمعه', // 5
  'شنبه', // 6
];

// Maps JS getDay() (0=Sun..6=Sat) to Iranian week index (0=Sat..6=Fri)
export function getIranianWeekdayIndex(date = new Date()): number {
  const jsDay = date.getDay(); // 0=Sun, 6=Sat
  return (jsDay + 1) % 7;
}

export function getShamsiDateInfo(date = new Date()): ShamsiDateInfo {
  const jsDay = date.getDay();
  const weekdayName = PERSIAN_WEEKDAYS[jsDay] || 'امروز';
  const weekdayIndex = getIranianWeekdayIndex(date);

  const isoYear = date.getFullYear();
  const isoMonth = String(date.getMonth() + 1).padStart(2, '0');
  const isoDay = String(date.getDate()).padStart(2, '0');
  const dateKey = `${isoYear}-${isoMonth}-${isoDay}`;

  try {
    const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(date);

    let year = 1404;
    let month = 1;
    let day = 1;

    // Convert Persian digits back to integer for month lookup
    const parseFaInt = (str: string) => {
      const latin = str.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
      return parseInt(latin, 10) || 1;
    };

    for (const part of parts) {
      if (part.type === 'year') year = parseFaInt(part.value);
      if (part.type === 'month') month = parseFaInt(part.value);
      if (part.type === 'day') day = parseFaInt(part.value);
    }

    const monthName = SHAMSI_MONTHS[month - 1] || '';
    const formattedFull = `${weekdayName} ${toPersianDigits(day)} ${monthName} ${toPersianDigits(year)}`;

    return {
      year,
      month,
      day,
      monthName,
      weekdayName,
      weekdayIndex,
      formattedFull,
      dateKey,
    };
  } catch {
    return {
      year: 1404,
      month: 1,
      day: 1,
      monthName: 'فروردین',
      weekdayName,
      weekdayIndex,
      formattedFull: `${weekdayName}`,
      dateKey,
    };
  }
}

/**
 * Strip Arabic diacritics (تشکیل / اعراب) when the user prefers plain text.
 */
export function stripArabicDiacritics(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
}
