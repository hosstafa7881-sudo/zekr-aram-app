import React, { useState } from 'react';
import { ShareStoreLinks } from '../../components/ShareStoreLinks';
import { shareAppText } from '../../lib/share';
import {
  DAY_SHARE_OPTION_LABELS,
  DayShareData,
  DayShareOption,
  DayShareVariant,
  buildDayShareText,
} from '../../lib/dayShareText';
import { useToast } from '../../components/ToastProvider';
import { X, ListChecks, NotebookPen, Layers } from 'lucide-react';

interface DayShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DayShareData;
  /** 'full' for «جزئیات بیشتر» و «۳۰ روز اخیر»، 'summary' for the calendar modal (مورد ۱۳). */
  variant: DayShareVariant;
  /** Which options to offer — computed by the caller from what the day actually has (مورد ۱۵). */
  options: DayShareOption[];
}

const OPTION_ICONS: Record<DayShareOption, React.ReactNode> = {
  dhikr: <ListChecks className="w-4 h-4" />,
  notebook: <NotebookPen className="w-4 h-4" />,
  both: <Layers className="w-4 h-4" />,
};

/** Lets the user pick what to include before sharing a day. Only shown when the day has BOTH dhikr and notebook content. */
export const DayShareModal: React.FC<DayShareModalProps> = ({
  isOpen,
  onClose,
  data,
  variant,
  options,
}) => {
  const [option, setOption] = useState<DayShareOption>(options[0] || 'dhikr');
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleShare = () => {
    shareAppText(buildDayShareText(option, variant, data), {
      onCopiedToClipboard: () =>
        showToast('متن اشتراک‌گذاری در حافظهٔ موقت کپی شد.', { kind: 'success' }),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--accent)]/40 rounded-3xl p-5 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 left-3 p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)]"
          aria-label="بستن"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-sm font-bold text-[var(--text)] mb-4">چه چیزی به اشتراک گذاشته شود؟</h3>

        <div className="space-y-2 mb-4">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              data-testid={`day-share-option-${opt}`}
              onClick={() => setOption(opt)}
              className={`w-full flex items-center gap-2.5 p-3 rounded-2xl border transition-all ${
                option === opt
                  ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--text)]'
                  : 'bg-[var(--bg)] border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              <span className={option === opt ? 'text-[var(--accent)]' : ''}>
                {OPTION_ICONS[opt]}
              </span>
              <span className="text-xs font-bold">{DAY_SHARE_OPTION_LABELS[opt]}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          data-testid="day-share-submit"
          onClick={handleShare}
          className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-xs font-bold shadow-md transition-all"
        >
          اشتراک‌گذاری
        </button>

        <ShareStoreLinks />
      </div>
    </div>
  );
};
