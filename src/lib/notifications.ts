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
import {
  armReminders,
  armOccasionNotices,
  armSingleReminder,
  cancelAllReminders,
  readArmedAlarms,
  OCCASION_SLOT_BASE,
  OCCASION_SLOT_COUNT,
  TEST_REMINDER_SLOT,
  type ReminderSlot,
} from './reminderAlarm';

export const REMINDER_MESSAGE =
  'امروز هنوز ذکری نگفتی، می‌خوای با گفتن ذکر، بیشتر به یاد خدا باشی؟ 📿';

/** مورد ۲۰ — a custom reminder has to fit inside a phone notification. */
export const REMINDER_MESSAGE_MAX_LENGTH = 100;

const NOTIFICATION_TITLE = 'ذکرآرام';

/** How many days ahead the rolling reminder window is armed. */
const REMINDER_WINDOW_DAYS = 14;
/** How many days ahead occasion notices are armed. */
const OCCASION_WINDOW_DAYS = 45;
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

/**
 * دور نهم — one named, high-importance channel for everything this app sends.
 *
 * Without an explicit channel the notifications land in Capacitor's own default
 * one, at default importance. Two consequences, both of which look to the user
 * exactly like «the reminder never arrived»: some phones (MIUI in particular)
 * give an app's unnamed default channel the quietest treatment they have, and
 * the user cannot find the right switch in the phone's own notification
 * settings because the channel has no name they recognise.
 *
 * Returns the id to schedule against, or undefined when there is no channel to
 * use — naming a channel that does not exist makes Android 8+ drop the
 * notification WITHOUT any error, the same silent failure as everything else
 * this area of the app has been fighting.
 */
const CHANNEL_ID = 'zekraram-reminders';
let channelState: 'unknown' | 'ready' | 'unavailable' = 'unknown';

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

// دور دهم — the scheduling helpers that lived here are gone.
//
// They built a JavaScript `Date` from the user's chosen time and handed that
// instant to @capacitor/local-notifications. That is precisely what made the
// reminder arrive an hour late: the WebView decided what «۲۱:۲۸» was worth in
// UTC and Android decided again in reverse, and on a ROM whose tzdata still
// carries Iran's pre-2022 daylight saving the two answers differ by an hour.
//
// Everything scheduled by wall-clock time now goes through
// src/lib/reminderAlarm.ts, which sends the hour and the minute and lets
// Android work out the moment in its own zone. The Capacitor plugin is still
// used for «ارسال پیام آزمایشی», which is a duration rather than a time of day
// and so was never affected.

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
      await cancelAllReminders();
    } catch {
      // Nothing to report — the user turned it off.
    }
    return nothing('off');
  }

  await ensureChannel();

  // دور دهم — the hour and the minute travel; the instant does not.
  //
  // Everything here used to build a `Date` from the user's chosen time and send
  // that across, which meant the WebView decided what «۲۱:۲۸» was worth in UTC
  // and Android decided again in reverse. When the two disagreed — and on a
  // stale-tzdata ROM in شهریور they disagree by an hour — the reminder simply
  // landed an hour late. Now Android computes the moment itself, in its own
  // zone, from the wall-clock numbers.
  const body = resolveReminderMessage(options.customMessage);
  const slots: ReminderSlot[] = [];
  for (let day = 0; day < REMINDER_WINDOW_DAYS; day++) {
    // Today is armed only while nothing has been counted yet — the whole
    // point of the reminder («فقط اگر آن روز هنوز ذکری نگفته باشد»).
    if (day === 0 && options.todayHasAnyDhikr) continue;
    slots.push({
      slot: day,
      dayOffset: day,
      hour: hh,
      minute: mm,
      title: NOTIFICATION_TITLE,
      body,
      channelId: CHANNEL_ID,
    });
  }

  try {
    const armed = await armReminders(slots);
    if (armed.length === 0) return nothing('failed', 'NOTHING_ARMED');
    // The time the SYSTEM settled on, not the one we hoped for.
    const nextAt = armed
      .map((a) => new Date(a.at))
      .filter((d) => d.getTime() > Date.now())
      .sort((a, b) => a.getTime() - b.getTime())[0] || null;
    return { status: 'armed', count: armed.length, nextAt };
  } catch (err) {
    // Scheduling failed outright — say so rather than claim a reminder the
    // user will never receive.
    return nothing('failed', String((err as Error)?.message || err || 'unknown'));
  }
}

/**
 * دور دهم — a reminder for a few minutes from now, through the very same alarm
 * path the daily reminder uses.
 *
 * «ارسال پیام آزمایشی» shows a notification immediately and never touches the
 * phone's scheduling at all, which is why it always worked and never proved
 * anything. This one is a real scheduled alarm: close the app, wait, and the
 * answer is unambiguous.
 */
export async function scheduleTestReminder(
  minutes: number,
  customMessage?: string
): Promise<{ status: 'armed' | 'failed' | 'no-permission' | 'browser'; at: Date | null }> {
  if (!isNativePlatform()) return { status: 'browser', at: null };
  if (getNotificationPermission() !== 'granted') {
    await refreshNotificationPermission();
    if (getNotificationPermission() !== 'granted') return { status: 'no-permission', at: null };
  }
  const channelId = await ensureChannel();
  try {
    const armed = await armSingleReminder({
      slot: TEST_REMINDER_SLOT,
      // Minutes from now — a duration, not a time of day. The wall-clock path
      // is the right tool for «هر روز ساعت ۹»، not for «۲ دقیقه بعد».
      inMinutes: minutes,
      hour: 0,
      minute: 0,
      title: NOTIFICATION_TITLE,
      body: resolveReminderMessage(customMessage),
      channelId,
    });
    if (!armed) return { status: 'failed', at: null };
    return { status: 'armed', at: new Date(armed.at) };
  } catch {
    return { status: 'failed', at: null };
  }
}

/** When our reminders actually fired — re-exported so the panel has one import. */
export { readDeliveryLog, type DeliveredReminder } from './reminderAlarm';

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
    // دور دهم — asked of the SYSTEM, not of our own bookkeeping.
    //
    // This used to read the Capacitor plugin's getPending(), which returns the
    // records that plugin saved for itself. That answers «did the app write
    // this down», not «is the phone holding an alarm» — so the card could say
    // «ثبت شده» about a reminder the phone knew nothing about. Now it is a
    // PendingIntent lookup against the alarm manager.
    const { count, nextAt } = await readArmedAlarms();

    let exactAllowed: boolean | null = null;
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const { exact_alarm } = await LocalNotifications.checkExactNotificationSetting();
      exactAllowed = exact_alarm === 'granted';
    } catch {
      exactAllowed = null;
    }

    return { supported: true, count, nextAt, exactAllowed };
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
  const channelId = await ensureChannel();

  // دور دهم — occasion notices carried the SAME wall-clock bug as the daily
  // reminder: ۹ صبح was converted to an instant here and converted back by
  // Android, so on a stale-tzdata ROM they would have drifted by the same hour.
  // They now go through the app's own alarm plugin, which is handed the hour
  // and the minute and works the moment out in the phone's own zone.
  const slots: ReminderSlot[] = [];
  for (let day = 0; day < OCCASION_WINDOW_DAYS; day++) {
    const body = noticesForDay(day);
    if (!body) continue;
    // «هر نوع اعلان، در هر روز حداکثر یک‌بار» — one entry per day, by slot.
    if (slots.length >= OCCASION_SLOT_COUNT) break;
    slots.push({
      slot: OCCASION_SLOT_BASE + slots.length,
      dayOffset: day,
      hour: OCCASION_HOUR,
      minute: 0,
      title: NOTIFICATION_TITLE,
      body,
      channelId,
    });
  }

  try {
    await armOccasionNotices(slots);
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
