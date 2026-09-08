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
 * Watches daily logs and fires star/badge/streak/record-break celebrations
 * exactly once each, persisted so reloads don't re-trigger old milestones.
 */
export function useGamificationEvents(dailyLogs: DailyLog[], todayDateKey: string) {
  const { showToast } = useToast();
  const [celebrationQueue, setCelebrationQueue] = useState<PendingCelebration[]>([]);
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
    const newCelebrations: PendingCelebration[] = [];

    if (starCount > state.lastSeenStarCount) {
      showToast(STAR_EARNED_MESSAGE(toPersianDigits(starCount)), {
        kind: 'celebration',
        durationMs: 4000,
      });
      nextState.lastSeenStarCount = starCount;
      changed = true;
    }

    const newlyEarnedBadges = earnedBadges.filter((b) => !state.lastSeenBadges.includes(b));
    if (newlyEarnedBadges.length > 0) {
      newlyEarnedBadges.forEach((badgeId) => {
        const badge = BADGE_LEVELS.find((b) => b.id === badgeId) as BadgeLevel;
        newCelebrations.push({ emoji: badge.emoji, message: badge.earnedMessage, shareText: badge.shareText });
      });
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
      newCelebrations.push({ emoji: '❤️', message: RECORD_BROKEN_MESSAGE, shareText: RECORD_BROKEN_SHARE_TEXT });
      nextState.lastRecordCelebratedDateKey = todayDateKey;
      changed = true;
    }

    if (changed) {
      stateRef.current = nextState;
      saveGamificationState(nextState);
    }
    if (newCelebrations.length > 0) {
      setCelebrationQueue((prev) => [...prev, ...newCelebrations]);
    }
  }, [dailyLogs, todayDateKey, showToast]);

  const currentCelebration = celebrationQueue[0] || null;
  const dismissCelebration = () => setCelebrationQueue((prev) => prev.slice(1));

  return { currentCelebration, dismissCelebration };
}
