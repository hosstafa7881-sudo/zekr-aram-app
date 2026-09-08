import React, { useState, useEffect, useCallback } from 'react';
import { DhikrItem, TargetMode } from '../../lib/seedData';
import { UserSettings } from '../../lib/db';
import {
  toPersianDigits,
  getShamsiDateInfo,
  stripArabicDiacritics,
} from '../../utils/persian';
import {
  triggerVibration,
  playTasbihBeadClick,
  playTargetReachedChime,
} from '../../lib/haptics';
import { HoldResetButton } from './HoldResetButton';
import { TasbihatStageBar, getTasbihatStageDetail } from './TasbihatStageBar';
import { TargetConfigModal } from './TargetConfigModal';
import {
  Minus,
  Target,
  ChevronDown,
  Sparkles,
  Volume2,
  VolumeX,
  Vibrate,
} from 'lucide-react';

interface CounterViewProps {
  activeDhikr: DhikrItem;
  allDhikrs: DhikrItem[];
  settings: UserSettings;
  onSelectDhikr: (id: string) => void;
  onIncrement: (delta: number) => void;
  onReset: () => void;
  onUpdateTarget: (newTarget: number, newMode: TargetMode) => void;
  onToggleSetting: (key: keyof UserSettings) => void;
  onOpenLibraryModal: () => void;
}

export const CounterView: React.FC<CounterViewProps> = ({
  activeDhikr,
  allDhikrs,
  settings,
  onSelectDhikr,
  onIncrement,
  onReset,
  onUpdateTarget,
  onToggleSetting,
  onOpenLibraryModal,
}) => {
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [tapRipple, setTapRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const [milestoneBanner, setMilestoneBanner] = useState<string | null>(null);

  const shamsiToday = getShamsiDateInfo();
  const todayWeekdayDhikr = allDhikrs.find(
    (d) => d.category === 'weekday' && d.weekdayIndex === shamsiToday.weekdayIndex
  );

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
          setMilestoneBanner('تسبیحات حضرت زهرا (س) با موفقیت کامل شد. قبول باشد!');
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
          setMilestoneBanner(
            `الحمدلله! به هدف ${toPersianDigits(nextCount)} مرتبه رسیدید.`
          );
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

  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto px-3 pt-2 pb-4 select-none">
      {/* Top Action & Dhikr Switcher Row */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        {/* Active Dhikr Switcher Button */}
        <button
          type="button"
          onClick={onOpenLibraryModal}
          className="flex items-center gap-2 bg-[#11221B] hover:bg-[#162B23] border border-[#D4AF37]/30 rounded-2xl px-3.5 py-2 text-right transition-all shadow-sm max-w-[68%]"
        >
          <div className="truncate">
            <div className="text-[11px] text-[#D4AF37] font-medium">ذکر انتخاب‌شده</div>
            <div className="text-sm font-bold text-[#F3F7F4] truncate">
              {activeDhikr.title}
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-[#D4AF37] shrink-0" />
        </button>

        {/* Top Corner Safety Utilities: Hold-to-Reset & -1 */}
        <div className="flex items-center gap-1.5">
          {/* Decrement -1 Button */}
          <button
            type="button"
            onClick={() => activeDhikr.count > 0 && onIncrement(-1)}
            disabled={activeDhikr.count === 0}
            title="کاهش یک عدد (-۱)"
            aria-label="کاهش یک عدد"
            className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[#11221B] border border-[#1C352B] text-[#94B2A3] hover:text-[#F3F7F4] hover:border-[#D4AF37]/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Hold-to-Reset Button (Isolated & Protected) */}
          <HoldResetButton
            onResetConfirmed={onReset}
            disabled={activeDhikr.count === 0}
            vibrationEnabled={settings.vibrationEnabled}
          />
        </div>
      </div>

      {/* Quick Prompt to Switch to Today's Weekday Dhikr if not already selected */}
      {todayWeekdayDhikr && activeDhikr.id !== todayWeekdayDhikr.id && (
        <div className="flex items-center justify-between bg-[#11221B]/75 border border-[#D4AF37]/25 rounded-xl px-3 py-1.5 mb-2 text-xs">
          <div className="flex items-center gap-1.5 text-[#94B2A3] truncate">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
            <span className="truncate">
              ذکر امروز ({shamsiToday.weekdayName}):{' '}
              <strong className="text-[#F3F7F4]">{todayWeekdayDhikr.arabicText}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectDhikr(todayWeekdayDhikr.id)}
            className="text-[#D4AF37] hover:underline font-bold shrink-0 mr-2"
          >
            انتخاب
          </button>
        </div>
      )}

      {/* Tasbihat Hazrat Zahra 3-Stage Automatic Indicator */}
      {activeDhikr.isTasbihatZahra && (
        <TasbihatStageBar totalCount={activeDhikr.count} />
      )}

      {/* Sacred Dhikr Text & Translation Card */}
      <div className="bg-[#11221B]/85 border border-[#1C352B] rounded-2xl p-3.5 mb-3 text-center shadow-inner">
        <p
          className="text-lg sm:text-xl font-bold text-[#F3F7F4] leading-relaxed tracking-wide mb-1.5"
          dir="rtl"
        >
          {tasbihatStage ? tasbihatStage.arabicTitle : displayedArabicText}
        </p>
        {activeDhikr.translation && (
          <p className="text-xs text-[#94B2A3] leading-relaxed line-clamp-2">
            {activeDhikr.translation}
          </p>
        )}
      </div>

      {/* Milestone / Completion Notification Toast */}
      {milestoneBanner && (
        <div className="bg-[#D4AF37]/20 border border-[#D4AF37] text-[#F3F7F4] text-xs font-bold px-3.5 py-2 rounded-xl text-center mb-2 animate-fade-in">
          {milestoneBanner}
        </div>
      )}

      {/* Target & Quick Sound/Haptics Row */}
      <div className="flex items-center justify-between px-1 mb-2">
        <button
          type="button"
          onClick={() => setIsTargetModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold bg-[#11221B] hover:bg-[#162B23] border border-[#1C352B] hover:border-[#D4AF37]/40 text-[#94B2A3] hover:text-[#F3F7F4] px-3 py-1.5 rounded-xl transition-all"
        >
          <Target className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>
            هدف:{' '}
            <strong className="text-[#F3F7F4] tabular-nums-fa">
              {toPersianDigits(activeDhikr.target)}
            </strong>
          </span>
          <span className="text-[10px] text-[#D4AF37] mr-0.5">
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
                ? 'bg-[#11221B] border-[#D4AF37]/40 text-[#D4AF37]'
                : 'bg-[#091410] border-[#1C352B] text-[#94B2A3]/50'
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
                ? 'bg-[#11221B] border-[#D4AF37]/40 text-[#D4AF37]'
                : 'bg-[#091410] border-[#1C352B] text-[#94B2A3]/50'
            }`}
          >
            <Vibrate className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN TACTILE COUNTER ZONE (60% Lower Screen Thumb Target) */}
      <div
        onClick={handleTapIncrement}
        role="button"
        tabIndex={0}
        aria-label="صفحه شمارش ذکر - برای افزودن یک ذکر ضربه بزنید"
        className="relative flex-1 min-h-[275px] flex flex-col items-center justify-center rounded-3xl sanctuary-arch-bg border border-[#D4AF37]/30 shadow-2xl cursor-pointer overflow-hidden transition-transform active:scale-[0.99] no-touch-callout group"
      >
        {/* Subtle Ripple on Tap */}
        {tapRipple && (
          <span
            key={tapRipple.id}
            style={{ left: tapRipple.x, top: tapRipple.y }}
            className="absolute w-28 h-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/20 pointer-events-none animate-ping"
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
              stroke="rgba(212, 175, 55, 0.14)"
              strokeWidth="8"
            />
            {/* Dynamic Golden Progress Ring */}
            <circle
              cx="128"
              cy="128"
              r={circleRadius}
              fill="none"
              stroke="#D4AF37"
              strokeWidth="8"
              strokeDasharray={circleCircumference}
              strokeDashoffset={circleDashoffset}
              strokeLinecap="round"
              className="transition-all duration-150 ease-out"
            />
          </svg>

          {/* Center Numeral Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <span className="text-[11px] font-medium text-[#94B2A3] mb-0.5">
              {tasbihatStage ? tasbihatStage.persianTitle : 'شمارش فعلی'}
            </span>

            {/* Huge Tabular Persian Numeral */}
            <div className="text-6xl sm:text-7xl font-black text-[#F3F7F4] tabular-nums-fa tracking-tight leading-none my-1 drop-shadow-md">
              {toPersianDigits(activeDhikr.count)}
            </div>

            {/* Target Fraction & Percentage */}
            <div className="text-xs font-bold text-[#D4AF37] tabular-nums-fa mt-1">
              {toPersianDigits(activeDhikr.count)} از{' '}
              {toPersianDigits(activeDhikr.target)}
            </div>

            {/* All-time total counter badge */}
            <div className="text-[10px] text-[#94B2A3]/80 mt-2 bg-[#091410]/80 px-2.5 py-0.5 rounded-full border border-[#1C352B]">
              مجموع کل این ذکر: {toPersianDigits(activeDhikr.totalAllTime)}
            </div>
          </div>
        </div>

        {/* Bottom Instruction Hint inside Touch Area */}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-[#94B2A3]/80 group-hover:text-[#D4AF37] transition-colors">
          <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
          <span>برای شمارش، روی هر نقطه از این کادر ضربه بزنید</span>
        </div>
      </div>

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
