import React, { useEffect, useState } from 'react';
import { X, Bell, CalendarHeart, Clock, Sparkles, Skull, PartyPopper } from 'lucide-react';
import { UserSettings } from '../../lib/db';
import { toPersianDigits, getShamsiDateInfo } from '../../utils/persian';
import { getHijriDateInfo, formatHijriDate } from '../../utils/hijri';
import { getUpcomingOccasions } from '../../lib/occasions';
import { OccasionsCalendarGrid } from './OccasionsCalendarGrid';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
} from '../../lib/notifications';

interface NotificationBellPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (next: UserSettings) => void;
}

type PanelTab = 'reminder' | 'occasions';

export const NotificationBellPanel: React.FC<NotificationBellPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [tab, setTab] = useState<PanelTab>('reminder');
  const [permission, setPermission] = useState(getNotificationPermission());

  const [savedHour, savedMinute] = settings.reminderTime.split(':');
  // Local, free-form text mirrors of the hour/minute fields. Keeping these
  // separate from the padded "HH"/"MM" value stored in settings is the fix
  // for the reported bug: previously the input's `value` was always the
  // re-padded string derived straight from settings (e.g. typing "1" saved
  // "01:00" and then forced the field back to "01"), which fights every
  // keystroke and can make what the user typed appear to "change itself" or
  // fail to register. Now the field shows exactly what was typed and is
  // normalized (padded/clamped) only once, on blur.
  const [hourText, setHourText] = useState(savedHour);
  const [minuteText, setMinuteText] = useState(savedMinute);

  // Re-sync the local free-typing fields from settings each time the panel
  // opens (e.g. after a backup restore changed reminderTime while closed).
  useEffect(() => {
    if (isOpen) {
      setHourText(savedHour);
      setMinuteText(savedMinute);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const todayHijri = getHijriDateInfo();
  const todayShamsi = getShamsiDateInfo();
  const upcoming = getUpcomingOccasions(todayHijri);

  const handleHourChange = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 2);
    setHourText(digitsOnly);
  };

  const handleMinuteChange = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 2);
    setMinuteText(digitsOnly);
  };

  const commitHour = () => {
    const h = String(Math.min(23, Math.max(0, parseInt(hourText, 10) || 0))).padStart(2, '0');
    setHourText(h);
    onUpdateSettings({ ...settings, reminderTime: `${h}:${minuteText || savedMinute}` });
  };

  const commitMinute = () => {
    const m = String(Math.min(59, Math.max(0, parseInt(minuteText, 10) || 0))).padStart(2, '0');
    setMinuteText(m);
    onUpdateSettings({ ...settings, reminderTime: `${hourText || savedHour}:${m}` });
  };

  const handleToggleReminder = async () => {
    if (!settings.reminderEnabled) {
      if (isNotificationSupported() && getNotificationPermission() !== 'granted') {
        const result = await requestNotificationPermission();
        setPermission(result);
        if (result !== 'granted') return;
      }
      onUpdateSettings({ ...settings, reminderEnabled: true });
    } else {
      onUpdateSettings({ ...settings, reminderEnabled: false });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-[var(--surface)] border border-[var(--border)] sm:rounded-3xl rounded-t-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="text-base font-bold text-[var(--text)]">اعلانات و مناسبت‌ها</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 mt-4 mb-4">
          <button
            type="button"
            onClick={() => setTab('reminder')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              tab === 'reminder'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--bg)] text-[var(--muted)] border-[var(--border)]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            یادآوری روزانه
          </button>
          <button
            type="button"
            onClick={() => setTab('occasions')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              tab === 'occasions'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--bg)] text-[var(--muted)] border-[var(--border)]'
            }`}
          >
            <CalendarHeart className="w-3.5 h-3.5" />
            مناسبت‌های مذهبی
          </button>
        </div>

        {tab === 'reminder' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-3.5">
              <div>
                <div className="text-xs font-bold text-[var(--text)]">یادآوری روزانه‌ی ذکر</div>
                <div className="text-[11px] text-[var(--muted)] mt-0.5 leading-relaxed">
                  اگه تا ساعت مشخصی هنوز ذکری نگفته باشید، یک یادآوری ملایم دریافت می‌کنید.
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleReminder}
                className={`shrink-0 w-12 h-7 rounded-full transition-colors p-1 flex items-center ${
                  settings.reminderEnabled ? 'bg-[var(--accent)] justify-start' : 'bg-[var(--bg)] border border-[var(--border)] justify-end'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full transition-transform ${
                    settings.reminderEnabled ? 'bg-[var(--bg)]' : 'bg-[var(--muted)]'
                  }`}
                />
              </button>
            </div>

            {settings.reminderEnabled && (
              <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-3.5">
                <label className="block text-xs font-bold text-[var(--text)] mb-2">ساعت یادآوری:</label>
                {/* دقیقه first in markup so, under RTL, ساعت ends up on the left and دقیقه on the right. */}
                <div className="flex items-end justify-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-[var(--muted)]">دقیقه</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={minuteText}
                      onChange={(e) => handleMinuteChange(e.target.value)}
                      onBlur={commitMinute}
                      className="w-20 bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-2 py-2.5 text-center text-lg font-bold text-[var(--text)] outline-none tabular-nums-fa"
                      aria-label="دقیقه"
                    />
                  </div>
                  <span className="text-lg font-bold text-[var(--muted)] pb-2.5">:</span>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-[var(--muted)]">ساعت</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={hourText}
                      onChange={(e) => handleHourChange(e.target.value)}
                      onBlur={commitHour}
                      className="w-20 bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-2 py-2.5 text-center text-lg font-bold text-[var(--text)] outline-none tabular-nums-fa"
                      aria-label="ساعت"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-[var(--muted)] text-center mt-1.5">ساعت (۰ تا ۲۳) و دقیقه (۰ تا ۵۹) را وارد کنید</p>
              </div>
            )}

            {permission === 'denied' && (
              <p className="text-[11px] text-[var(--danger)] leading-relaxed">
                دسترسی اعلان در مرورگر شما مسدود شده است. برای فعال‌سازی، از تنظیمات مرورگر اجازهٔ اعلان را برای این سایت فعال کنید.
              </p>
            )}
          </div>
        )}

        {tab === 'occasions' && (
          <div className="space-y-3">
            <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-2xl p-3 text-center">
              <div className="text-[11px] text-[var(--muted)] mb-0.5">امروز</div>
              <div className="text-sm font-bold text-[var(--text)]">
                {todayShamsi.formattedFull} — {formatHijriDate(todayHijri)}
              </div>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {upcoming.map((occ) => (
                <div
                  key={occ.id}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border ${
                    occ.daysUntil === 0
                      ? 'bg-[var(--accent)]/15 border-[var(--accent)]'
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
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[var(--text)] leading-relaxed">{occ.title}</div>
                    <div className="text-[10px] text-[var(--muted)] mt-0.5">
                      {occ.daysUntil === 0 ? 'امروز' : `${toPersianDigits(occ.daysUntil)} روز دیگر`} · {occ.shamsiLabel}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[var(--border)]">
              <OccasionsCalendarGrid />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
