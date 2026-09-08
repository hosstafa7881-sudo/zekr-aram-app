import React, { useState } from 'react';
import { DailyLog, UserSettings } from '../../lib/db';
import { toPersianDigits, getShamsiDateInfo } from '../../utils/persian';
import { computeLifetimeTotal, computeStarCount, computeEarnedBadges, BADGE_LEVELS } from '../../lib/gamification';
import { shareText } from '../../components/ShareStoreLinks';
import { AdPlaceholder } from '../../components/AdPlaceholder';
import { NotificationBellPanel } from './NotificationBellPanel';
import { useToast } from '../../components/ToastProvider';
import {
  Bell,
  Play,
  Share2,
  HeartHandshake,
  BookOpen,
  BarChart3,
  NotebookPen,
  Star,
} from 'lucide-react';

interface HomeViewProps {
  dailyLogs: DailyLog[];
  settings: UserSettings;
  onUpdateSettings: (next: UserSettings) => void;
  onGoToCounter: () => void;
  onGoToLibrary: () => void;
  onGoToHistory: () => void;
  onGoToNotebook: () => void;
  onGoToPaywall: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  dailyLogs,
  settings,
  onUpdateSettings,
  onGoToCounter,
  onGoToLibrary,
  onGoToHistory,
  onGoToNotebook,
  onGoToPaywall,
}) => {
  const [isBellOpen, setIsBellOpen] = useState(false);
  const { showToast } = useToast();

  const shamsiToday = getShamsiDateInfo();
  const todayLog = dailyLogs.find((l) => l.dateKey === shamsiToday.dateKey);
  const todayCount = todayLog?.totalCount || 0;
  const hasStartedToday = todayCount > 0;

  const lifetimeTotal = computeLifetimeTotal(dailyLogs);
  const starCount = computeStarCount(lifetimeTotal);
  const earnedBadges = computeEarnedBadges(lifetimeTotal);

  const starLabel =
    starCount === 0
      ? 'هنوز ستاره‌ای نگرفته‌اید'
      : starCount < 10
      ? '⭐'.repeat(starCount)
      : `${toPersianDigits(starCount)} ⭐`;

  const handleShareApp = () => {
    shareText(
      'ذکرآرام رو نصب کردم، یک اپلیکیشن ذکرشمار و صلوات‌شمار آرامش‌بخش و بدون تبلیغ. اگه دوست داری تو هم امتحانش کن 🌿',
      () => showToast('متن اشتراک‌گذاری در حافظهٔ موقت کپی شد.', { kind: 'success' })
    );
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto px-3 pt-2 pb-6 space-y-3.5">
      {/* Home header row: greeting + bell */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text)]">سلام و درود 🌿</h2>
          <p className="text-xs text-[var(--muted)]">{shamsiToday.formattedFull}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsBellOpen(true)}
          title="اعلانات و مناسبت‌های مذهبی"
          aria-label="اعلانات و مناسبت‌های مذهبی"
          className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all"
        >
          <Bell className="w-5 h-5" />
        </button>
      </div>

      {/* Today summary + continue button */}
      <div className="bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface)] border border-[var(--accent)]/30 rounded-3xl p-5 shadow-lg">
        <div className="text-xs text-[var(--muted)] mb-1">مجموع ذکر امروز شما</div>
        <div className="text-4xl font-black text-[var(--accent)] tabular-nums-fa mb-4">
          {toPersianDigits(todayCount)}
        </div>
        <button
          type="button"
          onClick={onGoToCounter}
          className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-[var(--bg)] font-bold py-3 rounded-2xl shadow-md transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          {hasStartedToday ? 'ادامهٔ ذکر امروز' : 'شروع ذکر امروز'}
        </button>
      </div>

      {/* Star & badge compact strip */}
      <button
        type="button"
        onClick={onGoToHistory}
        className="w-full flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 text-right hover:border-[var(--accent)]/40 transition-all"
      >
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-bold text-[var(--text)]">{starLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          {BADGE_LEVELS.map((b) => (
            <span
              key={b.id}
              className={`text-base ${earnedBadges.includes(b.id) ? '' : 'grayscale opacity-30'}`}
              title={b.label}
            >
              {b.emoji}
            </span>
          ))}
        </div>
      </button>

      {/* Quick access grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={onGoToLibrary}
          className="flex flex-col items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl py-3.5 hover:border-[var(--accent)]/40 transition-all"
        >
          <BookOpen className="w-5 h-5 text-[var(--accent)]" />
          <span className="text-[11px] font-bold text-[var(--text)]">کتابخانهٔ ذکر</span>
        </button>
        <button
          type="button"
          onClick={onGoToHistory}
          className="flex flex-col items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl py-3.5 hover:border-[var(--accent)]/40 transition-all"
        >
          <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
          <span className="text-[11px] font-bold text-[var(--text)]">تاریخچه</span>
        </button>
        <button
          type="button"
          onClick={onGoToNotebook}
          className="flex flex-col items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl py-3.5 hover:border-[var(--accent)]/40 transition-all"
        >
          <NotebookPen className="w-5 h-5 text-[var(--accent)]" />
          <span className="text-[11px] font-bold text-[var(--text)]">دفترچهٔ کارهای خوب</span>
        </button>
      </div>

      <AdPlaceholder isProUser={settings.isProUser} />

      {/* Share & support row */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleShareApp}
          className="flex items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 text-[var(--text)] text-xs font-bold py-3 rounded-2xl transition-all"
        >
          <Share2 className="w-4 h-4 text-[var(--accent)]" />
          اشتراک‌گذاری اپ
        </button>
        <button
          type="button"
          onClick={onGoToPaywall}
          className="flex items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 text-[var(--text)] text-xs font-bold py-3 rounded-2xl transition-all"
        >
          <HeartHandshake className="w-4 h-4 text-[var(--accent)]" />
          حمایت از ما
        </button>
      </div>

      <NotificationBellPanel
        isOpen={isBellOpen}
        onClose={() => setIsBellOpen(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />
    </div>
  );
};
