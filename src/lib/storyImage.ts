// مورد ۱۹ — the ready-made 1080×1920 story image.
//
// Two clearly separated halves, exactly as the spec asks:
//
//  * FIXED part — the collage of real app screens. It is a real screenshot
//    collage produced ahead of time by `scripts/build-story-collage.mjs`
//    (Playwright, full sample data, no browser chrome) and shipped as
//    `public/story-collage.png`. The user may replace that one file with their
//    own artwork later without touching any code.
//  * LIVE part — the top box's text (the user's own sentence or the default
//    one), which stores to list, and the QR code. All drawn here, at share
//    time, with the app's Vazirmatn font and RTL text direction.
//
// Vertical rhythm: ~170px of empty space at the top (where Instagram puts the
// account name) and ~200px at the bottom (where it puts the reply box), so
// nothing important is ever covered.

import { getAvailableStoreLinks } from '../config/storeLinks';
import { drawQrCode } from './qrCode';
import {
  canvasToBlob,
  drawText,
  drawWrappedText,
  ensureImageFontsReady,
  fillRoundRect,
  imageFont,
  loadImage,
  measureLineHeight,
} from './canvasKit';

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
const TOP_SAFE_SPACE = 170;
const BOTTOM_SAFE_SPACE = 200;
const MARGIN = 60;
const GAP = 28;

const BRAND_GREEN = 'hsl(92, 42%, 32%)';
const BRAND_GREEN_DARK = 'hsl(92, 52%, 20%)';
const SOFT_GREEN_BG = 'hsl(100, 40%, 94%)';
const DOT_COLOR = 'hsla(100, 28%, 45%, 0.16)';

export const STORY_DEFAULT_TEXT = 'من هر روز با ذکرآرام ذکر می‌گم؛ تو هم امتحانش کن';
export const STORY_TEXT_MAX_LENGTH = 70;

/** Path of the pre-rendered screen collage (the file the user may swap out). */
export const STORY_COLLAGE_PATH = 'story-collage.png';

export interface StoryImageOptions {
  /** The user's own sentence; falls back to STORY_DEFAULT_TEXT when empty. */
  customText?: string;
  /** 1 = full 1080×1920 output; smaller values render a cheap on-screen preview. */
  scale?: number;
}

function drawDottedBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = SOFT_GREEN_BG;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  ctx.fillStyle = DOT_COLOR;
  const step = 48;
  for (let y = step / 2; y < STORY_HEIGHT; y += step) {
    for (let x = step / 2; x < STORY_WIDTH; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawTopBox(ctx: CanvasRenderingContext2D, text: string): number {
  const innerWidth = STORY_WIDTH - MARGIN * 2 - 80;
  const titleFont = imageFont(900, 76);
  const textFont = imageFont(600, 42);
  const titleHeight = measureLineHeight(ctx, titleFont);
  // Measure the wrapped text before deciding the box height.
  const probe = document.createElement('canvas').getContext('2d');
  let textHeight = measureLineHeight(ctx, textFont);
  if (probe) {
    probe.font = textFont;
    const words = text.split(/\s+/).filter(Boolean);
    let line = '';
    let lines = 1;
    words.forEach((w) => {
      const candidate = line ? `${line} ${w}` : w;
      if (probe.measureText(candidate).width > innerWidth && line) {
        lines += 1;
        line = w;
      } else {
        line = candidate;
      }
    });
    textHeight = lines * measureLineHeight(ctx, textFont);
  }
  const height = 38 + titleHeight + 10 + textHeight + 38;

  fillRoundRect(ctx, MARGIN, TOP_SAFE_SPACE, STORY_WIDTH - MARGIN * 2, height, 52, BRAND_GREEN);

  let y = TOP_SAFE_SPACE + 38;
  y += drawText(ctx, 'ذکرآرام', STORY_WIDTH / 2, y, {
    font: titleFont,
    color: '#ffffff',
    align: 'center',
  });
  y += 10;
  drawWrappedText(ctx, text, STORY_WIDTH / 2, y, innerWidth, {
    font: textFont,
    color: 'rgba(255,255,255,0.95)',
    align: 'center',
  });

  return height;
}

/** Bottom white box: store names on the right, a real QR code on the left. Returns 0 when no store has a link yet. */
function drawBottomBox(ctx: CanvasRenderingContext2D, y: number): number {
  const stores = getAvailableStoreLinks();
  if (stores.length === 0) return 0; // مورد ۱۹: the whole box disappears.

  const height = 300;
  const boxX = MARGIN;
  const boxWidth = STORY_WIDTH - MARGIN * 2;
  fillRoundRect(ctx, boxX, y, boxWidth, height, 48, '#ffffff');

  // QR on the LEFT, pointing at Cafe Bazaar when it has a link, otherwise the
  // first store that does.
  const qrSize = 210;
  const qrX = boxX + 40;
  const qrY = y + (height - qrSize) / 2;
  const preferred = stores.find((s) => s.id === 'cafebazaar') || stores[0];
  drawQrCode(ctx, preferred.url, qrX, qrY, qrSize, { dark: BRAND_GREEN_DARK });

  const textRight = boxX + boxWidth - 44;
  let textY = y + 52;
  textY += drawText(ctx, 'دانلود رایگان از', textRight, textY, {
    font: imageFont(900, 50),
    color: BRAND_GREEN_DARK,
  });
  textY += 6;
  textY += drawText(ctx, stores.map((s) => s.label).join(' · '), textRight, textY, {
    font: imageFont(700, 40),
    color: '#2c352c',
  });
  textY += 12;
  drawText(ctx, 'یا کد کنار رو با دوربین گوشی اسکن کن', textRight, textY, {
    font: imageFont(500, 30),
    color: '#5c665c',
  });

  return height;
}

function drawCollage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  areaTop: number,
  areaHeight: number
) {
  const areaWidth = STORY_WIDTH - MARGIN * 2;
  if (!image || areaHeight <= 0) return;
  const scale = Math.min(areaWidth / image.width, areaHeight / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  const x = (STORY_WIDTH - w) / 2;
  const yy = areaTop + (areaHeight - h) / 2;
  ctx.drawImage(image, x, yy, w, h);
}

/** Renders the story image onto a canvas (used for both the preview and the final PNG). */
export async function renderStoryCanvas(
  options: StoryImageOptions = {}
): Promise<HTMLCanvasElement> {
  const scale = options.scale ?? 1;
  const text = (options.customText || '').trim() || STORY_DEFAULT_TEXT;

  await ensureImageFontsReady();

  let collage: HTMLImageElement | null = null;
  try {
    collage = await loadImage(new URL(STORY_COLLAGE_PATH, document.baseURI).toString());
  } catch {
    // Missing artwork must not break sharing — the rest of the image still
    // renders, just without the screen collage.
    collage = null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(STORY_WIDTH * scale);
  canvas.height = Math.round(STORY_HEIGHT * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('متأسفانه تصویر ساخته نشد. یه‌بار دیگه امتحان کن 🌿');
  ctx.scale(scale, scale);

  drawDottedBackground(ctx);
  const topBoxHeight = drawTopBox(ctx, text);

  // The bottom box is laid out from the bottom up, so the collage gets exactly
  // the space that's left in the middle.
  const bottomBoxProbeHeight = getAvailableStoreLinks().length > 0 ? 300 : 0;
  const bottomBoxY = STORY_HEIGHT - BOTTOM_SAFE_SPACE - bottomBoxProbeHeight;
  if (bottomBoxProbeHeight > 0) drawBottomBox(ctx, bottomBoxY);

  const collageTop = TOP_SAFE_SPACE + topBoxHeight + GAP;
  const collageBottom =
    bottomBoxProbeHeight > 0 ? bottomBoxY - GAP : STORY_HEIGHT - BOTTOM_SAFE_SPACE;
  drawCollage(ctx, collage, collageTop, collageBottom - collageTop);

  return canvas;
}

export async function generateStoryImage(options: StoryImageOptions = {}): Promise<Blob> {
  const canvas = await renderStoryCanvas({ ...options, scale: 1 });
  return canvasToBlob(canvas);
}

export async function generateStoryPreviewDataUrl(customText: string): Promise<string> {
  const canvas = await renderStoryCanvas({ customText, scale: 0.3 });
  return canvas.toDataURL('image/png');
}
