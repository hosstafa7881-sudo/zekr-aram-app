// Shared trial-badge logic for every locked-feature card in the app (تسبیحات
// اربعه، تسبیحات حضرت زهرا، ذکر چندمرحله‌ای دلخواه، ...). Previously each
// card decided its own badge ad-hoc and always rendered the "ویژه مشترکین"
// locked badge from day one, ignoring the actual trial countdown — a single
// shared hook here is the one place that decides "still free (X روز
// رایگانه)" vs "واقعاً قفل (ویژه مشترکین)" so every card stays consistent
// and correct as the trial progresses.
import { useEffect, useState } from 'react';
import { FeatureLockState, getFeatureLockState, getTrialDaysRemaining, TRIAL_DAYS } from './subscription';
import { toPersianDigits } from '../utils/persian';

export interface TrialGateInfo {
  state: FeatureLockState; // 'unlocked' | 'warning' | 'locked'
  daysRemaining: number;
  isLocked: boolean;
  /** "۳۰ روز رایگانه" on day one, "[عدد] روز دیگه رایگانه" afterwards — the one canonical wording used everywhere in the app. */
  freeDaysLabel: string;
}

export function formatFreeDaysLabel(daysRemaining: number): string {
  if (daysRemaining >= TRIAL_DAYS) return `${toPersianDigits(TRIAL_DAYS)} روز رایگانه`;
  return `${toPersianDigits(Math.max(0, daysRemaining))} روز دیگه رایگانه`;
}

export function getTrialGateInfo(isProUser: boolean): TrialGateInfo {
  const state = getFeatureLockState(isProUser);
  const daysRemaining = getTrialDaysRemaining();
  return {
    state,
    daysRemaining,
    isLocked: state === 'locked',
    freeDaysLabel: formatFreeDaysLabel(daysRemaining),
  };
}

/** React hook wrapper — re-renders periodically so a long-open tab's badges stay accurate as the trial countdown ticks over. */
export function useTrialGate(isProUser: boolean): TrialGateInfo {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return getTrialGateInfo(isProUser);
}
