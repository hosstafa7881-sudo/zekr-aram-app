// Major Shia religious occasions, keyed by Hijri (lunar) month/day so they
// recur correctly every year regardless of the Gregorian/Shamsi date.
// This list can be freely edited/extended later — it is plain data, no logic.

export type OccasionType = 'birth' | 'martyrdom' | 'eid';

export interface ReligiousOccasion {
  id: string;
  hijriMonth: number; // 1-12
  hijriDay: number; // 1-30
  title: string;
  personName: string;
  type: OccasionType;
  /** True only for the subset that is an actual official public holiday in Iran (not every religious occasion is a day off). */
  isOfficialHoliday?: boolean;
}

export const RELIGIOUS_OCCASIONS: ReligiousOccasion[] = [
  { id: 'milad-payambar', hijriMonth: 3, hijriDay: 17, title: 'میلاد پیامبر اکرم (ص) و امام صادق (ع)', personName: 'پیامبر اکرم (ص)', type: 'birth', isOfficialHoliday: true },
  { id: 'milad-imam-ali', hijriMonth: 7, hijriDay: 13, title: 'میلاد امام علی (ع)', personName: 'امام علی (ع)', type: 'birth' },
  { id: 'milad-fatemeh', hijriMonth: 12, hijriDay: 20, title: 'میلاد حضرت فاطمه زهرا (س)', personName: 'حضرت فاطمه زهرا (س)', type: 'birth' },
  { id: 'milad-imam-hassan', hijriMonth: 3, hijriDay: 15, title: 'میلاد امام حسن مجتبی (ع)', personName: 'امام حسن مجتبی (ع)', type: 'birth' },
  { id: 'milad-imam-hossein', hijriMonth: 3, hijriDay: 3, title: 'میلاد امام حسین (ع)', personName: 'امام حسین (ع)', type: 'birth' },
  { id: 'milad-abbas', hijriMonth: 4, hijriDay: 4, title: 'میلاد حضرت ابوالفضل عباس (ع)', personName: 'حضرت ابوالفضل عباس (ع)', type: 'birth' },
  { id: 'milad-imam-sajjad', hijriMonth: 5, hijriDay: 5, title: 'میلاد امام سجاد (ع)', personName: 'امام سجاد (ع)', type: 'birth' },
  { id: 'milad-imam-baqir', hijriMonth: 1, hijriDay: 1, title: 'میلاد امام محمدباقر (ع)', personName: 'امام محمدباقر (ع)', type: 'birth' },
  { id: 'milad-imam-kazim', hijriMonth: 7, hijriDay: 7, title: 'میلاد امام موسی کاظم (ع)', personName: 'امام موسی کاظم (ع)', type: 'birth' },
  { id: 'milad-imam-reza', hijriMonth: 11, hijriDay: 11, title: 'میلاد امام رضا (ع)', personName: 'امام رضا (ع)', type: 'birth' },
  { id: 'milad-imam-jawad', hijriMonth: 10, hijriDay: 10, title: 'میلاد امام محمدتقی الجواد (ع)', personName: 'امام محمدتقی الجواد (ع)', type: 'birth' },
  { id: 'milad-imam-hadi', hijriMonth: 2, hijriDay: 15, title: 'میلاد امام علی‌النقی الهادی (ع)', personName: 'امام علی‌النقی الهادی (ع)', type: 'birth' },
  { id: 'milad-imam-askari', hijriMonth: 8, hijriDay: 4, title: 'میلاد امام حسن عسکری (ع)', personName: 'امام حسن عسکری (ع)', type: 'birth' },
  { id: 'milad-imam-zaman', hijriMonth: 8, hijriDay: 15, title: 'میلاد امام زمان (عج)', personName: 'امام زمان (عج)', type: 'birth' },
  { id: 'shahadat-payambar-imam-hassan', hijriMonth: 2, hijriDay: 28, title: 'شهادت پیامبر اکرم (ص) و امام حسن مجتبی (ع)', personName: 'پیامبر اکرم (ص)', type: 'martyrdom', isOfficialHoliday: true },
  { id: 'shahadat-imam-ali', hijriMonth: 9, hijriDay: 21, title: 'شهادت امام علی (ع)', personName: 'امام علی (ع)', type: 'martyrdom', isOfficialHoliday: true },
  { id: 'shahadat-fatemeh', hijriMonth: 1, hijriDay: 3, title: 'شهادت حضرت فاطمه زهرا (س)', personName: 'حضرت فاطمه زهرا (س)', type: 'martyrdom' },
  { id: 'ashura', hijriMonth: 1, hijriDay: 10, title: 'شهادت امام حسین (ع) در روز عاشورا', personName: 'امام حسین (ع)', type: 'martyrdom', isOfficialHoliday: true },
  { id: 'tasua', hijriMonth: 1, hijriDay: 9, title: 'تاسوعای حسینی', personName: 'امام حسین (ع)', type: 'martyrdom', isOfficialHoliday: true },
  { id: 'arbaeen', hijriMonth: 2, hijriDay: 20, title: 'اربعین حسینی', personName: 'امام حسین (ع)', type: 'martyrdom', isOfficialHoliday: true },
  { id: 'shahadat-imam-sajjad', hijriMonth: 1, hijriDay: 25, title: 'شهادت امام سجاد (ع)', personName: 'امام سجاد (ع)', type: 'martyrdom' },
  { id: 'shahadat-imam-baqir', hijriMonth: 7, hijriDay: 7, title: 'شهادت امام محمدباقر (ع)', personName: 'امام محمدباقر (ع)', type: 'martyrdom' },
  { id: 'shahadat-imam-sadiq', hijriMonth: 7, hijriDay: 25, title: 'شهادت امام جعفر صادق (ع)', personName: 'امام جعفر صادق (ع)', type: 'martyrdom', isOfficialHoliday: true },
  { id: 'shahadat-imam-kazim', hijriMonth: 7, hijriDay: 25, title: 'شهادت امام موسی کاظم (ع)', personName: 'امام موسی کاظم (ع)', type: 'martyrdom' },
  { id: 'shahadat-imam-reza', hijriMonth: 2, hijriDay: 30, title: 'شهادت امام رضا (ع)', personName: 'امام رضا (ع)', type: 'martyrdom', isOfficialHoliday: true },
  { id: 'shahadat-imam-jawad', hijriMonth: 12, hijriDay: 29, title: 'شهادت امام محمدتقی الجواد (ع)', personName: 'امام محمدتقی الجواد (ع)', type: 'martyrdom', isOfficialHoliday: true },
  { id: 'shahadat-imam-hadi', hijriMonth: 3, hijriDay: 3, title: 'شهادت امام علی‌النقی الهادی (ع)', personName: 'امام علی‌النقی الهادی (ع)', type: 'martyrdom' },
  { id: 'shahadat-imam-askari', hijriMonth: 8, hijriDay: 8, title: 'شهادت امام حسن عسکری (ع)', personName: 'امام حسن عسکری (ع)', type: 'martyrdom', isOfficialHoliday: true },
  { id: 'eid-fitr', hijriMonth: 10, hijriDay: 1, title: 'عید سعید فطر', personName: '', type: 'eid', isOfficialHoliday: true },
  { id: 'eid-ghadir', hijriMonth: 12, hijriDay: 18, title: 'عید سعید غدیر خم', personName: '', type: 'eid', isOfficialHoliday: true },
  { id: 'eid-mabath', hijriMonth: 7, hijriDay: 27, title: 'عید مبعث پیامبر اکرم (ص)', personName: '', type: 'eid', isOfficialHoliday: true },
  { id: 'eid-adha', hijriMonth: 12, hijriDay: 10, title: 'عید سعید قربان', personName: '', type: 'eid', isOfficialHoliday: true },
  { id: 'nimeh-shaban', hijriMonth: 8, hijriDay: 15, title: 'جشن نیمهٔ شعبان (میلاد امام زمان عج)', personName: 'امام زمان (عج)', type: 'eid', isOfficialHoliday: true },
];

export function getOccasionMessage(occasion: ReligiousOccasion): string {
  if (occasion.type === 'birth') {
    return `تبریک می‌گم! امروز میلاد ${occasion.personName || occasion.title} هست ❤️`;
  }
  if (occasion.type === 'martyrdom') {
    return `امروز شهادت ${occasion.personName || occasion.title} رو تسلیت می‌گم 🖤`;
  }
  return `${occasion.title} مبارک باد 🌿`;
}
