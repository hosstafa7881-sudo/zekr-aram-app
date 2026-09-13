// فاز اول Capacitor / مورد ۳ — previews the splash screen exactly as Android
// will draw it: the REAL generated drawable, scaled the way
// androidScaleType: 'CENTER_CROP' scales it, inside three common phone shapes.
//
//   node scripts/preview-splash.mjs   → docs/capacitor-v1/splash-preview.png
//
// The square 2732×2732 drawable is scaled to COVER the portrait screen and
// cropped left/right, so the logo stays dead centre on every phone.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './lib/browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPLASH = path.join(ROOT, 'android/app/src/main/res/drawable-port-xxxhdpi/splash.png');
const OUT_DIR = path.join(ROOT, 'docs/capacitor-v1');

// Real screen shapes, scaled down to a previewable height.
const PHONES = [
  { label: 'گوشی ۳۶۰×۶۴۰ (نسبت ۹:۱۶)', w: 360, h: 640 },
  { label: 'گوشی ۳۹۰×۸۴۴ (نسبت بلند)', w: 390, h: 844 },
  { label: 'تبلت ۸۰۰×۱۲۸۰', w: 800, h: 1280 },
];
const PREVIEW_HEIGHT = 560;

async function run() {
  if (!fs.existsSync(SPLASH)) throw new Error('missing splash drawable — run: npm run icons:android');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const uri = `data:image/png;base64,${fs.readFileSync(SPLASH).toString('base64')}`;

  const frames = PHONES.map(({ label, w, h }) => {
    const scale = PREVIEW_HEIGHT / h;
    const fw = Math.round(w * scale);
    return `
      <figure style="margin:0">
        <div style="width:${fw}px;height:${PREVIEW_HEIGHT}px;overflow:hidden;border-radius:22px;border:2px solid #16321C22;background:#F3F7EE">
          <img src="${uri}" style="width:100%;height:100%;object-fit:cover;display:block">
        </div>
        <figcaption style="text-align:center;font:600 15px Vazirmatn,system-ui,sans-serif;color:#16321C;padding-top:10px;width:${fw}px">${label}</figcaption>
      </figure>`;
  }).join('');

  const browser = await launchChromium();
  const context = await browser.newContext({ viewport: { width: 1100, height: 660 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.setContent(
    `<body dir="rtl" style="margin:0;background:#ffffff;display:flex;gap:34px;padding:28px;align-items:flex-start;justify-content:center">${frames}</body>`
  );
  await page.waitForTimeout(400);
  const out = path.join(OUT_DIR, 'splash-preview.png');
  await page.screenshot({ path: out });
  console.log(`wrote ${path.relative(ROOT, out)}`);
  await context.close();
  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
