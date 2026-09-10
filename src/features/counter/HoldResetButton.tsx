import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { triggerVibration } from '../../lib/haptics';

interface HoldResetButtonProps {
  onResetConfirmed: () => void;
  disabled?: boolean;
  vibrationEnabled: boolean;
}

export const HoldResetButton: React.FC<HoldResetButtonProps> = ({
  onResetConfirmed,
  disabled = false,
  vibrationEnabled,
}) => {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const HOLD_DURATION = 1350; // 1.35s hold required

  const startHold = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (disabled) return;
    setHolding(true);
    startTimeRef.current = performance.now();
    triggerVibration(15, vibrationEnabled, 'light');

    const updateProgress = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION) * 100);
      setProgress(pct);

      if (pct >= 100) {
        setHolding(false);
        setProgress(0);
        triggerVibration([40, 40, 70], vibrationEnabled, 'strong');
        onResetConfirmed();
      } else {
        frameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    frameRef.current = requestAnimationFrame(updateProgress);
  };

  const cancelHold = (e?: React.PointerEvent) => {
    if (e) e.stopPropagation();
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    setHolding(false);
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center gap-1 flex-1">
      <button
        type="button"
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        disabled={disabled}
        title="برای صفر کردن شمارش، دکمه را چند ثانیه نگه دارید"
        aria-label="صفر کردن شمارش با نگه‌داشتن"
        className={`relative overflow-hidden w-full flex items-center justify-center gap-1.5 h-11 px-3.5 rounded-2xl border transition-all select-none no-touch-callout ${
          disabled
            ? 'opacity-30 border-[var(--border)] text-[var(--muted)] cursor-not-allowed'
            : holding
            ? 'bg-[var(--danger)]/20 border-[var(--danger)] text-[var(--danger)] scale-95'
            : 'bg-[var(--surface)]/90 border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)]/40'
        }`}
      >
        {holding && (
          <span
            className="absolute inset-x-0 bottom-0 h-1 bg-[var(--danger)] transition-[width] duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        )}
        <RotateCcw className="w-4 h-4 shrink-0" />
        <span className="text-xs font-bold whitespace-nowrap">صفر کردن شمارش</span>
      </button>

      <span
        className={`text-[10px] text-center leading-tight ${
          holding ? 'text-[var(--danger)] font-bold animate-pulse' : 'text-[var(--muted)]'
        }`}
      >
        {holding
          ? `نگه دارید (${Math.ceil(((100 - progress) / 100) * 1.4)} ثانیه)...`
          : 'دکمه را چند ثانیه نگه دارید'}
      </span>
    </div>
  );
};
