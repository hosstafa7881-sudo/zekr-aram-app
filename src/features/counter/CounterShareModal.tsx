import React, { useState } from 'react';
import { X, FileText, Image as ImageIcon, Share2, Loader2 } from 'lucide-react';
import { DailyLog } from '../../lib/db';
import { shareAppImage, shareAppText } from '../../lib/share';
import { buildTodayDhikrShareText } from '../../lib/dhikrShareText';
import { CounterImageInput, generateCounterImage } from '../../lib/counterShareImage';
import { useToast } from '../../components/ToastProvider';

type CounterShareOption = 'text' | 'image';

interface CounterShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyLogs: DailyLog[];
  todayDateKey: string;
  imageInput: CounterImageInput;
}

/**
 * مورد ۶ — the counting page's own share popup: today's dhikr list as text
 * (pre-selected) or a generated picture of the page. Both go through the one
 * shared share module in lib/share.ts, so the store links are appended in
 * exactly one place.
 */
export const CounterShareModal: React.FC<CounterShareModalProps> = ({
  isOpen,
  onClose,
  dailyLogs,
  todayDateKey,
  imageInput,
}) => {
  const [option, setOption] = useState<CounterShareOption>('text');
  const [isBusy, setIsBusy] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleShare = async () => {
    const caption = buildTodayDhikrShareText(dailyLogs, todayDateKey);
    if (option === 'text') {
      await shareAppText(caption, {
        onCopiedToClipboard: () =>
          showToast('متن اشتراک‌گذاری در حافظهٔ موقت کپی شد.', { kind: 'success' }),
      });
      onClose();
      return;
    }

    setIsBusy(true);
    try {
      const blob = await generateCounterImage(imageInput);
      // The text option's wording travels with the image as its caption.
      await shareAppImage(blob, 'zekraram-counter.png', caption, {
        onDownloadedInstead: () =>
          showToast('تصویر در گوشی شما دانلود شد.', { kind: 'success' }),
        onFailed: () => showToast('ساخت یا اشتراک‌گذاری تصویر انجام نشد.', { kind: 'info' }),
      });
      onClose();
    } catch {
      showToast('ساخت تصویر در این مرورگر انجام نشد.', { kind: 'info' });
    } finally {
      setIsBusy(false);
    }
  };

  const OPTIONS: { id: CounterShareOption; label: string; icon: React.ReactNode }[] = [
    { id: 'text', label: 'ذکرهای امروز (متن)', icon: <FileText className="w-4 h-4" /> },
    { id: 'image', label: 'تصویر همین صفحه', icon: <ImageIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-[72] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--accent)]/40 rounded-3xl p-5 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 left-3 p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)]"
          aria-label="بستن"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-sm font-bold text-[var(--text)] mb-4">اشتراک‌گذاری</h3>

        <div className="space-y-2 mb-4">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              data-testid={`counter-share-option-${opt.id}`}
              aria-pressed={option === opt.id}
              onClick={() => setOption(opt.id)}
              className={`w-full flex items-center gap-2.5 p-3 rounded-2xl border transition-all ${
                option === opt.id
                  ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--text)]'
                  : 'bg-[var(--bg)] border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                  option === opt.id
                    ? 'border-[var(--accent)] bg-[var(--accent)]'
                    : 'border-[var(--border)]'
                }`}
              />
              <span className={option === opt.id ? 'text-[var(--accent)]' : ''}>{opt.icon}</span>
              <span className="text-xs font-bold">{opt.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          data-testid="counter-share-submit"
          disabled={isBusy}
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-60 text-white text-xs font-bold shadow-md transition-all"
        >
          {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          {isBusy ? 'در حال ساخت تصویر…' : 'اشتراک‌گذاری'}
        </button>
      </div>
    </div>
  );
};
