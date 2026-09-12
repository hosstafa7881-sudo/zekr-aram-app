// Local daily-reminder notifications using the browser Notification API.
//
// LIMITATION: this is a PWA, not a native app. The Notification API only
// fires while this tab/PWA window is open (or very recently active) in most
// mobile browsers — there is no reliable background scheduling without a
// push server. This checks the reminder time once per minute while the app
// is open. When this project is later wrapped with Capacitor for Android,
// replace this module with the Capacitor Local Notifications plugin, which
// can schedule truly reliable OS-level notifications even when the app is
// closed. See NOTES.md.

export const REMINDER_MESSAGE =
  'امروز هنوز ذکری نگفتی، می‌خوای با گفتن ذکر، بیشتر به یاد خدا باشی؟ 📿';

/** مورد ۲۰ — a custom reminder has to fit inside a phone notification. */
export const REMINDER_MESSAGE_MAX_LENGTH = 100;

/** The message the user will actually see: their own wording when they wrote one, otherwise the default. */
export function resolveReminderMessage(customMessage?: string | null): string {
  const trimmed = (customMessage || '').trim();
  return trimmed.length > 0 ? trimmed : REMINDER_MESSAGE;
}

/** مورد ۲۰ — «ارسال پیام آزمایشی»: shows one sample notification right now. */
export async function sendTestNotification(message: string): Promise<'sent' | 'denied' | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  let permission = getNotificationPermission();
  if (permission !== 'granted') {
    permission = await requestNotificationPermission();
  }
  if (permission !== 'granted') return 'denied';
  try {
    new Notification('ذکرآرام', { body: message, icon: 'icon.svg' });
    return 'sent';
  } catch {
    return 'denied';
  }
}

const LAST_NOTIFIED_KEY = 'zikraram_reminder_last_notified_v1';

// In-memory backstop alongside the localStorage flag below. If the
// localStorage write ever silently fails (private-browsing storage limits,
// quota pressure from years of unlimited daily-log history, etc.), the
// once-per-day guard would never persist and this 60-second interval
// (see useDailyReminder.ts) would fire a brand-new `Notification()` — with
// its own system sound — every single minute for as long as the reminder
// stays past due. This is the most concrete, reproducible explanation we
// could find in the code for a real-device report of a repeating
// notification-like sound; the in-memory flag guarantees at most one real
// Notification per calendar day per page load even if storage is broken.
let firedInMemoryForDateKey: string | null = null;

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

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
 * Checks whether it's time to fire the daily reminder and does so if all
 * conditions hold. Call this roughly once a minute while the app is open.
 */
export function maybeFireDailyReminder(options: {
  reminderEnabled: boolean;
  reminderTime: string; // "HH:MM"
  todayDateKey: string;
  todayHasAnyDhikr: boolean;
  /** The user's own wording, when they wrote one (مورد ۲۰). */
  customMessage?: string;
}) {
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
      new Notification('ذکرآرام', {
        body: resolveReminderMessage(customMessage),
        icon: 'icon.svg',
      });
    } catch {
      // Ignore — some browsers disallow direct `new Notification` in certain contexts
    }
    markNotifiedToday(todayDateKey);
  }
}
