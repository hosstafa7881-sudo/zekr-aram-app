import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  LockedFeatureId,
  getFeatureLockState,
  getTrialDaysRemaining,
  wasWarningShownToday,
  markWarningShownToday,
  TRIAL_WARNING_MESSAGE,
} from './subscription';
import { toPersianDigits } from '../utils/persian';
import { useToast } from '../components/ToastProvider';
import { FeatureLockModal } from '../components/FeatureLockModal';

interface FeatureGateContextValue {
  isProUser: boolean;
  guard: (featureId: LockedFeatureId, onAllowed: () => void) => void;
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

  const guard = useCallback(
    (_featureId: LockedFeatureId, onAllowed: () => void) => {
      const state = getFeatureLockState(isProUser);

      if (state === 'unlocked') {
        onAllowed();
        return;
      }

      if (state === 'warning') {
        if (!wasWarningShownToday(todayDateKey)) {
          showToast(TRIAL_WARNING_MESSAGE(toPersianDigits(getTrialDaysRemaining())), {
            kind: 'info',
            durationMs: 4200,
          });
          markWarningShownToday(todayDateKey);
        }
        onAllowed();
        return;
      }

      setLockedFeature(_featureId);
    },
    [isProUser, todayDateKey, showToast]
  );

  return (
    <FeatureGateContext.Provider value={{ isProUser, guard }}>
      {children}
      <FeatureLockModal
        isOpen={lockedFeature !== null}
        onClose={() => setLockedFeature(null)}
        onSubscribe={() => {
          setLockedFeature(null);
          onRequestSubscribe();
        }}
      />
    </FeatureGateContext.Provider>
  );
};
