import React from 'react';
import { Tag, X } from 'lucide-react';
import { toPersianDigits } from '../../utils/persian';
import {
  ActiveDiscountCode,
  COUNT_DISCOUNT_EXPLAINER,
  TIER_30_THRESHOLD,
  TIER_50_THRESHOLD,
} from '../../lib/discounts';
import { DiscountCodeCard } from './DiscountCodeCard';

interface CountDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCode: ActiveDiscountCode | null;
  cycleCount: number;
  cycleDaysLeft: number;
  onGoToPaywall: () => void;
}

/** «کد تخفیف ۳۰ و ۵۰ درصدی» button's modal — explainer before earning, active code + expiry after (بخش پ). */
export const CountDiscountModal: React.FC<CountDiscountModalProps> = ({
  isOpen,
  onClose,
  activeCode,
  cycleCount,
  cycleDaysLeft,
  onGoToPaywall,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--accent)]/40 rounded-3xl p-5 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 left-3 p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)]"
          aria-label="بستن"
        >
          <X className="w-4 h-4" />
        </button>

        {activeCode ? (
          <>
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/40 flex items-center justify-center text-[var(--accent)] mb-3">
              <Tag className="w-6 h-6" />
            </div>
            <DiscountCodeCard
              message="کد تخفیف فعال شما:"
              percent={activeCode.tier}
              code={activeCode.code}
              expiresAt={activeCode.expiresAt}
              primaryAction={{ label: 'تهیه اشتراک ماهانه', onClick: onGoToPaywall }}
              secondaryAction={{ label: 'رد کردن', onClick: onClose }}
            />
          </>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/40 flex items-center justify-center text-[var(--accent)] mb-3">
              <Tag className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[var(--text)] leading-relaxed mb-3">
              {COUNT_DISCOUNT_EXPLAINER}
            </p>
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-3 mb-4 text-xs text-[var(--muted)] tabular-nums-fa">
              در این دوره‌ی ۳۰ روزه تا الان{' '}
              <strong className="text-[var(--accent)]">{toPersianDigits(cycleCount)}</strong> ذکر گفته‌اید
              {cycleCount < TIER_30_THRESHOLD
                ? ` (${toPersianDigits(TIER_30_THRESHOLD - cycleCount)} ذکر دیگر تا ۳۰٪ تخفیف)`
                : cycleCount < TIER_50_THRESHOLD
                ? ` (${toPersianDigits(TIER_50_THRESHOLD - cycleCount)} ذکر دیگر تا ۵۰٪ تخفیف)`
                : ''}
              <br />
              {toPersianDigits(cycleDaysLeft)} روز از این دوره باقی مانده.
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
            >
              متوجه شدم
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
