import { useEffect } from 'react';
import { getHijriDateInfo } from '../utils/hijri';
import {
  getTodaysNationalHolidays,
  getTodaysOccasions,
  wasOccasionNoticeShownToday,
  markOccasionNoticeShownToday,
} from './occasions';
import { NOWRUZ_MESSAGE, OccasionMood, buildOccasionNotice } from './occasionMessages';
import { useToast } from '../components/ToastProvider';
import { syncOccasionSchedule } from './notifications';
import { isNativePlatform } from './native';

export interface OccasionNoticeSettings {
  /** «اعلان مناسبت‌های مذهبی» — the Hijri/lunar religious calendar. */
  religiousEnabled: boolean;
  /** «اعلان روزهای رسمی دیگر» — the solar official-holiday calendar. */
  nationalEnabled: boolean;
}

/**
 * مورد ۲۱ — builds today's occasion notices. Titles of the SAME category are
 * merged into one notice with «و». Nowruz (1 فروردین) replaces the generic
 * official-day wording with its own greeting, and روزهای ۲ تا ۴ فروردین send
 * nothing at all.
 *
 * اصلاح بعد از دور پنجم: وقتی یک روز هم‌زمان مناسبتی از دسته‌ی «غم» و
 * مناسبتی از دسته‌ی «شادی» دارد، دو اعلان جدا (یکی تسلیت، یکی تبریک) کنار هم
 * ناهمخوان به‌نظر می‌رسند. به‌جای آن، فقط یک اعلان خنثی با هر دو عنوان و
 * بدون کلمه‌ی تسلیت/تبریک فرستاده می‌شود — «امروز [X] و [Y] است 📅». این
 * قانون برای **هر** روزی با این ترکیب در تقویم اعمال می‌شود (نه فقط چند
 * نمونه‌ی خاص مثل ۳ ربیع‌الاول یا ۷ رجب)، و شامل ترکیب یک مناسبت مذهبی با یک
 * روز رسمیِ دسته‌ی غم (مثل رحلت امام خمینی (ره)) هم می‌شود.
 */
export function buildTodaysOccasionNotices(
  settings: OccasionNoticeSettings,
  now = new Date()
): string[] {
  const byMood = new Map<OccasionMood, string[]>();
  const notices: string[] = [];

  if (settings.religiousEnabled) {
    // مورد ۱۰ — the category is stored on the occasion now, not derived from
    // a type, because the approved table has neutral lunar occasions too.
    getTodaysOccasions(getHijriDateInfo(now), now).forEach((occ) => {
      byMood.set(occ.mood, [...(byMood.get(occ.mood) || []), occ.title]);
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

  // غم + شادی هم‌زمان → یک اعلان خنثی واحد (به‌جای دو اعلان جدا و ناهمخوان).
  const sadTitles = byMood.get('sad');
  const happyTitles = byMood.get('happy');
  if (sadTitles && sadTitles.length > 0 && happyTitles && happyTitles.length > 0) {
    byMood.set('neutral', [...(byMood.get('neutral') || []), ...sadTitles, ...happyTitles]);
    byMood.delete('sad');
    byMood.delete('happy');
  }

  (['sad', 'happy', 'neutral'] as OccasionMood[]).forEach((mood) => {
    const titles = byMood.get(mood);
    if (titles && titles.length > 0) notices.push(buildOccasionNotice(mood, titles));
  });

  return notices;
}

/** The notice text for a day N days from now, or '' when that day has none. */
function noticeForDayOffset(settings: OccasionNoticeSettings, dayOffset: number): string {
  const day = new Date();
  day.setDate(day.getDate() + dayOffset);
  // «هر نوع اعلان، در هر روز حداکثر یک‌بار» — a day with several notices is
  // still ONE notification, its lines joined.
  return buildTodaysOccasionNotices(settings, day).join('\n');
}

/** Shows today's occasion notices once per day, respecting the two switches in the «مناسبت‌ها» tab. */
export function useOccasionNotice(todayDateKey: string, settings: OccasionNoticeSettings) {
  const { showToast } = useToast();
  const { religiousEnabled, nationalEnabled } = settings;

  // دور هشتم / مورد ۳ — on the phone the occasion notices are also handed to
  // the OS, so they arrive on the day itself rather than only when the app
  // happens to be open. Re-armed (never appended) whenever a switch changes.
  useEffect(() => {
    if (!isNativePlatform()) return;
    void syncOccasionSchedule((dayOffset) =>
      noticeForDayOffset({ religiousEnabled, nationalEnabled }, dayOffset)
    );
  }, [religiousEnabled, nationalEnabled]);

  useEffect(() => {
    if (wasOccasionNoticeShownToday(todayDateKey)) return;
    const notices = buildTodaysOccasionNotices({ religiousEnabled, nationalEnabled });
    if (notices.length === 0) return;

    notices.forEach((notice) => showToast(notice, { kind: 'celebration', durationMs: 6000 }));
    // One mark per calendar day, so an occasion notice is never repeated.
    markOccasionNoticeShownToday(todayDateKey);
  }, [todayDateKey, religiousEnabled, nationalEnabled, showToast]);
}
