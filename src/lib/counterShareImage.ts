// مورد ۶ — «تصویر همین صفحه»: the app DRAWS a picture of the counting page
// (it is not a phone screenshot), with these deliberate differences from the
// live page:
//
//  * the «صفر کردن شمارش» / «کم کردن یک عدد» row and its caption are replaced
//    by a white promo box (app name + tagline + which stores it's on)
//  * the bottom nav bar, the «برای شمارش، روی هر نقطه…» hint and the little
//    sound/vibration/share icons are left out entirely
//  * everything else the spec lists stays: ذکر انتخاب‌شده، دکمه‌ی کتابخانهٔ
//    ذکر، متن عربی و ترجمه، ردیف هدف، دایره‌ی شمارش، و ردیف ستاره و مدال
//    (only when the user actually has one).

import { DhikrItem } from './seedData';
import { toPersianDigits } from '../utils/persian';
import { BadgeLevel } from './gamification';
import { buildStarBadgeLine } from './dhikrShareText';
import { buildStoreNamesSentence } from './share';
import {
  ThemeColors,
  canvasToBlob,
  cropToHeight,
  drawText,
  drawWrappedText,
  ensureImageFontsReady,
  fillRoundRect,
  imageFont,
  measureLineHeight,
  measureTextWidth,
  readThemeColors,
} from './canvasKit';

const WIDTH = 1080;
const SCRATCH_HEIGHT = 2400;
const PAD = 56;

export interface CounterImageInput {
  dhikr: DhikrItem;
  /** Arabic text exactly as the page shows it (diacritics already applied/stripped). */
  arabicText: string;
  translation: string;
  /** Stage label shown above the number, e.g. «شمارش فعلی» or «مرحله ۲». */
  stageLabel: string;
  starCount: number;
  topBadge: BadgeLevel | null;
}

function drawTopRow(
  ctx: CanvasRenderingContext2D,
  y: number,
  theme: ThemeColors,
  dhikrTitle: string
): number {
  const rowHeight = 150;
  const buttonFont = imageFont(800, 34);
  const buttonLabel = 'کتابخانهٔ ذکر';
  const buttonWidth = measureTextWidth(ctx, buttonLabel, buttonFont) + 80;
  const cardWidth = WIDTH - PAD * 2 - buttonWidth - 24;

  // Right-hand card: «ذکر انتخاب‌شده» + the dhikr's name.
  fillRoundRect(ctx, WIDTH - PAD - cardWidth, y, cardWidth, rowHeight, 40, theme.surface, {
    color: theme.accent,
    width: 3,
  });
  drawText(ctx, 'ذکر انتخاب‌شده', WIDTH - PAD - 34, y + 32, {
    font: imageFont(500, 28),
    color: theme.accent,
  });
  drawText(ctx, dhikrTitle, WIDTH - PAD - 34, y + 74, {
    font: imageFont(800, 40),
    color: theme.text,
  });

  // Left-hand green «کتابخانهٔ ذکر» button.
  fillRoundRect(ctx, PAD, y, buttonWidth, rowHeight, 40, theme.accent);
  drawText(ctx, buttonLabel, PAD + buttonWidth / 2, y + rowHeight / 2, {
    font: buttonFont,
    color: '#ffffff',
    align: 'center',
    topBaseline: false,
  });

  return rowHeight;
}

function drawDhikrTextCard(
  ctx: CanvasRenderingContext2D,
  y: number,
  theme: ThemeColors,
  arabicText: string,
  translation: string
): number {
  if (!arabicText.trim()) return 0;
  const innerWidth = WIDTH - PAD * 2 - 72;
  const arabicFont = imageFont(800, 48);
  const translationFont = imageFont(500, 30);

  const arabicLines = Math.max(
    1,
    Math.ceil(measureTextWidth(ctx, arabicText, arabicFont) / innerWidth)
  );
  const arabicHeight = arabicLines * measureLineHeight(ctx, arabicFont);
  const translationHeight = translation
    ? measureLineHeight(ctx, translationFont) *
      Math.max(1, Math.ceil(measureTextWidth(ctx, translation, translationFont) / innerWidth))
    : 0;
  const cardHeight = 36 + arabicHeight + (translation ? 14 + translationHeight : 0) + 36;

  fillRoundRect(ctx, PAD, y, WIDTH - PAD * 2, cardHeight, 40, theme.surface, {
    color: theme.border,
    width: 3,
  });

  let inner = y + 36;
  inner += drawWrappedText(ctx, arabicText, WIDTH / 2, inner, innerWidth, {
    font: arabicFont,
    color: theme.text,
    align: 'center',
  });
  if (translation) {
    inner += 14;
    drawWrappedText(ctx, translation, WIDTH / 2, inner, innerWidth, {
      font: translationFont,
      color: theme.muted,
      align: 'center',
    });
  }
  return cardHeight;
}

function drawTargetRow(
  ctx: CanvasRenderingContext2D,
  y: number,
  theme: ThemeColors,
  dhikr: DhikrItem
): number {
  const height = 86;
  const modeLabel =
    dhikr.targetMode === 'stop'
      ? 'توقف در پایان'
      : dhikr.targetMode === 'loop'
      ? 'دور خودکار'
      : 'هشدار + ادامه';
  const label = `هدف: ${toPersianDigits(dhikr.target)} (${modeLabel})`;
  const font = imageFont(700, 30);
  const chipWidth = measureTextWidth(ctx, label, font) + 64;
  fillRoundRect(ctx, WIDTH - PAD - chipWidth, y, chipWidth, height, 28, theme.surface, {
    color: theme.border,
    width: 3,
  });
  drawText(ctx, label, WIDTH - PAD - chipWidth / 2, y + height / 2, {
    font,
    color: theme.text,
    align: 'center',
    topBaseline: false,
  });
  return height;
}

function drawCounterCircle(
  ctx: CanvasRenderingContext2D,
  y: number,
  theme: ThemeColors,
  input: CounterImageInput
): number {
  const boxHeight = 860;
  fillRoundRect(ctx, PAD, y, WIDTH - PAD * 2, boxHeight, 56, theme.surface2, {
    color: theme.accent,
    width: 3,
  });

  const cx = WIDTH / 2;
  const cy = y + boxHeight / 2;
  const radius = 300;
  const progress =
    input.dhikr.target > 0
      ? Math.min(1, input.dhikr.count / input.dhikr.target)
      : 0;

  ctx.save();
  ctx.lineWidth = 24;
  ctx.lineCap = 'round';
  ctx.strokeStyle = theme.border;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  if (progress > 0) {
    ctx.strokeStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  drawText(ctx, input.stageLabel, cx, cy - 190, {
    font: imageFont(500, 32),
    color: theme.muted,
    align: 'center',
  });
  drawText(ctx, toPersianDigits(input.dhikr.count), cx, cy + 10, {
    font: imageFont(900, 190),
    color: theme.text,
    align: 'center',
    topBaseline: false,
  });
  drawText(
    ctx,
    `${toPersianDigits(input.dhikr.count)} از ${toPersianDigits(input.dhikr.target)}`,
    cx,
    cy + 70,
    { font: imageFont(800, 34), color: theme.accent, align: 'center' }
  );
  drawText(
    ctx,
    `مجموع کل این ذکر: ${toPersianDigits(input.dhikr.totalAllTime)}`,
    cx,
    cy + 140,
    { font: imageFont(500, 28), color: theme.muted, align: 'center' }
  );

  return boxHeight;
}

function drawStarBadgeRow(
  ctx: CanvasRenderingContext2D,
  y: number,
  theme: ThemeColors,
  input: CounterImageInput
): number {
  const line = buildStarBadgeLine(input.starCount, input.topBadge);
  if (!line) return 0; // مورد ۱۰ — nothing at all when there's nothing earned.
  const height = 110;
  fillRoundRect(ctx, PAD, y, WIDTH - PAD * 2, height, 36, theme.surface, {
    color: theme.border,
    width: 3,
  });
  drawText(ctx, line, WIDTH - PAD - 40, y + height / 2, {
    font: imageFont(800, 36),
    color: theme.text,
    topBaseline: false,
  });
  return height;
}

/** The white box that takes the place of the reset/decrement row. */
function drawPromoBox(ctx: CanvasRenderingContext2D, y: number, theme: ThemeColors): number {
  const storeSentence = buildStoreNamesSentence();
  const lineCount = storeSentence ? 3 : 2;
  const height = lineCount === 3 ? 280 : 210;

  fillRoundRect(ctx, PAD, y, WIDTH - PAD * 2, height, 44, '#ffffff', {
    color: theme.accent,
    width: 3,
  });

  let inner = y + 40;
  inner += drawText(ctx, 'ذکرآرام', WIDTH / 2, inner, {
    font: imageFont(900, 68),
    color: theme.accentDark,
    align: 'center',
  });
  inner += 8;
  inner += drawText(ctx, 'برنامه‌ی شمارش ذکر و تسبیح', WIDTH / 2, inner, {
    font: imageFont(600, 34),
    color: '#3f4a3f',
    align: 'center',
  });
  if (storeSentence) {
    inner += 12;
    drawText(ctx, storeSentence, WIDTH / 2, inner, {
      font: imageFont(700, 32),
      color: theme.accent,
      align: 'center',
    });
  }
  return height;
}

/** Builds the counter-page image and returns it as a PNG blob. */
export async function generateCounterImage(input: CounterImageInput): Promise<Blob> {
  await ensureImageFontsReady();
  const theme = readThemeColors();

  const scratch = document.createElement('canvas');
  scratch.width = WIDTH;
  scratch.height = SCRATCH_HEIGHT;
  const ctx = scratch.getContext('2d');
  if (!ctx) throw new Error('متأسفانه تصویر ساخته نشد. یه‌بار دیگه امتحان کن 🌿');

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, WIDTH, SCRATCH_HEIGHT);

  let y = PAD;
  y += drawTopRow(ctx, y, theme, input.dhikr.title) + 20;
  const textCardHeight = drawDhikrTextCard(ctx, y, theme, input.arabicText, input.translation);
  if (textCardHeight > 0) y += textCardHeight + 20;
  y += drawTargetRow(ctx, y, theme, input.dhikr) + 20;
  y += drawCounterCircle(ctx, y, theme, input) + 20;
  const starRowHeight = drawStarBadgeRow(ctx, y, theme, input);
  if (starRowHeight > 0) y += starRowHeight + 20;
  y += drawPromoBox(ctx, y, theme);
  y += PAD;

  return canvasToBlob(cropToHeight(scratch, y));
}
