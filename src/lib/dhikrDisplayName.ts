// دور هشتم / مورد ۱۱ — the ONE place that turns a stored history entry into
// the name the user reads.
//
// THE BUG: the seven weekday dhikrs are stored under a generic label — «ذکر
// روز شنبه» — while the dhikr itself is the Arabic line shown under that label
// in کتابخانهٔ ذکر. History only ever printed the label, so a day's list read
//
//     ذکر روز شنبه: ۱۰۰
//
// with no sign of WHICH dhikr had been said 100 times. Every other dhikr was
// fine because its own title already names it («ذکر یونسیه: ۱۵»).
//
// No new wording was invented for this: the name comes straight out of the
// library entry the user already sees.
//
// Old records were written before the Arabic text was stored alongside the
// count, so their name is recovered from the dhikr's id instead — the user's
// existing history keeps its meaning rather than staying half-labelled.

import { INITIAL_DHIKR_LIST } from './seedData';

const SEED_BY_ID = new Map(INITIAL_DHIKR_LIST.map((d) => [d.id, d]));

/** Only the weekday dhikrs carry a generic label that needs the Arabic added. */
function needsArabicSuffix(dhikrId: string): boolean {
  return SEED_BY_ID.get(dhikrId)?.category === 'weekday';
}

/**
 * The display name for one entry of a day's breakdown.
 *
 * `storedArabic` is what newer records carry; when it is missing (every record
 * written before this round) the Arabic is looked up from the dhikr's id.
 * Anything that is not a weekday dhikr is returned untouched, so no other
 * screen's wording changes.
 */
export function resolveDhikrDisplayTitle(
  dhikrId: string,
  storedTitle: string,
  storedArabic?: string
): string {
  if (!needsArabicSuffix(dhikrId)) return storedTitle;
  const arabic = (storedArabic || SEED_BY_ID.get(dhikrId)?.arabicText || '').trim();
  if (!arabic) return storedTitle;
  if (storedTitle.includes(arabic)) return storedTitle;
  return `${storedTitle} — ${arabic}`;
}

/** The Arabic text to store with a new count, so future records stand alone. */
export function arabicTextForRecord(dhikrId: string, arabicText?: string): string | undefined {
  const value = (arabicText || SEED_BY_ID.get(dhikrId)?.arabicText || '').trim();
  return value.length > 0 ? value : undefined;
}
