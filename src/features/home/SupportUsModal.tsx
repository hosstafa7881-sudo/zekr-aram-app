import React from 'react';
import { X, Store } from 'lucide-react';
import { STORE_LINKS } from '../../config/storeLinks';
import { SUPPORT_US_MESSAGE } from '../../lib/messages';

interface SupportUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const REVIEW_TARGETS = [
  { id: 'cafebazaar', label: 'ثبت نظر در بازار' },
  { id: 'myket', label: 'ثبت نظر در مایکت' },
] as const;

export const SupportUsModal: React.FC<SupportUsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const links = REVIEW_TARGETS.map((t) => ({
    ...t,
    url: STORE_LINKS.find((s) => s.id === t.id)?.url || '',
  })).filter((t) => t.url.trim().length > 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--accent)]/40 rounded-3xl p-5 shadow-2xl text-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 left-3 p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)]"
          aria-label="بستن"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-sm text-[var(--text)] leading-relaxed mb-5 mt-2">
          {SUPPORT_US_MESSAGE}
        </p>
        {links.length > 0 ? (
          <div className="flex flex-col gap-2">
            {links.map((t) => (
              <a
                key={t.id}
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-xs font-bold py-2.5 rounded-xl transition-all"
              >
                <Store className="w-4 h-4" />
                {t.label}
              </a>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-[var(--muted)]">
            اپ هنوز روی فروشگاه‌ها منتشر نشده — به‌زودی از همین‌جا می‌تونید نظر ثبت کنید.
          </p>
        )}
      </div>
    </div>
  );
};
