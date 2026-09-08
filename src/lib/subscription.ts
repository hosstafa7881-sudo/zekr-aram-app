// Trial + paywall logic. No real payment gateway is connected yet — `isProUser`
// is a local flag (persisted in UserSettings) that later plugs into a real
// payment provider. See NOTES.md for the integration plan.

export const TRIAL_DAYS = 30;
export const TRIAL_WARNING_DAYS = 5;

const TRIAL_START_KEY = 'zikraram_trial_start_v1';

export type LockedFeatureId =
  | 'tasbihat-arba'
  | 'tasbihat-zahra'
  | 'history-stats'
  | 'history-chart'
  | 'notebook'
  | 'color-palette'
  | 'day-night-mode'
  | 'remove-ads'
  | 'home-widget';

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
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getTrialDaysRemaining(): number {
  return Math.max(0, TRIAL_DAYS - getDaysSinceTrialStart());
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

export const TRIAL_WARNING_MESSAGE = (daysLeftLabel: string) =>
  `این امکان تا ${daysLeftLabel} روز دیگه به‌صورت رایگان در دسترسه. تا وقت داری، ازش لذت ببر! 🌿`;

export const TRIAL_ENDED_MESSAGE =
  'مدت ۳۰ روزه‌ی استفاده‌ی رایگان از این امکان تموم شده. با تهیه‌ی اشتراک ماهانه می‌تونی به استفاده از این قسمت ادامه بدی.';
