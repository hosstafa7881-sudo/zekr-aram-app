import React from 'react';
import { Tag, Gift } from 'lucide-react';
import { toPersianDigits } from '../../utils/persian';
import { ActiveDiscountCode } from '../../lib/discounts';
import { FEATURES } from '../../config/features';

interface DiscountButtonsRowProps {
  activeCountDiscount: ActiveDiscountCode | null;
  onOpenCountDiscount: () => void;
  onOpenReferralDiscount: () => void;
  className?: string;
}

/** The two side-by-side discount entry points (بخش ث) — same green family, distinct tones, distinct icons, always shown together on Home and Counter. */
export const DiscountButtonsRow: React.FC<DiscountButtonsRowProps> = ({
  activeCountDiscount,
  onOpenCountDiscount,
  onOpenReferralDiscount,
  className = '',
}) => {
  // دور دهم — while the ۱۰۰٪ code is switched off for the Cafe Bazaar
  // submission, the remaining button takes the whole width rather than leaving
  // an empty half-row where the other one used to be.
  const showReferral = FEATURES.referralDiscount;
  return (
    <div
      data-testid="discount-buttons-row"
      className={`grid ${showReferral ? 'grid-cols-2' : 'grid-cols-1'} gap-2 ${className}`}
    >
      <button
        type="button"
        onClick={onOpenCountDiscount}
        className="flex items-center justify-center gap-1.5 h-11 px-2.5 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-xs font-bold shadow-sm transition-all"
      >
        <Tag className="w-4 h-4 shrink-0" />
        <span className="truncate">
          {activeCountDiscount
            ? `کد ${toPersianDigits(activeCountDiscount.tier)}٪ فعال`
            : 'کد تخفیف ۳۰ و ۵۰ درصدی'}
        </span>
      </button>

      {showReferral && (
        <button
          type="button"
          data-testid="discount-referral-button"
          onClick={onOpenReferralDiscount}
          className="flex items-center justify-center gap-1.5 h-11 px-2.5 rounded-2xl text-white text-xs font-bold shadow-sm transition-all bg-[color-mix(in_oklab,var(--accent)_55%,teal_45%)] hover:bg-[color-mix(in_oklab,var(--accent-light)_55%,teal_45%)]"
        >
          <Gift className="w-4 h-4 shrink-0" />
          <span className="truncate">کد تخفیف ۱۰۰ درصدی</span>
        </button>
      )}
    </div>
  );
};
