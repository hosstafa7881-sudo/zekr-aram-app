import React, { useState } from 'react';
import { Gift, X } from 'lucide-react';
import { getShamsiDateInfo } from '../../utils/persian';
import { REFERRAL_ALREADY_USED_MESSAGE, ReferralGrantResult } from '../../lib/discounts';
import { DiscountCodeCard } from './DiscountCodeCard';

interface ReferralDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  eligible: boolean;
  nextEligibleDate: number | null;
  onClaim: () => ReferralGrantResult;
}

/** «کد تخفیف ۱۰۰ درصدی» button's modal — share-the-app honor system, 180-day cooldown (بخش ت). */
export const ReferralDiscountModal: React.FC<ReferralDiscountModalProps> = ({
  isOpen,
  onClose,
  eligible,
  nextEligibleDate,
  onClaim,
}) => {
  const [claimedResult, setClaimedResult] = useState<ReferralGrantResult | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setClaimedResult(null);
    onClose();
  };

  const handleClaim = () => {
    setClaimedResult(onClaim());
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--accent)]/40 rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 left-3 p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)]"
          aria-label="بستن"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 mx-auto rounded-2xl bg-[color-mix(in_oklab,var(--accent)_55%,teal_45%)]/15 border border-[color-mix(in_oklab,var(--accent)_55%,teal_45%)]/40 flex items-center justify-center text-[color-mix(in_oklab,var(--accent)_55%,teal_45%)] mb-3">
          <Gift className="w-6 h-6" />
        </div>

        {claimedResult ? (
          <DiscountCodeCard
            message="یک ماه اشتراک کامل رایگان برای شما فعال شد 🎁"
            percent={100}
            code={claimedResult.code}
            expiresAt={claimedResult.proGrantExpiresAt}
            secondaryAction={{ label: 'متوجه شدم', onClick: handleClose }}
          />
        ) : !eligible ? (
          <p className="text-sm font-bold text-[var(--text)] leading-relaxed text-center">
            {REFERRAL_ALREADY_USED_MESSAGE(
              nextEligibleDate ? getShamsiDateInfo(new Date(nextEligibleDate)).formattedFull : ''
            )}
          </p>
        ) : (
          <div className="text-sm text-[var(--text)] leading-relaxed space-y-3 text-center">
            <p className="font-black text-base">یک ماه اشتراک، کاملاً رایگان 🎁</p>
            <p>با معرفی ذکرآرام به اطرافیانتون، یک ماه اشتراک کامل رایگان بگیرید!</p>
            <div className="text-right bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-3.5 space-y-2 text-xs">
              <p>۱. یکی‌دو اسکرین‌شات از برنامه بگیرید (مثلاً از صفحه‌ی شمارش ذکرتون یا آماری که بهش رسیدید)</p>
              <p>۲. توی استوری یا یکی از گروه‌هاتون به اشتراک بذارید، همراه با نظر خودتون درباره‌ی برنامه و لینک دانلود از بازار/مایکت</p>
              <p>۳. دکمه‌ی پایین رو بزنید تا کد تخفیفتون فعال بشه</p>
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              با کلیک روی دکمه‌ی زیر، تأیید می‌کنین که این برنامه رو به اشتراک گذاشتین. کد تخفیفتون همین الان فعال میشه.
            </p>
            <button
              type="button"
              onClick={handleClaim}
              className="w-full py-3 rounded-2xl bg-[color-mix(in_oklab,var(--accent)_55%,teal_45%)] hover:bg-[color-mix(in_oklab,var(--accent-light)_55%,teal_45%)] text-white font-bold shadow-md transition-all"
            >
              به اشتراک گذاشتم ✅
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
