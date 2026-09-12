// مورد ۲۱ — the exact wording of every occasion notice, in one place.
//
// Category → message (کلمه‌به‌کلمه از پرامپت):
//   مذهبی غم (شهادت/رحلت/وفات/عاشورا…)  → امروز [عنوان] است، تسلیت می‌گم 🖤
//   مذهبی شادی (میلاد/عید/بعثت…)        → امروز [عنوان] است، تبریک می‌گم ❤️
//   رسمی غیرمذهبی                        → امروز [عنوان] است 📅
//   استثنا: اول فروردین (نوروز)          → the dedicated Nowruz greeting below
//
// [عنوان] is always the occasion's official calendar title, and when a day has
// several occasions of the SAME category their titles are joined with «و» in a
// single notice.

export type OccasionMood = 'sad' | 'happy' | 'national';

export const NOWRUZ_MESSAGE =
  'سال نو مبارک 🌸 یا مُحَوِّلَ الحَولِ وَالأحوال، حَوِّل حالَنا إلی أحسَنِ الحال. امیدوارم امسال پر از آرامش، سلامتی و یاد خدا باشه 🌱';

export function joinOccasionTitles(titles: string[]): string {
  return titles.filter(Boolean).join(' و ');
}

export function buildOccasionNotice(mood: OccasionMood, titles: string[]): string {
  const title = joinOccasionTitles(titles);
  if (mood === 'sad') return `امروز ${title} است، تسلیت می‌گم 🖤`;
  if (mood === 'happy') return `امروز ${title} است، تبریک می‌گم ❤️`;
  return `امروز ${title} است 📅`;
}
