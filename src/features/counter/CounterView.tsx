import React, { useState, useEffect, useCallback } from 'react';
import { DhikrItem, TargetMode } from '../../lib/seedData';
import { UserSettings, DailyLog } from '../../lib/db';
import {
  toPersianDigits,
  stripArabicDiacritics,
} from '../../utils/persian';
import {
  triggerVibration,
  playTasbihBeadClick,
  playTargetReachedChime,
} from '../../lib/haptics';
import { computeLifetimeTotal, computeStarCount, computeEarnedBadges, BADGE_LEVELS } from '../../lib/gamification';
import { shareText } from '../../components/ShareStoreLinks';
import { useToast } from '../../components/ToastProvider';
import { TARGET_REACHED_MESSAGE } from '../../lib/messages';
import { HoldResetButton } from './HoldResetButton';
import { TasbihatStageBar, getTasbihatStageDetail } from './TasbihatStageBar';
import { CustomStageBar } from './CustomStageBar';
import { getCustomStageDetail } from './customStageHelpers';
import { TargetConfigModal } from './TargetConfigModal';
import { DiscountButtonsRow } from '../discounts/DiscountButtonsRow';
import { ActiveDiscountCode } from '../../lib/discounts';
import {
  Minus,
  Target,
  BookOpen,
  Volume2,
  VolumeX,
  Vibrate,
  Star,
  Share2,
} from 'lucide-react';

interface CounterViewProps {
  activeDhikr: DhikrItem;
  dailyLogs: DailyLog[];
  settings: UserSettings;
  onIncrement: (delta: number) => void;
  onReset: () => void;
  onUpdateTarget: (newTarget: number, newMode: TargetMode) => void;
  onToggleSetting: (key: keyof UserSettings) => void;
  onOpenLibraryModal: () => void;
  /** Star-earned celebration message, anchored above the counter box instead of the global top-of-screen toast (see App.tsx's useGamificationEvents wiring). */
  starEarnedToast?: string | null;
  onDismissStarEarnedToast?: () => void;
  activeCountDiscount: ActiveDiscountCode | null;
  onOpenCountDiscount: () => void;
  onOpenReferralDiscount: () => void;
}

export const CounterView: React.FC<CounterViewProps> = ({
  activeDhikr,
  dailyLogs,
  settings,
  onIncrement,
  onReset,
  onUpdateTarget,
  onToggleSetting,
  onOpenLibraryModal,
  starEarnedToast,
  onDismissStarEarnedToast,
  activeCountDiscount,
  onOpenCountDiscount,
  onOpenReferralDiscount,
}) => {
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [tapRipple, setTapRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const [milestoneBanner, setMilestoneBanner] = useState<string | null>(null);
  const { showToast } = useToast();

  // Auto-dismiss the locally-anchored star toast after the same duration the
  // global toast used to use.
  useEffect(() => {
    if (!starEarnedToast) return;
    const id = window.setTimeout(() => onDismissStarEarnedToast?.(), 4000);
    return () => window.clearTimeout(id);
  }, [starEarnedToast, onDismissStarEarnedToast]);

  const lifetimeTotal = computeLifetimeTotal(dailyLogs);
  const starCount = computeStarCount(lifetimeTotal);
  const earnedBadges = computeEarnedBadges(lifetimeTotal);
  const hasAnyAchievement = starCount > 0 || earnedBadges.length > 0;
  const starLabel = starCount < 10 ? '⭐'.repeat(starCount) : `${toPersianDigits(starCount)} ⭐`;

  const handleShareAchievement = () => {
    const topBadge = [...BADGE_LEVELS].reverse().find((b) => earnedBadges.includes(b.id));
    if (!topBadge) return;
    shareText(topBadge.shareText, () =>
      showToast('متن اشتراک‌گذاری در حافظهٔ موقت کپی شد.', { kind: 'success' })
    );
  };

  // Determine displayed Arabic text (with or without diacritics)
  const displayedArabicText = settings.showDiacritics
    ? activeDhikr.arabicText
    : stripArabicDiacritics(activeDhikr.arabicText);

  // Progress calculation
  const rawProgress =
    activeDhikr.target > 0
      ? Math.min(100, (activeDhikr.count / activeDhikr.target) * 100)
      : 0;

  // Handle +1 Tap
  const handleTapIncrement = useCallback(
    (e?: React.MouseEvent | React.TouchEvent | KeyboardEvent) => {
      // Check if target mode is 'stop' and already reached
      if (
        activeDhikr.targetMode === 'stop' &&
        activeDhikr.count >= activeDhikr.target
      ) {
        triggerVibration([40, 40, 40], settings.vibrationEnabled, 'medium');
        setMilestoneBanner('ختم این ذکر به پایان رسیده است. برای شروع مجدد، شمارنده را صفر کنید.');
        setTimeout(() => setMilestoneBanner(null), 3200);
        return;
      }

      const nextCount = activeDhikr.count + 1;

      // Visual ripple feedback
      if (e && 'clientX' in e) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setTapRipple({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          id: Date.now(),
        });
      }

      // Check special Tasbihat Hazrat Zahra stage transitions (34 -> 35, 67 -> 68, 100)
      if (activeDhikr.isTasbihatZahra) {
        if (nextCount === 34) {
          triggerVibration([50, 50, 80], settings.vibrationEnabled, 'strong');
          playTargetReachedChime(settings.soundEnabled);
          setMilestoneBanner('مرحله اول (۳۴ الله اکبر) تمام شد • ورود به مرحله الحمدلله');
          setTimeout(() => setMilestoneBanner(null), 3200);
        } else if (nextCount === 67) {
          triggerVibration([50, 50, 80], settings.vibrationEnabled, 'strong');
          playTargetReachedChime(settings.soundEnabled);
          setMilestoneBanner('مرحله دوم (۳۳ الحمدلله) تمام شد • ورود به مرحله سبحان‌الله');
          setTimeout(() => setMilestoneBanner(null), 3200);
        } else if (nextCount === 100) {
          triggerVibration([90, 60, 120, 60, 140], settings.vibrationEnabled, 'strong');
          playTargetReachedChime(settings.soundEnabled);
          setMilestoneBanner('تسبیحات حضرت زهرا (س) با موفقیت کامل شد. قبول باشد! 🙏');
          setTimeout(() => setMilestoneBanner(null), 4000);
        } else {
          triggerVibration(12, settings.vibrationEnabled, settings.vibrationIntensity);
          playTasbihBeadClick(settings.soundEnabled);
        }
      } else {
        // Normal dhikr target check
        const reachedTarget =
          activeDhikr.target > 0 && nextCount === activeDhikr.target;
        const reachedMultipleOfTarget =
          activeDhikr.target > 0 &&
          nextCount > 0 &&
          nextCount % activeDhikr.target === 0;

        if (reachedTarget || reachedMultipleOfTarget) {
          triggerVibration([80, 60, 130], settings.vibrationEnabled, 'strong');
          playTargetReachedChime(settings.soundEnabled);
          setMilestoneBanner(TARGET_REACHED_MESSAGE(toPersianDigits(nextCount)));
          setTimeout(() => setMilestoneBanner(null), 3500);
        } else {
          triggerVibration(12, settings.vibrationEnabled, settings.vibrationIntensity);
          playTasbihBeadClick(settings.soundEnabled);
        }
      }

      onIncrement(1);
    },
    [activeDhikr, onIncrement, settings]
  );

  // Keyboard shortcuts (Space / ArrowUp for +1, ArrowDown for -1)
  useEffect(() => {
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (isTargetModalOpen) return;
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (ev.code === 'Space' || ev.code === 'ArrowUp') {
        ev.preventDefault();
        handleTapIncrement(ev);
      } else if (ev.code === 'ArrowDown') {
        ev.preventDefault();
        if (activeDhikr.count > 0) {
          onIncrement(-1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTapIncrement, activeDhikr.count, onIncrement, isTargetModalOpen]);

  // SVG Ring calculation
  const circleRadius = 112;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const circleDashoffset =
    circleCircumference - (rawProgress / 100) * circleCircumference;

  const tasbihatStage = activeDhikr.isTasbihatZahra
    ? getTasbihatStageDetail(activeDhikr.count)
    : null;
  const hasCustomStages = !!activeDhikr.customStages && activeDhikr.customStages.length > 0;
  const customStage =
    hasCustomStages && activeDhikr.customStages
      ? getCustomStageDetail(activeDhikr.customStages, activeDhikr.count)
      : null;

  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto px-3 pt-2 pb-4 select-none">
      {/* Top utilities: Reset & Decrement, with visible text labels.
          items-start (not items-center) so the two buttons' tops line up —
          the reset button's column is taller because of its caption line
          below it, and centering the row let the plain decrement button
          drift visually lower/out of alignment with it. */}
      <div className="flex items-start gap-1.5 mb-2">
        <HoldResetButton
          onResetConfirmed={onReset}
          disabled={activeDhikr.count === 0}
          vibrationEnabled={settings.vibrationEnabled}
        />
        <button
          type="button"
          onClick={() => activeDhikr.count > 0 && onIncrement(-1)}
          disabled={activeDhikr.count === 0}
          title="کاهش یک عدد"
          aria-label="کاهش یک عدد"
          className="flex-1 flex items-center justify-center gap-1.5 h-11 px-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)]/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <Minus className="w-4 h-4 shrink-0" />
          <span className="text-xs font-bold whitespace-nowrap">کم کردن یک عدد</span>
        </button>
      </div>

      {/* Dhikr name (label only) + explicit Library button */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 bg-[var(--surface)] border border-[var(--accent)]/30 rounded-2xl px-3.5 py-2 text-right shadow-sm min-w-0">
          <div className="text-[11px] text-[var(--accent)] font-medium">ذکر انتخاب‌شده</div>
          <div className="text-sm font-bold text-[var(--text)] truncate">{activeDhikr.title}</div>
        </div>
        <button
          type="button"
          onClick={onOpenLibraryModal}
          className="shrink-0 flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-xs font-bold px-3.5 h-[46px] rounded-2xl shadow-sm transition-all"
        >
          <BookOpen className="w-4 h-4" />
          کتابخانهٔ ذکر
        </button>
      </div>

      {/* Tasbihat Hazrat Zahra 3-Stage Automatic Indicator */}
      {activeDhikr.isTasbihatZahra && (
        <TasbihatStageBar totalCount={activeDhikr.count} />
      )}

      {/* Custom multi-stage dhikr indicator */}
      {hasCustomStages && activeDhikr.customStages && (
        <CustomStageBar stages={activeDhikr.customStages} totalCount={activeDhikr.count} />
      )}

      {/* Sacred Dhikr Text & Translation Card — multi-stage dhikrs (Tasbihat
          Zahra / custom) already show the current stage's phrase in the
          colored stage bar above, so this whole card (not just the
          translation line) is skipped entirely for them; it's redundant and
          adds extra scroll. Single-stage dhikrs keep it as-is. */}
      {!tasbihatStage && !customStage && (
        <div className="bg-[var(--surface)]/85 border border-[var(--border)] rounded-2xl p-3.5 mb-2 text-center shadow-inner">
          <p
            className="text-lg sm:text-xl font-bold text-[var(--text)] leading-relaxed tracking-wide mb-1.5"
            dir="rtl"
          >
            {displayedArabicText}
          </p>
          {activeDhikr.translation && (
            <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2">
              {activeDhikr.translation}
            </p>
          )}
        </div>
      )}

      {/* Milestone / Completion Notification Toast */}
      {milestoneBanner && (
        <div className="bg-[var(--accent)]/20 border border-[var(--accent)] text-[var(--text)] text-xs font-bold px-3.5 py-2 rounded-xl text-center mb-2 animate-fade-in">
          {milestoneBanner}
        </div>
      )}

      {/* Target & Quick Sound/Haptics Row */}
      <div className="flex items-center justify-between px-1 mb-2">
        <button
          type="button"
          onClick={() => setIsTargetModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold bg-[var(--surface)] hover:bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)]/40 text-[var(--muted)] hover:text-[var(--text)] px-3 py-1.5 rounded-xl transition-all"
        >
          <Target className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>
            هدف:{' '}
            <strong className="text-[var(--text)] tabular-nums-fa">
              {toPersianDigits(activeDhikr.target)}
            </strong>
          </span>
          <span className="text-[10px] text-[var(--accent)] mr-0.5">
            (
            {activeDhikr.targetMode === 'stop'
              ? 'توقف در پایان'
              : activeDhikr.targetMode === 'loop'
              ? 'دور خودکار'
              : 'هشدار + ادامه'}
            )
          </span>
        </button>

        {/* Quick Feedback Toggles */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleSetting('soundEnabled')}
            title={settings.soundEnabled ? 'صدای کلیک تسبیح: فعال' : 'صدای کلیک تسبیح: غیرفعال'}
            className={`p-1.5 rounded-xl border transition-all ${
              settings.soundEnabled
                ? 'bg-[var(--surface)] border-[var(--accent)]/40 text-[var(--accent)]'
                : 'bg-[var(--bg)] border-[var(--border)] text-[var(--muted)]/50'
            }`}
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onToggleSetting('vibrationEnabled')}
            title={settings.vibrationEnabled ? 'لرزش لمسی: فعال' : 'لرزش لمسی: غیرفعال'}
            className={`p-1.5 rounded-xl border transition-all ${
              settings.vibrationEnabled
                ? 'bg-[var(--surface)] border-[var(--accent)]/40 text-[var(--accent)]'
                : 'bg-[var(--bg)] border-[var(--border)] text-[var(--muted)]/50'
            }`}
          >
            <Vibrate className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Star-earned toast, anchored right above the counter box (not the top of the whole screen) */}
      {starEarnedToast && (
        <div className="flex items-center justify-center gap-2 bg-[var(--accent)] text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl mb-2 animate-fade-in text-center">
          <Star className="w-4 h-4 shrink-0" />
          <span>{starEarnedToast}</span>
        </div>
      )}

      {/* MAIN TACTILE COUNTER ZONE (60% Lower Screen Thumb Target) */}
      <div
        onClick={handleTapIncrement}
        role="button"
        tabIndex={0}
        aria-label="صفحه شمارش ذکر - برای افزودن یک ذکر ضربه بزنید"
        className="relative flex-1 min-h-[275px] flex flex-col items-center justify-center rounded-3xl sanctuary-arch-bg border border-[var(--accent)]/30 shadow-2xl cursor-pointer overflow-hidden transition-transform active:scale-[0.99] no-touch-callout group"
      >
        {/* Subtle Ripple on Tap */}
        {tapRipple && (
          <span
            key={tapRipple.id}
            style={{ left: tapRipple.x, top: tapRipple.y }}
            className="absolute w-28 h-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)]/20 pointer-events-none animate-ping"
          />
        )}

        {/* Circular Tactile Tasbih Ring */}
        <div className="relative flex items-center justify-center w-64 h-64">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256">
            {/* Outer decorative track */}
            <circle
              cx="128"
              cy="128"
              r={circleRadius}
              fill="none"
              stroke="color-mix(in oklab, var(--accent) 14%, transparent)"
              strokeWidth="8"
            />
            {/* Dynamic Golden Progress Ring */}
            <circle
              cx="128"
              cy="128"
              r={circleRadius}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="8"
              strokeDasharray={circleCircumference}
              strokeDashoffset={circleDashoffset}
              strokeLinecap="round"
              className="transition-all duration-150 ease-out"
            />
          </svg>

          {/* Center Numeral Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <span className="text-[11px] font-medium text-[var(--muted)] mb-0.5">
              {tasbihatStage
                ? tasbihatStage.persianTitle
                : customStage
                ? `مرحله ${toPersianDigits(customStage.stageNumber)}`
                : 'شمارش فعلی'}
            </span>

            {/* Huge Tabular Persian Numeral */}
            <div className="text-6xl sm:text-7xl font-black text-[var(--text)] tabular-nums-fa tracking-tight leading-none my-1 drop-shadow-md">
              {toPersianDigits(activeDhikr.count)}
            </div>

            {/* Target Fraction & Percentage */}
            <div className="text-xs font-bold text-[var(--accent)] tabular-nums-fa mt-1">
              {toPersianDigits(activeDhikr.count)} از{' '}
              {toPersianDigits(activeDhikr.target)}
            </div>

            {/* All-time total counter badge */}
            <div className="text-[10px] text-[var(--muted)]/80 mt-2 bg-[var(--bg)]/80 px-2.5 py-0.5 rounded-full border border-[var(--border)]">
              مجموع کل این ذکر: {toPersianDigits(activeDhikr.totalAllTime)}
            </div>
          </div>
        </div>

        {/* Bottom Instruction Hint inside Touch Area */}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--muted)]/80 group-hover:text-[var(--accent)] transition-colors">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span>برای شمارش، روی هر نقطه از این کادر ضربه بزنید</span>
        </div>
      </div>

      {/* Persistent star/badge section */}
      <div className="mt-2 flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3">
        {hasAnyAchievement ? (
          <>
            <Star className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span className="text-xs font-bold text-[var(--text)]">{starLabel}</span>
            <div className="flex items-center gap-1">
              {BADGE_LEVELS.filter((b) => earnedBadges.includes(b.id)).map((b) => (
                <span key={b.id} className="text-base" title={b.label}>
                  {b.emoji}
                </span>
              ))}
            </div>
            {earnedBadges.length > 0 && (
              <button
                type="button"
                onClick={handleShareAchievement}
                title="اشتراک‌گذاری مدال"
                aria-label="اشتراک‌گذاری مدال"
                className="mr-auto flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        ) : (
          <span className="text-xs text-[var(--muted)]">هنوز ستاره یا مدالی دریافت نکرده‌اید</span>
        )}
      </div>

      {/* Discount entry points — بخش ث: right after the star/badge section, must stay above the fold on the counting page */}
      <DiscountButtonsRow
        activeCountDiscount={activeCountDiscount}
        onOpenCountDiscount={onOpenCountDiscount}
        onOpenReferralDiscount={onOpenReferralDiscount}
        className="mt-2"
      />

      {/* Target Configuration Modal */}
      <TargetConfigModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        currentTarget={activeDhikr.target}
        currentMode={activeDhikr.targetMode}
        dhikrTitle={activeDhikr.title}
        onSave={onUpdateTarget}
      />
    </div>
  );
};
