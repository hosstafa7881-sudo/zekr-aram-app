import { useEffect, useRef, useState } from 'react';
import { DailyLog } from './db';
import {
  computeLifetimeTotal,
  computeStarCount,
  computeEarnedBadges,
  computeStreakDays,
  computeBestPreviousDayTotal,
  loadGamificationState,
  saveGamificationState,
  BADGE_LEVELS,
  BadgeLevel,
  CURRENT_BADGE_THRESHOLD_VERSION,
  RECORD_BROKEN_MESSAGE,
  RECORD_BROKEN_SHARE_TEXT,
} from './gamification';
import { toPersianDigits } from '../utils/persian';
import { useToast } from '../components/ToastProvider';
import { STAR_EARNED_MESSAGE, STREAK_MESSAGE } from './messages';

export interface PendingCelebration {
  emoji: string;
  message: string;
  shareText: string;
}

/**
 * Watches daily logs and fires star/medal/streak/record-break celebrations
 * exactly once each, persisted so reloads don't re-trigger old milestones.
 *
 * Three deliberately different presentations (مورد ۸):
 *  * ستاره → a toast only, anchored above the counter box by CounterView.
 *    Never a popup.
 *  * مدال → `medalEarned`, rendered as the dedicated MedalEarnedModal popup
 *    with its own tap guard. No toast at all for medals anymore.
 *  * رکورد شکسته‌شده → the existing CelebrationModal, unchanged in behaviour
 *    (only its wording changed, see مورد ۱۲).
 */
export function useGamificationEvents(dailyLogs: DailyLog[], todayDateKey: string) {
  const { showToast } = useToast();
  const [recordCelebration, setRecordCelebration] = useState<PendingCelebration | null>(null);
  const [medalEarned, setMedalEarned] = useState<BadgeLevel | null>(null);
  const [starEarnedToast, setStarEarnedToast] = useState<string | null>(null);
  const stateRef = useRef(loadGamificationState());

  useEffect(() => {
    const state = stateRef.current;
    const lifetimeTotal = computeLifetimeTotal(dailyLogs);
    const starCount = computeStarCount(lifetimeTotal);
    const earnedBadges = computeEarnedBadges(lifetimeTotal);
    const streak = computeStreakDays(dailyLogs, todayDateKey);
    const bestPrevious = computeBestPreviousDayTotal(dailyLogs, todayDateKey);
    const todayLog = dailyLogs.find((l) => l.dateKey === todayDateKey);
    const todayCount = todayLog?.totalCount || 0;

    const nextState = { ...state };
    let changed = false;

    // مورد ۹ — the medal thresholds changed to ۲۰۰۰/۱۰۰۰۰/۲۰۰۰۰. An existing
    // user's stored `lastSeenBadges` was recorded against the old values, so
    // re-derive it once from their real lifetime total and do NOT pop a
    // celebration for medals they already had (or "un-earn" them loudly).
    if (state.badgeThresholdVersion !== CURRENT_BADGE_THRESHOLD_VERSION) {
      nextState.lastSeenBadges = earnedBadges;
      nextState.badgeThresholdVersion = CURRENT_BADGE_THRESHOLD_VERSION;
      stateRef.current = nextState;
      saveGamificationState(nextState);
      return;
    }

    if (starCount > state.lastSeenStarCount) {
      setStarEarnedToast(STAR_EARNED_MESSAGE(toPersianDigits(starCount)));
      nextState.lastSeenStarCount = starCount;
      changed = true;
    }

    const newlyEarnedBadges = earnedBadges.filter((b) => !state.lastSeenBadges.includes(b));
    if (newlyEarnedBadges.length > 0) {
      // Only the highest newly-earned medal is announced — the lower ones are
      // replaced by it everywhere anyway (مورد ۹).
      const highestNew = [...BADGE_LEVELS]
        .reverse()
        .find((b) => newlyEarnedBadges.includes(b.id));
      if (highestNew) setMedalEarned(highestNew);
      nextState.lastSeenBadges = earnedBadges;
      changed = true;
    }

    if (streak >= 2 && state.lastStreakCelebratedDateKey !== todayDateKey) {
      showToast(STREAK_MESSAGE(toPersianDigits(streak)), {
        kind: 'celebration',
        durationMs: 4000,
      });
      nextState.lastStreakCelebratedDateKey = todayDateKey;
      changed = true;
    }

    if (bestPrevious > 0 && todayCount > bestPrevious && state.lastRecordCelebratedDateKey !== todayDateKey) {
      setRecordCelebration({
        emoji: '😍',
        message: RECORD_BROKEN_MESSAGE,
        shareText: RECORD_BROKEN_SHARE_TEXT,
      });
      nextState.lastRecordCelebratedDateKey = todayDateKey;
      changed = true;
    }

    if (changed) {
      stateRef.current = nextState;
      saveGamificationState(nextState);
    }
  }, [dailyLogs, todayDateKey, showToast]);

  return {
    medalEarned,
    dismissMedalEarned: () => setMedalEarned(null),
    recordCelebration,
    dismissRecordCelebration: () => setRecordCelebration(null),
    starEarnedToast,
    dismissStarEarnedToast: () => setStarEarnedToast(null),
  };
}
