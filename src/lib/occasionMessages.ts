// مورد ۲۱ — the exact wording of every occasion notice, in one place.
//
// Category → message (کلمه‌به‌کلمه از پرامپت):
//   مذهبی غم (شهادت/رحلت/وفات/عاشورا…)  → امروز [عنوان] است، تسلیت می‌گم 🖤
//   مذهبی شادی (میلاد/عید/بعثت…)        → امروز [عنوان] است، تبریک می‌گم ❤️
//   خنثی                                 → امروز [عنوان] است 📅
//   استثنا: اول فروردین (نوروز)          → the dedicated Nowruz greeting below
//
// [عنوان] is always the occasion's official calendar title, and when a day has
// several occasions of the SAME category their titles are joined with «و» in a
// single notice.

// دور هشتم / مورد ۱۰ — the category now lives on the data itself (غم/شادی/خنثی)
// rather than being derived from an occasion's type, because the approved table
// includes neutral LUNAR occasions too (آغاز سال نو قمری، شب قدر، تعطیل عید فطر)
// and the old name 'national' no longer described it.
export type { OccasionMood } from '../data/religiousOccasions';
import type { OccasionMood } from '../data/religiousOccasions';

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
