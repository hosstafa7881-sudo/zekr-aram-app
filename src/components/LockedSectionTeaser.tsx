import React from 'react';
import { Lock, Eye } from 'lucide-react';

interface LockedSectionTeaserProps {
  title: string;
  description: string;
  onReveal: () => void;
}

/** Shown in place of a paywall-gated in-page section until the user taps to view it (which runs the feature gate). */
export const LockedSectionTeaser: React.FC<LockedSectionTeaserProps> = ({ title, description, onReveal }) => {
  return (
    <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-2xl p-5 text-center">
      <div className="w-11 h-11 mx-auto rounded-2xl bg-[var(--muted)]/10 flex items-center justify-center text-[var(--muted)] mb-2.5">
        <Lock className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-bold text-[var(--text)] mb-1">{title}</h4>
      <p className="text-xs text-[var(--muted)] leading-relaxed mb-3">{description}</p>
      <button
        type="button"
        onClick={onReveal}
        className="inline-flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-[var(--bg)] text-xs font-bold px-4 py-2 rounded-xl transition-all"
      >
        <Eye className="w-3.5 h-3.5" />
        مشاهده
      </button>
    </div>
  );
};
