import { useEffect, useState } from 'react';
import { DailyLog } from './db';
import {
  ActiveDiscountCode,
  CountDiscountState,
  TIER_30_THRESHOLD,
  TIER_50_THRESHOLD,
  computeCurrentCycleDhikrCount,
  getCurrentCycleIndex,
  getCurrentCycleDaysLeft,
  issueDiscountCode,
  loadCountDiscountState,
  saveCountDiscountState,
} from './discounts';

/**
 * Watches daily logs for the current 30-day discount cycle and issues/
 * replaces the 30%/50% dhikr-count discount code as thresholds are crossed,
 * exactly once per (cycle, tier) pair — mirroring useGamificationEvents'
 * "compute once per effect run, persist what's been shown" pattern.
 */
export function useCountDiscountEvents(dailyLogs: DailyLog[]) {
  const [state, setState] = useState<CountDiscountState>(loadCountDiscountState);
  const [justEarnedTier, setJustEarnedTier] = useState<30 | 50 | null>(null);

  useEffect(() => {
    const now = Date.now();
    const cycleIdx = getCurrentCycleIndex(now);
    let next = state;
    let changed = false;

    // Expire a spent/aged-out code.
    if (next.activeCode && now > next.activeCode.expiresAt) {
      next = { ...next, activeCode: null };
      changed = true;
    }

    const cycleCount = computeCurrentCycleDhikrCount(dailyLogs, now);
    const highestTier: 30 | 50 | null =
      cycleCount >= TIER_50_THRESHOLD ? 50 : cycleCount >= TIER_30_THRESHOLD ? 30 : null;

    if (highestTier) {
      const key = `${cycleIdx}-${highestTier}`;
      const alreadyAtThisOrHigherTier =
        next.activeCode?.tier === 50 || next.activeCode?.tier === highestTier;
      if (!alreadyAtThisOrHigherTier && next.celebratedForCycleTier !== key) {
        next = {
          activeCode: issueDiscountCode(highestTier, now),
          celebratedForCycleTier: key,
        };
        changed = true;
        setJustEarnedTier(highestTier);
      }
    }

    if (changed) {
      setState(next);
      saveCountDiscountState(next);
    }
    // Only re-run when the logs actually change — reading `state` here would
    // create an infinite loop since this effect itself updates it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyLogs]);

  const cycleCount = computeCurrentCycleDhikrCount(dailyLogs);
  const cycleDaysLeft = getCurrentCycleDaysLeft();

  const dismissEarnedCelebration = () => setJustEarnedTier(null);

  const refreshActiveCode = () => setState(loadCountDiscountState());

  return {
    activeCode: state.activeCode as ActiveDiscountCode | null,
    cycleCount,
    cycleDaysLeft,
    justEarnedTier,
    dismissEarnedCelebration,
    refreshActiveCode,
  };
}
