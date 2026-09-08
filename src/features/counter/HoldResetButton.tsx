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

  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        disabled={disabled}
        title="برای صفر کردن، دکمه را نگه دارید"
        aria-label="صفر کردن شمارنده با نگه‌داشتن"
        className={`relative flex items-center justify-center w-11 h-11 rounded-2xl border transition-all select-none no-touch-callout ${
          disabled
            ? 'opacity-30 border-[var(--border)] text-[var(--muted)] cursor-not-allowed'
            : holding
            ? 'bg-[var(--danger)]/20 border-[var(--danger)] text-[var(--danger)] scale-95'
            : 'bg-[var(--surface)]/90 border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)]/40'
        }`}
      >
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 44 44">
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="color-mix(in oklab, var(--danger) 20%, transparent)"
            strokeWidth="2.5"
            className={holding ? 'opacity-100' : 'opacity-0'}
          />
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="var(--danger)"
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-none"
          />
        </svg>
        <RotateCcw className="w-4 h-4" />
      </button>

      {holding && (
        <span className="text-xs font-medium text-[var(--danger)] bg-[var(--bg)]/90 px-2.5 py-1 rounded-lg border border-[var(--danger)]/40 animate-pulse whitespace-nowrap">
          نگه دارید ({Math.ceil(((100 - progress) / 100) * 1.4)} ثانیه)...
        </span>
      )}
    </div>
  );
};
