import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  LockedFeatureId,
  getFeatureLockState,
  getTrialDaysRemaining,
  wasWarningShownToday,
  markWarningShownToday,
  TRIAL_WARNING_MESSAGE,
  TRIAL_ENDED_MESSAGE,
} from './subscription';
import { formatFreeDaysLabel } from './useTrialGate';
import { useToast } from '../components/ToastProvider';
import { FeatureLockModal } from '../components/FeatureLockModal';

interface FeatureGateContextValue {
  isProUser: boolean;
  /** customLockedMessage overrides the generic "trial ended" text for this one call (e.g. re-locking a previously-created multi-stage dhikr). */
  guard: (featureId: LockedFeatureId, onAllowed: () => void, customLockedMessage?: string) => void;
}

const FeatureGateContext = createContext<FeatureGateContextValue | null>(null);

export function useFeatureGate(): FeatureGateContextValue {
  const ctx = useContext(FeatureGateContext);
  if (!ctx) throw new Error('useFeatureGate must be used within FeatureGateProvider');
  return ctx;
}

interface FeatureGateProviderProps {
  isProUser: boolean;
  todayDateKey: string;
  onRequestSubscribe: () => void;
  children: React.ReactNode;
}

export const FeatureGateProvider: React.FC<FeatureGateProviderProps> = ({
  isProUser,
  todayDateKey,
  onRequestSubscribe,
  children,
}) => {
  const { showToast } = useToast();
  const [lockedFeature, setLockedFeature] = useState<LockedFeatureId | null>(null);
  const [lockedMessage, setLockedMessage] = useState<string>(TRIAL_ENDED_MESSAGE);

  const guard = useCallback(
    (_featureId: LockedFeatureId, onAllowed: () => void, customLockedMessage?: string) => {
      const state = getFeatureLockState(isProUser);

      if (state === 'unlocked') {
        onAllowed();
        return;
      }

      if (state === 'warning') {
        if (!wasWarningShownToday(todayDateKey)) {
          showToast(TRIAL_WARNING_MESSAGE(formatFreeDaysLabel(getTrialDaysRemaining())), {
            kind: 'info',
            durationMs: 4200,
          });
          markWarningShownToday(todayDateKey);
        }
        onAllowed();
        return;
      }

      setLockedMessage(customLockedMessage || TRIAL_ENDED_MESSAGE);
      setLockedFeature(_featureId);
    },
    [isProUser, todayDateKey, showToast]
  );

  return (
    <FeatureGateContext.Provider value={{ isProUser, guard }}>
      {children}
      <FeatureLockModal
        isOpen={lockedFeature !== null}
        message={lockedMessage}
        onClose={() => setLockedFeature(null)}
        onSubscribe={() => {
          setLockedFeature(null);
          onRequestSubscribe();
        }}
      />
    </FeatureGateContext.Provider>
  );
};
