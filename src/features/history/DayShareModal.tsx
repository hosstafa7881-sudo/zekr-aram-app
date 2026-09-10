import React, { useState } from 'react';
import { DailyLog } from '../../lib/db';
import { NotebookItemDef, NotebookDayEntry } from '../notebook/notebookTypes';
import { toPersianDigits } from '../../utils/persian';
import { shareText, ShareStoreLinks } from '../../components/ShareStoreLinks';
import { useToast } from '../../components/ToastProvider';
import { X, ListChecks, NotebookPen, Layers } from 'lucide-react';

type ShareOption = 'dhikr' | 'notebook' | 'both';

interface DayShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shamsiDateLabel: string;
  log: DailyLog | undefined;
  notebookEntry: NotebookDayEntry | undefined;
  notebookItems: NotebookItemDef[];
}

function buildDhikrText(shamsiDateLabel: string, log: DailyLog | undefined): string {
  const total = log?.totalCount || 0;
  return `آمار ذکر من در ${shamsiDateLabel}: مجموع ${toPersianDigits(total)} ذکر 🌿`;
}

function buildNotebookText(
  shamsiDateLabel: string,
  notebookEntry: NotebookDayEntry | undefined,
  notebookItems: NotebookItemDef[]
): string {
  const checkedCount = notebookEntry?.checkedItemIds.length || 0;
  const lines = [
    `دفترچهٔ کارهای خوب من در ${shamsiDateLabel}: ${toPersianDigits(checkedCount)} از ${toPersianDigits(
      notebookItems.length
    )} مورد انجام شد`,
  ];
  if (notebookEntry?.feelingText) lines.push(notebookEntry.feelingText);
  if (notebookEntry?.stickers.length) lines.push(notebookEntry.stickers.join(' '));
  return `${lines.join('\n')} 🌿`;
}

/** Lets the user pick what to include before sharing a day: dhikr only, notebook only, or both (بخش ت #15). */
export const DayShareModal: React.FC<DayShareModalProps> = ({
  isOpen,
  onClose,
  shamsiDateLabel,
  log,
  notebookEntry,
  notebookItems,
}) => {
  const [option, setOption] = useState<ShareOption>('dhikr');
  const { showToast } = useToast();

  if (!isOpen) return null;

  const buildText = (): string => {
    if (option === 'dhikr') return buildDhikrText(shamsiDateLabel, log);
    if (option === 'notebook') return buildNotebookText(shamsiDateLabel, notebookEntry, notebookItems);
    return `${buildDhikrText(shamsiDateLabel, log)}\n\n${buildNotebookText(shamsiDateLabel, notebookEntry, notebookItems)}`;
  };

  const handleShare = () => {
    shareText(buildText(), () => showToast('متن اشتراک‌گذاری در حافظهٔ موقت کپی شد.', { kind: 'success' }));
    onClose();
  };

  const OPTIONS: { id: ShareOption; label: string; icon: React.ReactNode }[] = [
    { id: 'dhikr', label: 'فقط ذکرها', icon: <ListChecks className="w-4 h-4" /> },
    { id: 'notebook', label: 'فقط دفترچه', icon: <NotebookPen className="w-4 h-4" /> },
    { id: 'both', label: 'ذکرها و دفترچه', icon: <Layers className="w-4 h-4" /> },
  ];

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
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setOption(opt.id)}
              className={`w-full flex items-center gap-2.5 p-3 rounded-2xl border transition-all ${
                option === opt.id
                  ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--text)]'
                  : 'bg-[var(--bg)] border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              <span className={option === opt.id ? 'text-[var(--accent)]' : ''}>{opt.icon}</span>
              <span className="text-xs font-bold">{opt.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
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
