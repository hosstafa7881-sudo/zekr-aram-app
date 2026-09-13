// دور هشتم / مورد ۳ — daily reminder + occasion notices.
//
// WHAT WAS BROKEN: this module only ever used the browser Notification API.
// The Android WebView does not implement it, so `isNotificationSupported()`
// was false inside the APK — «ارسال پیام آزمایشی» answered «گوشی یا مرورگرت
// الان امکان نمایش اعلان رو نداره» and the daily reminder never arrived. Worse,
// even where the Web API does work it only fires while the page is open, which
// defeats the entire purpose of shipping an Android app.
//
// NOW: @capacitor/local-notifications on native, scheduled by the OS, so a
// reminder arrives with the app closed. The browser path is kept unchanged so
// the app still behaves during development.
//
// «فقط اگر آن روز هنوز ذکری نگفته باشد» cannot be evaluated by the OS at fire
// time, so instead a rolling window of individual daily notifications is
// re-armed every time the app opens or the day's count changes: today's is
// dropped the moment a dhikr is recorded, and future days stay armed because
// the app cannot know yet.

import { isNativePlatform } from './native';

export const REMINDER_MESSAGE =
  'امروز هنوز ذکری نگفتی، می‌خوای با گفتن ذکر، بیشتر به یاد خدا باشی؟ 📿';

/** مورد ۲۰ — a custom reminder has to fit inside a phone notification. */
export const REMINDER_MESSAGE_MAX_LENGTH = 100;

const NOTIFICATION_TITLE = 'ذکرآرام';

/** How many days ahead the rolling reminder window is armed. */
const REMINDER_WINDOW_DAYS = 14;
/** How many days ahead occasion notices are armed. */
const OCCASION_WINDOW_DAYS = 45;
/** Notification id ranges, kept apart so one type never cancels the other. */
const REMINDER_ID_BASE = 10_000;
const OCCASION_ID_BASE = 20_000;
/** The hour an occasion notice arrives, when the day has one. */
const OCCASION_HOUR = 9;

/** The message the user will actually see: their own wording when they wrote one, otherwise the default. */
export function resolveReminderMessage(customMessage?: string | null): string {
  const trimmed = (customMessage || '').trim();
  return trimmed.length > 0 ? trimmed : REMINDER_MESSAGE;
}

// ─── permission ───────────────────────────────────────────────────────────
//
// The call sites read the permission synchronously (it drives what the bell
// panel renders), so the native answer is cached here and refreshed in the
// background rather than turning every caller async.

type Permission = NotificationPermission | 'unsupported';
let cachedNativePermission: Permission = 'default';

export function isNotificationSupported(): boolean {
  if (isNativePlatform()) return true;
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): Permission {
  if (isNativePlatform()) return cachedNativePermission;
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** Reads the real native permission and updates the cache the getter serves. */
export async function refreshNotificationPermission(): Promise<Permission> {
  if (!isNativePlatform()) return getNotificationPermission();
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const { display } = await LocalNotifications.checkPermissions();
    cachedNativePermission = display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'default';
  } catch {
    cachedNativePermission = 'denied';
  }
  return cachedNativePermission;
}

if (isNativePlatform()) {
  void refreshNotificationPermission();
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      // POST_NOTIFICATIONS on Android 13+ — this is the system prompt.
      const { display } = await LocalNotifications.requestPermissions();
      cachedNativePermission = display === 'granted' ? 'granted' : 'denied';
      return cachedNativePermission as NotificationPermission;
    } catch {
      cachedNativePermission = 'denied';
      return 'denied';
    }
  }
  if (!isNotificationSupported()) return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

// ─── test notification ────────────────────────────────────────────────────

/** مورد ۲۰ — «ارسال پیام آزمایشی»: shows one real notification right now. */
export async function sendTestNotification(message: string): Promise<'sent' | 'denied' | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  let permission = getNotificationPermission();
  if (permission !== 'granted') {
    permission = await requestNotificationPermission();
  }
  if (permission !== 'granted') return 'denied';

  if (isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [
          {
            // A fixed id so repeated presses replace rather than stack up.
            id: 1,
            title: NOTIFICATION_TITLE,
            body: message,
            // A moment in the future: an immediate schedule is dropped by some
            // Android builds as "already past".
            schedule: { at: new Date(Date.now() + 800) },
          },
        ],
      });
      return 'sent';
    } catch {
      return 'denied';
    }
  }

  try {
    new Notification(NOTIFICATION_TITLE, { body: message, icon: 'icon.svg' });
    return 'sent';
  } catch {
    return 'denied';
  }
}

// ─── native scheduling ────────────────────────────────────────────────────

interface PendingNotification {
  id: number;
  title: string;
  body: string;
  at: Date;
}

/**
 * Replaces every notification in an id range with a fresh set. Cancelling
 * first is what makes this safe to call on every app open: the window is
 * rebuilt, never appended to, so a notification can not pile up twice.
 */
async function replaceScheduled(idBase: number, span: number, next: PendingNotification[]) {
  const { LocalNotifications } = await import('@capacitor/local-notifications');

  const pending = await LocalNotifications.getPending();
  const mine = pending.notifications.filter((n) => n.id >= idBase && n.id < idBase + span);
  if (mine.length > 0) {
    await LocalNotifications.cancel({ notifications: mine.map((n) => ({ id: n.id })) });
  }

  const future = next.filter((n) => n.at.getTime() > Date.now() + 1000);
  if (future.length === 0) return;

  const build = (allowWhileIdle: boolean) => ({
    notifications: future.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      schedule: { at: n.at, allowWhileIdle },
    })),
  });

  try {
    // allowWhileIdle keeps the reminder on its minute instead of drifting into
    // a Doze batch — it needs SCHEDULE_EXACT_ALARM, which the user can refuse.
    await LocalNotifications.schedule(build(true));
  } catch {
    // Refused: an inexact alarm still arrives, just not to the minute. Far
    // better than no reminder at all.
    await LocalNotifications.schedule(build(false));
  }
}

function atTimeOnDay(dayOffset: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export interface ReminderScheduleOptions {
  reminderEnabled: boolean;
  /** "HH:MM" */
  reminderTime: string;
  /** True when the user has already said a dhikr today — today is then skipped. */
  todayHasAnyDhikr: boolean;
  customMessage?: string;
}

/**
 * Arms the rolling daily-reminder window. Safe and cheap to call repeatedly;
 * it always rebuilds rather than adds.
 */
export async function syncDailyReminderSchedule(options: ReminderScheduleOptions): Promise<void> {
  if (!isNativePlatform()) return;
  if (getNotificationPermission() !== 'granted') {
    await refreshNotificationPermission();
    if (getNotificationPermission() !== 'granted') return;
  }

  const [hh, mm] = options.reminderTime.split(':').map((v) => parseInt(v, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return;

  const body = resolveReminderMessage(options.customMessage);
  const pending: PendingNotification[] = [];

  if (options.reminderEnabled) {
    for (let day = 0; day < REMINDER_WINDOW_DAYS; day++) {
      // Today is armed only while nothing has been counted yet — the whole
      // point of the reminder («فقط اگر آن روز هنوز ذکری نگفته باشد»).
      if (day === 0 && options.todayHasAnyDhikr) continue;
      pending.push({
        id: REMINDER_ID_BASE + day,
        title: NOTIFICATION_TITLE,
        body,
        at: atTimeOnDay(day, hh, mm),
      });
    }
  }

  try {
    await replaceScheduled(REMINDER_ID_BASE, REMINDER_WINDOW_DAYS, pending);
  } catch {
    // Scheduling failed outright — say nothing rather than claim a reminder
    // the user will never receive.
  }
}

/**
 * Arms the occasion notices. `noticesForDay` is supplied by the caller so this
 * module stays free of calendar logic; it returns the day's notice text, or ''
 * when that day has none.
 */
export async function syncOccasionSchedule(
  noticesForDay: (dayOffset: number) => string
): Promise<void> {
  if (!isNativePlatform()) return;
  if (getNotificationPermission() !== 'granted') return;

  const pending: PendingNotification[] = [];
  for (let day = 0; day < OCCASION_WINDOW_DAYS; day++) {
    const body = noticesForDay(day);
    if (!body) continue;
    // «هر نوع اعلان، در هر روز حداکثر یک‌بار» — one entry per day, by id.
    pending.push({
      id: OCCASION_ID_BASE + day,
      title: NOTIFICATION_TITLE,
      body,
      at: atTimeOnDay(day, OCCASION_HOUR, 0),
    });
  }

  try {
    await replaceScheduled(OCCASION_ID_BASE, OCCASION_WINDOW_DAYS, pending);
  } catch {
    // Same rule: silence beats a false promise.
  }
}

// ─── browser fallback (development only) ──────────────────────────────────

const LAST_NOTIFIED_KEY = 'zikraram_reminder_last_notified_v1';

// In-memory backstop alongside the localStorage flag below. If the
// localStorage write ever silently fails (private-browsing storage limits,
// quota pressure from years of unlimited daily-log history, etc.), the
// once-per-day guard would never persist and the 60-second interval in
// useDailyReminder.ts would fire a brand-new `Notification()` — with its own
// system sound — every single minute for as long as the reminder stays past
// due. The in-memory flag guarantees at most one real Notification per
// calendar day per page load even if storage is broken.
let firedInMemoryForDateKey: string | null = null;

function wasNotifiedToday(dateKey: string): boolean {
  try {
    return localStorage.getItem(LAST_NOTIFIED_KEY) === dateKey;
  } catch {
    return false;
  }
}

function markNotifiedToday(dateKey: string) {
  try {
    localStorage.setItem(LAST_NOTIFIED_KEY, dateKey);
  } catch {
    // Ignore
  }
}

/**
 * The browser-only path: polls while the page is open. On native this is a
 * no-op — the OS holds the schedule instead, which is what lets a reminder
 * arrive with the app closed.
 */
export function maybeFireDailyReminder(options: {
  reminderEnabled: boolean;
  reminderTime: string; // "HH:MM"
  todayDateKey: string;
  todayHasAnyDhikr: boolean;
  customMessage?: string;
}) {
  if (isNativePlatform()) return;

  const { reminderEnabled, reminderTime, todayDateKey, todayHasAnyDhikr, customMessage } = options;
  if (!reminderEnabled) return;
  if (todayHasAnyDhikr) return;
  if (getNotificationPermission() !== 'granted') return;
  if (wasNotifiedToday(todayDateKey)) return;
  if (firedInMemoryForDateKey === todayDateKey) return;

  const [hh, mm] = reminderTime.split(':').map((v) => parseInt(v, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return;

  const now = new Date();
  const reminderMinutes = hh * 60 + mm;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (nowMinutes >= reminderMinutes) {
    firedInMemoryForDateKey = todayDateKey;
    try {
      new Notification(NOTIFICATION_TITLE, {
        body: resolveReminderMessage(customMessage),
        icon: 'icon.svg',
      });
    } catch {
      // Ignore — some browsers disallow direct `new Notification` in certain contexts
    }
    markNotifiedToday(todayDateKey);
  }
}
