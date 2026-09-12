// Central catalog of every "dictionary" message from the product spec
// (بخش د + بخش ذ). Existing messages that already lived correctly in their
// natural module are re-exported here (not duplicated) so this file stays
// the single reference point for auditing exact wording.
//
// Numbers in comments refer to بخش د's numbered list (1-24) and بخش ذ (51).

export {
  TRIAL_WARNING_MESSAGE, // 1
  TRIAL_ENDED_MESSAGE, // 2
} from './subscription';

export {
  RECORD_BROKEN_MESSAGE, // 4
  RECORD_BROKEN_SHARE_TEXT, // 5
} from './gamification';

export { CUSTOM_DHIKR_LIMIT_MESSAGE } from './dhikrLimits'; // 6
export { CUSTOM_DHIKR_DELETE_CONFIRM_MESSAGE } from './dhikrLimits'; // 8

export { REMINDER_MESSAGE } from './notifications'; // 16

// 3. Streak message — dynamic day count (Persian digits), built at the call
// site. Wording + sticker updated in round five (مورد ۱۱); the *timing* logic
// (streak >= 2, once per day) is unchanged.
export const STREAK_MESSAGE = (dayCountLabel: string) =>
  `آفرین، ${dayCountLabel} روز پیاپی ذکر گفتی! همین‌طور ادامه بده 🌹`;

// 7. Confirm deleting one day's history
export const DELETE_DAY_HISTORY_CONFIRM_MESSAGE =
  'آیا از حذف ذکرهای ثبت‌شده‌ی این روز مطمئنی؟ این عمل قابل بازگشت نیست.';

// 9. Star earned — dynamic total, built at the call site.
export const STAR_EARNED_MESSAGE = (totalLabel: string) =>
  `یک ستاره‌ی جدید گرفتی! ⭐ مجموع ستاره‌هات: ${totalLabel}`;

// 10-15 medal messages live in gamification.ts's BADGE_LEVELS array
// (earnedMessage / shareText fields) — see BADGE_LEVELS there.

// 17-18. Religious occasions — built dynamically in religiousOccasions.ts's getOccasionMessage()

// 19. No data for the searched day
export const NO_DATA_FOR_DAY_MESSAGE =
  'داده‌ای برای این روز ثبت نشده. شاید تاریخ رو اشتباه وارد کردی یا شایدم شرایطش رو نداشتی ذکر بگی 🌿';

// 20. Target reached — dynamic count, built at the call site.
export const TARGET_REACHED_MESSAGE = (countLabel: string) =>
  `تبریک می‌گم! به هدف ${countLabel} ذکر رسیدید 🌿`;

// 21. Generic app-share message
export const APP_SHARE_MESSAGE = 'دارم با این برنامه ذکر می‌گم 🌿 اگه بخوای تو هم می‌تونی امتحانش کنی.';

// 22. Support-us message (shown in SupportUsModal alongside the two review buttons)
export const SUPPORT_US_MESSAGE =
  'اگه از برنامه خوشتون اومد، با دادن یک نظر خوب توی فروشگاه، مارو حمایت کنین 🌿';

// 23. Paywall page banner for a user still inside the free trial — dynamic days-left.
// `freeDaysLabel` is the one canonical wording from useTrialGate's formatFreeDaysLabel
// ("۳۰ روز رایگانه" on day one, "[عدد] روز دیگه رایگانه" afterwards) — used everywhere
// in the app without exception, so this banner never re-derives its own phrasing.
export const PAYWALL_TRIAL_BANNER = (freeDaysLabel: string) =>
  `به مدت ۳۰ روز، همه‌ی امکانات این برنامه برای شما رایگانه 🌿 ${freeDaysLabel}. بعدش، بعضی از امکانات قفل می‌شن و برای ادامه‌ی استفاده نیاز به تهیه‌ی اشتراک ماهانه دارین.`;

// 24. Notebook free-trial banner (shown on every visit for the whole 30 days, not just the last 5)
export const NOTEBOOK_TRIAL_BANNER = (freeDaysLabel: string) =>
  `این امکان ${freeDaysLabel}. تا وقت داری، ازش لذت ببر! 🌿`;

// Hard-reset confirmation (Settings) — explicit wording requested after the message audit.
export const HARD_RESET_CONFIRM_MESSAGE =
  'آیا کاملاً مطمئنی؟ با این کار، تمام ذکرها، تاریخچه، ستاره‌ها و مدال‌های شما برای همیشه پاک می‌شن و این عمل غیرقابل بازگشته. پیشنهاد می‌کنیم قبل از این کار، از بخش «پشتیبان‌گیری» یک فایل پشتیبان تهیه کنید.';

// بخش ذ #51 — re-lock message for a previously-created multi-stage custom dhikr
export const MULTISTAGE_DHIKR_LOCKED_MESSAGE =
  'این ذکر چندمرحله‌ای دلخواه که در دوره‌ی رایگان ساخته بودی، الان قفل شده. با تهیه‌ی اشتراک ماهانه می‌تونی دوباره ازش استفاده کنی.';
