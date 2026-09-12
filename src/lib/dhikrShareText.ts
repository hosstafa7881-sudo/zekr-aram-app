// مورد ۶ / مورد ۸ — the exact «ذکرهای امروز» share text, built in ONE place
// because two different buttons send it: the counter page's new share icon
// and the medal-earned popup (which prefixes it with its own headline).
//
// Shape (exact, per the spec):
//
//   📿 ذکرهای امروز من — [تاریخ شمسی کامل]
//
//   [نام ذکر]: [تعداد]
//   مجموع: [X] ذکر
//
//   ⭐ [N] ستاره | [آیکون مدال] [نام مدال]
//
//   من با برنامه‌ی «ذکرآرام» ذکر می‌گم 🌿 تو هم می‌تونی امتحانش کنی:
//   (the store links themselves are appended by share.ts)

import { DailyLog } from './db';
import { BadgeLevel, computeLifetimeTotal, computeStarCount, getTopBadge } from './gamification';
import { toPersianDigits, getShamsiDateInfo } from '../utils/persian';
import { buildInviteLine } from './share';

export interface TodayDhikrSummary {
  shamsiDateLabel: string;
  lines: { title: string; count: number }[];
  total: number;
  starCount: number;
  topBadge: BadgeLevel | null;
}

export function buildTodayDhikrSummary(
  dailyLogs: DailyLog[],
  todayDateKey: string
): TodayDhikrSummary {
  const todayLog = dailyLogs.find((l) => l.dateKey === todayDateKey);
  const lines = todayLog
    ? Object.values(todayLog.breakdown)
        .filter((item) => item.count > 0)
        .map((item) => ({ title: item.title, count: item.count }))
    : [];
  const lifetimeTotal = computeLifetimeTotal(dailyLogs);
  return {
    shamsiDateLabel: todayLog?.shamsiDate || getShamsiDateInfo().formattedFull,
    lines,
    total: todayLog?.totalCount || 0,
    starCount: computeStarCount(lifetimeTotal),
    // مورد ۹ — only the highest medal, never the whole collection.
    topBadge: getTopBadge(lifetimeTotal),
  };
}

/**
 * The «⭐ [N] ستاره | 🥉 مدال برنز» line. Returns '' when the user has neither
 * a star nor a medal (مورد ۱۰: say nothing at all rather than "you have none
 * yet"), and only the half that actually applies when just one of them exists.
 */
export function buildStarBadgeLine(starCount: number, topBadge: BadgeLevel | null): string {
  const parts: string[] = [];
  if (starCount > 0) parts.push(`⭐ ${toPersianDigits(starCount)} ستاره`);
  if (topBadge) parts.push(`${topBadge.emoji} ${topBadge.label}`);
  return parts.join(' | ');
}

export function buildTodayDhikrShareText(
  dailyLogs: DailyLog[],
  todayDateKey: string
): string {
  const summary = buildTodayDhikrSummary(dailyLogs, todayDateKey);
  const blocks: string[] = [`📿 ذکرهای امروز من — ${summary.shamsiDateLabel}`];

  const countLines = summary.lines.map(
    (l) => `${l.title}: ${toPersianDigits(l.count)}`
  );
  countLines.push(`مجموع: ${toPersianDigits(summary.total)} ذکر`);
  blocks.push(countLines.join('\n'));

  const starBadgeLine = buildStarBadgeLine(summary.starCount, summary.topBadge);
  if (starBadgeLine) blocks.push(starBadgeLine);

  blocks.push(buildInviteLine());
  return blocks.join('\n\n');
}

/** مورد ۸ — the medal popup's share text: its own headline, then the text above. */
export function buildMedalShareText(
  badge: BadgeLevel,
  dailyLogs: DailyLog[],
  todayDateKey: string
): string {
  return `🏅 امروز ${badge.label} رو گرفتم!\n\n${buildTodayDhikrShareText(
    dailyLogs,
    todayDateKey
  )}`;
}
