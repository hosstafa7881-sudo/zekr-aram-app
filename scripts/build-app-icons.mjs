// فاز اول Capacitor — builds the source images @capacitor/assets needs, from
// ONE place, so the whole Android icon/splash set can be regenerated with a
// single command after the artwork changes.
//
//   node scripts/build-app-icons.mjs      (then: npx capacitor-assets generate --android)
//
// ── How to swap the artwork ───────────────────────────────────────────────
// Drop a square PNG (1024×1024 or larger) at `resources/icon-source.png` and
// re-run this script. It wins over `resources/icon-source.svg`, which is the
// app's existing PWA logo (public/icon.svg) and the current default.
//
// ── What it produces ──────────────────────────────────────────────────────
//  resources/icon-only.png        1024×1024  the artwork edge-to-edge (legacy icon)
//  resources/icon-foreground.png  1024×1024  the artwork shrunk into Android's
//                                            adaptive-icon SAFE ZONE, so no mask
//                                            shape can ever clip it
//  resources/icon-background.png  1024×1024  the flat colour behind it
//  resources/splash.png           2732×2732  logo centred on the app's default
//  resources/splash-dark.png      2732×2732  (سبز ملایم) background
//
// Android's adaptive icon is 108dp wide but only the middle 72dp is guaranteed
// to survive every launcher mask, and a circular mask eats down to ~66dp. The
// foreground layer therefore draws the artwork at 66/108 = 61% of the canvas.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './lib/browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RES = path.join(ROOT, 'resources');

/** The app's default background tint — the very colour index.html paints first. */
export const SPLASH_BACKGROUND = '#F3F7EE';
/** Flat colour behind the adaptive icon, taken from the logo's own backdrop. */
export const ICON_BACKGROUND = '#11221B';

/**
 * Android's adaptive icon canvas is 108dp but only the middle 72dp is inside
 * the masked viewport, so the foreground artwork is drawn at 72/108 of it.
 * (The XML must NOT add an inset on top of this — see fixAdaptiveXml below.)
 */
export const ADAPTIVE_SAFE_RATIO = 72 / 108;

function toDataUri(file) {
  const buf = fs.readFileSync(file);
  return file.endsWith('.svg')
    ? `data:image/svg+xml;base64,${buf.toString('base64')}`
    : `data:image/png;base64,${buf.toString('base64')}`;
}

/**
 * Picks the artwork. A PNG the user drops in wins over the bundled SVG, and a
 * raster source has no separable backdrop, so its adaptive foreground is just
 * the whole picture shrunk into the safe zone over a flat background colour.
 */
function pickSources() {
  const png = path.join(RES, 'icon-source.png');
  if (fs.existsSync(png)) {
    return {
      from: 'icon-source.png',
      raster: true,
      full: toDataUri(png),
      foreground: toDataUri(png),
      background: null,
    };
  }
  const svg = path.join(RES, 'icon-source.svg');
  if (!fs.existsSync(svg)) throw new Error('no resources/icon-source.png or .svg found');
  return {
    from: 'icon-source.svg',
    raster: false,
    full: toDataUri(svg),
    // The logo minus its own rounded-square backdrop, so the full-bleed
    // background layer below shows through under every launcher mask.
    foreground: toDataUri(path.join(RES, 'icon-foreground-source.svg')),
    background: toDataUri(path.join(RES, 'icon-background-source.svg')),
  };
}

/**
 * Draws the artwork onto a square canvas and returns the PNG bytes.
 * `inset` is the fraction of the canvas the artwork is allowed to cover.
 */
async function render(page, uri, size, inset, background) {
  const b64 = await page.evaluate(
    async ({ uri, size, inset, background }) => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = uri;
      });
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, size, size);
      } else {
        ctx.clearRect(0, 0, size, size);
      }
      const drawn = Math.round(size * inset);
      const offset = Math.round((size - drawn) / 2);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, offset, offset, drawn, drawn);
      return canvas.toDataURL('image/png').split(',')[1];
    },
    { uri, size, inset, background }
  );
  return Buffer.from(b64, 'base64');
}

async function run() {
  fs.mkdirSync(RES, { recursive: true });
  const src = pickSources();
  console.log(`source: resources/${src.from}${src.raster ? ' (raster — flat colour behind the adaptive icon)' : ''}`);

  const browser = await launchChromium();
  const context = await browser.newContext({ viewport: { width: 400, height: 400 } });
  const page = await context.newPage();
  await page.setContent('<body></body>');

  const outputs = [
    // Edge-to-edge: the legacy (pre-Android-8) square icon.
    ['icon-only.png', src.full, 1024, 1, null],
    // Adaptive foreground: inside the safe zone, transparent around it.
    ['icon-foreground.png', src.foreground, 1024, ADAPTIVE_SAFE_RATIO, null],
    // Adaptive background: edge to edge, so no mask shape can expose a corner.
    ['icon-background.png', src.background || src.full, 1024, src.background ? 1 : 0, src.background ? null : ICON_BACKGROUND],
    // Splash: the logo small and centred on the app's own background tint.
    ['splash.png', src.full, 2732, 0.22, SPLASH_BACKGROUND],
    ['splash-dark.png', src.full, 2732, 0.22, SPLASH_BACKGROUND],
  ];

  for (const [name, uri, size, inset, background] of outputs) {
    const buf = await render(page, uri, size, inset, background);
    fs.writeFileSync(path.join(RES, name), buf);
    console.log(`  → resources/${name}  (${size}×${size}, ${Math.round(buf.length / 1024)} KB)`);
  }

  await context.close();
  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
