import React, { useMemo, useState } from 'react';
import { toPersianDigits, getShamsiDateInfo } from '../../utils/persian';
import { getJalaliMonthDays, shiftJalaliMonth } from '../../utils/jalali';
import { getHijriDateInfo, formatHijriDate } from '../../utils/hijri';
import { RELIGIOUS_OCCASIONS, ReligiousOccasion } from '../../data/religiousOccasions';
import { NATIONAL_HOLIDAYS, NationalHoliday } from '../../data/nationalHolidays';
import { ChevronRight, ChevronLeft, X, Sparkles, Skull, PartyPopper, CalendarOff } from 'lucide-react';

const WEEKDAY_HEADERS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const WEEKEND_HOLIDAY_REASON = 'تعطیل رسمی: آخر هفته';

interface DayOccasionInfo {
  dateKey: string;
  jalaliDay: number;
  weekdayIndex: number;
  hijriLabel: string;
  occasions: ReligiousOccasion[];
  nationalHolidays: NationalHoliday[];
  isWeekend: boolean;
  isOfficialHoliday: boolean;
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
        const shamsi = getShamsiDateInfo(day.gregorianDate);
        const hijri = getHijriDateInfo(day.gregorianDate);
        const occasions = RELIGIOUS_OCCASIONS.filter(
          (o) => o.hijriMonth === hijri.month && o.hijriDay === hijri.day
        );
        const nationalHolidays = NATIONAL_HOLIDAYS.filter(
          (h) => h.jalaliMonth === viewMonth && h.jalaliDay === day.jalaliDay
        );
        const isWeekend = shamsi.weekdayIndex === 6; // جمعه
        const isOfficialHoliday =
          isWeekend || nationalHolidays.length > 0 || occasions.some((o) => o.isOfficialHoliday);
        return {
          dateKey: day.dateKey,
          jalaliDay: day.jalaliDay,
          weekdayIndex: shamsi.weekdayIndex,
          hijriLabel: formatHijriDate(hijri),
          occasions,
          nationalHolidays,
          isWeekend,
          isOfficialHoliday,
        };
      }),
    [monthDays, viewMonth]
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
          const isClickable = hasOccasion || day.isOfficialHoliday;

          return (
            <button
              key={day.dateKey}
              type="button"
              disabled={!isClickable}
              onClick={() => (isClickable ? setSelected(day) : undefined)}
              className={`relative aspect-square flex items-center justify-center rounded-xl text-xs font-bold tabular-nums-fa transition-all ${
                day.isOfficialHoliday
                  ? 'bg-[var(--danger)]/12 text-[var(--danger)] border border-[var(--danger)]/45'
                  : hasOccasion
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/50'
                  : isToday
                  ? 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]'
                  : 'bg-[var(--bg)] text-[var(--text)]'
              }`}
            >
              {toPersianDigits(day.jalaliDay)}
              {isClickable && (
                <span
                  className={`absolute bottom-1 w-1 h-1 rounded-full ${
                    day.isOfficialHoliday ? 'bg-[var(--danger)]' : 'bg-[var(--accent)]'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 text-[10px] text-[var(--muted)] pt-1">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--danger)]/40 border border-[var(--danger)]/60" />
          تعطیل رسمی
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]/40 border border-[var(--accent)]/60" />
          مناسبت (غیر تعطیل)
        </span>
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
              {selected.nationalHolidays.map((h) => (
                <div key={h.id} className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30">
                  <CalendarOff className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
                  <span className="text-xs font-bold text-[var(--text)] leading-relaxed">تعطیل رسمی: {h.title}</span>
                </div>
              ))}
              {selected.isWeekend && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30">
                  <CalendarOff className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
                  <span className="text-xs font-bold text-[var(--text)] leading-relaxed">{WEEKEND_HOLIDAY_REASON}</span>
                </div>
              )}
              {selected.occasions.map((occ) => (
                <div
                  key={occ.id}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border ${
                    occ.isOfficialHoliday
                      ? 'bg-[var(--danger)]/10 border-[var(--danger)]/30'
                      : 'bg-[var(--bg)] border-[var(--border)]'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {occ.type === 'birth' ? (
                      <Sparkles className="w-4 h-4 text-[var(--success)]" />
                    ) : occ.type === 'martyrdom' ? (
                      <Skull className="w-4 h-4 text-[var(--muted)]" />
                    ) : (
                      <PartyPopper className="w-4 h-4 text-[var(--accent)]" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-[var(--text)] leading-relaxed">
                    {occ.isOfficialHoliday ? `تعطیل رسمی: ${occ.title}` : occ.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
