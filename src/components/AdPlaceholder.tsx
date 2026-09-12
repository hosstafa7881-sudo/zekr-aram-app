import React from 'react';
import { Megaphone } from 'lucide-react';

interface AdPlaceholderProps {
  isProUser: boolean;
  variant?: 'banner' | 'card';
}

/**
 * Placeholder slot for a future ad SDK integration. Not wired to any real ad
 * network yet — see NOTES.md. Hidden entirely for subscribed (pro) users.
 */
export const AdPlaceholder: React.FC<AdPlaceholderProps> = ({ isProUser, variant = 'banner' }) => {
  if (isProUser) return null;

  return (
    <div
      data-testid="ad-placeholder"
      className={`flex items-center justify-center gap-2 border border-dashed border-[var(--border)] rounded-2xl text-[var(--muted)] text-[11px] ${
        variant === 'banner' ? 'py-3 px-4' : 'py-8 px-4'
      }`}
    >
      <Megaphone className="w-3.5 h-3.5 shrink-0" />
      <span>جای نمایش تبلیغات (به‌زودی)</span>
    </div>
  );
};
