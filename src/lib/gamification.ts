import { DailyLog } from './db';

export const DHIKR_PER_STAR = 100;

export interface BadgeLevel {
  id: 'bronze' | 'silver' | 'gold';
  threshold: number;
  emoji: string;
  label: string;
  earnedMessage: string;
  shareText: string;
}

export const BADGE_LEVELS: BadgeLevel[] = [
  {
    id: 'bronze',
    threshold: 2000,
    emoji: '🥉',
    label: 'مدال برنز',
    earnedMessage: 'تبریک! مدال برنز رو گرفتی 🥉 همینطور ادامه بده',
    shareText: 'مدال برنز ذکرآرام رو گرفتم 🥉 اگه دوست داری تو هم امتحانش کن 😍',
  },
  {
    id: 'silver',
    threshold: 10000,
    emoji: '🥈',
    label: 'مدال نقره',
    earnedMessage: 'تبریک! مدال نقره رو گرفتی 🥈 پیشرفتت عالیه',
    shareText: 'مدال نقره‌ی ذکرآرام رو گرفتم 🥈 اگه دوست داری تو هم امتحانش کن 😍',
  },
  {
    id: 'gold',
    threshold: 20000,
    emoji: '🥇',
    label: 'مدال طلا',
    earnedMessage: 'تبریک! به مدال طلا رسیدی 🥇 افتخارآفرینی کردی',
    shareText: 'مدال طلای ذکرآرام رو گرفتم 🥇 اگه دوست داری تو هم امتحانش کن 😍',
  },
];

export const RECORD_BROKEN_MESSAGE = 'تبریک می‌گم! امروز رکورد ذکر گفتنت رو شکستی 😍';
export const RECORD_BROKEN_SHARE_TEXT =
  'امروز رکورد ذکر گفتنم رو شکوندم 🎉 اگه بخوای تو هم می‌تونی امتحانش کنی.';

export function computeLifetimeTotal(dailyLogs: DailyLog[]): number {
  return dailyLogs.reduce((sum, log) => sum + (log.totalCount || 0), 0);
}

export function computeStarCount(lifetimeTotal: number): number {
  return Math.floor(lifetimeTotal / DHIKR_PER_STAR);
}

export function computeEarnedBadges(lifetimeTotal: number): BadgeLevel['id'][] {
  return BADGE_LEVELS.filter((b) => lifetimeTotal >= b.threshold).map((b) => b.id);
}

/**
 * مورد ۹ — ONLY the highest earned medal is ever displayed: silver replaces
 * bronze, gold replaces silver. Every surface that shows a medal (خانه،
 * شمارنده، ریزآمار، متن‌ها و تصاویر اشتراک‌گذاری) must go through this helper
 * rather than mapping over computeEarnedBadges, so the rule can never drift
 * apart between screens. Returns null when no medal has been earned yet.
 *
 * Medals are always derived from the lifetime dhikr total, so changing the
 * thresholds automatically re-evaluates a user's existing history — no stored
 * medal list to migrate.
 */
export function getTopBadge(lifetimeTotal: number): BadgeLevel | null {
  let top: BadgeLevel | null = null;
  for (const badge of BADGE_LEVELS) {
    if (lifetimeTotal >= badge.threshold) top = badge;
  }
  return top;
}

/** Consecutive days (including today) with totalCount > 0, walking backward from today. */
export function computeStreakDays(dailyLogs: DailyLog[], todayDateKey: string): number {
  const countByKey = new Map(dailyLogs.map((l) => [l.dateKey, l.totalCount]));
  let streak = 0;
  const cursor = new Date(todayDateKey + 'T00:00:00');

  while (true) {
    const key = toDateKey(cursor);
    const count = countByKey.get(key) || 0;
    if (count <= 0) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Best day total strictly before today (excludes today itself). */
export function computeBestPreviousDayTotal(dailyLogs: DailyLog[], todayDateKey: string): number {
  return dailyLogs
    .filter((l) => l.dateKey !== todayDateKey)
    .reduce((max, l) => Math.max(max, l.totalCount || 0), 0);
}

export interface GamificationState {
  lastSeenStarCount: number;
  lastSeenBadges: BadgeLevel['id'][];
  lastStreakCelebratedDateKey: string | null;
  lastRecordCelebratedDateKey: string | null;
  /**
   * Which generation of medal thresholds `lastSeenBadges` was recorded
   * against. Bumped to 2 when the thresholds changed to ۲۰۰۰/۱۰۰۰۰/۲۰۰۰۰
   * (مورد ۹): an existing user's stored list was computed with the old
   * ۱۰۰۰/۵۰۰۰/۱۰۰۰۰ values, so it is silently re-derived from their real
   * lifetime total once, WITHOUT popping celebration modals for medals they
   * already knew about.
   */
  badgeThresholdVersion: number;
}

const STATE_KEY = 'zikraram_gamification_v1';

export const CURRENT_BADGE_THRESHOLD_VERSION = 2;

export const DEFAULT_GAMIFICATION_STATE: GamificationState = {
  lastSeenStarCount: 0,
  lastSeenBadges: [],
  lastStreakCelebratedDateKey: null,
  lastRecordCelebratedDateKey: null,
  badgeThresholdVersion: CURRENT_BADGE_THRESHOLD_VERSION,
};

export function loadGamificationState(): GamificationState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return DEFAULT_GAMIFICATION_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_GAMIFICATION_STATE,
      // A save written before the threshold change has no version field at
      // all — treat it as generation 1 so the migration below runs once.
      badgeThresholdVersion: 1,
      ...parsed,
    };
  } catch {
    return DEFAULT_GAMIFICATION_STATE;
  }
}

export function saveGamificationState(state: GamificationState) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota issues
  }
}
