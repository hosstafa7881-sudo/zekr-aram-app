export type TargetMode = 'stop' | 'notify-continue' | 'loop';

export interface CustomDhikrStage {
  id: string;
  name: string;
  target: number;
}

export interface DhikrItem {
  id: string;
  title: string;
  arabicText: string;
  translation: string;
  count: number;
  totalAllTime: number;
  target: number;
  targetMode: TargetMode;
  category: 'salawat' | 'tasbihat' | 'weekday' | 'general' | 'custom';
  weekdayIndex?: number; // 0 = شنبه (Saturday), 1 = یکشنبه, ..., 6 = جمعه (Friday)
  isTasbihatZahra?: boolean;
  /** User-defined multi-stage dhikr (like Tasbihat Arba's structure), each stage with its own name + target. Locked after the free trial. */
  customStages?: CustomDhikrStage[];
  color: string;
  updatedAt: number;
}

export const INITIAL_DHIKR_LIST: DhikrItem[] = [
  {
    id: 'salawat-main',
    title: 'صلوات بر محمّد و آل محمّد',
    arabicText: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَآلِ مُحَمَّدٍ وَعَجِّلْ فَرَجَهُمْ',
    translation: 'خدایا بر محمّد و خاندان پاکش درود فرست و در فرج ایشان تعجیل فرما.',
    count: 0,
    totalAllTime: 0,
    target: 100,
    targetMode: 'notify-continue',
    category: 'salawat',
    color: '#D4AF37',
    updatedAt: Date.now(),
  },
  {
    id: 'tasbihat-zahra',
    title: 'تسبیحات حضرت زهرا (س)',
    arabicText: 'اللَّهُ أَكْبَرُ (۳۴) • الْحَمْدُ لِلَّهِ (۳۳) • سُبْحَانَ اللَّهِ (۳۳)',
    translation: 'تسبیحات سه‌مرحله‌ای خودکار: ۳۴ مرتبه الله اکبر، ۳۳ مرتبه الحمدلله، ۳۳ مرتبه سبحان‌الله.',
    count: 0,
    totalAllTime: 0,
    target: 100,
    targetMode: 'stop',
    category: 'tasbihat',
    isTasbihatZahra: true,
    color: '#34D399',
    updatedAt: Date.now(),
  },
  {
    id: 'istighfar',
    title: 'استغفار و طلب آمرزش',
    arabicText: 'أَسْتَغْفِرُ اللَّهَ رَبِّي وَأَتُوبُ إِلَيْهِ',
    translation: 'از خداوند که پروردگار من است آمرزش می‌طلبم و به سوی او باز می‌گردم.',
    count: 0,
    totalAllTime: 0,
    target: 70,
    targetMode: 'notify-continue',
    category: 'general',
    color: '#6EE7B7',
    updatedAt: Date.now(),
  },
  {
    id: 'tasbihat-arba',
    title: 'تسبیحات اربعه',
    arabicText: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلٰهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ',
    translation: 'پاک و منزه است خدا، و ستایش مخصوص خداست، و معبودی جز خدا نیست، و خدا بزرگ‌تر از هر وصفی است.',
    count: 0,
    totalAllTime: 0,
    target: 33,
    targetMode: 'notify-continue',
    category: 'general',
    color: '#FBBF24',
    updatedAt: Date.now(),
  },
  // 7 Weekday Dhikrs (0=شنبه ... 6=جمعه)
  {
    id: 'weekday-0-saturday',
    title: 'ذکر روز شنبه',
    arabicText: 'يَا رَبَّ الْعَالَمِينَ',
    translation: 'ای پروردگار جهانیان (موجب بی‌نیازی و برکت در کارها)',
    count: 0,
    totalAllTime: 0,
    target: 100,
    targetMode: 'notify-continue',
    category: 'weekday',
    weekdayIndex: 0,
    color: '#D4AF37',
    updatedAt: Date.now(),
  },
  {
    id: 'weekday-1-sunday',
    title: 'ذکر روز یکشنبه',
    arabicText: 'يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
    translation: 'ای صاحب جلال و بزرگواری (موجب فتح و گشایش در امور)',
    count: 0,
    totalAllTime: 0,
    target: 100,
    targetMode: 'notify-continue',
    category: 'weekday',
    weekdayIndex: 1,
    color: '#D4AF37',
    updatedAt: Date.now(),
  },
  {
    id: 'weekday-2-monday',
    title: 'ذکر روز دوشنبه',
    arabicText: 'يَا قَاضِيَ الْحَاجَاتِ',
    translation: 'ای برآورندهٔ حاجت‌ها (موجب روا شدن حاجات)',
    count: 0,
    totalAllTime: 0,
    target: 100,
    targetMode: 'notify-continue',
    category: 'weekday',
    weekdayIndex: 2,
    color: '#D4AF37',
    updatedAt: Date.now(),
  },
  {
    id: 'weekday-3-tuesday',
    title: 'ذکر روز سه‌شنبه',
    arabicText: 'يَا أَرْحَمَ الرَّاحِمِينَ',
    translation: 'ای مهربان‌ترین مهربانان (موجب روا شدن حاجت‌های مشروع)',
    count: 0,
    totalAllTime: 0,
    target: 100,
    targetMode: 'notify-continue',
    category: 'weekday',
    weekdayIndex: 3,
    color: '#D4AF37',
    updatedAt: Date.now(),
  },
  {
    id: 'weekday-4-wednesday',
    title: 'ذکر روز چهارشنبه',
    arabicText: 'يَا حَيُّ يَا قَيُّومُ',
    translation: 'ای زنده و ای پایندهٔ همیشگی (موجب عزت و ماندگاری بر خیر)',
    count: 0,
    totalAllTime: 0,
    target: 100,
    targetMode: 'notify-continue',
    category: 'weekday',
    weekdayIndex: 4,
    color: '#D4AF37',
    updatedAt: Date.now(),
  },
  {
    id: 'weekday-5-thursday',
    title: 'ذکر روز پنجشنبه',
    arabicText: 'لَا إِلٰهَ إِلَّا اللَّهُ الْمَلِكُ الْحَقُّ الْمُبِينُ',
    translation: 'معبودی جز الله فرمانروای حق و آشکار نیست (موجب رزق و روزی فراوان)',
    count: 0,
    totalAllTime: 0,
    target: 100,
    targetMode: 'notify-continue',
    category: 'weekday',
    weekdayIndex: 5,
    color: '#D4AF37',
    updatedAt: Date.now(),
  },
  {
    id: 'weekday-6-friday',
    title: 'ذکر روز جمعه (صلوات خاص)',
    arabicText: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَآلِ مُحَمَّدٍ وَعَجِّلْ فَرَجَهُمْ',
    translation: 'خدایا بر محمّد و آل محمّد درود فرست و در فرج ایشان تعجیل فرما',
    count: 0,
    totalAllTime: 0,
    target: 100,
    targetMode: 'notify-continue',
    category: 'weekday',
    weekdayIndex: 6,
    color: '#D4AF37',
    updatedAt: Date.now(),
  },
];
