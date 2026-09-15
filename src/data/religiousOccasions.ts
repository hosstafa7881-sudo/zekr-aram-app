// دور هشتم / مورد ۱۰ — the Hijri (lunar) occasion table, REPLACED WHOLESALE.
//
// WHY: the old table had wrong data, and the wrongness was visible on the
// user's phone. «میلاد حضرت ابوالفضل عباس (ع)» sat on ۴ ربیع‌الثانی instead of
// ۴ شعبان, and «شهادت امام جعفر صادق (ع)» and «شهادت امام موسی کاظم (ع)» were
// both filed under ۲۵ رجب, so the app showed them on the very same day.
//
// The conversion engine was never at fault — Intl's islamic calendar agrees
// exactly with what the phone displayed. The DATA was wrong. This list is the
// one the user supplied and approved; nothing has been added to it or removed
// from it.
//
// Two entries fall on «آخرین روز ماه» and must not be pinned to a number: a
// lunar month is 29 or 30 days depending on the year, so they carry
// `hijriDay: 'last'` and occasions.ts resolves it per year.

/** غم (تسلیت) · شادی (تبریک) · خنثی (بدون هیچ‌کدام). */
export type OccasionMood = 'sad' | 'happy' | 'neutral';

export interface ReligiousOccasion {
  id: string;
  /** 1 محرم … 12 ذی‌الحجه */
  hijriMonth: number;
  /** A day number, or 'last' for «آخرین روز ماه» (29 or 30 depending on the year). */
  hijriDay: number | 'last';
  title: string;
  mood: OccasionMood;
  /** Only the subset that is an actual day off in Iran — not every occasion is. */
  isOfficialHoliday?: boolean;
}

export const RELIGIOUS_OCCASIONS: ReligiousOccasion[] = [
  // محرم
  { id: 'aghaz-sal-ghamari', hijriMonth: 1, hijriDay: 1, title: 'آغاز سال نو قمری', mood: 'neutral' },
  { id: 'vorood-karbala', hijriMonth: 1, hijriDay: 2, title: 'ورود امام حسین (ع) به کربلا', mood: 'sad' },
  { id: 'tasua', hijriMonth: 1, hijriDay: 9, title: 'تاسوعای حسینی', mood: 'sad', isOfficialHoliday: true },
  { id: 'ashura', hijriMonth: 1, hijriDay: 10, title: 'عاشورای حسینی', mood: 'sad', isOfficialHoliday: true },
  { id: 'shahadat-imam-sajjad', hijriMonth: 1, hijriDay: 12, title: 'شهادت امام سجاد (ع)', mood: 'sad' },

  // صفر
  { id: 'arbaeen', hijriMonth: 2, hijriDay: 20, title: 'اربعین حسینی', mood: 'sad', isOfficialHoliday: true },
  { id: 'rehlat-payambar-shahadat-imam-hassan', hijriMonth: 2, hijriDay: 28, title: 'رحلت پیامبر اکرم (ص) و شهادت امام حسن مجتبی (ع)', mood: 'sad', isOfficialHoliday: true },
  { id: 'shahadat-imam-reza', hijriMonth: 2, hijriDay: 'last', title: 'شهادت امام رضا (ع)', mood: 'sad', isOfficialHoliday: true },

  // ربیع‌الاول
  { id: 'shahadat-imam-askari', hijriMonth: 3, hijriDay: 8, title: 'شهادت امام حسن عسکری (ع)', mood: 'sad', isOfficialHoliday: true },
  // دور دهم — ۸ است، نه ۹: آغاز امامت هم‌روز با شهادت امام حسن عسکری (ع) است
  // (۳۰ مرداد ۱۴۰۵)، همان‌طور که تقویم رسمی نشان می‌دهد و کاربر گزارش کرد.
  // چون آن روز یک مناسبت غم و یک مناسبت شادی دارد، قانون موجود یک اعلان
  // خنثای واحد با هر دو عنوان می‌سازد.
  { id: 'aghaz-emamat-valiasr', hijriMonth: 3, hijriDay: 8, title: 'آغاز امامت حضرت ولیعصر (عج)', mood: 'happy' },
  { id: 'milad-payambar-ahle-sonnat', hijriMonth: 3, hijriDay: 12, title: 'میلاد پیامبر اکرم (ص) به روایت اهل سنت — آغاز هفته وحدت', mood: 'happy' },
  { id: 'veladat-payambar-imam-sadiq', hijriMonth: 3, hijriDay: 17, title: 'ولادت پیامبر اکرم (ص) و امام جعفر صادق (ع)', mood: 'happy', isOfficialHoliday: true },

  // ربیع‌الثانی
  { id: 'veladat-imam-askari', hijriMonth: 4, hijriDay: 8, title: 'ولادت امام حسن عسکری (ع)', mood: 'happy' },
  { id: 'vafat-masoumeh', hijriMonth: 4, hijriDay: 10, title: 'وفات حضرت معصومه (س)', mood: 'sad' },

  // جمادی‌الاول
  { id: 'veladat-zeinab', hijriMonth: 5, hijriDay: 5, title: 'ولادت حضرت زینب (س) — روز پرستار', mood: 'happy' },
  { id: 'ayyam-fatemiyeh', hijriMonth: 5, hijriDay: 13, title: 'ایام فاطمیه', mood: 'sad' },

  // جمادی‌الثانی
  { id: 'shahadat-fatemeh', hijriMonth: 6, hijriDay: 3, title: 'شهادت حضرت فاطمه زهرا (س)', mood: 'sad', isOfficialHoliday: true },
  { id: 'vafat-ommolbanin', hijriMonth: 6, hijriDay: 13, title: 'وفات حضرت ام‌البنین (س)', mood: 'sad' },
  { id: 'veladat-fatemeh', hijriMonth: 6, hijriDay: 20, title: 'ولادت حضرت فاطمه زهرا (س) — روز مادر', mood: 'happy' },

  // رجب
  { id: 'veladat-imam-baqir', hijriMonth: 7, hijriDay: 1, title: 'ولادت امام محمد باقر (ع)', mood: 'happy' },
  { id: 'shahadat-imam-hadi', hijriMonth: 7, hijriDay: 3, title: 'شهادت امام هادی (ع)', mood: 'sad' },
  { id: 'veladat-imam-taqi', hijriMonth: 7, hijriDay: 10, title: 'ولادت امام محمد تقی (ع)', mood: 'happy' },
  { id: 'veladat-imam-ali', hijriMonth: 7, hijriDay: 13, title: 'ولادت امام علی (ع) — روز پدر', mood: 'happy', isOfficialHoliday: true },
  { id: 'vafat-zeinab', hijriMonth: 7, hijriDay: 15, title: 'وفات حضرت زینب (س)', mood: 'sad' },
  { id: 'shahadat-imam-kazim', hijriMonth: 7, hijriDay: 25, title: 'شهادت امام موسی کاظم (ع)', mood: 'sad' },
  { id: 'mabath', hijriMonth: 7, hijriDay: 27, title: 'مبعث پیامبر اکرم (ص)', mood: 'happy', isOfficialHoliday: true },

  // شعبان
  { id: 'veladat-imam-hossein', hijriMonth: 8, hijriDay: 3, title: 'ولادت امام حسین (ع) — روز پاسدار', mood: 'happy' },
  { id: 'veladat-abolfazl', hijriMonth: 8, hijriDay: 4, title: 'ولادت حضرت ابوالفضل العباس (ع) — روز جانباز', mood: 'happy' },
  { id: 'veladat-imam-sajjad', hijriMonth: 8, hijriDay: 5, title: 'ولادت امام سجاد (ع)', mood: 'happy' },
  { id: 'veladat-ali-akbar', hijriMonth: 8, hijriDay: 11, title: 'ولادت حضرت علی اکبر (ع) — روز جوان', mood: 'happy' },
  { id: 'veladat-mahdi', hijriMonth: 8, hijriDay: 15, title: 'ولادت حضرت مهدی (عج)', mood: 'happy', isOfficialHoliday: true },

  // رمضان
  { id: 'aghaz-ramazan', hijriMonth: 9, hijriDay: 1, title: 'آغاز ماه مبارک رمضان', mood: 'happy' },
  { id: 'veladat-imam-hassan', hijriMonth: 9, hijriDay: 15, title: 'ولادت امام حسن مجتبی (ع)', mood: 'happy' },
  { id: 'zarbat-imam-ali', hijriMonth: 9, hijriDay: 19, title: 'ضربت خوردن امام علی (ع) — شب قدر', mood: 'sad' },
  { id: 'shahadat-imam-ali', hijriMonth: 9, hijriDay: 21, title: 'شهادت امام علی (ع) — شب قدر', mood: 'sad', isOfficialHoliday: true },
  { id: 'shab-ghadr-23', hijriMonth: 9, hijriDay: 23, title: 'شب قدر', mood: 'neutral' },

  // شوال
  { id: 'eid-fitr', hijriMonth: 10, hijriDay: 1, title: 'عید سعید فطر', mood: 'happy', isOfficialHoliday: true },
  { id: 'eid-fitr-2', hijriMonth: 10, hijriDay: 2, title: 'تعطیل به مناسبت عید فطر', mood: 'neutral', isOfficialHoliday: true },
  { id: 'shahadat-imam-sadiq', hijriMonth: 10, hijriDay: 25, title: 'شهادت امام جعفر صادق (ع)', mood: 'sad', isOfficialHoliday: true },

  // ذی‌القعده
  { id: 'veladat-imam-reza', hijriMonth: 11, hijriDay: 11, title: 'ولادت امام رضا (ع)', mood: 'happy' },
  { id: 'shahadat-imam-taqi', hijriMonth: 11, hijriDay: 'last', title: 'شهادت امام محمد تقی (ع)', mood: 'sad' },

  // ذی‌الحجه
  { id: 'ezdevaj-ali-fatemeh', hijriMonth: 12, hijriDay: 1, title: 'ازدواج حضرت علی (ع) و حضرت فاطمه (س)', mood: 'happy' },
  { id: 'shahadat-imam-baqir', hijriMonth: 12, hijriDay: 7, title: 'شهادت امام محمد باقر (ع)', mood: 'sad' },
  { id: 'rooz-arafe', hijriMonth: 12, hijriDay: 9, title: 'روز عرفه', mood: 'happy' },
  { id: 'eid-ghorban', hijriMonth: 12, hijriDay: 10, title: 'عید سعید قربان', mood: 'happy', isOfficialHoliday: true },
  { id: 'veladat-imam-hadi', hijriMonth: 12, hijriDay: 15, title: 'ولادت امام هادی (ع)', mood: 'happy' },
  { id: 'eid-ghadir', hijriMonth: 12, hijriDay: 18, title: 'عید سعید غدیر خم', mood: 'happy', isOfficialHoliday: true },
  { id: 'veladat-imam-kazim', hijriMonth: 12, hijriDay: 20, title: 'ولادت امام موسی کاظم (ع)', mood: 'happy' },
  { id: 'rooz-mobahele', hijriMonth: 12, hijriDay: 24, title: 'روز مباهله', mood: 'happy' },
];
