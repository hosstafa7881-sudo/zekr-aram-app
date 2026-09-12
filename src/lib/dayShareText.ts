// مورد ۱۳ / ۱۵ — every "share one day" text, in one place.
//
// Round four shared the notebook only as a one-line summary everywhere. Round
// five splits that into two variants:
//   * 'full'    → صفحه‌ی «جزئیات بیشتر» و کارت‌های «۳۰ روز اخیر»: the complete
//                 notebook (every item with ✅/❌, plus دلیل and راه‌حل each on
//                 its own line)
//   * 'summary' → مودال خلاصه‌ی تقویم: the shorter round-four wording, kept
//                 exactly as it was
//
// It also decides WHICH options make sense for a given day (مورد ۱۵), so a day
// with only a notebook never offers "فقط ذکرها".

import { DailyLog } from './db';
import { NotebookDayEntry, NotebookItemDef } from '../features/notebook/notebookTypes';
import { toPersianDigits } from '../utils/persian';

export type DayShareOption = 'dhikr' | 'notebook' | 'both';
export type DayShareVariant = 'full' | 'summary';

export interface DayShareData {
  shamsiDateLabel: string;
  log: DailyLog | undefined;
  notebookEntry: NotebookDayEntry | undefined;
  notebookItems: NotebookItemDef[];
}

/** متن نمایش‌داده‌شده برای روزی که دفترچه دارد ولی هیچ ذکری ندارد (مورد ۱۴). */
export const NO_DHIKR_ON_DAY_TEXT = 'در این روز هیچ ذکری ثبت نشده';

export function dayHasDhikr(data: DayShareData): boolean {
  return (data.log?.totalCount || 0) > 0;
}

export function dayHasNotebook(data: DayShareData): boolean {
  const entry = data.notebookEntry;
  if (!entry) return false;
  const hasReason = Object.values(entry.reasons || {}).some(
    (r) => r.why?.trim() || r.solution?.trim()
  );
  return (
    entry.checkedItemIds.length > 0 ||
    !!entry.feelingText?.trim() ||
    entry.stickers.length > 0 ||
    hasReason
  );
}

/**
 * مورد ۱۵ — only the options that actually have content. A single returned
 * option means the caller should share it straight away without showing the
 * picker popup at all.
 */
export function getAvailableDayShareOptions(data: DayShareData): DayShareOption[] {
  const hasDhikr = dayHasDhikr(data);
  const hasNotebook = dayHasNotebook(data);
  if (hasDhikr && hasNotebook) return ['dhikr', 'notebook', 'both'];
  if (hasNotebook) return ['notebook'];
  return ['dhikr'];
}

function buildDhikrLines(data: DayShareData): string[] {
  const lines = data.log
    ? Object.values(data.log.breakdown)
        .filter((item) => item.count > 0)
        .map((item) => `${item.title}: ${toPersianDigits(item.count)}`)
    : [];
  lines.push(
    dayHasDhikr(data)
      ? `مجموع: ${toPersianDigits(data.log?.totalCount || 0)} ذکر`
      : NO_DHIKR_ON_DAY_TEXT
  );
  return lines;
}

function buildFullNotebookBlock(data: DayShareData, withHeader: boolean): string {
  const checkedIds = data.notebookEntry?.checkedItemIds || [];
  const lines: string[] = [];
  if (withHeader) {
    lines.push(
      `📔 دفترچه‌ی کارهای خوب (${toPersianDigits(checkedIds.length)} از ${toPersianDigits(
        data.notebookItems.length
      )} مورد)`
    );
  }
  data.notebookItems.forEach((item) => {
    const done = checkedIds.includes(item.id);
    lines.push(`${done ? '✅' : '❌'} ${item.text}`);
    if (!done) {
      const reason = data.notebookEntry?.reasons?.[item.id];
      // «دلیل» و «راه‌حل» هرکدام در یک خط جدا — و اگر خالی‌اند، خطی هم نمی‌آید.
      if (reason?.why?.trim()) lines.push(`    دلیل: ${reason.why.trim()}`);
      if (reason?.solution?.trim()) lines.push(`    راه‌حل: ${reason.solution.trim()}`);
    }
  });
  return lines.join('\n');
}

function buildFeelingLine(data: DayShareData): string {
  const entry = data.notebookEntry;
  if (!entry) return '';
  const feeling = entry.feelingText?.trim() || '';
  const stickers = entry.stickers.join(' ');
  if (!feeling && !stickers) return '';
  return `حس امروز: ${[feeling, stickers].filter(Boolean).join(' ')}`;
}

/** The unchanged round-four short notebook wording, used by the calendar summary modal only. */
function buildSummaryNotebookText(data: DayShareData): string {
  const checkedCount = data.notebookEntry?.checkedItemIds.length || 0;
  const lines = [
    `دفترچهٔ کارهای خوب من در ${data.shamsiDateLabel}: ${toPersianDigits(
      checkedCount
    )} از ${toPersianDigits(data.notebookItems.length)} مورد انجام شد`,
  ];
  if (data.notebookEntry?.feelingText) lines.push(data.notebookEntry.feelingText);
  if (data.notebookEntry?.stickers.length) lines.push(data.notebookEntry.stickers.join(' '));
  return `${lines.join('\n')} 🌿`;
}

function buildSummaryDhikrText(data: DayShareData): string {
  return `آمار ذکر من در ${data.shamsiDateLabel}: مجموع ${toPersianDigits(
    data.log?.totalCount || 0
  )} ذکر 🌿`;
}

export function buildDayShareText(
  option: DayShareOption,
  variant: DayShareVariant,
  data: DayShareData
): string {
  if (variant === 'summary') {
    if (option === 'dhikr') return buildSummaryDhikrText(data);
    if (option === 'notebook') return buildSummaryNotebookText(data);
    return `${buildSummaryDhikrText(data)}\n\n${buildSummaryNotebookText(data)}`;
  }

  const blocks: string[] = [];

  if (option === 'notebook') {
    // First line carries the date (and the ratio, so the count isn't lost when
    // the dhikr section is dropped).
    const checked = data.notebookEntry?.checkedItemIds.length || 0;
    blocks.push(
      `📔 دفترچه‌ی کارهای خوب من — ${data.shamsiDateLabel} (${toPersianDigits(
        checked
      )} از ${toPersianDigits(data.notebookItems.length)} مورد)`
    );
    blocks.push(buildFullNotebookBlock(data, false));
  } else if (option === 'dhikr') {
    blocks.push(`📿 ذکرهای من — ${data.shamsiDateLabel}`);
    blocks.push(buildDhikrLines(data).join('\n'));
  } else {
    blocks.push(`📿 ذکرها و دفترچه‌ی من — ${data.shamsiDateLabel}`);
    blocks.push(buildDhikrLines(data).join('\n'));
    blocks.push(buildFullNotebookBlock(data, true));
  }

  if (option !== 'dhikr') {
    const feeling = buildFeelingLine(data);
    if (feeling) blocks.push(feeling);
  }

  return blocks.join('\n\n');
}

export const DAY_SHARE_OPTION_LABELS: Record<DayShareOption, string> = {
  dhikr: 'فقط ذکرها',
  notebook: 'فقط دفترچه',
  both: 'ذکرها و دفترچه',
};
