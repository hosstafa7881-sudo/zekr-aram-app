import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toPersianDigits } from '../../utils/persian';
import { formatCodeExpiryDate } from '../../lib/discounts';

interface DiscountCodeCardProps {
  message: string;
  percent: 30 | 50 | 100;
  code: string;
  expiresAt: number;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction: { label: string; onClick: () => void };
}

/** Shared "you've got a code" presentation — used both as the automatic earned-celebration popup and as the manual "active code" view of the count-based discount button. */
export const DiscountCodeCard: React.FC<DiscountCodeCardProps> = ({
  message,
  percent,
  code,
  expiresAt,
  primaryAction,
  secondaryAction,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore — nothing more we can do without a backend
    }
  };

  return (
    <div className="text-center">
      <p className="text-sm font-bold text-[var(--text)] leading-relaxed mb-4">{message}</p>

      <div className="flex items-center justify-center gap-2 mb-1">
        <span className="text-lg font-black tracking-widest text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-xl px-4 py-2 tabular-nums-fa">
          {code}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          title="کپی کد"
          aria-label="کپی کد"
          className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-all"
        >
          {copied ? <Check className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-[10px] text-[var(--muted)] mb-4">
        تخفیف {toPersianDigits(percent)}٪ — این کد تا {formatCodeExpiryDate(expiresAt)} معتبره
      </p>

      <div className="flex items-center gap-2">
        {primaryAction && (
          <button
            type="button"
            onClick={primaryAction.onClick}
            className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-xs font-bold shadow-md transition-all"
          >
            {primaryAction.label}
          </button>
        )}
        <button
          type="button"
          onClick={secondaryAction.onClick}
          className={`py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--muted)] hover:text-[var(--text)] transition-all ${
            primaryAction ? 'flex-1' : 'w-full'
          }`}
        >
          {secondaryAction.label}
        </button>
      </div>
    </div>
  );
};
