import React from 'react';
import { X, Share2 } from 'lucide-react';
import { ShareStoreLinks, shareText } from '../../components/ShareStoreLinks';
import { useToast } from '../../components/ToastProvider';

interface CelebrationModalProps {
  isOpen: boolean;
  emoji: string;
  message: string;
  shareText: string;
  onClose: () => void;
}

/** Used for medal-earned and personal-record-broken celebrations — both carry a share button + store links. */
export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  isOpen,
  emoji,
  message,
  shareText: text,
  onClose,
}) => {
  const { showToast } = useToast();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--accent)]/40 rounded-3xl p-6 shadow-2xl text-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 left-3 p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)]"
          aria-label="بستن"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="text-5xl mb-3">{emoji}</div>
        <p className="text-sm font-bold text-[var(--text)] leading-relaxed mb-4">{message}</p>
        <button
          type="button"
          onClick={() =>
            shareText(text, () => showToast('متن اشتراک‌گذاری در حافظهٔ موقت کپی شد.', { kind: 'success' }))
          }
          className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-bold py-2.5 rounded-2xl shadow-md transition-all"
        >
          <Share2 className="w-4 h-4" />
          اشتراک‌گذاری
        </button>
        <ShareStoreLinks />
      </div>
    </div>
  );
};
