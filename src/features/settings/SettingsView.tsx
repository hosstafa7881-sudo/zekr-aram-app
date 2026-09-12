import React, { useState } from 'react';
import { UserSettings } from '../../lib/db';
import { PALETTE_OPTIONS } from '../../lib/theme';
import { LockedFeatureId } from '../../lib/subscription';
import { useTrialGate } from '../../lib/useTrialGate';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { HARD_RESET_CONFIRM_MESSAGE } from '../../lib/messages';
import { APP_VERSION_LABEL } from '../../lib/version';
import {
  Vibrate,
  Volume2,
  Sun,
  Type,
  ShieldAlert,
  Moon,
  Palette,
  Check,
} from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onHardResetAllData: () => void;
  guard: (featureId: LockedFeatureId, onAllowed: () => void, customLockedMessage?: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onHardResetAllData,
  guard,
}) => {
  const [confirmHardReset, setConfirmHardReset] = useState(false);
  const trialGate = useTrialGate(settings.isProUser);

  const toggleBool = (key: keyof UserSettings) => {
    onUpdateSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto px-3 pt-2 pb-6 space-y-4">
      {/* Appearance: Day/Night mode + color palette */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
          <h3 className="text-sm font-bold text-[var(--text)]">ظاهر و شخصی‌سازی</h3>
          {!settings.isProUser && !trialGate.isLocked && (
            <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-md">
              {trialGate.freeDaysLabel}
            </span>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            {settings.themeMode === 'day' ? (
              <Sun className="w-4 h-4 text-[var(--accent)]" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--accent)]" />
            )}
            <span className="text-xs font-bold text-[var(--text)]">حالت شب و روز</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => guard('day-night-mode', () => onUpdateSettings({ ...settings, themeMode: 'night' }))}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                settings.themeMode === 'night'
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--bg)] text-[var(--muted)] border-[var(--border)]'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              حالت شب
            </button>
            <button
              type="button"
              onClick={() => guard('day-night-mode', () => onUpdateSettings({ ...settings, themeMode: 'day' }))}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                settings.themeMode === 'day'
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--bg)] text-[var(--muted)] border-[var(--border)]'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              حالت روز
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-xs font-bold text-[var(--text)]">رنگ‌بندی پس‌زمینه</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {PALETTE_OPTIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => guard('color-palette', () => onUpdateSettings({ ...settings, colorPalette: p.id }))}
                title={p.label}
                className={`relative flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all ${
                  settings.colorPalette === p.id ? 'border-[var(--accent)]' : 'border-[var(--border)]'
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: p.swatch }}
                />
                {settings.colorPalette === p.id && (
                  <Check className="w-3 h-3 text-[var(--accent)] absolute top-1 left-1" />
                )}
                <span className="text-[9px] text-[var(--muted)] leading-tight text-center">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Haptic & Sound Settings */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
        <h3 className="text-sm font-bold text-[var(--text)] border-b border-[var(--border)] pb-2">
          تنظیمات بازخورد لمسی و صوتی
        </h3>

        {/* Vibration Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Vibrate className="w-4 h-4 text-[var(--accent)]" />
            <div>
              <div className="text-xs font-bold text-[var(--text)]">ویبره و لرزش لمسی هنگام شمارش</div>
              <div className="text-[11px] text-[var(--muted)]">
                لرزش ملایم در هر ضربه و لرزش ویژه در پایان هدف
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleBool('vibrationEnabled')}
            className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center ${
              settings.vibrationEnabled ? 'bg-[var(--accent)] justify-start' : 'bg-[var(--bg)] border border-[var(--border)] justify-end'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full transition-transform ${
                settings.vibrationEnabled ? 'bg-[var(--bg)]' : 'bg-[var(--muted)]'
              }`}
            />
          </button>
        </div>

        {/* Vibration Intensity */}
        {settings.vibrationEnabled && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[var(--muted)]">شدت ویبره لمسی:</span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'light', label: 'ملایم' },
                { id: 'medium', label: 'متوسط' },
                { id: 'strong', label: 'قوی' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      vibrationIntensity: opt.id as any,
                    })
                  }
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                    settings.vibrationIntensity === opt.id
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'bg-[var(--bg)] text-[var(--muted)] border-[var(--border)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sound Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-4 h-4 text-[var(--accent)]" />
            <div>
              <div className="text-xs font-bold text-[var(--text)]">صدای کلیک دانهٔ تسبیح</div>
              <div className="text-[11px] text-[var(--muted)]">
                صدای طبیعی و آرامش‌بخش بدون نیاز به دانلود فایل صوتی
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleBool('soundEnabled')}
            className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center ${
              settings.soundEnabled ? 'bg-[var(--accent)] justify-start' : 'bg-[var(--bg)] border border-[var(--border)] justify-end'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full transition-transform ${
                settings.soundEnabled ? 'bg-[var(--bg)]' : 'bg-[var(--muted)]'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Display & Behavior Settings */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
        <h3 className="text-sm font-bold text-[var(--text)] border-b border-[var(--border)] pb-2">
          تنظیمات صفحه و نمایش متون
        </h3>

        {/* Wake Lock Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sun className="w-4 h-4 text-[var(--accent)]" />
            <div>
              <div className="text-xs font-bold text-[var(--text)]">روشن ماندن صفحه هنگام ذکر (Wake Lock)</div>
              <div className="text-[11px] text-[var(--muted)]">
                جلوگیری از خاموش شدن خودکار صفحهٔ موبایل در زمان شمارش
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleBool('wakeLockEnabled')}
            className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center ${
              settings.wakeLockEnabled ? 'bg-[var(--accent)] justify-start' : 'bg-[var(--bg)] border border-[var(--border)] justify-end'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full transition-transform ${
                settings.wakeLockEnabled ? 'bg-[var(--bg)]' : 'bg-[var(--muted)]'
              }`}
            />
          </button>
        </div>

        {/* Diacritics Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <Type className="w-4 h-4 text-[var(--accent)]" />
            <div>
              <div className="text-xs font-bold text-[var(--text)]">نمایش اعراب و حرکت‌گذاری متون عربی</div>
              <div className="text-[11px] text-[var(--muted)]">
                می‌توانید برای خوانایی ساده‌تر اعراب را خاموش کنید
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleBool('showDiacritics')}
            className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center ${
              settings.showDiacritics ? 'bg-[var(--accent)] justify-start' : 'bg-[var(--bg)] border border-[var(--border)] justify-end'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full transition-transform ${
                settings.showDiacritics ? 'bg-[var(--bg)]' : 'bg-[var(--muted)]'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Hard Reset All Data Section (Protected) */}
      <div className="bg-[var(--surface)] border border-[var(--danger)]/30 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[var(--danger)] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-[var(--text)]">
                بازنشانی کامل و پاک کردن تمام داده‌ها
              </h4>
              <p className="text-xs text-[var(--muted)] mt-0.5 leading-relaxed">
                این گزینه تمام شمارش‌ها، تاریخچه و ذکرهای شخصی را به حالت اولیه بازمی‌گرداند. قبل از انجام، پیشنهاد می‌کنیم از بخش «آمار و پشتیبان» فایل پشتیبان تهیه کنید.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConfirmHardReset(true)}
          className="mt-3 px-4 py-2 rounded-xl bg-[var(--danger)]/15 hover:bg-[var(--danger)]/25 border border-[var(--danger)]/40 text-[var(--danger)] text-xs font-bold transition-all"
        >
          پاک کردن کامل داده‌ها...
        </button>

        <ConfirmDialog
          isOpen={confirmHardReset}
          title="بازنشانی کامل و پاک کردن تمام داده‌ها"
          message={HARD_RESET_CONFIRM_MESSAGE}
          confirmLabel="بله، پاک شود"
          onCancel={() => setConfirmHardReset(false)}
          onConfirm={() => {
            onHardResetAllData();
            setConfirmHardReset(false);
          }}
        />
      </div>

      {/* مورد ۲الف — version line, deliberately small and muted. It doubles as
          the quickest way for the user to confirm their phone is actually
          showing the newest published build. */}
      <p
        data-testid="app-version-label"
        className="text-[10px] text-[var(--muted)]/70 text-center pt-1"
      >
        {APP_VERSION_LABEL}
      </p>
    </div>
  );
};
