import React, { useMemo, useState } from 'react';
import { DailyLog } from '../../lib/db';
import { NotebookItemDef, NotebookDayEntry } from '../notebook/notebookTypes';
import { toPersianDigits, getShamsiDateInfo } from '../../utils/persian';
import { getJalaliMonthDays, shiftJalaliMonth } from '../../utils/jalali';
import { HistoryDayDetailModal } from './HistoryDayDetailModal';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const WEEKDAY_HEADERS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

interface HistorySearchCalendarProps {
  dailyLogs: DailyLog[];
  notebookItems: NotebookItemDef[];
  notebookEntries: NotebookDayEntry[];
  onDeleteDay: (dateKey: string) => void;
}

export const HistorySearchCalendar: React.FC<HistorySearchCalendarProps> = ({
  dailyLogs,
  notebookItems,
  notebookEntries,
  onDeleteDay,
}) => {
  const todayInfo = getShamsiDateInfo();
  const [viewYear, setViewYear] = useState(todayInfo.year);
  const [viewMonth, setViewMonth] = useState(todayInfo.month);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const monthDays = useMemo(() => getJalaliMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const startWeekday = monthDays.length > 0 ? getShamsiDateInfo(monthDays[0].gregorianDate).weekdayIndex : 0;
  const monthName = monthDays[0] ? getShamsiDateInfo(monthDays[0].gregorianDate).monthName : '';

  const logByKey = useMemo(() => new Map(dailyLogs.map((l) => [l.dateKey, l])), [dailyLogs]);
  const notebookByKey = useMemo(
    () => new Map(notebookEntries.map((e) => [e.dateKey, e])),
    [notebookEntries]
  );

  const goPrevMonth = () => {
    const { jy, jm } = shiftJalaliMonth(viewYear, viewMonth, -1);
    setViewYear(jy);
    setViewMonth(jm);
  };
  const goNextMonth = () => {
    const { jy, jm } = shiftJalaliMonth(viewYear, viewMonth, 1);
    setViewYear(jy);
    setViewMonth(jm);
  };

  return (
    <div className="space-y-3">
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrevMonth}
          className="p-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
          aria-label="ماه قبل"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="text-sm font-bold text-[var(--text)]">
          {monthName} {toPersianDigits(viewYear)}
        </div>
        <button
          type="button"
          onClick={goNextMonth}
          className="p-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
          aria-label="ماه بعد"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_HEADERS.map((w, i) => (
          <div key={i} className="text-[10px] font-bold text-[var(--muted)] py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startWeekday }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {monthDays.map((day) => {
          const hasData = logByKey.has(day.dateKey);
          const isToday = day.dateKey === todayInfo.dateKey;

          return (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => setSelectedDateKey(day.dateKey)}
              className={`relative aspect-square flex items-center justify-center rounded-xl text-xs font-bold tabular-nums-fa transition-all ${
                isToday
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/50'
                  : 'bg-[var(--bg)] text-[var(--text)] hover:bg-[var(--surface-2)]'
              }`}
            >
              {toPersianDigits(day.jalaliDay)}
              {hasData && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[var(--success)]" />
              )}
            </button>
          );
        })}
      </div>

      <HistoryDayDetailModal
        isOpen={selectedDateKey !== null}
        onClose={() => setSelectedDateKey(null)}
        log={selectedDateKey ? logByKey.get(selectedDateKey) : undefined}
        notebookEntry={selectedDateKey ? notebookByKey.get(selectedDateKey) : undefined}
        notebookItems={notebookItems}
        onDeleteDay={onDeleteDay}
      />
    </div>
  );
};
