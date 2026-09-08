import React, { useState } from 'react';
import { X, Bell, CalendarHeart, Clock, Sparkles, Skull, PartyPopper } from 'lucide-react';
import { UserSettings } from '../../lib/db';
import { toPersianDigits } from '../../utils/persian';
import { getHijriDateInfo, formatHijriDate } from '../../utils/hijri';
import { getUpcomingOccasions } from '../../lib/occasions';
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

  if (!isOpen) return null;

  const todayHijri = getHijriDateInfo();
  const upcoming = getUpcomingOccasions(todayHijri);

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
                ? 'bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]'
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
                ? 'bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]'
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
                <input
                  type="time"
                  value={settings.reminderTime}
                  onChange={(e) => onUpdateSettings({ ...settings, reminderTime: e.target.value })}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-center text-lg font-bold text-[var(--text)] outline-none tabular-nums-fa"
                />
              </div>
            )}

            {permission === 'denied' && (
              <p className="text-[11px] text-[var(--danger)] leading-relaxed">
                دسترسی اعلان در مرورگر شما مسدود شده است. برای فعال‌سازی، از تنظیمات مرورگر اجازهٔ اعلان را برای این سایت فعال کنید.
              </p>
            )}

            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              توجه: چون ذکرآرام یک وب‌اپلیکیشن است، یادآوری فقط زمانی کار می‌کند که برنامه باز یا اخیراً باز بوده باشد. برای اعلان‌های کاملاً مطمئن حتی وقتی برنامه بسته است، نسخهٔ اندرویدی آینده از قابلیت اعلان‌های محلی سیستم‌عامل استفاده خواهد کرد.
            </p>
          </div>
        )}

        {tab === 'occasions' && (
          <div className="space-y-3">
            <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-2xl p-3 text-center">
              <div className="text-[11px] text-[var(--muted)] mb-0.5">امروز به تقویم قمری</div>
              <div className="text-sm font-bold text-[var(--text)]">{formatHijriDate(todayHijri)}</div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
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
                      {occ.daysUntil === 0
                        ? 'امروز'
                        : `${toPersianDigits(occ.daysUntil)} روز دیگر`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
