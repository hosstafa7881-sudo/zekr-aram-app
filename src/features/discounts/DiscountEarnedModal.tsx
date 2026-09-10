import React from 'react';
import { PartyPopper } from 'lucide-react';
import { ActiveDiscountCode, TIER_EARNED_MESSAGE } from '../../lib/discounts';
import { DiscountCodeCard } from './DiscountCodeCard';

interface DiscountEarnedModalProps {
  isOpen: boolean;
  activeCode: ActiveDiscountCode;
  onGoToPaywall: () => void;
  onDismiss: () => void;
}

/** Automatic celebration popup fired the moment the 5,000/20,000 dhikr threshold is crossed (بخش پ). */
export const DiscountEarnedModal: React.FC<DiscountEarnedModalProps> = ({
  isOpen,
  activeCode,
  onGoToPaywall,
  onDismiss,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--accent)]/40 rounded-3xl p-6 shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/40 flex items-center justify-center text-[var(--accent)] mb-3">
          <PartyPopper className="w-7 h-7" />
        </div>
        <DiscountCodeCard
          message={TIER_EARNED_MESSAGE(activeCode.tier)}
          percent={activeCode.tier}
          code={activeCode.code}
          expiresAt={activeCode.expiresAt}
          primaryAction={{ label: 'تهیه اشتراک ماهانه', onClick: onGoToPaywall }}
          secondaryAction={{ label: 'رد کردن', onClick: onDismiss }}
        />
      </div>
    </div>
  );
};
