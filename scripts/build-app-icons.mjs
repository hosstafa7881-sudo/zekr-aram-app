// فاز اول Capacitor — builds the source images @capacitor/assets needs, from
// ONE place, so the whole Android icon/splash set can be regenerated with a
// single command after the artwork changes.
//
//   node scripts/build-app-icons.mjs      (then: npx capacitor-assets generate --android)
//
// ── How to swap the artwork ───────────────────────────────────────────────
// Put a square image (1024×1024 or larger) in `resources/user-icon/` — ANY
// file name works, so a file uploaded straight from a phone needs no renaming
// — and re-run this script. `resources/icon-source.png` is also still read, and
// either wins over `resources/icon-source.svg`, which is the app's existing PWA
// logo (public/icon.svg) and the current default.
//
// ── What it produces ──────────────────────────────────────────────────────
//  resources/icon-only.png        1024×1024  the artwork edge-to-edge (legacy icon)
//  resources/icon-foreground.png  1024×1024  the artwork shrunk into Android's
//                                            adaptive-icon SAFE ZONE, so no mask
//                                            shape can ever clip it
//  resources/icon-background.png  1024×1024  the flat colour behind it
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
 * (The XML must NOT add an inset on top of this — see fix-adaptive-icon-xml.mjs.)
 */
export const ADAPTIVE_SAFE_RATIO = 72 / 108;

/**
 * دور هشتم / مورد ۸ — how much bigger the supplied artwork is drawn.
 *
 * The tally-counter picture carries 21-30% of empty margin on each side, which
 * left the icon visibly smaller than every other app on the home screen. 1.25
 * crops a quarter of that margin away; the artwork's own content is measured
 * against the circular mask by preview-icon-masks.mjs, which is what proves
 * nothing is clipped. The measured headroom before the farthest content corner
 * reaches the circle was 1.371, so 1.25 keeps roughly 9% of clearance.
 *
 * Only raster artwork is zoomed. The project's SVG logo has no spare margin to
 * crop and is already sized to the safe zone.
 */
export const RASTER_ZOOM = 1.25;

const MIME = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function toDataUri(file) {
  const type = MIME[path.extname(file).toLowerCase()];
  if (!type) throw new Error(`unsupported image type: ${path.basename(file)}`);
  return `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
}

/**
 * Reads the artwork's own background colour from its four corners. A photo-style
 * icon carries its backdrop baked in, and painting the adaptive background layer
 * that SAME colour is what makes a mask invisible: whatever a circle crops off
 * the picture's edge is replaced by the identical colour underneath, instead of
 * a contrasting field the cropped square then floats on.
 *
 * Returns null when the four corners disagree (a busy, edge-to-edge image), so
 * the caller can fall back to the brand colour and the mask preview can show
 * what that costs.
 */
async function sampleCornerColor(page, uri) {
  return page.evaluate(async (uri) => {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = uri;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const inset = Math.max(2, Math.round(Math.min(img.width, img.height) * 0.02));
    const points = [
      [inset, inset],
      [img.width - inset, inset],
      [inset, img.height - inset],
      [img.width - inset, img.height - inset],
    ];
    const samples = points.map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data));
    // Fully transparent corners mean there is no baked-in backdrop at all.
    if (samples.every((s) => s[3] < 8)) return null;
    const avg = [0, 1, 2].map((i) => Math.round(samples.reduce((a, s) => a + s[i], 0) / samples.length));
    const spread = Math.max(
      ...[0, 1, 2].map((i) => Math.max(...samples.map((s) => s[i])) - Math.min(...samples.map((s) => s[i])))
    );
    // More than a gentle gradient between corners → not one flat backdrop.
    if (spread > 24) return null;
    return `#${avg.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }, uri);
}

/**
 * Picks the artwork. A PNG the user drops in wins over the bundled SVG.
 *
 * A raster source is drawn into the adaptive FOREGROUND at full size rather
 * than shrunk into the safe zone: such an image is expected to carry its own
 * safe margin (that is exactly what is asked for when one is supplied), and
 * shrinking it a second time would leave the icon a small island. The mask
 * preview is what proves the margin is really enough.
 */
/**
 * Any image dropped in `resources/user-icon/`, whatever it is called. This
 * exists so replacing the icon never depends on getting a file name exactly
 * right — the usual way a swap silently does nothing and the old icon ships.
 */
function findDroppedIcon() {
  const dir = path.join(RES, 'user-icon');
  if (!fs.existsSync(dir)) return null;
  const images = fs
    .readdirSync(dir)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort();
  if (images.length === 0) return null;
  if (images.length > 1) {
    throw new Error(
      `resources/user-icon/ holds ${images.length} images (${images.join(', ')}). ` +
        'Leave exactly one so there is no doubt which is the icon.'
    );
  }
  return path.join(dir, images[0]);
}

function pickSources() {
  const dropped = findDroppedIcon();
  const png = path.join(RES, 'icon-source.png');
  const raster = dropped || (fs.existsSync(png) ? png : null);
  if (raster) {
    return {
      from: path.relative(RES, raster),
      raster: true,
      full: toDataUri(raster),
      foreground: toDataUri(raster),
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

  // A raster icon's backdrop is baked in, so the layer underneath is painted
  // the same colour and the mask stops being visible as a seam.
  let flatBackground = ICON_BACKGROUND;
  if (src.raster) {
    const sampled = await sampleCornerColor(page, src.full);
    if (sampled) {
      flatBackground = sampled;
      console.log(`  background colour read from the image's corners: ${sampled}`);
    } else {
      console.log(`  ⚠ corners are transparent or not one flat colour — falling back to ${ICON_BACKGROUND}.`);
      console.log('    Check docs/capacitor-v1/icon-masks.png before shipping this.');
    }
  }

  const outputs = [
    // Edge-to-edge: the legacy (pre-Android-8) square icon. Zoomed to match
    // the adaptive foreground so both layers show the artwork at one size.
    ['icon-only.png', src.full, 1024, src.raster ? RASTER_ZOOM : 1, null],
    // Adaptive foreground. Raster artwork is drawn at RASTER_ZOOM of the
    // canvas — its own margin is the safe zone, and cropping some of that
    // margin is what makes the icon match the size of its neighbours on the
    // home screen. The project SVG has no spare margin, so it stays inside the
    // safe zone instead.
    ['icon-foreground.png', src.foreground, 1024, src.raster ? RASTER_ZOOM : ADAPTIVE_SAFE_RATIO, null],
    // Adaptive background: edge to edge, so no mask shape can expose a corner.
    ['icon-background.png', src.background || src.full, 1024, src.background ? 1 : 0, src.background ? null : flatBackground],
    // دور هشتم / مورد ۷ — no splash images any more. The splash screen was
    // removed entirely, so generating them would only put files back that the
    // Android project no longer references.
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
