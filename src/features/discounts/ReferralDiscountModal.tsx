import React, { useEffect, useRef, useState } from 'react';
import { Gift, X } from 'lucide-react';
import { getShamsiDateInfo, toPersianDigits } from '../../utils/persian';
import { ReferralGrantResult, getFreeDaysLeft } from '../../lib/discounts';
import { StoryImageComposer } from './StoryImageComposer';

interface ReferralDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  eligible: boolean;
  /** When the code was last activated (null when never used). */
  activatedAt: number | null;
  nextEligibleDate: number | null;
  onClaim: () => ReferralGrantResult;
}

/**
 * دور ششم / مورد ۵ — for this long after a «دانلود تصویر آماده» /
 * «اشتراک‌گذاری مستقیم» press, the activation button is visibly disabled.
 * That window covers the moment the Android share sheet or the download bar
 * closes, which is when a stray click can be delivered to whatever is now
 * under the finger. Short enough that a real user never notices it — going
 * off to actually share the picture takes far longer than a second.
 */
const IMAGE_ACTION_GUARD_MS = 900;

function shamsi(timestamp: number): string {
  return getShamsiDateInfo(new Date(timestamp)).formattedFull;
}

/**
 * مورد ۱۷ — «کد تخفیف ۱۰۰ درصدی» window, fully rewritten. Two states:
 *   الف) before activation — how to introduce the app, the ready-made image,
 *        and the trust-based activation button.
 *   ب) after activation — when it was activated, when it can be used again
 *      (exactly 180 days later), how many free days are left, and the same
 *      image tools again.
 *
 * The underlying logic (honour system, once every 180 days) is unchanged; what
 * changed is the wording, the layout, and that the 30 days now stack on top of
 * whatever free time was left (مورد ۱۸).
 */
export const ReferralDiscountModal: React.FC<ReferralDiscountModalProps> = ({
  isOpen,
  onClose,
  eligible,
  activatedAt,
  nextEligibleDate,
  onClaim,
}) => {
  const [justClaimed, setJustClaimed] = useState<ReferralGrantResult | null>(null);
  // دور ششم / مورد ۵ — true for a moment after either picture button is
  // pressed. While it is true the activation button is really `disabled`, so
  // a stray click can't reach it AND the user can see why nothing happened.
  const [imageActionGuard, setImageActionGuard] = useState(false);
  const lastImageActionAt = useRef(0);
  const guardTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (guardTimer.current !== null) window.clearTimeout(guardTimer.current);
    },
    []
  );

  const noteImageAction = () => {
    lastImageActionAt.current = Date.now();
    setImageActionGuard(true);
    if (guardTimer.current !== null) window.clearTimeout(guardTimer.current);
    guardTimer.current = window.setTimeout(
      () => setImageActionGuard(false),
      IMAGE_ACTION_GUARD_MS
    );
  };

  if (!isOpen) return null;

  const handleClose = () => {
    setJustClaimed(null);
    onClose();
  };

  /**
   * دور ششم / مورد ۵ — the ONE and ONLY path that activates the ۱۰۰٪ code.
   * Closing the window, downloading the picture, sharing it, or coming back to
   * the app after sharing must never reach this.
   */
  const handleClaimClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (Date.now() - lastImageActionAt.current < IMAGE_ACTION_GUARD_MS) return;
    if (justClaimed) return; // already activated in this session of the window
    setJustClaimed(onClaim());
  };

  const isActivatedState = !!justClaimed || (!eligible && !!activatedAt);
  const activationTime = justClaimed?.activatedAt ?? activatedAt;
  const nextTime = justClaimed?.nextEligibleAt ?? nextEligibleDate;
  const freeDaysLeft = getFreeDaysLeft();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--accent)]/40 rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Always reachable, even when the content scrolls. */}
        <button
          type="button"
          onClick={handleClose}
          className="sticky top-0 float-left -mt-1 -ml-1 p-1.5 rounded-xl bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] z-10"
          aria-label="بستن"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 mx-auto rounded-2xl bg-[color-mix(in_oklab,var(--accent)_55%,teal_45%)]/15 border border-[color-mix(in_oklab,var(--accent)_55%,teal_45%)]/40 flex items-center justify-center text-[color-mix(in_oklab,var(--accent)_55%,teal_45%)] mb-3">
          <Gift className="w-6 h-6" />
        </div>

        {isActivatedState ? (
          <div data-testid="referral-state-activated" className="text-sm text-[var(--text)] leading-relaxed space-y-3 text-right">
            <p className="font-black text-base text-center">🎁 کد تخفیف ۱۰۰٪</p>

            {activationTime && (
              <p className="text-xs">
                کد تخفیف ۱۰۰٪ در تاریخ {shamsi(activationTime)} برات فعال شد 🎁
                <br />
                دفعه‌ی بعد، از {nextTime ? shamsi(nextTime) : ''} می‌تونی دوباره ازش استفاده کنی 🌹
              </p>
            )}

            {freeDaysLeft > 0 && (
              <p data-testid="referral-free-days" className="text-xs font-bold text-[var(--accent)]">
                از الان تا {toPersianDigits(freeDaysLeft)} روز دیگه، همه‌ی امکانات برنامه برات رایگانه 🌿
              </p>
            )}

            <p className="text-xs">
              اگه هنوز برنامه رو استوری نکردی یا توی گروه دوستانت به اشتراک نذاشتی، می‌تونی همین الان
              انجامش بدی 😊
            </p>

            <div className="pt-1 border-t border-[var(--border)]">
              <StoryImageComposer />
            </div>
          </div>
        ) : (
          <div data-testid="referral-state-before" className="text-sm text-[var(--text)] leading-relaxed space-y-3 text-right">
            <p className="font-black text-base text-center">
              🎁 یک ماه اشتراک کامل، هدیه‌ی معرفی ذکرآرام
            </p>

            <p className="text-xs">
              اگه ذکرآرام به دلت نشسته، توی شبکه‌های اجتماعی (به‌صورت استوری یا پست) یا حتی توی
              گروه‌های دوستانت معرفیش کن و یک ماه اشتراک کامل رو رایگان هدیه بگیر 🌿
            </p>

            <p className="text-xs font-bold">دو راه ساده داری:</p>

            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-3.5 space-y-3 text-xs">
              <div>
                <p className="font-bold">۱. معرفی با تجربه‌ی خودت</p>
                <p className="mt-0.5">
                  از یکی دو صفحه‌ی برنامه (مثلاً صفحه‌ی شمارش ذکر یا آماری که بهش رسیدی) اسکرین
                  بگیر، چند کلمه از تجربه‌ت بنویس و لینک دانلود برنامه رو هم کنارش بذار.
                </p>
              </div>
              <div>
                <p className="font-bold">۲. راه سریع‌تر</p>
                <p className="mt-0.5">
                  اگه وقت یا حوصله‌ش رو نداری، تصویر آماده‌ی برنامه رو از دکمه‌ی زیر دانلود کن و توی
                  استوری یا گروه‌های دوستانت منتشر کن 🌸
                </p>
              </div>
            </div>

            <StoryImageComposer onImageAction={noteImageAction} />

            <div className="pt-2 border-t border-[var(--border)] space-y-2">
              <p className="text-xs font-bold">ما به تو اعتماد داریم 🤍</p>
              <p className="text-xs">
                بعد از این‌که برنامه رو معرفی کردی، دکمه‌ی زیر رو بزن تا کد تخفیفت همین الان فعال
                بشه 🌸
              </p>
              <button
                type="button"
                data-testid="referral-claim-button"
                disabled={imageActionGuard}
                onClick={handleClaimClick}
                className="w-full py-3 rounded-2xl bg-[color-mix(in_oklab,var(--accent)_55%,teal_45%)] hover:bg-[color-mix(in_oklab,var(--accent-light)_55%,teal_45%)] disabled:opacity-60 text-white font-bold shadow-md transition-all"
              >
                معرفی کردم، فعالش کن
              </button>
            </div>

            <p className="text-[11px] text-[var(--muted)]">
              این هدیه هر ۱۸۰ روز یک‌بار قابل استفاده‌ست.
            </p>

            {/* حدیث — calm and respectful, deliberately without any emoji. */}
            <div className="pt-3 border-t border-[var(--border)] text-center space-y-1">
              <p className="text-[11px] text-[var(--muted)]">پیامبر اکرم (ص) فرمودند:</p>
              <p className="text-sm font-bold text-[var(--text)] leading-loose" dir="rtl">
                «الدَّالُّ عَلَى الْخَيْرِ كَفَاعِلِهِ»
              </p>
              <p className="text-[11px] text-[var(--muted)]/85 leading-relaxed">
                «کسی که به کار خیر راهنمایی کند، مانند انجام‌دهنده‌ی آن است.»
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
