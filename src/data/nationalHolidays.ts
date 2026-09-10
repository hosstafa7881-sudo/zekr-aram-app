// Official Iranian national holidays that are NOT tied to the Hijri (lunar)
// calendar — they recur on a fixed Jalali (solar) date every year, unlike
// the religious occasions in religiousOccasions.ts which are Hijri-based.
// Plain data, no logic, so it stays easy to edit/extend later.

export interface NationalHoliday {
  id: string;
  jalaliMonth: number; // 1-12
  jalaliDay: number;
  title: string;
}

export const NATIONAL_HOLIDAYS: NationalHoliday[] = [
  { id: 'nowruz-1', jalaliMonth: 1, jalaliDay: 1, title: 'عید نوروز' },
  { id: 'nowruz-2', jalaliMonth: 1, jalaliDay: 2, title: 'عید نوروز' },
  { id: 'nowruz-3', jalaliMonth: 1, jalaliDay: 3, title: 'عید نوروز' },
  { id: 'nowruz-4', jalaliMonth: 1, jalaliDay: 4, title: 'عید نوروز' },
  { id: 'jomhouri-eslami', jalaliMonth: 1, jalaliDay: 12, title: 'روز جمهوری اسلامی ایران' },
  { id: 'sizdah-bedar', jalaliMonth: 1, jalaliDay: 13, title: 'روز طبیعت (سیزده‌به‌در)' },
  { id: 'rehlat-emam-khomeini', jalaliMonth: 3, jalaliDay: 14, title: 'رحلت امام خمینی (ره)' },
  { id: '15-khordad', jalaliMonth: 3, jalaliDay: 15, title: 'قیام ۱۵ خرداد' },
  { id: '22-bahman', jalaliMonth: 11, jalaliDay: 22, title: 'پیروزی انقلاب اسلامی ایران' },
];
