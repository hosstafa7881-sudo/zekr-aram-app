import { useEffect } from 'react';
import { getHijriDateInfo } from '../utils/hijri';
import { getTodaysOccasions, wasOccasionNoticeShownToday, markOccasionNoticeShownToday } from './occasions';
import { getOccasionMessage } from '../data/religiousOccasions';
import { useToast } from '../components/ToastProvider';

/** Shows an in-app celebratory/condolence toast once per day when today matches a religious occasion. */
export function useOccasionNotice(todayDateKey: string) {
  const { showToast } = useToast();

  useEffect(() => {
    if (wasOccasionNoticeShownToday(todayDateKey)) return;
    const todayHijri = getHijriDateInfo();
    const occasions = getTodaysOccasions(todayHijri);
    if (occasions.length === 0) return;

    occasions.forEach((occ) => {
      showToast(getOccasionMessage(occ), { kind: 'celebration', durationMs: 6000 });
    });
    markOccasionNoticeShownToday(todayDateKey);
  }, [todayDateKey, showToast]);
}
