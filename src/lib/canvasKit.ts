// Small shared helpers for the two images the app generates on the fly:
// the counter-page image (مورد ۶) and the ready-made story image (مورد ۱۹).
//
// Everything here sticks to plain Canvas 2D drawing calls — no clip-path, no
// WebGL, no filters — because the known Xiaomi rendering bug in this project's
// history was a canvas/compositing issue. Persian text is drawn with the app's
// own Vazirmatn webfont and `direction = 'rtl'`, which is what makes the
// letters join correctly and the digits come out Persian.

export interface ThemeColors {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentDark: string;
}

/** Reads the live CSS custom properties so a generated image matches the user's current theme/palette. */
export function readThemeColors(): ThemeColors {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    bg: read('--bg', '#f3f7ee'),
    surface: read('--surface', '#ffffff'),
    surface2: read('--surface-2', '#e9efe3'),
    border: read('--border', '#d6ddcf'),
    text: read('--text', '#16321c'),
    muted: read('--muted', '#5b6b5e'),
    accent: read('--accent', '#4b7327'),
    accentDark: read('--accent-dark', '#2d4718'),
  };
}

export const IMAGE_FONT_FAMILY = "'Vazirmatn', system-ui, sans-serif";

export function imageFont(weight: number, sizePx: number): string {
  return `${weight} ${sizePx}px ${IMAGE_FONT_FAMILY}`;
}

/**
 * Makes sure every Vazirmatn weight used by the generated images is actually
 * loaded before we draw — otherwise the first render silently falls back to a
 * system font and the Persian letters can come out disconnected.
 */
export async function ensureImageFontsReady(): Promise<void> {
  try {
    const weights = [400, 500, 700, 800, 900];
    await Promise.all(
      weights.map((w) => document.fonts.load(`${w} 64px 'Vazirmatn'`))
    );
    await document.fonts.ready;
  } catch {
    // Font loading isn't observable in every browser — drawing still works.
  }
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: { color: string; width: number }
) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = stroke.width;
    ctx.strokeStyle = stroke.color;
    ctx.stroke();
  }
}

export interface TextOptions {
  font: string;
  color: string;
  align?: CanvasTextAlign;
  /** Baseline y is treated as the TOP of the line when true (default). */
  topBaseline?: boolean;
}

/** Draws one line of right-to-left text. Returns the drawn line's height. */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: TextOptions
): number {
  ctx.save();
  ctx.direction = 'rtl';
  ctx.font = opts.font;
  ctx.fillStyle = opts.color;
  ctx.textAlign = opts.align || 'right';
  ctx.textBaseline = opts.topBaseline === false ? 'alphabetic' : 'top';
  ctx.fillText(text, x, y);
  ctx.restore();
  return measureLineHeight(ctx, opts.font);
}

/** Pixel size out of a CSS font shorthand — note the WEIGHT comes first, so a naive parseInt would read "800" as the size. */
export function fontSizePx(font: string): number {
  const match = /(\d+(?:\.\d+)?)px/.exec(font);
  return match ? parseFloat(match[1]) : 32;
}

export function measureLineHeight(ctx: CanvasRenderingContext2D, font: string): number {
  ctx.save();
  ctx.font = font;
  const m = ctx.measureText('اج');
  ctx.restore();
  const ascent = m.actualBoundingBoxAscent || 0;
  const descent = m.actualBoundingBoxDescent || 0;
  const measured = ascent + descent;
  return Math.max(measured * 1.3, fontSizePx(font) * 1.35);
}

export function measureTextWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string
): number {
  ctx.save();
  ctx.direction = 'rtl';
  ctx.font = font;
  const w = ctx.measureText(text).width;
  ctx.restore();
  return w;
}

/** Greedy word wrap for RTL text. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureTextWidth(ctx, candidate, font) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Draws wrapped RTL text and returns the total height consumed. */
export function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  opts: TextOptions
): number {
  const lines = wrapText(ctx, text, maxWidth, opts.font);
  const lineHeight = measureLineHeight(ctx, opts.font);
  lines.forEach((line, idx) => {
    drawText(ctx, line, x, y + idx * lineHeight, opts);
  });
  return lines.length * lineHeight;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('canvas.toBlob returned null'));
      }, 'image/png');
    } catch (err) {
      reject(err as Error);
    }
  });
}

/** Copies the used top part of a tall scratch canvas into a correctly-sized one. */
export function cropToHeight(source: HTMLCanvasElement, height: number): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = Math.max(1, Math.round(height));
  const ctx = out.getContext('2d');
  if (ctx) ctx.drawImage(source, 0, 0);
  return out;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`تصویر بارگذاری نشد: ${src}`));
    img.src = src;
  });
}
