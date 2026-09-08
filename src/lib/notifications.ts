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

const LAST_NOTIFIED_KEY = 'zikraram_reminder_last_notified_v1';

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
}) {
  const { reminderEnabled, reminderTime, todayDateKey, todayHasAnyDhikr } = options;
  if (!reminderEnabled) return;
  if (todayHasAnyDhikr) return;
  if (getNotificationPermission() !== 'granted') return;
  if (wasNotifiedToday(todayDateKey)) return;

  const [hh, mm] = reminderTime.split(':').map((v) => parseInt(v, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return;

  const now = new Date();
  const reminderMinutes = hh * 60 + mm;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (nowMinutes >= reminderMinutes) {
    try {
      new Notification('ذکرآرام', {
        body: REMINDER_MESSAGE,
        icon: 'icon.svg',
      });
    } catch {
      // Ignore — some browsers disallow direct `new Notification` in certain contexts
    }
    markNotifiedToday(todayDateKey);
  }
}
