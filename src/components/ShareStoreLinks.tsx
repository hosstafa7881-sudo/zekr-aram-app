import React from 'react';
import { Store } from 'lucide-react';
import { getAvailableStoreLinks } from '../config/storeLinks';

/** Renders download buttons only for stores that already have a configured link. */
export const ShareStoreLinks: React.FC = () => {
  const links = getAvailableStoreLinks();
  if (links.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border)]">
      <div className="text-[11px] text-[var(--muted)] mb-2 text-center">دانلود «ذکرآرام» از:</div>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {links.map((s) => (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent)]/50 text-[var(--text)] text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
          >
            <Store className="w-3.5 h-3.5 text-[var(--accent)]" />
            {s.label}
          </a>
        ))}
      </div>
    </div>
  );
};

/** Best-effort share via Web Share API, falling back to clipboard copy. */
export async function shareText(text: string, onFallback?: () => void) {
  try {
    if (navigator.share) {
      await navigator.share({ text, title: 'ذکرآرام' });
      return;
    }
  } catch {
    // User cancelled or share failed — fall through to clipboard
  }
  try {
    await navigator.clipboard.writeText(text);
    onFallback?.();
  } catch {
    // Ignore — nothing more we can do without a backend
  }
}
