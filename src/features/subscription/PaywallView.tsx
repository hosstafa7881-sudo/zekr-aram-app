import React from 'react';
import { UserSettings } from '../../lib/db';
import { TasbihIcon } from '../../components/TasbihIcon';
import { useToast } from '../../components/ToastProvider';
import {
  Sparkles,
  Ban,
  BarChart3,
  TrendingUp,
  NotebookPen,
  Palette,
  MoonStar,
  LayoutGrid,
  Check,
} from 'lucide-react';

interface PaywallViewProps {
  settings: UserSettings;
  onUpdateSettings: (next: UserSettings) => void;
}

const FEATURES: { icon: React.ReactNode; text: string; color: string }[] = [
  { icon: <Ban className="w-5 h-5" />, text: 'حذف کامل تمامی تبلیغات', color: '#EF4444' },
  { icon: <TasbihIcon className="w-5 h-5" />, text: 'دسترسی به تسبیحات اربعه و تسبیحات حضرت زهرا (س)', color: '#10B981' },
  { icon: <BarChart3 className="w-5 h-5" />, text: 'دسترسی کامل و همیشگی به ریزآمار روزهای گذشته', color: '#3B82F6' },
  { icon: <TrendingUp className="w-5 h-5" />, text: 'دسترسی کامل به نمودار ۷ روز اخیر', color: '#A855F7' },
  { icon: <NotebookPen className="w-5 h-5" />, text: 'دسترسی نامحدود به دفترچهٔ کارهای خوب روزانه', color: '#F59E0B' },
  { icon: <Palette className="w-5 h-5" />, text: 'تنظیمات کامل رنگ پس‌زمینه و شخصی‌سازی', color: '#EC4899' },
  { icon: <MoonStar className="w-5 h-5" />, text: 'دسترسی کامل به حالت شب و حالت روز', color: '#6366F1' },
  { icon: <LayoutGrid className="w-5 h-5" />, text: 'دسترسی به ویجت صفحهٔ اصلی (نسخهٔ اندروید)', color: '#14B8A6' },
];

export const PaywallView: React.FC<PaywallViewProps> = ({ settings, onUpdateSettings }) => {
  const { showToast } = useToast();

  const handleSubscribe = () => {
    // No real payment gateway is connected yet — this simulates a successful
    // purchase locally. See NOTES.md for the real integration plan.
    onUpdateSettings({ ...settings, isProUser: true });
    showToast('اشتراک ماهانه با موفقیت فعال شد. از حمایت شما سپاسگزاریم 🌿', {
      kind: 'celebration',
      durationMs: 4500,
    });
  };

  if (settings.isProUser) {
    return (
      <div className="flex flex-col flex-1 w-full max-w-md mx-auto px-4 pt-10 pb-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-[var(--accent)]/15 border border-[var(--accent)]/40 flex items-center justify-center text-[var(--accent)] mb-4">
          <Check className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-[var(--text)] mb-1.5">شما مشترک ذکرآرام هستید</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed mb-5">
          از حمایت شما بسیار سپاسگزاریم. همهٔ امکانات ویژه برایتان باز است 🌿
        </p>
        <button
          type="button"
          onClick={() => onUpdateSettings({ ...settings, isProUser: false })}
          className="text-[11px] text-[var(--muted)] underline"
        >
          غیرفعال کردن اشتراک (فقط برای تست)
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto px-4 pt-4 pb-8">
      <div className="text-center mb-5">
        <div className="flex items-center justify-center gap-2 text-[var(--accent)] mb-1.5">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-black text-[var(--text)]">تهیه اشتراک ماهانه</h2>
          <Sparkles className="w-5 h-5" />
        </div>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          تجربه‌ای کامل، بدون تبلیغات و آرامش‌بخش از برنامه
        </p>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 space-y-3 mb-4">
        <h3 className="text-xs font-bold text-[var(--muted)] mb-1">ویژگی‌های اشتراک ماهانه:</h3>
        {FEATURES.map((f, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${f.color}22`, color: f.color }}
            >
              {f.icon}
            </div>
            <span className="text-xs text-[var(--text)] leading-relaxed">{f.text}</span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-[var(--muted)] leading-relaxed text-center mb-5">
        این برنامه با حمایت شما زنده می‌مونه 🌿. تنها راه نگهداری و توسعه‌ش، دیدن تبلیغات یا تهیه‌ی اشتراک ماهانه‌ست. هر کدوم رو انتخاب کنید، کمک بزرگی به ماست ❤️
      </p>

      <div className="text-center mb-3">
        <span className="text-2xl font-black text-[var(--accent)]">۳۰ هزار تومان</span>
        <span className="text-xs text-[var(--muted)]"> / ماهانه</span>
      </div>

      <button
        type="button"
        onClick={handleSubscribe}
        className="w-full py-3.5 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-[var(--bg)] font-bold shadow-lg shadow-[var(--accent)]/20 transition-all"
      >
        تهیه اشتراک ماهانه
      </button>

      <p className="text-[10px] text-[var(--muted)] text-center mt-3 leading-relaxed">
        درگاه پرداخت واقعی هنوز متصل نشده است؛ این دکمه فعلاً به‌صورت آزمایشی اشتراک را روی این دستگاه فعال می‌کند.
      </p>
    </div>
  );
};
