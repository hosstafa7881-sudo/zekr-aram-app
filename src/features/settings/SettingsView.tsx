import React, { useState } from 'react';
import { UserSettings } from '../../lib/db';
import { PALETTE_OPTIONS } from '../../lib/theme';
import { LockedFeatureId, getFeatureLockState, getTrialDaysRemaining } from '../../lib/subscription';
import { toPersianDigits } from '../../utils/persian';
import {
  Vibrate,
  Volume2,
  Sun,
  Type,
  ShieldAlert,
  Info,
  DownloadCloud,
  Moon,
  Palette,
  Crown,
  Check,
} from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onHardResetAllData: () => void;
  onInstallPWA?: () => void;
  canInstallPWA: boolean;
  guard: (featureId: LockedFeatureId, onAllowed: () => void) => void;
  onGoToPaywall: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onHardResetAllData,
  onInstallPWA,
  canInstallPWA,
  guard,
  onGoToPaywall,
}) => {
  const [confirmHardReset, setConfirmHardReset] = useState(false);
  const lockState = getFeatureLockState(settings.isProUser);
  const daysRemaining = getTrialDaysRemaining();

  const toggleBool = (key: keyof UserSettings) => {
    onUpdateSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto px-3 pt-2 pb-6 space-y-4">
      {/* Android PWA Installation Onboarding Card */}
      <div className="bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface)] border border-[var(--accent)]/40 rounded-2xl p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent)]/20 border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] shrink-0">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text)]">
                نصب اپلیکیشن «ذکرآرام» روی صفحهٔ اصلی گوشی (PWA)
              </h3>
              <p className="text-xs text-[var(--muted)] mt-0.5 leading-relaxed">
                این برنامه یک وب‌اپلیکیشن پیشرفته (PWA) است که بدون نیاز به اینترنت کار می‌کند و مانند برنامهٔ واقعی روی اندروید نصب می‌شود.
              </p>
            </div>
          </div>
        </div>

        {canInstallPWA && onInstallPWA ? (
          <button
            type="button"
            onClick={onInstallPWA}
            className="mt-3 w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-[var(--bg)] text-xs font-bold shadow-md transition-all"
          >
            نصب مستقیم روی گوشی اندروید
          </button>
        ) : (
          <div className="mt-3 bg-[var(--bg)]/80 border border-[var(--border)] rounded-xl p-3 text-xs text-[var(--muted)] space-y-1.5">
            <div className="font-bold text-[var(--accent)]">راهنمای نصب در کروم اندروید:</div>
            <p>
              ۱. روی دکمهٔ سه نقطه <strong className="text-[var(--text)]">(⋮)</strong> در بالا سمت چپ یا راست مرورگر کروم بزنید.
            </p>
            <p>
              ۲. گزینهٔ <strong className="text-[var(--text)]">«Add to Home screen»</strong> یا <strong className="text-[var(--text)]">«Install app / نصب برنامه»</strong> را انتخاب کنید.
            </p>
            <p>
              ۳. آیکون «ذکرآرام» به صفحهٔ اصلی گوشی اضافه می‌شود و همیشه کاملاً آفلاین و بدون نوار آدرس باز خواهد شد.
            </p>
          </div>
        )}
      </div>

      {/* Subscription status card */}
      <div className="bg-[var(--surface)] border border-[var(--accent)]/30 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/40 flex items-center justify-center text-[var(--accent)] shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text)]">
              {settings.isProUser
                ? 'مشترک ذکرآرام'
                : lockState === 'locked'
                ? 'دورهٔ آزمایشی رایگان تمام شد'
                : 'دورهٔ آزمایشی رایگان'}
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">
              {settings.isProUser
                ? 'همهٔ امکانات ویژه برای شما باز است'
                : lockState === 'locked'
                ? 'برای دسترسی به امکانات ویژه، اشتراک تهیه کنید'
                : `${toPersianDigits(daysRemaining)} روز رایگان باقی مانده`}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onGoToPaywall}
          className="shrink-0 px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-[var(--bg)] text-xs font-bold"
        >
          مشاهده
        </button>
      </div>

      {/* Appearance: Day/Night mode + color palette */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
        <h3 className="text-sm font-bold text-[var(--text)] border-b border-[var(--border)] pb-2">
          ظاهر و شخصی‌سازی
        </h3>

        <div>
          <div className="flex items-center gap-2 mb-2">
            {settings.themeMode === 'day' ? (
              <Sun className="w-4 h-4 text-[var(--accent)]" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--accent)]" />
            )}
            <span className="text-xs font-bold text-[var(--text)]">حالت نمایش صفحه</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => guard('day-night-mode', () => onUpdateSettings({ ...settings, themeMode: 'night' }))}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                settings.themeMode === 'night'
                  ? 'bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]'
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
                  ? 'bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]'
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
                      ? 'bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]'
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

      {/* Honest Explanation about Hardware Volume Buttons in Web/PWA */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
        <div className="flex items-start gap-2.5">
          <Info className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-[var(--text)] mb-1">
              دربارهٔ شمارش با دکمهٔ ولوم (صدا) گوشی در وب‌اپلیکیشن
            </h4>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              مرورگرهای اندروید به دلایل امنیتی اجازهٔ تغییر کاربری دکمهٔ فیزیکی صدا (Volume Up/Down) را به وب‌اپلیکیشن‌ها نمی‌دهند تا تنظیم صدای گوشی مختل نشود.
              <br />
              <strong className="text-[var(--accent)]">راهکار جایگزین در ذکرآرام:</strong> ۶۰٪ پایین صفحه به صورت یک ناحیهٔ لمسی بزرگ طراحی شده است تا بتوانید حتی بدون نگاه کردن به گوشی، با لمس هر نقطه از نیمهٔ پایینی صفحه با شست خود به راحتی ذکر بگویید. همچنین روی رایانه و کیبورد دکمه‌های <code className="text-[var(--text)]">Space</code> و <code className="text-[var(--text)]">Arrow Up/Down</code> فعال هستند.
            </p>
          </div>
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
                این گزینه تمام شمارش‌ها، تاریخچه و ذکرهای شخصی را به حالت اولیه بازمی‌گرداند. قبل از انجام، پیشنهاد می‌کنیم از بخش «آمار و پشتیبان» فایل JSON تهیه کنید.
              </p>
            </div>
          </div>
        </div>

        {!confirmHardReset ? (
          <button
            type="button"
            onClick={() => setConfirmHardReset(true)}
            className="mt-3 px-4 py-2 rounded-xl bg-[var(--danger)]/15 hover:bg-[var(--danger)]/25 border border-[var(--danger)]/40 text-[var(--danger)] text-xs font-bold transition-all"
          >
            پاک کردن کامل داده‌ها...
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-2 bg-[var(--bg)] p-3 rounded-xl border border-[var(--danger)]">
            <span className="text-xs font-bold text-[var(--danger)] flex-1">
              آیا کاملاً مطمئن هستید؟ این عمل غیرقابل بازگشت است.
            </span>
            <button
              type="button"
              onClick={() => setConfirmHardReset(false)}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-xs text-[var(--muted)]"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={() => {
                onHardResetAllData();
                setConfirmHardReset(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-[var(--danger)] text-xs font-bold text-white"
            >
              بله، پاک شود
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
