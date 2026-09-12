import { useEffect } from 'react';
import { getHijriDateInfo } from '../utils/hijri';
import {
  getTodaysNationalHolidays,
  getTodaysOccasions,
  wasOccasionNoticeShownToday,
  markOccasionNoticeShownToday,
} from './occasions';
import { getOccasionMood } from '../data/religiousOccasions';
import { NOWRUZ_MESSAGE, OccasionMood, buildOccasionNotice } from './occasionMessages';
import { useToast } from '../components/ToastProvider';

export interface OccasionNoticeSettings {
  /** «اعلان مناسبت‌های مذهبی» — the Hijri/lunar religious calendar. */
  religiousEnabled: boolean;
  /** «اعلان روزهای رسمی دیگر» — the solar official-holiday calendar. */
  nationalEnabled: boolean;
}

/**
 * مورد ۲۱ — builds today's occasion notices. Titles of the SAME category are
 * merged into one notice with «و»; different categories stay separate notices
 * (so a day carrying both a تسلیت and a تبریک occasion sends one of each
 * rather than the app silently picking a winner). Nowruz (1 فروردین) replaces
 * the generic official-day wording with its own greeting, and روزهای ۲ تا ۴
 * فروردین send nothing at all.
 */
export function buildTodaysOccasionNotices(
  settings: OccasionNoticeSettings,
  now = new Date()
): string[] {
  const byMood = new Map<OccasionMood, string[]>();
  const notices: string[] = [];

  if (settings.religiousEnabled) {
    getTodaysOccasions(getHijriDateInfo(now)).forEach((occ) => {
      const mood = getOccasionMood(occ);
      byMood.set(mood, [...(byMood.get(mood) || []), occ.title]);
    });
  }

  if (settings.nationalEnabled) {
    getTodaysNationalHolidays(now).forEach((holiday) => {
      if (!holiday.notify) return;
      if (holiday.isNowruz) {
        notices.push(NOWRUZ_MESSAGE);
        return;
      }
      byMood.set(holiday.mood, [...(byMood.get(holiday.mood) || []), holiday.title]);
    });
  }

  (['sad', 'happy', 'national'] as OccasionMood[]).forEach((mood) => {
    const titles = byMood.get(mood);
    if (titles && titles.length > 0) notices.push(buildOccasionNotice(mood, titles));
  });

  return notices;
}

/** Shows today's occasion notices once per day, respecting the two switches in the «مناسبت‌ها» tab. */
export function useOccasionNotice(todayDateKey: string, settings: OccasionNoticeSettings) {
  const { showToast } = useToast();
  const { religiousEnabled, nationalEnabled } = settings;

  useEffect(() => {
    if (wasOccasionNoticeShownToday(todayDateKey)) return;
    const notices = buildTodaysOccasionNotices({ religiousEnabled, nationalEnabled });
    if (notices.length === 0) return;

    notices.forEach((notice) => showToast(notice, { kind: 'celebration', durationMs: 6000 }));
    // One mark per calendar day, so an occasion notice is never repeated.
    markOccasionNoticeShownToday(todayDateKey);
  }, [todayDateKey, religiousEnabled, nationalEnabled, showToast]);
}
