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

// مورد ۲۰ — reminder tab wording.
export const REMINDER_EXPLAINER =
  'هر روز سر ساعتی که انتخاب می‌کنی، اگه هنوز ذکری نگفته باشی، با یه پیام کوچیک، بهت یادآوری میشه 🌿';
export const REMINDER_EXPLAINER_NOTE = '(اگه قبلش ذکر گفته باشی، پیامی نمیاد.)';

/** Toast after «ثبت یادآوری» — timeLabel is the real saved time in Persian digits, e.g. «۲۱:۳۰». */
export const REMINDER_SAVED_TOAST = (timeLabel: string) =>
  `ثبت شد ✅ هر روز ساعت ${timeLabel} یادت میندازیم 🌿`;

/**
 * دور ششم / مورد ۹ — the standing guide box in the «یادآوری روزانه» tab. It is
 * ALWAYS shown, whether the reminder switch is on or off, because a reminder
 * the phone itself blocks looks to the user like a broken feature.
 * (After the Capacitor build we will be able to read the real notification
 * state and show this only when notifications are off.)
 */
export const REMINDER_PHONE_PERMISSION_GUIDE = [
  'برای اینکه یادآوری روزانه واقعاً به گوشیت برسه، باید اعلان‌های «ذکرآرام» توی گوشیت روشن باشه.',
  'اگه هنوز روشن نکردی: تنظیمات گوشی ⟵ اعلان‌ها ⟵ ذکرآرام ⟵ روشن کردن اعلان.',
  '(مسیر دقیق ممکنه بسته به مدل گوشی کمی فرق کنه.)',
];

/**
 * دور نهم / مورد ۴ — the second half of the guide, and the half that actually
 * matters on the user's own phone.
 *
 * «ارسال پیام آزمایشی» worked and the daily reminder never arrived. That gap is
 * the signature of a phone that shows notifications but kills the alarm that
 * would have produced one: on Xiaomi/MIUI, Huawei, Samsung and others, an app
 * that is not allowed to auto-start — or that battery saving is «optimising» —
 * has its scheduled alarms dropped the moment the app is not in the foreground.
 * No amount of code inside the app can grant itself those two settings, so the
 * only honest fix is to tell the user exactly where they are.
 */
export const REMINDER_BACKGROUND_GUIDE = [
  'اگه پیام آزمایشی میاد ولی یادآوری روزانه نمیاد، یعنی گوشیت اجازه‌ی «کار در پس‌زمینه» رو به برنامه نداده.',
  'روی گوشی‌های شیائومی: تنظیمات ⟵ برنامه‌ها ⟵ ذکرآرام ⟵ «اجرای خودکار» (Autostart) رو روشن کن، و توی «صرفه‌جویی باتری» گزینه‌ی «بدون محدودیت» رو انتخاب کن.',
  'روی بقیه‌ی گوشی‌ها: تنظیمات ⟵ باتری ⟵ ذکرآرام ⟵ «بهینه‌سازی باتری» رو خاموش کن.',
];

/** دور نهم / مورد ۴ — the live readout of what the phone is really holding. */
export const REMINDER_STATUS_TITLE = 'وضعیت یادآوری روی گوشی';
export const REMINDER_STATUS_ARMED = (whenLabel: string) =>
  `یادآوری روی گوشیت ثبت شده ✅ اولین یادآوری: ${whenLabel}`;
/** دور دهم — why today's reminder is missing when the user already said a dhikr. */
export const REMINDER_STATUS_TODAY_SKIPPED =
  '(امروز چون ذکر گفتی، یادآوری امروز فرستاده نمی‌شود.)';
export const REMINDER_STATUS_NONE =
  'الان هیچ یادآوری‌ای روی گوشیت ثبت نیست. دکمه‌ی «ثبت یادآوری» رو بزن.';
export const REMINDER_STATUS_INEXACT =
  'گوشیت اجازه‌ی «هشدار دقیق» نداده، برای همین ممکنه یادآوری چند دقیقه دیرتر برسه.';
export const REMINDER_STATUS_EXACT_BUTTON = 'روشن کردن هشدار دقیق';

/** دور نهم / مورد ۴ — «ثبت یادآوری» when the phone did not actually take it. */
export const REMINDER_SAVE_FAILED_TOAST =
  'یادآوری روی گوشیت ثبت نشد. لطفاً اعلان‌های برنامه رو از تنظیمات گوشی روشن کن و دوباره امتحان کن.';

/**
 * دور دهم — the scheduled test.
 *
 * «ارسال پیام آزمایشی» shows its notification immediately and never goes
 * through the phone's scheduler, so it always worked and proved nothing. This
 * one is a real alarm a couple of minutes out: close the app, wait, and the
 * answer is unambiguous.
 */
export const REMINDER_TEST_SCHEDULE_BUTTON = 'یادآوری آزمایشی برای ۲ دقیقه بعد';
export const REMINDER_TEST_SCHEDULED_TOAST = (timeLabel: string) =>
  `یادآوری آزمایشی برای ساعت ${timeLabel} ثبت شد ⏰ برنامه رو ببند و صبر کن.`;
export const REMINDER_TEST_FAILED_TOAST =
  'یادآوری آزمایشی ثبت نشد. لطفاً اعلان‌های برنامه رو از تنظیمات گوشی روشن کن.';

/** دور دهم — the delivery log: «نیامد» and «آمد و ندیدمش» are not the same thing. */
export const REMINDER_LOG_TITLE = 'یادآوری‌هایی که تا حالا رسیده‌اند';
export const REMINDER_LOG_EMPTY =
  'هنوز هیچ یادآوری‌ای اجرا نشده. بعد از اولین یادآوری، ساعتش این‌جا ثبت می‌شود.';

/** NEW TEXT (needs the user's confirmation) — shown when notification permission was refused. */
export const REMINDER_PERMISSION_DENIED_MESSAGE =
  'برای اینکه یادآوری کار کنه، باید اجازه‌ی نمایش اعلان رو بدی. بدون این اجازه، پیام یادآوری روی گوشیت نمایش داده نمیشه 🌿';

// 3. Streak message — dynamic day count (Persian digits), built at the call
// site. Wording + sticker updated in round five (مورد ۱۱); the *timing* logic
// (streak >= 2, once per day) is unchanged.
export const STREAK_MESSAGE = (dayCountLabel: string) =>
  `آفرین، ${dayCountLabel} روز پیاپی ذکر گفتی! همین‌طور ادامه بده 🌹`;

// 7. Confirm deleting one day's history.
//
// دور نهم / مورد ۶ — the old wording was «آیا از حذف ذکرهای ثبت‌شده‌ی این روز
// مطمئنی؟ …», which named ذکرها specifically. That was accurate when the delete
// button could only remove ذکرها; now the same button can remove the notebook
// too, so the sentence must not promise one of the three. The user's own
// wording covers all three, and is what is used.
export const DELETE_DAY_HISTORY_CONFIRM_MESSAGE =
  'مطمئنی؟ بعد از حذف، این عمل قابل بازگشت نیست.';
export const DELETE_DAY_CONFIRM_MESSAGE = DELETE_DAY_HISTORY_CONFIRM_MESSAGE;

export const DELETE_DAY_TITLE = 'حذف اطلاعات این روز';
export const DELETE_DAY_DHIKR_LABEL = 'حذف ذکرها';
export const DELETE_DAY_NOTEBOOK_LABEL = 'حذف دفترچه';
export const DELETE_DAY_BOTH_LABEL = 'حذف ذکرها و دفترچه';

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
