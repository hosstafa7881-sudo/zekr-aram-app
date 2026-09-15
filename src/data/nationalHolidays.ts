// دور هشتم / مورد ۱۰ — the Jalali (solar) occasion table, REPLACED WHOLESALE
// with the list the user supplied and approved. Nothing added, nothing removed.
//
// These recur on a fixed solar date every year, unlike the Hijri occasions in
// religiousOccasions.ts.

import { OccasionMood } from './religiousOccasions';

export interface NationalHoliday {
  id: string;
  jalaliMonth: number; // 1-12
  jalaliDay: number;
  title: string;
  mood: OccasionMood;
  /** Every entry in the approved list is an official day off. */
  isOfficialHoliday?: boolean;
  /**
   * False for days that deliberately send no notice at all. Only روزهای ۲ تا ۴
   * فروردین: they stay in the calendar, but greeting the user «عید نوروز
   * مبارک» four mornings running was settled against in an earlier round, and
   * the new table changes their CATEGORY, not that decision.
   */
  notify: boolean;
  /** Only 1 فروردین, which uses the dedicated Nowruz greeting instead of the generic wording. */
  isNowruz?: boolean;
}

export const NATIONAL_HOLIDAYS: NationalHoliday[] = [
  { id: 'nowruz-1', jalaliMonth: 1, jalaliDay: 1, title: 'عید نوروز', mood: 'happy', isOfficialHoliday: true, notify: true, isNowruz: true },
  { id: 'nowruz-2', jalaliMonth: 1, jalaliDay: 2, title: 'عید نوروز', mood: 'happy', isOfficialHoliday: true, notify: false },
  { id: 'nowruz-3', jalaliMonth: 1, jalaliDay: 3, title: 'عید نوروز', mood: 'happy', isOfficialHoliday: true, notify: false },
  { id: 'nowruz-4', jalaliMonth: 1, jalaliDay: 4, title: 'عید نوروز', mood: 'happy', isOfficialHoliday: true, notify: false },
  { id: 'jomhouri-eslami', jalaliMonth: 1, jalaliDay: 12, title: 'روز جمهوری اسلامی ایران', mood: 'neutral', isOfficialHoliday: true, notify: true },
  { id: 'rooz-tabiat', jalaliMonth: 1, jalaliDay: 13, title: 'روز طبیعت', mood: 'neutral', isOfficialHoliday: true, notify: true },
  { id: 'rehlat-emam-khomeini', jalaliMonth: 3, jalaliDay: 14, title: 'رحلت امام خمینی (ره)', mood: 'sad', isOfficialHoliday: true, notify: true },
  { id: 'ghiyam-15-khordad', jalaliMonth: 3, jalaliDay: 15, title: 'قیام ۱۵ خرداد', mood: 'sad', isOfficialHoliday: true, notify: true },
  { id: 'piroozi-enghelab', jalaliMonth: 11, jalaliDay: 22, title: 'پیروزی انقلاب اسلامی', mood: 'happy', isOfficialHoliday: true, notify: true },
  { id: 'melli-shodan-naft', jalaliMonth: 12, jalaliDay: 29, title: 'روز ملی شدن صنعت نفت', mood: 'neutral', isOfficialHoliday: true, notify: true },
];
