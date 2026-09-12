import React, { useState } from 'react';
import { DailyLog, UserSettings } from '../../lib/db';
import { toPersianDigits, getShamsiDateInfo } from '../../utils/persian';
import { computeLifetimeTotal, computeStarCount, getTopBadge } from '../../lib/gamification';
import { shareAppText } from '../../lib/share';
import { AdPlaceholder } from '../../components/AdPlaceholder';
import { NotificationBellPanel } from './NotificationBellPanel';
import { SupportUsModal } from './SupportUsModal';
import { useToast } from '../../components/ToastProvider';
import { APP_SHARE_MESSAGE } from '../../lib/messages';
import { DiscountButtonsRow } from '../discounts/DiscountButtonsRow';
import { ActiveDiscountCode } from '../../lib/discounts';
import { Bell, Play, Share2, HeartHandshake, BookOpen, Star } from 'lucide-react';

interface HomeViewProps {
  dailyLogs: DailyLog[];
  settings: UserSettings;
  onUpdateSettings: (next: UserSettings) => void;
  onGoToCounter: () => void;
  onGoToLibrary: () => void;
  onGoToPaywall: () => void;
  activeCountDiscount: ActiveDiscountCode | null;
  onOpenCountDiscount: () => void;
  onOpenReferralDiscount: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  dailyLogs,
  settings,
  onUpdateSettings,
  onGoToCounter,
  onGoToLibrary,
  onGoToPaywall,
  activeCountDiscount,
  onOpenCountDiscount,
  onOpenReferralDiscount,
}) => {
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const { showToast } = useToast();

  const shamsiToday = getShamsiDateInfo();
  const todayLog = dailyLogs.find((l) => l.dateKey === shamsiToday.dateKey);
  const todayCount = todayLog?.totalCount || 0;
  const hasStartedToday = todayCount > 0;

  const lifetimeTotal = computeLifetimeTotal(dailyLogs);
  const starCount = computeStarCount(lifetimeTotal);
  // مورد ۹ — only the single highest medal is ever displayed.
  const topBadge = getTopBadge(lifetimeTotal);
  const hasAnyAchievement = starCount > 0 || !!topBadge;

  const starLabel = starCount < 10 ? '⭐'.repeat(starCount) : `${toPersianDigits(starCount)} ⭐`;

  const handleShareApp = () => {
    shareAppText(APP_SHARE_MESSAGE, {
      onCopiedToClipboard: () =>
        showToast('متن اشتراک‌گذاری در حافظهٔ موقت کپی شد.', { kind: 'success' }),
    });
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto px-3 pt-2 pb-6 space-y-3.5">
      {/* Home header row: greeting + share/support/bell icons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text)]">السلام علیک یا مولای</h2>
          <p className="text-xs text-[var(--muted)]">{shamsiToday.formattedFull}</p>
        </div>
        {/* مورد ۲۲ — one tour highlight covers all three icons at once, so
            they live in a single container carrying the data-tour hook. */}
        <div data-tour="home-actions" className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleShareApp}
            title="اشتراک‌گذاری برنامه"
            aria-label="اشتراک‌گذاری برنامه"
            className="flex items-center justify-center w-9 h-9 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsSupportOpen(true)}
            title="حمایت از ما"
            aria-label="حمایت از ما"
            className="flex items-center justify-center w-9 h-9 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-[var(--icon-heart)] hover:border-[var(--accent)]/50 transition-all"
          >
            <HeartHandshake className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsBellOpen(true)}
            title="اعلانات و مناسبت‌ها"
            aria-label="اعلانات و مناسبت‌ها"
            className="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-[var(--icon-bell)] hover:border-[var(--accent)]/50 transition-all"
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Today summary + continue button */}
      <div className="bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface)] border border-[var(--accent)]/30 rounded-3xl p-5 shadow-lg">
        <div className="text-xs text-[var(--muted)] mb-1">مجموع ذکر امروز شما</div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-4xl font-black text-[var(--accent)] tabular-nums-fa">
            {toPersianDigits(todayCount)}
          </div>
          <button
            type="button"
            data-tour="home-start-button"
            onClick={onGoToCounter}
            className="flex items-center justify-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-bold text-sm py-2.5 px-4 rounded-2xl shadow-md transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {hasStartedToday ? 'ادامه ذکر' : 'شروع ذکر'}
          </button>
        </div>
      </div>

      {/* Discount entry points — بخش ث: after the main "today's total" card, before the star/badge section */}
      <DiscountButtonsRow
        activeCountDiscount={activeCountDiscount}
        onOpenCountDiscount={onOpenCountDiscount}
        onOpenReferralDiscount={onOpenReferralDiscount}
      />

      {hasAnyAchievement && (
        <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3">
          <Star className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-bold text-[var(--text)]">{starLabel}</span>
          <div className="flex items-center gap-1 mr-auto">
            {topBadge && (
              <span className="text-base" title={topBadge.label}>
                {topBadge.emoji}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Library quick access */}
      <button
        type="button"
        data-tour="home-library"
        onClick={onGoToLibrary}
        className="w-full flex items-center gap-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3.5 hover:border-[var(--accent)]/40 transition-all"
      >
        <BookOpen className="w-5 h-5 text-[var(--accent)]" />
        <span className="text-sm font-bold text-[var(--text)]">کتابخانهٔ ذکر</span>
      </button>

      {/* Standalone subscribe button */}
      <button
        type="button"
        data-testid="home-subscribe-button"
        onClick={onGoToPaywall}
        className="w-full py-3.5 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-bold shadow-md transition-all"
      >
        تهیه اشتراک ماهانه
      </button>

      <AdPlaceholder isProUser={settings.isProUser} />

      <NotificationBellPanel
        isOpen={isBellOpen}
        onClose={() => setIsBellOpen(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />
      <SupportUsModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </div>
  );
};
