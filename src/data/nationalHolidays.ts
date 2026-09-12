// Official Iranian national holidays that are NOT tied to the Hijri (lunar)
// calendar — they recur on a fixed Jalali (solar) date every year, unlike
// the religious occasions in religiousOccasions.ts which are Hijri-based.
// Plain data, no logic, so it stays easy to edit/extend later.

export interface NationalHoliday {
  id: string;
  jalaliMonth: number; // 1-12
  jalaliDay: number;
  title: string;
  /**
   * مورد ۲۱ — which notice wording this day gets. 'national' is the neutral
   * «امروز [عنوان] است 📅»; 'sad' is the تسلیت wording (رحلت امام خمینی (ره)
   * is explicitly a غم day even though it is an official, non-religious
   * holiday). Both categories sit under the «اعلان روزهای رسمی دیگر» switch,
   * which is what that switch means: the solar/official calendar.
   */
  mood: 'national' | 'sad';
  /** False for days that deliberately send no notice at all (روزهای ۲ تا ۴ فروردین). */
  notify: boolean;
  /** Only the 1st of Farvardin, which uses the dedicated Nowruz greeting instead of the generic wording. */
  isNowruz?: boolean;
}

export const NATIONAL_HOLIDAYS: NationalHoliday[] = [
  { id: 'nowruz-1', jalaliMonth: 1, jalaliDay: 1, title: 'عید نوروز', mood: 'national', notify: true, isNowruz: true },
  // روزهای ۲ تا ۴ فروردین در تقویم می‌مانند ولی اعلان جداگانه‌ی تبریک ندارند.
  { id: 'nowruz-2', jalaliMonth: 1, jalaliDay: 2, title: 'عید نوروز', mood: 'national', notify: false },
  { id: 'nowruz-3', jalaliMonth: 1, jalaliDay: 3, title: 'عید نوروز', mood: 'national', notify: false },
  { id: 'nowruz-4', jalaliMonth: 1, jalaliDay: 4, title: 'عید نوروز', mood: 'national', notify: false },
  { id: 'jomhouri-eslami', jalaliMonth: 1, jalaliDay: 12, title: 'روز جمهوری اسلامی ایران', mood: 'national', notify: true },
  { id: 'sizdah-bedar', jalaliMonth: 1, jalaliDay: 13, title: 'روز طبیعت (سیزده‌به‌در)', mood: 'national', notify: true },
  { id: 'rehlat-emam-khomeini', jalaliMonth: 3, jalaliDay: 14, title: 'رحلت امام خمینی (ره)', mood: 'sad', notify: true },
  { id: '15-khordad', jalaliMonth: 3, jalaliDay: 15, title: 'قیام ۱۵ خرداد', mood: 'national', notify: true },
  { id: '22-bahman', jalaliMonth: 11, jalaliDay: 22, title: 'پیروزی انقلاب اسلامی ایران', mood: 'national', notify: true },
];
