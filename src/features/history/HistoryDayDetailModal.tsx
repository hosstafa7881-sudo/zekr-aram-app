import React, { useState } from 'react';
import { DailyLog } from '../../lib/db';
import { NotebookItemDef, NotebookDayEntry } from '../notebook/notebookTypes';
import { toPersianDigits } from '../../utils/persian';
import { shareText } from '../../components/ShareStoreLinks';
import { useToast } from '../../components/ToastProvider';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { NO_DATA_FOR_DAY_MESSAGE, DELETE_DAY_HISTORY_CONFIRM_MESSAGE } from '../../lib/messages';
import { X, Trash2, Share2, CheckCircle2 } from 'lucide-react';

interface HistoryDayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: DailyLog | undefined;
  notebookEntry: NotebookDayEntry | undefined;
  notebookItems: NotebookItemDef[];
  onDeleteDay: (dateKey: string) => void;
}

export const HistoryDayDetailModal: React.FC<HistoryDayDetailModalProps> = ({
  isOpen,
  onClose,
  log,
  notebookEntry,
  notebookItems,
  onDeleteDay,
}) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleShareDay = () => {
    if (!log) return;
    const text = `آمار ذکر من در ${log.shamsiDate}: مجموع ${log.totalCount} ذکر 🌿`;
    shareText(text, () => showToast('متن اشتراک‌گذاری در حافظهٔ موقت کپی شد.', { kind: 'success' }));
  };

  const checkedCount = notebookEntry?.checkedItemIds.length || 0;

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

        {log ? (
          <>
            <div className="pr-1 mb-3">
              <div className="text-sm font-bold text-[var(--text)]">{log.shamsiDate}</div>
              <div className="text-xs font-extrabold text-[var(--accent)] tabular-nums-fa mt-0.5">
                مجموع: {toPersianDigits(log.totalCount)} ذکر
              </div>
            </div>

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
                onClick={() => setDeleteConfirmOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 border border-[var(--danger)]/30 text-[var(--danger)] text-xs font-bold transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف این روز
              </button>
              <button
                type="button"
                onClick={handleShareDay}
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

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="حذف تاریخچهٔ روز"
        message={DELETE_DAY_HISTORY_CONFIRM_MESSAGE}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          if (log) onDeleteDay(log.dateKey);
          setDeleteConfirmOpen(false);
          onClose();
        }}
      />
    </div>
  );
};
