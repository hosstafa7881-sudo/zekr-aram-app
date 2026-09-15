// فاز اول Capacitor / مورد ۲ — renders the REAL generated adaptive icon under
// the launcher mask shapes Android actually uses, so cropping is judged from a
// picture instead of guessed.
//
//   node scripts/preview-icon-masks.mjs        → docs/capacitor-v1/icon-masks.png
//
// It composites android/.../mipmap-xxxhdpi/ic_launcher_background.png and
// ic_launcher_foreground.png exactly the way the launcher does (both layers
// full-bleed over the 108dp canvas, mask applied), in four shapes:
//
//   circle · squircle · rounded square · full square (no mask)
//
// It also reports, per shape, how much of the artwork's own edge is cut away —
// the number that matters when the source image is filled right to its border.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './lib/browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIPMAP = path.join(ROOT, 'android/app/src/main/res/mipmap-xxxhdpi');
const OUT_DIR = path.join(ROOT, 'docs/capacitor-v1');

const TILE = 320;
const GAP = 28;

/** The four shapes, as CSS clip-paths on a TILE×TILE box. */
const SHAPES = [
  { id: 'circle', label: 'دایره‌ای', clip: 'circle(50% at 50% 50%)' },
  { id: 'squircle', label: 'مربع‌گرد (squircle)', clip: 'inset(0 round 38%)' },
  { id: 'rounded', label: 'مربع با گوشه‌ی کم', clip: 'inset(0 round 16%)' },
  { id: 'square', label: 'مربع کامل (بدون ماسک)', clip: 'none' },
];

function dataUri(file) {
  return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
}

async function run() {
  for (const name of ['ic_launcher_background.png', 'ic_launcher_foreground.png']) {
    if (!fs.existsSync(path.join(MIPMAP, name))) {
      throw new Error(`missing ${name} — run: npm run icons:android`);
    }
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const bg = dataUri(path.join(MIPMAP, 'ic_launcher_background.png'));
  const fg = dataUri(path.join(MIPMAP, 'ic_launcher_foreground.png'));

  const width = SHAPES.length * TILE + (SHAPES.length + 1) * GAP;
  const height = TILE + GAP * 2 + 46;

  const tiles = SHAPES.map(
    (s) => `
      <figure style="margin:0;width:${TILE}px">
        <div style="width:${TILE}px;height:${TILE}px;position:relative;overflow:hidden;${
          s.clip === 'none' ? '' : `clip-path:${s.clip};`
        }">
          <img src="${bg}" style="position:absolute;inset:0;width:100%;height:100%">
          <img src="${fg}" style="position:absolute;inset:0;width:100%;height:100%">
        </div>
        <figcaption style="text-align:center;font:600 19px Vazirmatn,system-ui,sans-serif;color:#16321C;padding-top:12px">${s.label}</figcaption>
      </figure>`
  ).join('');

  const browser = await launchChromium();
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.setContent(
    `<body dir="rtl" style="margin:0;background:#F3F7EE;display:flex;gap:${GAP}px;padding:${GAP}px;align-items:flex-start">${tiles}</body>`
  );
  await page.waitForTimeout(500);
  const out = path.join(OUT_DIR, 'icon-masks.png');
  await page.screenshot({ path: out });
  console.log(`wrote ${path.relative(ROOT, out)}`);

  // How much of the FULL-BLEED artwork each mask removes. Measured on the
  // legacy/edge-to-edge icon, which is the one that fills its canvas — that is
  // the case the "no safe margin" warning is about.
  const coverage = await page.evaluate(
    ({ shapes }) =>
      shapes.map(({ id, clip }) => {
        const size = 200;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        if (clip === 'none') {
          ctx.fillRect(0, 0, size, size);
        } else if (clip.startsWith('circle')) {
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const pct = parseFloat(clip.match(/round ([\d.]+)%/)[1]) / 100;
          const r = size * pct;
          ctx.beginPath();
          ctx.roundRect(0, 0, size, size, r);
          ctx.fill();
        }
        const data = ctx.getImageData(0, 0, size, size).data;
        let kept = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 128) kept++;
        return { id, keptPercent: Math.round((kept / (size * size)) * 1000) / 10 };
      }),
    { shapes: SHAPES.map((s) => ({ id: s.id, clip: s.clip })) }
  );
  console.log('\nهر ماسک چند درصد از یک تصویر لبه‌تا‌لبه را نگه می‌دارد:');
  for (const c of coverage) console.log(`  ${c.id.padEnd(10)} ${c.keptPercent}%`);

  await context.close();
  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
