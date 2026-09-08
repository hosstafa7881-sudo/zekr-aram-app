import React, { useMemo, useState } from 'react';
import { DailyLog } from '../../lib/db';
import { toPersianDigits, getShamsiDateInfo } from '../../utils/persian';
import { getJalaliMonthDays, shiftJalaliMonth } from '../../utils/jalali';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';

const WEEKDAY_HEADERS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

interface HistorySearchCalendarProps {
  dailyLogs: DailyLog[];
  onDeleteDay: (dateKey: string) => void;
}

export const HistorySearchCalendar: React.FC<HistorySearchCalendarProps> = ({ dailyLogs, onDeleteDay }) => {
  const todayInfo = getShamsiDateInfo();
  const [viewYear, setViewYear] = useState(todayInfo.year);
  const [viewMonth, setViewMonth] = useState(todayInfo.month);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const monthDays = useMemo(() => getJalaliMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const startWeekday = monthDays.length > 0 ? getShamsiDateInfo(monthDays[0].gregorianDate).weekdayIndex : 0;
  const monthName = monthDays[0] ? getShamsiDateInfo(monthDays[0].gregorianDate).monthName : '';

  const logByKey = useMemo(() => new Map(dailyLogs.map((l) => [l.dateKey, l])), [dailyLogs]);
  const selectedLog = selectedDateKey ? logByKey.get(selectedDateKey) : undefined;

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
          const isSelected = day.dateKey === selectedDateKey;

          return (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => setSelectedDateKey(day.dateKey)}
              className={`relative aspect-square flex items-center justify-center rounded-xl text-xs font-bold tabular-nums-fa transition-all ${
                isSelected
                  ? 'bg-[var(--accent)] text-[var(--bg)]'
                  : isToday
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/50'
                  : 'bg-[var(--bg)] text-[var(--text)] hover:bg-[var(--surface-2)]'
              }`}
            >
              {toPersianDigits(day.jalaliDay)}
              {hasData && (
                <span
                  className={`absolute bottom-1 w-1 h-1 rounded-full ${
                    isSelected ? 'bg-[var(--bg)]' : 'bg-[var(--success)]'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDateKey && (
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-3.5">
          {selectedLog ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[var(--text)]">{selectedLog.shamsiDate}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[var(--accent)] tabular-nums-fa">
                    مجموع: {toPersianDigits(selectedLog.totalCount)} ذکر
                  </span>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(true)}
                    title="حذف تاریخچهٔ این روز"
                    className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(selectedLog.breakdown).map(([id, item]) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 bg-[var(--surface)] text-[var(--muted)] text-[11px] px-2 py-0.5 rounded-lg border border-[var(--border)] tabular-nums-fa"
                  >
                    <span>{item.title}:</span>
                    <strong className="text-[var(--text)]">{toPersianDigits(item.count)}</strong>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-[var(--muted)] text-center py-2 leading-relaxed">
              داده‌ای برای این روز ثبت نشده. شاید تاریخ رو اشتباه وارد کردی یا شایدم شرایطش رو نداشتی ذکر بگی 🌿
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="حذف تاریخچهٔ روز"
        message="آیا از حذف ذکرهای ثبت‌شده‌ی این روز مطمئنی؟ این عمل قابل بازگشت نیست."
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          if (selectedDateKey) onDeleteDay(selectedDateKey);
          setDeleteConfirmOpen(false);
        }}
      />
    </div>
  );
};
