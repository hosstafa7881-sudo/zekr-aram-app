import React from 'react';
import { DailyLog } from '../../lib/db';
import { NotebookItemDef, NotebookDayEntry } from '../notebook/notebookTypes';
import { DayDetailCard } from './DayDetailCard';
import { NO_DATA_FOR_DAY_MESSAGE } from '../../lib/messages';
import { X, ChevronRight } from 'lucide-react';

interface DayFullDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  dateKey: string;
  shamsiDateLabel: string;
  log: DailyLog | undefined;
  notebookEntry: NotebookDayEntry | undefined;
  notebookItems: NotebookItemDef[];
  onDeleteDay: (dateKey: string) => void;
}

/** Standalone "جزئیات بیشتر" page for one day — reuses the exact same DayDetailCard as the "جزئیات ۳۰ روز اخیر" list (بخش ت #14). */
export const DayFullDetailView: React.FC<DayFullDetailViewProps> = ({
  isOpen,
  onClose,
  dateKey,
  shamsiDateLabel,
  log,
  notebookEntry,
  notebookItems,
  onDeleteDay,
}) => {
  if (!isOpen) return null;

  const hasAnyData = !!log || !!notebookEntry;

  return (
    <div className="fixed inset-0 z-[68] bg-[var(--bg)] overflow-y-auto">
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
          <h2 className="text-sm font-bold text-[var(--text)]">جزئیات بیشتر</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)]"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {hasAnyData ? (
          <DayDetailCard
            dateKey={dateKey}
            shamsiDateLabel={shamsiDateLabel}
            log={log}
            notebookEntry={notebookEntry}
            notebookItems={notebookItems}
            onDeleteDay={onDeleteDay}
            onDeleted={onClose}
          />
        ) : (
          <p className="text-xs text-[var(--muted)] text-center py-10 leading-relaxed">
            {NO_DATA_FOR_DAY_MESSAGE}
          </p>
        )}
      </div>
    </div>
  );
};
