import React from 'react';
import { Tag, Gift } from 'lucide-react';
import { toPersianDigits } from '../../utils/persian';
import { ActiveDiscountCode } from '../../lib/discounts';

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
  return (
    <div data-testid="discount-buttons-row" className={`grid grid-cols-2 gap-2 ${className}`}>
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

      <button
        type="button"
        onClick={onOpenReferralDiscount}
        className="flex items-center justify-center gap-1.5 h-11 px-2.5 rounded-2xl text-white text-xs font-bold shadow-sm transition-all bg-[color-mix(in_oklab,var(--accent)_55%,teal_45%)] hover:bg-[color-mix(in_oklab,var(--accent-light)_55%,teal_45%)]"
      >
        <Gift className="w-4 h-4 shrink-0" />
        <span className="truncate">کد تخفیف ۱۰۰ درصدی</span>
      </button>
    </div>
  );
};
