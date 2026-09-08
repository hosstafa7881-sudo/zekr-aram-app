import React from 'react';
import { Lock, X } from 'lucide-react';

interface FeatureLockModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
  onSubscribe: () => void;
}

export const FeatureLockModal: React.FC<FeatureLockModalProps> = ({ isOpen, message, onClose, onSubscribe }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--accent)]/40 rounded-3xl p-5 shadow-2xl text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/40 flex items-center justify-center text-[var(--accent)] mb-3">
          <Lock className="w-7 h-7" />
        </div>
        <p className="text-sm text-[var(--text)] leading-relaxed mb-5">{message}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
          >
            رد کردن
          </button>
          <button
            type="button"
            onClick={onSubscribe}
            className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-bold shadow-lg hover:bg-[var(--accent-light)]"
          >
            تهیه اشتراک
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 left-3 p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)]"
          aria-label="بستن"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
