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
      const channelId = await ensureChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            // A fixed id so repeated presses replace rather than stack up.
            id: 1,
            title: NOTIFICATION_TITLE,
            body: message,
            ...(channelId ? { channelId } : {}),
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
 * دور نهم — one named, high-importance channel for everything this app sends.
 *
 * Without an explicit channel the notifications land in Capacitor's own default
 * one, at default importance. Two consequences, both of which look to the user
 * exactly like «the reminder never arrived»: some phones (MIUI in particular)
 * give an app's unnamed default channel the quietest treatment they have, and
 * the user cannot find the right switch in the phone's own notification
 * settings because the channel has no name they recognise. A named channel at
 * high importance fixes both, and is also what the guide text can point at.
 */
const CHANNEL_ID = 'zekraram-reminders';
let channelState: 'unknown' | 'ready' | 'unavailable' = 'unknown';

/**
 * Returns the channel id to schedule against, or undefined when there is no
 * channel to use.
 *
 * That distinction matters more than it looks: naming a channel that does not
 * exist makes Android 8+ drop the notification WITHOUT any error — the same
 * silent failure this whole round is about. So if creating it fails, we go back
 * to the plugin's own default channel rather than pointing at nothing.
 */
async function ensureChannel(): Promise<string | undefined> {
  if (!isNativePlatform()) return undefined;
  if (channelState === 'ready') return CHANNEL_ID;
  if (channelState === 'unavailable') return undefined;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'یادآوری و مناسبت‌ها',
      description: 'یادآوری روزانه‌ی ذکر و اعلان مناسبت‌های تقویم',
      importance: 5,
      visibility: 1,
      vibration: true,
    });
    channelState = 'ready';
    return CHANNEL_ID;
  } catch {
    // Older Android has no channels at all, and then the default is correct.
    channelState = 'unavailable';
    return undefined;
  }
}

/**
 * Replaces every notification in an id range with a fresh set. Cancelling
 * first is what makes this safe to call on every app open: the window is
 * rebuilt, never appended to, so a notification can not pile up twice.
 */
async function replaceScheduled(
  idBase: number,
  span: number,
  next: PendingNotification[]
): Promise<number> {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const channelId = await ensureChannel();

  const pending = await LocalNotifications.getPending();
  const mine = pending.notifications.filter((n) => n.id >= idBase && n.id < idBase + span);
  if (mine.length > 0) {
    await LocalNotifications.cancel({ notifications: mine.map((n) => ({ id: n.id })) });
  }

  const future = next.filter((n) => n.at.getTime() > Date.now() + 1000);
  if (future.length === 0) return 0;

  const build = (allowWhileIdle: boolean) => ({
    notifications: future.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      ...(channelId ? { channelId } : {}),
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

  // دور نهم — and then ASK THE PHONE. Everything above can run without error
  // and still leave nothing armed; the user reported exactly that, and the app
  // had no way to tell, because it never looked. Counting what the OS actually
  // holds is the difference between «ثبت شد» being a claim and being a fact.
  const after = await LocalNotifications.getPending();
  return after.notifications.filter((n) => n.id >= idBase && n.id < idBase + span).length;
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
 * دور نهم — what arming the reminder actually achieved.
 *
 * 'armed'         — the OS is holding N reminders; `nextAt` is the first one.
 * 'browser'       — not the Android app, so nothing to arm (development only).
 * 'no-permission' — the phone has not granted permission to show notifications.
 * 'off'           — the reminder switch is off; nothing armed on purpose.
 * 'failed'        — we tried and the phone is holding nothing. Never call this
 *                   a success: it is precisely the state the user was in when
 *                   the app told them «ثبت شد» and no reminder ever arrived.
 */
export interface ReminderScheduleResult {
  status: 'armed' | 'browser' | 'no-permission' | 'off' | 'failed';
  count: number;
  nextAt: Date | null;
  reason?: string;
}

/**
 * Arms the rolling daily-reminder window. Safe and cheap to call repeatedly;
 * it always rebuilds rather than adds.
 */
export async function syncDailyReminderSchedule(
  options: ReminderScheduleOptions
): Promise<ReminderScheduleResult> {
  const nothing = (status: ReminderScheduleResult['status'], reason?: string) =>
    ({ status, count: 0, nextAt: null, reason }) as ReminderScheduleResult;

  if (!isNativePlatform()) return nothing('browser');
  if (getNotificationPermission() !== 'granted') {
    await refreshNotificationPermission();
    if (getNotificationPermission() !== 'granted') return nothing('no-permission');
  }

  const [hh, mm] = options.reminderTime.split(':').map((v) => parseInt(v, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return nothing('failed', 'BAD_TIME');

  if (!options.reminderEnabled) {
    try {
      await replaceScheduled(REMINDER_ID_BASE, REMINDER_WINDOW_DAYS, []);
    } catch {
      // Nothing to report — the user turned it off.
    }
    return nothing('off');
  }

  const body = resolveReminderMessage(options.customMessage);
  const pending: PendingNotification[] = [];
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

  try {
    const count = await replaceScheduled(REMINDER_ID_BASE, REMINDER_WINDOW_DAYS, pending);
    if (count === 0) return nothing('failed', 'NOTHING_ARMED');
    const nextAt = pending
      .map((n) => n.at)
      .filter((d) => d.getTime() > Date.now())
      .sort((a, b) => a.getTime() - b.getTime())[0] || null;
    return { status: 'armed', count, nextAt };
  } catch (err) {
    // Scheduling failed outright — say so rather than claim a reminder the
    // user will never receive.
    return nothing('failed', String((err as Error)?.message || err || 'unknown'));
  }
}

// ─── reading the schedule back ────────────────────────────────────────────

/**
 * دور نهم — «is a reminder really armed right now?», answered by the phone.
 *
 * The user set a daily reminder, the app said «ثبت شد»، and nothing ever
 * arrived — with the app open or closed. There was no way for either of us to
 * tell whether the reminder had been armed and the phone was suppressing it, or
 * whether it had never been armed at all. This makes that visible: the panel
 * shows the next reminder the OS is actually holding, so the difference stops
 * being invisible.
 */
export interface ArmedReminderInfo {
  supported: boolean;
  count: number;
  nextAt: Date | null;
  /** Android 12+: exact alarms can be refused, which makes reminders drift. */
  exactAllowed: boolean | null;
}

export async function readArmedReminders(): Promise<ArmedReminderInfo> {
  if (!isNativePlatform()) {
    return { supported: false, count: 0, nextAt: null, exactAllowed: null };
  }
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const pending = await LocalNotifications.getPending();
    const mine = pending.notifications.filter(
      (n) => n.id >= REMINDER_ID_BASE && n.id < REMINDER_ID_BASE + REMINDER_WINDOW_DAYS
    );
    const times = mine
      .map((n) => (n.schedule?.at ? new Date(n.schedule.at) : null))
      .filter((d): d is Date => !!d && d.getTime() > Date.now())
      .sort((a, b) => a.getTime() - b.getTime());

    let exactAllowed: boolean | null = null;
    try {
      const { exact_alarm } = await LocalNotifications.checkExactNotificationSetting();
      exactAllowed = exact_alarm === 'granted';
    } catch {
      exactAllowed = null;
    }

    return { supported: true, count: mine.length, nextAt: times[0] || null, exactAllowed };
  } catch {
    return { supported: true, count: 0, nextAt: null, exactAllowed: null };
  }
}

/** Android 12+ — opens the system screen where exact alarms are allowed. */
export async function openExactAlarmSetting(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const { exact_alarm } = await LocalNotifications.changeExactNotificationSetting();
    return exact_alarm === 'granted';
  } catch {
    return false;
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
