import React, { useState } from 'react';
import { UserSettings } from '../../lib/db';
import {
  Vibrate,
  Volume2,
  Sun,
  Type,
  ShieldAlert,
  Info,
  DownloadCloud,
} from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onHardResetAllData: () => void;
  onInstallPWA?: () => void;
  canInstallPWA: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onHardResetAllData,
  onInstallPWA,
  canInstallPWA,
}) => {
  const [confirmHardReset, setConfirmHardReset] = useState(false);

  const toggleBool = (key: keyof UserSettings) => {
    onUpdateSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto px-3 pt-2 pb-6 space-y-4">
      {/* Android PWA Installation Onboarding Card */}
      <div className="bg-gradient-to-br from-[#162B23] to-[#11221B] border border-[#D4AF37]/40 rounded-2xl p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37] shrink-0">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F3F7F4]">
                نصب اپلیکیشن «ذکرآرام» روی صفحهٔ اصلی گوشی (PWA)
              </h3>
              <p className="text-xs text-[#94B2A3] mt-0.5 leading-relaxed">
                این برنامه یک وب‌اپلیکیشن پیشرفته (PWA) است که بدون نیاز به اینترنت کار می‌کند و مانند برنامهٔ واقعی روی اندروید نصب می‌شود.
              </p>
            </div>
          </div>
        </div>

        {canInstallPWA && onInstallPWA ? (
          <button
            type="button"
            onClick={onInstallPWA}
            className="mt-3 w-full py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E6C987] text-[#091410] text-xs font-bold shadow-md transition-all"
          >
            نصب مستقیم روی گوشی اندروید
          </button>
        ) : (
          <div className="mt-3 bg-[#091410]/80 border border-[#1C352B] rounded-xl p-3 text-xs text-[#94B2A3] space-y-1.5">
            <div className="font-bold text-[#D4AF37]">راهنمای نصب در کروم اندروید:</div>
            <p>
              ۱. روی دکمهٔ سه نقطه <strong className="text-[#F3F7F4]">(⋮)</strong> در بالا سمت چپ یا راست مرورگر کروم بزنید.
            </p>
            <p>
              ۲. گزینهٔ <strong className="text-[#F3F7F4]">«Add to Home screen»</strong> یا <strong className="text-[#F3F7F4]">«Install app / نصب برنامه»</strong> را انتخاب کنید.
            </p>
            <p>
              ۳. آیکون «ذکرآرام» به صفحهٔ اصلی گوشی اضافه می‌شود و همیشه کاملاً آفلاین و بدون نوار آدرس باز خواهد شد.
            </p>
          </div>
        )}
      </div>

      {/* Haptic & Sound Settings */}
      <div className="bg-[#11221B] border border-[#1C352B] rounded-2xl p-4 space-y-4">
        <h3 className="text-sm font-bold text-[#F3F7F4] border-b border-[#1C352B] pb-2">
          تنظیمات بازخورد لمسی و صوتی
        </h3>

        {/* Vibration Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Vibrate className="w-4 h-4 text-[#D4AF37]" />
            <div>
              <div className="text-xs font-bold text-[#F3F7F4]">ویبره و لرزش لمسی هنگام شمارش</div>
              <div className="text-[11px] text-[#94B2A3]">
                لرزش ملایم در هر ضربه و لرزش ویژه در پایان هدف
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleBool('vibrationEnabled')}
            className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center ${
              settings.vibrationEnabled ? 'bg-[#D4AF37] justify-start' : 'bg-[#091410] border border-[#1C352B] justify-end'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full transition-transform ${
                settings.vibrationEnabled ? 'bg-[#091410]' : 'bg-[#94B2A3]'
              }`}
            />
          </button>
        </div>

        {/* Vibration Intensity */}
        {settings.vibrationEnabled && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[#94B2A3]">شدت ویبره لمسی:</span>
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
                      ? 'bg-[#D4AF37] text-[#091410] border-[#D4AF37]'
                      : 'bg-[#091410] text-[#94B2A3] border-[#1C352B]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sound Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1C352B]">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-4 h-4 text-[#D4AF37]" />
            <div>
              <div className="text-xs font-bold text-[#F3F7F4]">صدای کلیک دانهٔ تسبیح</div>
              <div className="text-[11px] text-[#94B2A3]">
                صدای طبیعی و آرامش‌بخش بدون نیاز به دانلود فایل صوتی
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleBool('soundEnabled')}
            className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center ${
              settings.soundEnabled ? 'bg-[#D4AF37] justify-start' : 'bg-[#091410] border border-[#1C352B] justify-end'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full transition-transform ${
                settings.soundEnabled ? 'bg-[#091410]' : 'bg-[#94B2A3]'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Display & Behavior Settings */}
      <div className="bg-[#11221B] border border-[#1C352B] rounded-2xl p-4 space-y-4">
        <h3 className="text-sm font-bold text-[#F3F7F4] border-b border-[#1C352B] pb-2">
          تنظیمات صفحه و نمایش متون
        </h3>

        {/* Wake Lock Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sun className="w-4 h-4 text-[#D4AF37]" />
            <div>
              <div className="text-xs font-bold text-[#F3F7F4]">روشن ماندن صفحه هنگام ذکر (Wake Lock)</div>
              <div className="text-[11px] text-[#94B2A3]">
                جلوگیری از خاموش شدن خودکار صفحهٔ موبایل در زمان شمارش
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleBool('wakeLockEnabled')}
            className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center ${
              settings.wakeLockEnabled ? 'bg-[#D4AF37] justify-start' : 'bg-[#091410] border border-[#1C352B] justify-end'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full transition-transform ${
                settings.wakeLockEnabled ? 'bg-[#091410]' : 'bg-[#94B2A3]'
              }`}
            />
          </button>
        </div>

        {/* Diacritics Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1C352B]">
          <div className="flex items-center gap-2.5">
            <Type className="w-4 h-4 text-[#D4AF37]" />
            <div>
              <div className="text-xs font-bold text-[#F3F7F4]">نمایش اعراب و حرکت‌گذاری متون عربی</div>
              <div className="text-[11px] text-[#94B2A3]">
                می‌توانید برای خوانایی ساده‌تر اعراب را خاموش کنید
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleBool('showDiacritics')}
            className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center ${
              settings.showDiacritics ? 'bg-[#D4AF37] justify-start' : 'bg-[#091410] border border-[#1C352B] justify-end'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full transition-transform ${
                settings.showDiacritics ? 'bg-[#091410]' : 'bg-[#94B2A3]'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Honest Explanation about Hardware Volume Buttons in Web/PWA */}
      <div className="bg-[#11221B] border border-[#1C352B] rounded-2xl p-4">
        <div className="flex items-start gap-2.5">
          <Info className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-[#F3F7F4] mb-1">
              دربارهٔ شمارش با دکمهٔ ولوم (صدا) گوشی در وب‌اپلیکیشن
            </h4>
            <p className="text-xs text-[#94B2A3] leading-relaxed">
              مرورگرهای اندروید به دلایل امنیتی اجازهٔ تغییر کاربری دکمهٔ فیزیکی صدا (Volume Up/Down) را به وب‌اپلیکیشن‌ها نمی‌دهند تا تنظیم صدای گوشی مختل نشود.
              <br />
              <strong className="text-[#D4AF37]">راهکار جایگزین در ذکرآرام:</strong> ۶۰٪ پایین صفحه به صورت یک ناحیهٔ لمسی بزرگ طراحی شده است تا بتوانید حتی بدون نگاه کردن به گوشی، با لمس هر نقطه از نیمهٔ پایینی صفحه با شست خود به راحتی ذکر بگویید. همچنین روی رایانه و کیبورد دکمه‌های <code className="text-[#F3F7F4]">Space</code> و <code className="text-[#F3F7F4]">Arrow Up/Down</code> فعال هستند.
            </p>
          </div>
        </div>
      </div>

      {/* Hard Reset All Data Section (Protected) */}
      <div className="bg-[#11221B] border border-[#EF4444]/30 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-[#F3F7F4]">
                بازنشانی کامل و پاک کردن تمام داده‌ها
              </h4>
              <p className="text-xs text-[#94B2A3] mt-0.5 leading-relaxed">
                این گزینه تمام شمارش‌ها، تاریخچه و ذکرهای شخصی را به حالت اولیه بازمی‌گرداند. قبل از انجام، پیشنهاد می‌کنیم از بخش «آمار و پشتیبان» فایل JSON تهیه کنید.
              </p>
            </div>
          </div>
        </div>

        {!confirmHardReset ? (
          <button
            type="button"
            onClick={() => setConfirmHardReset(true)}
            className="mt-3 px-4 py-2 rounded-xl bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border border-[#EF4444]/40 text-[#EF4444] text-xs font-bold transition-all"
          >
            پاک کردن کامل داده‌ها...
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-2 bg-[#091410] p-3 rounded-xl border border-[#EF4444]">
            <span className="text-xs font-bold text-[#EF4444] flex-1">
              آیا کاملاً مطمئن هستید؟ این عمل غیرقابل بازگشت است.
            </span>
            <button
              type="button"
              onClick={() => setConfirmHardReset(false)}
              className="px-3 py-1.5 rounded-lg bg-[#11221B] text-xs text-[#94B2A3]"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={() => {
                onHardResetAllData();
                setConfirmHardReset(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#EF4444] text-xs font-bold text-white"
            >
              بله، پاک شود
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
