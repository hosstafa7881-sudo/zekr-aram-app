import React, { useState, useRef } from 'react';
import { DhikrItem } from '../../lib/seedData';
import {
  DailyLog,
  UserSettings,
  exportBackupJSON,
  parseAndValidateBackupJSON,
  BackupPayload,
} from '../../lib/db';
import { toPersianDigits, getShamsiDateInfo } from '../../utils/persian';
import { computeLifetimeTotal, computeStarCount, computeEarnedBadges, BADGE_LEVELS } from '../../lib/gamification';
import { LockedFeatureId } from '../../lib/subscription';
import { NotebookItemDef, NotebookDayEntry } from '../notebook/notebookTypes';
import { HistorySearchCalendar } from './HistorySearchCalendar';
import { MonthDetailModal } from './MonthDetailModal';
import { getJalaliMonthDays } from '../../utils/jalali';
import {
  Calendar,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ListChecks,
  ChevronRight,
  Lock,
  Eye,
  Star,
  NotebookPen,
} from 'lucide-react';

interface HistoryBackupViewProps {
  dhikrs: DhikrItem[];
  activeDhikrId: string;
  dailyLogs: DailyLog[];
  settings: UserSettings;
  notebookItems: NotebookItemDef[];
  notebookEntries: NotebookDayEntry[];
  onRestoreBackup: (payload: BackupPayload) => void;
  onDeleteDailyLog: (dateKey: string) => void;
  guard: (featureId: LockedFeatureId, onAllowed: () => void, customLockedMessage?: string) => void;
}

export const HistoryBackupView: React.FC<HistoryBackupViewProps> = ({
  dhikrs,
  activeDhikrId,
  dailyLogs,
  settings,
  notebookItems,
  notebookEntries,
  onRestoreBackup,
  onDeleteDailyLog,
  guard,
}) => {
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isMonthDetailOpen, setIsMonthDetailOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const shamsiToday = getShamsiDateInfo();
  const totalLifetimeCount = computeLifetimeTotal(dailyLogs);
  const starCount = computeStarCount(totalLifetimeCount);
  const earnedBadges = computeEarnedBadges(totalLifetimeCount);
  const starLabel = starCount < 10 ? '⭐'.repeat(starCount) : `${toPersianDigits(starCount)} ⭐`;

  // This month (Jalali) summary
  const thisMonthLogs = dailyLogs.filter((l) => {
    const info = getShamsiDateInfo(new Date(l.dateKey + 'T00:00:00'));
    return info.year === shamsiToday.year && info.month === shamsiToday.month;
  });
  const thisMonthTotal = thisMonthLogs.reduce((sum, l) => sum + l.totalCount, 0);
  const thisMonthBreakdown = new Map<string, { title: string; count: number }>();
  thisMonthLogs.forEach((l) => {
    Object.entries(l.breakdown).forEach(([id, item]) => {
      const existing = thisMonthBreakdown.get(id);
      thisMonthBreakdown.set(id, { title: item.title, count: (existing?.count || 0) + item.count });
    });
  });

  // Notebook completion for this month
  const thisMonthNotebookEntries = notebookEntries.filter((e) => {
    const info = getShamsiDateInfo(new Date(e.dateKey + 'T00:00:00'));
    return info.year === shamsiToday.year && info.month === shamsiToday.month;
  });
  const thisMonthNotebookDaysWithProgress = thisMonthNotebookEntries.filter(
    (e) => e.checkedItemIds.length > 0
  ).length;

  // Last 7 days chart data
  const last7Days = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - idx));
    const info = getShamsiDateInfo(d);
    const foundLog = dailyLogs.find((l) => l.dateKey === info.dateKey);
    return {
      dateKey: info.dateKey,
      weekdayName: info.weekdayName,
      dayNum: info.day,
      monthName: info.monthName,
      count: foundLog ? foundLog.totalCount : 0,
    };
  });
  const maxDayCount = Math.max(100, ...last7Days.map((d) => d.count));

  const handleExportJSON = () => {
    try {
      const jsonStr = exportBackupJSON(dhikrs, activeDhikrId, dailyLogs, settings, notebookItems, notebookEntries);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zikraram-backup-${shamsiToday.dateKey}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: 'success',
        text: 'فایل پشتیبان با موفقیت دانلود شد. می‌توانید آن را در جای امن نگه دارید.',
      });
    } catch {
      setStatusMessage({ type: 'error', text: 'خطا در ساخت فایل پشتیبان.' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const payload = parseAndValidateBackupJSON(content);
        onRestoreBackup(payload);
        setStatusMessage({
          type: 'success',
          text: 'اطلاعات، آمار و ذکرهای شما با موفقیت از فایل پشتیبان بازیابی شد!',
        });
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err?.message || 'فایل انتخاب‌شده معتبر نیست.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const backupSection = (
    <div className="bg-[var(--surface)] border border-[var(--accent)]/35 rounded-2xl p-4">
      <h3 className="text-sm font-bold text-[var(--text)] mb-1">
        پشتیبان‌گیری و انتقال امن اطلاعات
      </h3>
      <p className="text-xs text-[var(--muted)] leading-relaxed mb-3.5">
        تمام آمار و ذکرهای شما به صورت خودکار در حافظهٔ مرورگر (IndexedDB) ذخیره می‌شوند. برای اطمینان ۱۰۰٪ هنگام تعویض گوشی یا بروزرسانی، می‌توانید فایل پشتیبان تهیه کنید.
      </p>

      {statusMessage && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold mb-3 border ${
            statusMessage.type === 'success'
              ? 'bg-[var(--success)]/15 border-[var(--success)] text-[var(--success)]'
              : 'bg-[var(--danger)]/15 border-[var(--danger)] text-[var(--danger)]'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleExportJSON}
          className="flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-xs font-bold py-3 px-4 rounded-xl shadow-md transition-all"
        >
          <Download className="w-4 h-4" />
          <span>دانلود فایل پشتیبان</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 bg-[var(--bg)] hover:bg-[var(--surface-2)] text-[var(--text)] border border-[var(--accent)]/40 text-xs font-bold py-3 px-4 rounded-xl transition-all"
        >
          <Upload className="w-4 h-4 text-[var(--accent)]" />
          <span>بازگردانی از فایل پشتیبان</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );

  if (!isDetailOpen) {
    return (
      <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto px-3 pt-2 pb-6 space-y-4">
        <button
          type="button"
          onClick={() => guard('history-stats', () => setIsDetailOpen(true))}
          className="w-full flex items-center gap-3 bg-[var(--surface)] border border-[var(--accent)]/30 rounded-3xl p-5 text-right shadow-sm hover:border-[var(--accent)]/60 transition-all"
        >
          <div className="w-11 h-11 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] shrink-0">
            {settings.isProUser ? <BarChart3 className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-[var(--text)]">ریزآمار روزهای گذشته</div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">
              این ماه، نمودار ۷ روز اخیر، جست‌وجوی تقویمی، دفترچه و مدال‌ها
            </div>
          </div>
          <Eye className="w-4 h-4 text-[var(--muted)] shrink-0" />
        </button>

        {backupSection}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto px-3 pt-2 pb-6 space-y-4">
      <button
        type="button"
        onClick={() => setIsDetailOpen(false)}
        className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)] w-fit"
      >
        <ChevronRight className="w-4 h-4" />
        بازگشت
      </button>

      {/* Star & badge summary */}
      <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3">
        <Star className="w-4 h-4 text-[var(--accent)] shrink-0" />
        <span className="text-xs font-bold text-[var(--text)]">
          {starCount > 0 ? starLabel : 'هنوز ستاره‌ای نگرفته‌اید'}
        </span>
        <div className="flex items-center gap-1 mr-auto">
          {BADGE_LEVELS.filter((b) => earnedBadges.includes(b.id)).map((b) => (
            <span key={b.id} className="text-base" title={b.label}>
              {b.emoji}
            </span>
          ))}
        </div>
      </div>

      {/* This month */}
      <button
        type="button"
        onClick={() => setIsMonthDetailOpen(true)}
        className="w-full text-right bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/50 rounded-2xl p-4 transition-all"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--text)]">این ماه</h3>
          </div>
          <span className="text-xs font-extrabold text-[var(--accent)] tabular-nums-fa">
            {toPersianDigits(thisMonthTotal)} ذکر
          </span>
        </div>
        {thisMonthBreakdown.size === 0 ? (
          <p className="text-xs text-[var(--muted)] text-center py-2">هنوز این ماه ذکری ثبت نشده است.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Array.from(thisMonthBreakdown.entries()).map(([id, item]) => (
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
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] pt-2 border-t border-[var(--border)]">
          <NotebookPen className="w-3.5 h-3.5 text-[var(--accent)]" />
          دفترچهٔ کارهای خوب: {toPersianDigits(thisMonthNotebookDaysWithProgress)} روز از این ماه ثبت شده
        </div>
      </button>

      {/* 7-day chart */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--text)]">نمودار ۷ روز اخیر (تقویم شمسی)</h3>
          </div>
          <span className="text-xs text-[var(--muted)]">بر اساس روز</span>
        </div>

        <div className="grid grid-cols-7 gap-2 items-end h-36 pt-4 pb-1 px-1">
          {last7Days.map((day) => {
            const heightPct = Math.max(8, Math.round((day.count / maxDayCount) * 100));
            const isToday = day.dateKey === shamsiToday.dateKey;

            return (
              <div key={day.dateKey} className="flex flex-col items-center h-full justify-end">
                <div className="text-[10px] font-bold text-[var(--muted)] tabular-nums-fa mb-1">
                  {day.count > 0 ? toPersianDigits(day.count) : ''}
                </div>
                <div className="w-full max-w-[28px] bg-[var(--bg)] rounded-t-lg h-24 flex items-end overflow-hidden border border-[var(--border)]">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      isToday
                        ? 'bg-gradient-to-t from-[var(--accent-dark)] to-[var(--accent)]'
                        : day.count > 0
                        ? 'bg-[var(--success)]/70'
                        : 'bg-[var(--border)]'
                    }`}
                  />
                </div>
                <div
                  className={`text-[10px] font-bold mt-1.5 ${
                    isToday ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                  }`}
                >
                  {day.weekdayName}
                </div>
                <div className="text-[9px] text-[var(--muted)]/70 tabular-nums-fa">
                  {toPersianDigits(day.dayNum)} {day.monthName}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Jalali search calendar */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-bold text-[var(--text)]">جست‌وجوی تاریخچه (تقویم شمسی)</h3>
        </div>
        <HistorySearchCalendar
          dailyLogs={dailyLogs}
          notebookItems={notebookItems}
          notebookEntries={notebookEntries}
          onDeleteDay={onDeleteDailyLog}
        />
      </div>

      {backupSection}

      <MonthDetailModal
        isOpen={isMonthDetailOpen}
        onClose={() => setIsMonthDetailOpen(false)}
        monthLabel={`${shamsiToday.monthName} ${toPersianDigits(shamsiToday.year)}`}
        days={getJalaliMonthDays(shamsiToday.year, shamsiToday.month).filter((d) => d.jalaliDay <= shamsiToday.day)}
        dailyLogs={dailyLogs}
        notebookItems={notebookItems}
        notebookEntries={notebookEntries}
      />
    </div>
  );
};
