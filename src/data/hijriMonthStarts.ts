// دور نهم / مورد ۵ — the official Iranian lunar calendar, as a table.
//
// WHY A TABLE AND NOT A CALCULATION
//
// Every occasion date in this app is placed by converting a Gregorian day to a
// Hijri (qamari) one, and that conversion was done with `Intl`'s `islamic`
// calendar. `Intl` is arithmetically fine — it just is not the calendar Iran
// uses. Iran's official qamari calendar is decided by whether the new crescent
// is visible from Tehran, which is published each year by the Geophysics
// Institute of Tehran University; `Intl` instead follows the Umm al-Qura /
// tabular reckoning. Across the year below they disagree by one day in ten
// months out of thirteen, and by two in one of them.
//
// One day is not a rounding error here. It is «ولادت امام حسن عسکری (ع)»
// landing on ۲۸ شهریور instead of ۲۹, «وفات حضرت معصومه (س)» on ۳۰ instead of
// ۳۱, «ولادت حضرت زینب (س)» on ۲۳ مهر instead of ۲۴ — which is exactly what the
// user reported, three times, each time one day early.
//
// So the conversion no longer guesses. This table records the Gregorian day on
// which each qamari month actually begins, read off the published Iranian
// calendar. The previous rule in SKILL.md («موتور سالم بود، داده غلط بود —
// روزبه‌روز با Intl تبدیل کن») was true when it was written and is not true
// any more: this round the DATA was right and the ENGINE was wrong.
//
// WHERE THESE NUMBERS COME FROM
//
// The user supplied 31 screenshots of the «باحساب» calendar covering every
// month of ۱۴۰۵ and the first month of ۱۴۰۶. Each day cell there carries both
// its qamari and its Gregorian number, so every line below was read off a
// published calendar rather than computed, and each one was cross-checked
// against that month's own occasion list (عید فطر, عاشورا, اربعین, مبعث, عید
// قربان and so on all fall where the table puts them).
//
// HOW FAR IT REACHES
//
// The last month here is شوال ۱۴۴۸. That is not laziness: «باحساب» itself
// prints «تقویم و تعطیلات قمری اعلام نشده است» over فروردین ۱۴۰۶, because the
// Iranian calendar for a future year genuinely does not exist yet — it depends
// on moon sightings that have not happened. Outside the covered range the
// conversion falls back to `Intl` shifted by one day, which matched the
// official calendar in ten of the thirteen months below; those dates are
// approximate and `isHijriDateExact()` says so.
//
// ⛳ THIS TABLE MUST BE EXTENDED EVERY YEAR, once the new Iranian calendar is
//    published. Add the new month starts to the end and nothing else changes.

export interface HijriMonthStart {
  /** Gregorian date of the 1st of this qamari month, as YYYY-MM-DD. */
  gregorian: string;
  year: number;
  /** 1 = محرم … 12 = ذی‌الحجه */
  month: number;
}

/** Sorted ascending by date. Read off the published Iranian calendar for ۱۴۰۵. */
export const HIJRI_MONTH_STARTS: HijriMonthStart[] = [
  { gregorian: '2026-03-21', year: 1447, month: 10 }, // ۱ شوال ۱۴۴۷ — ۱ فروردین ۱۴۰۵، عید فطر
  { gregorian: '2026-04-19', year: 1447, month: 11 }, // ۱ ذی‌القعده — ۳۰ فروردین ۱۴۰۵
  { gregorian: '2026-05-18', year: 1447, month: 12 }, // ۱ ذی‌الحجه — ۲۸ اردیبهشت ۱۴۰۵
  { gregorian: '2026-06-16', year: 1448, month: 1 },  // ۱ محرم ۱۴۴۸ — ۲۶ خرداد ۱۴۰۵
  { gregorian: '2026-07-16', year: 1448, month: 2 },  // ۱ صفر — ۲۵ تیر ۱۴۰۵
  { gregorian: '2026-08-14', year: 1448, month: 3 },  // ۱ ربیع‌الاول — ۲۳ مرداد ۱۴۰۵
  { gregorian: '2026-09-13', year: 1448, month: 4 },  // ۱ ربیع‌الثانی — ۲۲ شهریور ۱۴۰۵
  { gregorian: '2026-10-12', year: 1448, month: 5 },  // ۱ جمادی‌الاول — ۲۰ مهر ۱۴۰۵
  { gregorian: '2026-11-11', year: 1448, month: 6 },  // ۱ جمادی‌الثانی — ۲۰ آبان ۱۴۰۵
  { gregorian: '2026-12-11', year: 1448, month: 7 },  // ۱ رجب — ۲۰ آذر ۱۴۰۵
  { gregorian: '2027-01-10', year: 1448, month: 8 },  // ۱ شعبان — ۲۰ دی ۱۴۰۵
  { gregorian: '2027-02-08', year: 1448, month: 9 },  // ۱ رمضان — ۱۹ بهمن ۱۴۰۵
  { gregorian: '2027-03-10', year: 1448, month: 10 }, // ۱ شوال ۱۴۴۸ — ۱۹ اسفند ۱۴۰۵، عید فطر
];
