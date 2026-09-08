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
import {
  Calendar,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Award,
} from 'lucide-react';

interface HistoryBackupViewProps {
  dhikrs: DhikrItem[];
  activeDhikrId: string;
  dailyLogs: DailyLog[];
  settings: UserSettings;
  onRestoreBackup: (payload: BackupPayload) => void;
}

export const HistoryBackupView: React.FC<HistoryBackupViewProps> = ({
  dhikrs,
  activeDhikrId,
  dailyLogs,
  settings,
  onRestoreBackup,
}) => {
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const shamsiToday = getShamsiDateInfo();
  const todayLog = dailyLogs.find((l) => l.dateKey === shamsiToday.dateKey);
  const todayCount = todayLog ? todayLog.totalCount : 0;

  const totalLifetimeCount = dhikrs.reduce(
    (sum, item) => sum + (item.totalAllTime || 0),
    0
  );

  // Prepare last 7 days chart data
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

  // Handle JSON Backup Download
  const handleExportJSON = () => {
    try {
      const jsonStr = exportBackupJSON(dhikrs, activeDhikrId, dailyLogs, settings);
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
      setStatusMessage({
        type: 'error',
        text: 'خطا در ساخت فایل پشتیبان.',
      });
    }
  };

  // Handle JSON Backup File Upload
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
        setStatusMessage({
          type: 'error',
          text: err?.message || 'فایل انتخاب‌شده معتبر نیست.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto px-3 pt-2 pb-6 space-y-4">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--surface)] border border-[var(--accent)]/30 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--muted)] text-xs mb-1">
            <span>ذکرهای امروز</span>
            <Calendar className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="text-3xl font-black text-[var(--text)] tabular-nums-fa">
            {toPersianDigits(todayCount)}
          </div>
          <div className="text-[11px] text-[var(--accent)] mt-1">
            {shamsiToday.formattedFull}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--muted)] text-xs mb-1">
            <span>مجموع کل ذکرها</span>
            <Award className="w-4 h-4 text-[var(--success)]" />
          </div>
          <div className="text-3xl font-black text-[var(--accent)] tabular-nums-fa">
            {toPersianDigits(totalLifetimeCount)}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">
            ذخیره خودکار و دائمی روی دستگاه
          </div>
        </div>
      </div>

      {/* 7-Day Shamsi Visual Bar Chart */}
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

      {/* Backup & Restore Card (Anti-Data-Loss Guarantee) */}
      <div className="bg-[var(--surface)] border border-[var(--accent)]/35 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-[var(--text)] mb-1">
          پشتیبان‌گیری و انتقال امن اطلاعات (JSON)
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
            className="flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-[var(--bg)] text-xs font-bold py-3 px-4 rounded-xl shadow-md transition-all"
          >
            <Download className="w-4 h-4" />
            <span>دانلود فایل پشتیبان (JSON)</span>
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

      {/* Daily Breakdown Log List */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
        <h3 className="text-sm font-bold text-[var(--text)] mb-3">
          ریز آمار روزهای گذشته
        </h3>

        {dailyLogs.length === 0 ? (
          <p className="text-xs text-[var(--muted)] text-center py-6">
            هنوز آماری ثبت نشده است. با اولین ضربه روی شمارنده، آمار امروز ثبت می‌شود.
          </p>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {dailyLogs.slice(0, 14).map((log) => (
              <div
                key={log.dateKey}
                className="bg-[var(--bg)]/80 border border-[var(--border)] rounded-xl p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[var(--text)]">
                    {log.shamsiDate}
                  </span>
                  <span className="text-xs font-extrabold text-[var(--accent)] tabular-nums-fa">
                    مجموع: {toPersianDigits(log.totalCount)} ذکر
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(log.breakdown).map(([id, item]) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 bg-[var(--surface)] text-[var(--muted)] text-[11px] px-2 py-0.5 rounded-lg border border-[var(--border)] tabular-nums-fa"
                    >
                      <span>{item.title}:</span>
                      <strong className="text-[var(--text)]">
                        {toPersianDigits(item.count)}
                      </strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
