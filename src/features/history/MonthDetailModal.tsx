import React from 'react';
import { DailyLog } from '../../lib/db';
import { NotebookItemDef, NotebookDayEntry } from '../notebook/notebookTypes';
import { toPersianDigits } from '../../utils/persian';
import { JalaliMonthDay } from '../../utils/jalali';
import { X, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';

interface MonthDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthLabel: string;
  days: JalaliMonthDay[];
  dailyLogs: DailyLog[];
  notebookItems: NotebookItemDef[];
  notebookEntries: NotebookDayEntry[];
}

/** Full-page breakdown of every day of the given month: dhikr totals + which
 * notebook items were done/not-done that day (and why, when the user logged a reason). */
export const MonthDetailModal: React.FC<MonthDetailModalProps> = ({
  isOpen,
  onClose,
  monthLabel,
  days,
  dailyLogs,
  notebookItems,
  notebookEntries,
}) => {
  if (!isOpen) return null;

  const logByKey = new Map(dailyLogs.map((l) => [l.dateKey, l]));
  const entryByKey = new Map(notebookEntries.map((e) => [e.dateKey, e]));

  return (
    <div className="fixed inset-0 z-[65] bg-[var(--bg)] overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto px-3 pt-3 pb-8">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-[var(--bg)]/95 backdrop-blur-md pt-1 pb-2 -mx-3 px-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
          >
            <ChevronRight className="w-4 h-4" />
            بازگشت
          </button>
          <h2 className="text-sm font-bold text-[var(--text)]">جزئیات {monthLabel}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)]"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {[...days].reverse().map((day) => {
            const log = logByKey.get(day.dateKey);
            const entry = entryByKey.get(day.dateKey);
            const checkedIds = entry?.checkedItemIds || [];
            const hasAnyData = !!log || !!entry;

            return (
              <div
                key={day.dateKey}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3.5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-[var(--text)]">
                    روز {toPersianDigits(day.jalaliDay)}
                  </span>
                  <span className="text-xs font-extrabold text-[var(--accent)] tabular-nums-fa">
                    {toPersianDigits(log?.totalCount || 0)} ذکر
                  </span>
                </div>

                {!hasAnyData ? (
                  <p className="text-[11px] text-[var(--muted)]">این روز هیچ ذکر یا کار خوبی ثبت نشده است.</p>
                ) : (
                  <>
                    {log && Object.keys(log.breakdown).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
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

                    <div className="space-y-1 pt-2 border-t border-[var(--border)]">
                      {notebookItems.map((item) => {
                        const done = checkedIds.includes(item.id);
                        const reason = entry?.reasons?.[item.id];
                        return (
                          <div key={item.id} className="text-[11px]">
                            <div className="flex items-center gap-1.5">
                              {done ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-[var(--muted)]/50 shrink-0" />
                              )}
                              <span className={done ? 'text-[var(--text)]' : 'text-[var(--muted)]'}>
                                {item.text}
                              </span>
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

                    {entry?.feelingText && (
                      <p className="text-[11px] text-[var(--muted)] leading-relaxed pt-2 mt-2 border-t border-[var(--border)]">
                        {entry.feelingText} {entry.stickers.join(' ')}
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
