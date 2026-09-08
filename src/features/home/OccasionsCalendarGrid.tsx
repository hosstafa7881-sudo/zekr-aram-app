import React, { useMemo, useState } from 'react';
import { toPersianDigits, getShamsiDateInfo } from '../../utils/persian';
import { getJalaliMonthDays, shiftJalaliMonth } from '../../utils/jalali';
import { getHijriDateInfo, formatHijriDate } from '../../utils/hijri';
import { RELIGIOUS_OCCASIONS, ReligiousOccasion } from '../../data/religiousOccasions';
import { ChevronRight, ChevronLeft, X, Sparkles, Skull, PartyPopper } from 'lucide-react';

const WEEKDAY_HEADERS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

interface DayOccasionInfo {
  dateKey: string;
  jalaliDay: number;
  hijriLabel: string;
  occasions: ReligiousOccasion[];
}

export const OccasionsCalendarGrid: React.FC = () => {
  const todayInfo = getShamsiDateInfo();
  const [viewYear, setViewYear] = useState(todayInfo.year);
  const [viewMonth, setViewMonth] = useState(todayInfo.month);
  const [selected, setSelected] = useState<DayOccasionInfo | null>(null);

  const monthDays = useMemo(() => getJalaliMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const startWeekday = monthDays.length > 0 ? getShamsiDateInfo(monthDays[0].gregorianDate).weekdayIndex : 0;
  const monthName = monthDays[0] ? getShamsiDateInfo(monthDays[0].gregorianDate).monthName : '';

  const dayInfos: DayOccasionInfo[] = useMemo(
    () =>
      monthDays.map((day) => {
        const hijri = getHijriDateInfo(day.gregorianDate);
        const occasions = RELIGIOUS_OCCASIONS.filter(
          (o) => o.hijriMonth === hijri.month && o.hijriDay === hijri.day
        );
        return {
          dateKey: day.dateKey,
          jalaliDay: day.jalaliDay,
          hijriLabel: formatHijriDate(hijri),
          occasions,
        };
      }),
    [monthDays]
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

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_HEADERS.map((w, i) => (
          <div key={i} className="text-[10px] font-bold text-[var(--muted)] py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startWeekday }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {dayInfos.map((day) => {
          const isToday = day.dateKey === todayInfo.dateKey;
          const hasOccasion = day.occasions.length > 0;

          return (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => (hasOccasion ? setSelected(day) : undefined)}
              className={`relative aspect-square flex items-center justify-center rounded-xl text-xs font-bold tabular-nums-fa transition-all ${
                hasOccasion
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/50'
                  : isToday
                  ? 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]'
                  : 'bg-[var(--bg)] text-[var(--text)]'
              }`}
            >
              {toPersianDigits(day.jalaliDay)}
              {hasOccasion && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[var(--accent)]" />
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--accent)]/40 rounded-3xl p-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute top-3 left-3 p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)]"
              aria-label="بستن"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-xs text-[var(--muted)] mb-3">
              {toPersianDigits(selected.jalaliDay)} {monthName} — {selected.hijriLabel}
            </div>
            <div className="space-y-2">
              {selected.occasions.map((occ) => (
                <div key={occ.id} className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                  <div className="shrink-0 mt-0.5">
                    {occ.type === 'birth' ? (
                      <Sparkles className="w-4 h-4 text-[var(--success)]" />
                    ) : occ.type === 'martyrdom' ? (
                      <Skull className="w-4 h-4 text-[var(--muted)]" />
                    ) : (
                      <PartyPopper className="w-4 h-4 text-[var(--accent)]" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-[var(--text)] leading-relaxed">{occ.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
