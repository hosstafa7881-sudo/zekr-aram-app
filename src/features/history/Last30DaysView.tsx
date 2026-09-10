import React from 'react';
import { DailyLog } from '../../lib/db';
import { NotebookItemDef, NotebookDayEntry } from '../notebook/notebookTypes';
import { getShamsiDateInfo, toPersianDigits } from '../../utils/persian';
import { RollingDay } from '../../utils/jalali';
import { DayDetailCard } from './DayDetailCard';
import { X, ChevronRight } from 'lucide-react';

/** "۱۹ شهریور ۱۴۰۵" — day + month + year, no weekday name (per بخش ت #12د's example). */
function formatFullShamsiDate(date: Date): string {
  const info = getShamsiDateInfo(date);
  return `${toPersianDigits(info.day)} ${info.monthName} ${toPersianDigits(info.year)}`;
}

interface Last30DaysViewProps {
  isOpen: boolean;
  onClose: () => void;
  days: RollingDay[];
  dailyLogs: DailyLog[];
  notebookItems: NotebookItemDef[];
  notebookEntries: NotebookDayEntry[];
  onDeleteDay: (dateKey: string) => void;
}

/** Rolling last-30-days breakdown (بخش ت #12) — not a calendar month. Days
 * with no dhikr and no notebook activity are dropped entirely rather than
 * shown as an empty card. */
export const Last30DaysView: React.FC<Last30DaysViewProps> = ({
  isOpen,
  onClose,
  days,
  dailyLogs,
  notebookItems,
  notebookEntries,
  onDeleteDay,
}) => {
  if (!isOpen) return null;

  const logByKey = new Map(dailyLogs.map((l) => [l.dateKey, l]));
  const entryByKey = new Map(notebookEntries.map((e) => [e.dateKey, e]));

  const activeDays = days
    .map((day) => ({
      day,
      log: logByKey.get(day.dateKey),
      entry: entryByKey.get(day.dateKey),
    }))
    .filter(({ log, entry }) => !!log || !!entry);

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
          <h2 className="text-sm font-bold text-[var(--text)]">جزئیات ۳۰ روز اخیر</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)]"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {activeDays.length === 0 ? (
          <p className="text-xs text-[var(--muted)] text-center py-10 leading-relaxed">
            در ۳۰ روز اخیر هیچ ذکر یا کار خوبی ثبت نشده است.
          </p>
        ) : (
          <div className="space-y-2.5">
            {activeDays.map(({ day, log, entry }) => (
              <DayDetailCard
                key={day.dateKey}
                dateKey={day.dateKey}
                shamsiDateLabel={formatFullShamsiDate(day.gregorianDate)}
                log={log}
                notebookEntry={entry}
                notebookItems={notebookItems}
                onDeleteDay={onDeleteDay}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
