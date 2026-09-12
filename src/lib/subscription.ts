// Trial + paywall logic. No real payment gateway is connected yet — `isProUser`
// is a local flag (persisted in UserSettings) that later plugs into a real
// payment provider. See NOTES.md for the integration plan.

export const TRIAL_DAYS = 30;
export const TRIAL_WARNING_DAYS = 5;

const TRIAL_START_KEY = 'zikraram_trial_start_v1';

// مورد ۱۸ — the ۱۰۰٪ referral code no longer grants a separate 30-day "Pro"
// window that runs in parallel with the trial. Instead it pushes the END of
// the user's free access forward by 30 days, and this absolute timestamp is
// the single place that extension is stored. Everything about locking,
// countdown labels and the "۵ روز مانده" warning then keeps flowing through
// the one shared useTrialGate hook — no second, parallel notion of "free
// until" anywhere in the app.
const FREE_EXTENSION_KEY = 'zikraram_free_extension_until_v1';
const DAY_MS = 24 * 60 * 60 * 1000;

export type LockedFeatureId =
  | 'tasbihat-arba'
  | 'tasbihat-zahra'
  | 'history-stats'
  | 'history-chart'
  | 'notebook'
  | 'color-palette'
  | 'day-night-mode'
  | 'remove-ads'
  | 'home-widget'
  | 'multistage-dhikr';

export const ALWAYS_FREE_DHIKR_IDS = new Set<string>([]);
export const LOCKED_DHIKR_IDS: Record<string, LockedFeatureId> = {
  'tasbihat-arba': 'tasbihat-arba',
  'tasbihat-zahra': 'tasbihat-zahra',
};

export function getTrialStartDate(): number {
  try {
    const raw = localStorage.getItem(TRIAL_START_KEY);
    if (raw) return parseInt(raw, 10);
    const now = Date.now();
    localStorage.setItem(TRIAL_START_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

export function getDaysSinceTrialStart(): number {
  const start = getTrialStartDate();
  const diffMs = Date.now() - start;
  return Math.floor(diffMs / DAY_MS);
}

/** Plain 30-day trial end, ignoring any ۱۰۰٪-code extension. */
export function getTrialEndDate(): number {
  return getTrialStartDate() + TRIAL_DAYS * DAY_MS;
}

/** The ۱۰۰٪-code extension timestamp, or null when the code was never used. */
export function getFreeExtensionUntil(): number | null {
  try {
    const raw = localStorage.getItem(FREE_EXTENSION_KEY);
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setFreeExtensionUntil(timestamp: number | null) {
  try {
    if (timestamp === null) localStorage.removeItem(FREE_EXTENSION_KEY);
    else localStorage.setItem(FREE_EXTENSION_KEY, String(timestamp));
  } catch {
    // Ignore
  }
}

/** True when the user's free window has been pushed out by the ۱۰۰٪ code. */
export function hasFreeExtension(): boolean {
  const until = getFreeExtensionUntil();
  return until !== null && until > getTrialEndDate();
}

/** When the user's free access actually ends — the later of the plain trial end and any ۱۰۰٪-code extension. */
export function getEffectiveFreeEndDate(): number {
  const trialEnd = getTrialEndDate();
  const extension = getFreeExtensionUntil();
  return extension && extension > trialEnd ? extension : trialEnd;
}

/**
 * مورد ۱۸ — adds `days` to the CURRENT end of free access (never to "today"
 * when there is still time left), and returns the new end date. If the free
 * window has already run out, the new window starts from today instead.
 */
export function extendFreeAccessByDays(days: number, now = Date.now()): number {
  const currentEnd = Math.max(now, getEffectiveFreeEndDate());
  const nextEnd = currentEnd + days * DAY_MS;
  setFreeExtensionUntil(nextEnd);
  return nextEnd;
}

export function getTrialDaysRemaining(): number {
  return Math.max(0, Math.ceil((getEffectiveFreeEndDate() - Date.now()) / DAY_MS));
}

export type FeatureLockState = 'unlocked' | 'warning' | 'locked';

export function getFeatureLockState(isProUser: boolean): FeatureLockState {
  if (isProUser) return 'unlocked';
  const remaining = getTrialDaysRemaining();
  if (remaining <= 0) return 'locked';
  if (remaining <= TRIAL_WARNING_DAYS) return 'warning';
  return 'unlocked';
}

const WARNING_SHOWN_KEY = 'zikraram_trial_warning_shown_v1';

export function wasWarningShownToday(dateKey: string): boolean {
  try {
    return localStorage.getItem(WARNING_SHOWN_KEY) === dateKey;
  } catch {
    return false;
  }
}

export function markWarningShownToday(dateKey: string) {
  try {
    localStorage.setItem(WARNING_SHOWN_KEY, dateKey);
  } catch {
    // Ignore
  }
}

export const TRIAL_WARNING_MESSAGE = (freeDaysLabel: string) =>
  `این امکان ${freeDaysLabel}. تا وقت داری، ازش لذت ببر! 🌿`;

export const TRIAL_ENDED_MESSAGE =
  'مدت ۳۰ روزه‌ی استفاده‌ی رایگان از این امکان تموم شده. با تهیه‌ی اشتراک ماهانه می‌تونی به استفاده از این قسمت ادامه بدی.';
