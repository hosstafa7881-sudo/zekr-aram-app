import { useCallback, useState } from 'react';
import {
  getReferralLastUsed,
  getReferralNextEligibleDate,
  isReferralEligible,
  markReferralUsedNow,
  ReferralGrantResult,
} from './discounts';

/** Honor-system referral discount (بخش ت) — re-eligible every 180 days, no server check. */
export function useReferralDiscount() {
  const [, forceTick] = useState(0);

  const eligible = isReferralEligible();
  const nextEligibleDate = getReferralNextEligibleDate();
  const activatedAt = getReferralLastUsed();

  const claim = useCallback((): ReferralGrantResult => {
    const result = markReferralUsedNow();
    forceTick((n) => n + 1);
    return result;
  }, []);

  return { eligible, nextEligibleDate, activatedAt, claim };
}
