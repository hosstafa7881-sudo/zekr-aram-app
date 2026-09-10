import React, { useState } from 'react';
import { DailyLog } from '../../lib/db';
import { NotebookItemDef, NotebookDayEntry } from '../notebook/notebookTypes';
import { toPersianDigits } from '../../utils/persian';
import { DayShareModal } from './DayShareModal';
import { NO_DATA_FOR_DAY_MESSAGE } from '../../lib/messages';
import { X, Share2, CheckCircle2, ChevronLeft } from 'lucide-react';

interface HistoryDayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: DailyLog | undefined;
  notebookEntry: NotebookDayEntry | undefined;
  notebookItems: NotebookItemDef[];
  shamsiDateLabel: string;
  onOpenFullDetail: () => void;
}

/** Quick day summary opened from the search calendar — «حذف این روز» was
 * replaced with «جزئیات بیشتر» (بخش ت #13); deleting a day now only happens
 * from the full detail page / the ۳۰-day list. */
export const HistoryDayDetailModal: React.FC<HistoryDayDetailModalProps> = ({
  isOpen,
  onClose,
  log,
  notebookEntry,
  notebookItems,
  shamsiDateLabel,
  onOpenFullDetail,
}) => {
  const [shareOpen, setShareOpen] = useState(false);

  if (!isOpen) return null;

  const checkedCount = notebookEntry?.checkedItemIds.length || 0;
  const hasAnyData = !!log || !!notebookEntry;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--accent)]/40 rounded-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 left-3 p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)]"
          aria-label="بستن"
        >
          <X className="w-4 h-4" />
        </button>

        {hasAnyData ? (
          <>
            <div className="pr-1 mb-3">
              <div className="text-sm font-bold text-[var(--text)]">{shamsiDateLabel}</div>
              <div className="text-xs font-extrabold text-[var(--accent)] tabular-nums-fa mt-0.5">
                مجموع: {toPersianDigits(log?.totalCount || 0)} ذکر
              </div>
            </div>

            {log && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {Object.entries(log.breakdown).map(([id, item]) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 bg-[var(--bg)] text-[var(--muted)] text-[11px] px-2 py-0.5 rounded-lg border border-[var(--border)] tabular-nums-fa"
                  >
                    <span>{item.title}:</span>
                    <strong className="text-[var(--text)]">{toPersianDigits(item.count)}</strong>
                  </span>
                ))}
              </div>
            )}

            {notebookEntry && (checkedCount > 0 || notebookEntry.feelingText) && (
              <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-3 mb-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text)] mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />
                  دفترچهٔ کارهای خوب:{' '}
                  {toPersianDigits(checkedCount)} از {toPersianDigits(notebookItems.length)} مورد
                </div>
                {notebookEntry.feelingText && (
                  <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                    {notebookEntry.feelingText} {notebookEntry.stickers.join(' ')}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenFullDetail}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-xs font-bold hover:border-[var(--accent)]/40 transition-all"
              >
                جزئیات بیشتر
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-xs font-bold transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                اشتراک‌گذاری
              </button>
            </div>
          </>
        ) : (
          <p className="text-xs text-[var(--muted)] text-center py-6 leading-relaxed">
            {NO_DATA_FOR_DAY_MESSAGE}
          </p>
        )}
      </div>

      <DayShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        shamsiDateLabel={shamsiDateLabel}
        log={log}
        notebookEntry={notebookEntry}
        notebookItems={notebookItems}
      />
    </div>
  );
};
