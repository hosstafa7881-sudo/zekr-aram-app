import React, { useEffect, useState } from 'react';
import {
  X,
  Bell,
  CalendarHeart,
  Clock,
  Sparkles,
  Skull,
  PartyPopper,
  Pencil,
  RotateCcw,
  Send,
  Check,
} from 'lucide-react';
import { UserSettings } from '../../lib/db';
import { toPersianDigits, getShamsiDateInfo } from '../../utils/persian';
import { getHijriDateInfo, formatHijriDate } from '../../utils/hijri';
import { getUpcomingOccasions } from '../../lib/occasions';
import { OccasionsCalendarGrid } from './OccasionsCalendarGrid';
import { useToast } from '../../components/ToastProvider';
import {
  REMINDER_MESSAGE_MAX_LENGTH,
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  resolveReminderMessage,
  sendTestNotification,
} from '../../lib/notifications';
import {
  REMINDER_EXPLAINER,
  REMINDER_EXPLAINER_NOTE,
  REMINDER_PERMISSION_DENIED_MESSAGE,
  REMINDER_SAVED_TOAST,
} from '../../lib/messages';

interface NotificationBellPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (next: UserSettings) => void;
}

type PanelTab = 'reminder' | 'occasions';

const Toggle: React.FC<{ on: boolean; onToggle: () => void; label: string }> = ({
  on,
  onToggle,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={onToggle}
    className={`shrink-0 w-12 h-7 rounded-full transition-colors p-1 flex items-center ${
      on
        ? 'bg-[var(--accent)] justify-start'
        : 'bg-[var(--bg)] border border-[var(--border)] justify-end'
    }`}
  >
    <span
      className={`w-5 h-5 rounded-full transition-transform ${
        on ? 'bg-[var(--bg)]' : 'bg-[var(--muted)]'
      }`}
    />
  </button>
);

export const NotificationBellPanel: React.FC<NotificationBellPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [tab, setTab] = useState<PanelTab>('reminder');
  const [permission, setPermission] = useState(getNotificationPermission());
  const { showToast } = useToast();

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
  const [isCustomOpen, setIsCustomOpen] = useState(
    (settings.reminderCustomMessage || '').length > 0
  );
  const [customDraft, setCustomDraft] = useState(settings.reminderCustomMessage || '');

  // Re-sync the local free-typing fields from settings each time the panel
  // opens (e.g. after a backup restore changed reminderTime while closed).
  useEffect(() => {
    if (isOpen) {
      setHourText(savedHour);
      setMinuteText(savedMinute);
      setCustomDraft(settings.reminderCustomMessage || '');
      setIsCustomOpen((settings.reminderCustomMessage || '').length > 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const todayHijri = getHijriDateInfo();
  const todayShamsi = getShamsiDateInfo();
  const upcoming = getUpcomingOccasions(todayHijri);
  const previewMessage = resolveReminderMessage(customDraft);

  const handleHourChange = (raw: string) => setHourText(raw.replace(/\D/g, '').slice(0, 2));
  const handleMinuteChange = (raw: string) => setMinuteText(raw.replace(/\D/g, '').slice(0, 2));

  const normalizedHour = () =>
    String(Math.min(23, Math.max(0, parseInt(hourText, 10) || 0))).padStart(2, '0');
  const normalizedMinute = () =>
    String(Math.min(59, Math.max(0, parseInt(minuteText, 10) || 0))).padStart(2, '0');

  const commitHour = () => {
    const h = normalizedHour();
    setHourText(h);
    onUpdateSettings({ ...settings, reminderTime: `${h}:${minuteText || savedMinute}` });
  };

  const commitMinute = () => {
    const m = normalizedMinute();
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

  const handleCustomChange = (raw: string) => {
    setCustomDraft(raw.slice(0, REMINDER_MESSAGE_MAX_LENGTH));
  };

  const handleResetCustom = () => {
    setCustomDraft('');
    onUpdateSettings({ ...settings, reminderCustomMessage: '' });
  };

  const handleSendTest = async () => {
    const result = await sendTestNotification(previewMessage);
    if (result === 'denied') {
      setPermission(getNotificationPermission());
      showToast(REMINDER_PERMISSION_DENIED_MESSAGE, { kind: 'info', durationMs: 6000 });
    } else if (result === 'unsupported') {
      showToast('مرورگر شما از نمایش اعلان پشتیبانی نمی‌کند.', { kind: 'info' });
    }
  };

  const handleSaveReminder = async () => {
    if (isNotificationSupported() && getNotificationPermission() !== 'granted') {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result !== 'granted') {
        showToast(REMINDER_PERMISSION_DENIED_MESSAGE, { kind: 'info', durationMs: 6000 });
        return;
      }
    }
    const time = `${normalizedHour()}:${normalizedMinute()}`;
    setHourText(normalizedHour());
    setMinuteText(normalizedMinute());
    onUpdateSettings({
      ...settings,
      reminderEnabled: true,
      reminderTime: time,
      reminderCustomMessage: customDraft.trim(),
    });
    showToast(REMINDER_SAVED_TOAST(toPersianDigits(time)), { kind: 'success', durationMs: 5000 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
      <div
        data-testid="bell-panel"
        className="w-full sm:max-w-md bg-[var(--surface)] border border-[var(--border)] sm:rounded-3xl rounded-t-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="text-base font-bold text-[var(--text)]">اعلانات و مناسبت‌ها</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)]"
            aria-label="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 mt-4 mb-4">
          <button
            type="button"
            data-testid="tab-reminder"
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
            data-testid="tab-occasions"
            onClick={() => setTab('occasions')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              tab === 'occasions'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--bg)] text-[var(--muted)] border-[var(--border)]'
            }`}
          >
            <CalendarHeart className="w-3.5 h-3.5" />
            {/* مورد ۲۱الف — no longer «مناسبت‌های مذهبی»: this tab now also
                covers the official non-religious days. */}
            مناسبت‌ها
          </button>
        </div>

        {tab === 'reminder' && (
          <div className="space-y-4">
            {/* مورد ۲۰ — the switch stays at the top. While it is off, nothing
                else is shown; turning it on reveals the rest of the tab. */}
            <div className="flex items-center justify-between bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-3.5">
              <div className="flex items-center gap-2">
                <span className="text-base">🔔</span>
                <span className="text-xs font-bold text-[var(--text)]">یادآوری روزانه</span>
              </div>
              <Toggle
                on={settings.reminderEnabled}
                onToggle={handleToggleReminder}
                label="یادآوری روزانه"
              />
            </div>

            {settings.reminderEnabled && (
              <div data-testid="reminder-body" className="space-y-4">
                <div className="text-[11px] text-[var(--muted)] leading-relaxed">
                  <p>{REMINDER_EXPLAINER}</p>
                  <p className="mt-0.5">{REMINDER_EXPLAINER_NOTE}</p>
                </div>

                <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-3.5">
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
                  <p className="text-[10px] text-[var(--muted)] text-center mt-1.5">
                    ساعت (۰ تا ۲۳) و دقیقه (۰ تا ۵۹) را وارد کنید
                  </p>
                </div>

                {/* Live preview of the exact message the phone will show. */}
                <div>
                  <div className="text-[11px] font-bold text-[var(--text)] mb-1.5">
                    پیامی که روی گوشیت می‌بینی:
                  </div>
                  <p
                    data-testid="reminder-preview"
                    className="text-[11px] text-[var(--muted)] leading-relaxed bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-3"
                  >
                    «{previewMessage}»
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    data-testid="reminder-custom-toggle"
                    onClick={() => setIsCustomOpen((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent)]"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    نوشتن پیام دلخواه
                  </button>

                  {isCustomOpen && (
                    <div className="mt-2 space-y-1.5">
                      <textarea
                        data-testid="reminder-custom-input"
                        value={customDraft}
                        onChange={(e) => handleCustomChange(e.target.value)}
                        maxLength={REMINDER_MESSAGE_MAX_LENGTH}
                        rows={3}
                        placeholder="پیام یادآوری خودت رو اینجا بنویس… 😊"
                        className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded-2xl px-3 py-2.5 text-xs text-[var(--text)] outline-none leading-relaxed resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--muted)] tabular-nums-fa">
                          {toPersianDigits(customDraft.length)} / {toPersianDigits(REMINDER_MESSAGE_MAX_LENGTH)}
                        </span>
                        <button
                          type="button"
                          data-testid="reminder-custom-reset"
                          onClick={handleResetCustom}
                          className="flex items-center gap-1 text-[10px] font-bold text-[var(--muted)] hover:text-[var(--text)]"
                        >
                          <RotateCcw className="w-3 h-3" />
                          برگشت به پیام پیش‌فرض
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    data-testid="reminder-test-button"
                    onClick={handleSendTest}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-[var(--bg)] border border-[var(--accent)]/40 text-[var(--text)] text-xs font-bold transition-all"
                  >
                    <Send className="w-3.5 h-3.5 text-[var(--accent)]" />
                    ارسال پیام آزمایشی
                  </button>
                  <button
                    type="button"
                    data-testid="reminder-save-button"
                    onClick={handleSaveReminder}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-xs font-bold shadow-md transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    ثبت یادآوری
                  </button>
                </div>

                <p className="text-[10px] text-[var(--muted)]/80 leading-relaxed">
                  در نسخه‌ی وب، یادآوری فقط وقتی برنامه باز است ارسال می‌شود. در نسخه‌ی اندرویدی،
                  یادآوری به‌صورت کامل و در پس‌زمینه کار خواهد کرد.
                </p>
              </div>
            )}

            {permission === 'denied' && (
              <p className="text-[11px] text-[var(--danger)] leading-relaxed">
                {REMINDER_PERMISSION_DENIED_MESSAGE}
              </p>
            )}
          </div>
        )}

        {tab === 'occasions' && (
          <div className="space-y-3">
            {/* مورد ۲۱ب — two notification switches, both on by default. */}
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-3">
                <span className="text-xs font-bold text-[var(--text)]">اعلان مناسبت‌های مذهبی</span>
                <Toggle
                  on={settings.occasionReligiousNotifyEnabled}
                  onToggle={() =>
                    onUpdateSettings({
                      ...settings,
                      occasionReligiousNotifyEnabled: !settings.occasionReligiousNotifyEnabled,
                    })
                  }
                  label="اعلان مناسبت‌های مذهبی"
                />
              </div>
              <div className="flex items-center justify-between bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-3">
                <span className="text-xs font-bold text-[var(--text)]">اعلان روزهای رسمی دیگر</span>
                <Toggle
                  on={settings.occasionNationalNotifyEnabled}
                  onToggle={() =>
                    onUpdateSettings({
                      ...settings,
                      occasionNationalNotifyEnabled: !settings.occasionNationalNotifyEnabled,
                    })
                  }
                  label="اعلان روزهای رسمی دیگر"
                />
              </div>
            </div>

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
