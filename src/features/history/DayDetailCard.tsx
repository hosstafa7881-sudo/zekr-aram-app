import React, { useState } from 'react';
import { DailyLog } from '../../lib/db';
import { NotebookItemDef, NotebookDayEntry } from '../notebook/notebookTypes';
import { toPersianDigits } from '../../utils/persian';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DELETE_DAY_HISTORY_CONFIRM_MESSAGE } from '../../lib/messages';
import { DayShareModal } from './DayShareModal';
import { Share2, Trash2, CheckCircle2, XCircle } from 'lucide-react';

interface DayDetailCardProps {
  dateKey: string;
  shamsiDateLabel: string;
  log: DailyLog | undefined;
  notebookEntry: NotebookDayEntry | undefined;
  notebookItems: NotebookItemDef[];
  onDeleteDay: (dateKey: string) => void;
  /** Called after the day is deleted — e.g. to close a full-page view that no longer has anything to show. */
  onDeleted?: () => void;
}

/** One day's full breakdown — dhikr counts, notebook checklist with reasons,
 * feeling/stickers, and its share/delete actions. Shared between the
 * "جزئیات ۳۰ روز اخیر" list and the standalone "جزئیات بیشتر" page (بخش ت
 * #14) so the two never drift apart. */
export const DayDetailCard: React.FC<DayDetailCardProps> = ({
  dateKey,
  shamsiDateLabel,
  log,
  notebookEntry,
  notebookItems,
  onDeleteDay,
  onDeleted,
}) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const checkedIds = notebookEntry?.checkedItemIds || [];

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3.5">
      {/* Header row, right-to-left: date | share | delete */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-sm font-bold text-[var(--text)]">{shamsiDateLabel}</span>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          title="اشتراک‌گذاری"
          aria-label="اشتراک‌گذاری"
          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setDeleteConfirmOpen(true)}
          title="حذف این روز"
          aria-label="حذف این روز"
          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {log && Object.keys(log.breakdown).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {Object.entries(log.breakdown).map(([id, item]) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 bg-[var(--bg)] text-[var(--muted)] text-[10px] px-2 py-0.5 rounded-lg border border-[var(--border)] tabular-nums-fa"
            >
              <span>{item.title}:</span>
              <strong className="text-[var(--text)]">{toPersianDigits(item.count)}</strong>
            </span>
          ))}
        </div>
      )}

      <div className="text-xs font-extrabold text-[var(--accent)] tabular-nums-fa mb-2.5">
        مجموع: {toPersianDigits(log?.totalCount || 0)} ذکر
      </div>

      <div className="space-y-1 pt-2 border-t border-[var(--border)]">
        {notebookItems.map((item) => {
          const done = checkedIds.includes(item.id);
          const reason = notebookEntry?.reasons?.[item.id];
          return (
            <div key={item.id} className="text-[11px]">
              <div className="flex items-center gap-1.5">
                {done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-[var(--muted)]/50 shrink-0" />
                )}
                <span className={done ? 'text-[var(--text)]' : 'text-[var(--muted)]'}>{item.text}</span>
              </div>
              {!done && reason && (reason.why || reason.solution) && (
                <div className="mr-5 mt-0.5 text-[10px] text-[var(--muted)] leading-relaxed">
                  {reason.why && <span>دلیل: {reason.why} </span>}
                  {reason.solution && <span>راه‌حل: {reason.solution}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {notebookEntry?.feelingText && (
        <p className="text-[11px] text-[var(--muted)] leading-relaxed pt-2 mt-2 border-t border-[var(--border)]">
          {notebookEntry.feelingText} {notebookEntry.stickers.join(' ')}
        </p>
      )}

      <DayShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        shamsiDateLabel={shamsiDateLabel}
        log={log}
        notebookEntry={notebookEntry}
        notebookItems={notebookItems}
      />

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="حذف تاریخچهٔ روز"
        message={DELETE_DAY_HISTORY_CONFIRM_MESSAGE}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          onDeleteDay(dateKey);
          setDeleteConfirmOpen(false);
          onDeleted?.();
        }}
      />
    </div>
  );
};
