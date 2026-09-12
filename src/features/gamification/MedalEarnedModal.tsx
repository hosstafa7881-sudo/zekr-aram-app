import React, { useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';
import { BadgeLevel } from '../../lib/gamification';
import { DailyLog } from '../../lib/db';
import { buildMedalShareText } from '../../lib/dhikrShareText';
import { shareAppText } from '../../lib/share';
import { useToast } from '../../components/ToastProvider';

interface MedalEarnedModalProps {
  badge: BadgeLevel;
  dailyLogs: DailyLog[];
  todayDateKey: string;
  onClose: () => void;
}

/** How long the buttons stay inert after the popup appears (مورد ۸). */
const TAP_GUARD_MS = 1000;

/**
 * مورد ۸ — replaces the old medal toast/celebration. A medal is earned while
 * the user is tapping fast, so:
 *   * the buttons ignore taps for the first second, and
 *   * because this is a full-screen overlay AND CounterView stops counting
 *     while it is open, no tap during that moment is ever counted as dhikr.
 *
 * There is deliberately no separate medal toast anymore — this popup is the
 * only medal notification. Stars are untouched and keep their toast.
 */
export const MedalEarnedModal: React.FC<MedalEarnedModalProps> = ({
  badge,
  dailyLogs,
  todayDateKey,
  onClose,
}) => {
  const [armed, setArmed] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const id = window.setTimeout(() => setArmed(true), TAP_GUARD_MS);
    return () => window.clearTimeout(id);
  }, []);

  const handleShare = () => {
    if (!armed) return;
    shareAppText(buildMedalShareText(badge, dailyLogs, todayDateKey), {
      onCopiedToClipboard: () =>
        showToast('متن اشتراک‌گذاری در حافظهٔ موقت کپی شد.', { kind: 'success' }),
    });
    onClose();
  };

  return (
    <div
      data-testid="medal-earned-modal"
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      // Swallow every tap that lands on the backdrop so a fast tapper can't
      // accidentally count dhikr or dismiss the popup by mistake.
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--accent)]/40 rounded-3xl p-6 shadow-2xl text-center">
        <div className="text-5xl mb-3">{badge.emoji}</div>
        <p className="text-sm font-bold text-[var(--text)] leading-relaxed mb-3">
          {badge.earnedMessage}
        </p>
        <p className="text-xs text-[var(--muted)] leading-relaxed mb-4">
          می‌تونی ذکرها و مدال‌هات رو با دیگران به اشتراک بذاری 😍
        </p>

        <button
          type="button"
          data-testid="medal-share-button"
          onClick={handleShare}
          disabled={!armed}
          className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-60 text-white font-bold py-2.5 rounded-2xl shadow-md transition-all"
        >
          <Share2 className="w-4 h-4" />
          اشتراک‌گذاری
        </button>
        <button
          type="button"
          data-testid="medal-later-button"
          onClick={() => armed && onClose()}
          disabled={!armed}
          className="w-full mt-2 py-2.5 rounded-2xl text-xs font-bold text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-50 transition-all"
        >
          بعداً
        </button>
      </div>
    </div>
  );
};
