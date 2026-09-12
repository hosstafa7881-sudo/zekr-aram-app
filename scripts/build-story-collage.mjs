// Builds `public/story-collage.png` — the FIXED half of the ready-made story
// image (مورد ۱۹): a collage of real screenshots of the app's own pages, taken
// with full sample data and no browser chrome.
//
//   node scripts/build-story-collage.mjs
//
// Layout (RTL): the big «صفحه‌ی شمارش ذکر» shot on the right, and a column of
// three smaller shots on the left — «خانه», «ریزآمار», «مناسبت‌ها». The big
// image's height is set to EXACTLY the sum of the three small ones, so its top
// and bottom edges line up with the column (round four's test build had a
// shorter big image, which looked untidy).
//
// The user may replace public/story-collage.png with their own artwork later;
// nothing else needs to change.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './lib/browser.mjs';
import { serveDist } from './lib/server.mjs';
import { applySeed, buildSeedState, patchActiveDhikr } from './lib/seed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT_FILE = path.join(ROOT, 'public', 'story-collage.png');
const TMP = path.join(ROOT, '.tmp-collage');
const PORT = 4183;
const VIEWPORT = { width: 390, height: 844 };

const HIDE_FOR_STORY_CSS = `
  /* مورد ۱۹ — the home shot must NOT show the discount buttons, the
     "تهیه اشتراک ماهانه" button, or the ad slot. */
  [data-testid="discount-buttons-row"],
  [data-testid="home-subscribe-button"],
  [data-testid="ad-placeholder"] { display: none !important; }
`;

async function openApp(browser, { hideForStory = false } = {}) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: 'fa-IR',
  });
  const state = buildSeedState();
  await context.addInitScript(`(${applySeed.toString()})(${JSON.stringify(state)})`);
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  // The dhikr list is created by the app on first load, so patch the active
  // dhikr afterwards and reload to pick it up.
  await page.evaluate(`(${patchActiveDhikr.toString()})(${JSON.stringify(state)})`);
  await page.reload({ waitUntil: 'load' });
  if (hideForStory) await page.addStyleTag({ content: HIDE_FOR_STORY_CSS });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  return { context, page };
}

async function shotCounter(browser) {
  const { context, page } = await openApp(browser);
  await page.getByRole('button', { name: /شمارنده/ }).click();
  await page.waitForTimeout(500);
  const file = path.join(TMP, 'counter.png');
  await page.screenshot({ path: file, fullPage: false });
  await context.close();
  return file;
}

async function shotHome(browser) {
  const { context, page } = await openApp(browser, { hideForStory: true });
  await page.waitForTimeout(300);
  // Clip from the very top down to the bottom of the «کتابخانهٔ ذکر» button.
  const box = await page.locator('[data-tour="home-library"]').boundingBox();
  const file = path.join(TMP, 'home.png');
  await page.screenshot({
    path: file,
    clip: { x: 0, y: 0, width: VIEWPORT.width, height: Math.ceil((box?.y ?? 400) + (box?.height ?? 56) + 8) },
  });
  await context.close();
  return file;
}

async function shotStats(browser) {
  const { context, page } = await openApp(browser);
  await page.getByRole('button', { name: /تاریخچه/ }).click();
  await page.waitForTimeout(300);
  await page.getByText('ریزآمار روزهای گذشته').click();
  await page.waitForTimeout(500);
  // Clip a region that definitely contains BOTH the ۳۰-day card and the
  // 7-day chart (مورد ۱۹ requires both to be visible in this small shot).
  const thirtyBox = await page.getByRole('button', { name: /۳۰ روز اخیر/ }).first().boundingBox();
  const chartBox = await page.getByText('نمودار ۷ روز اخیر (تقویم شمسی)').boundingBox();
  const top = Math.max(0, Math.floor((thirtyBox?.y ?? 80) - 8));
  // A little extra room at the bottom so the «ریزآمار» caption chip doesn't
  // land on the chart's own day labels (مورد ۱۹: labels must not cover
  // important content).
  const chartBottom = (chartBox?.y ?? 300) + 285;
  const file = path.join(TMP, 'stats.png');
  await page.screenshot({
    path: file,
    clip: {
      x: 0,
      y: top,
      width: VIEWPORT.width,
      height: Math.min(VIEWPORT.height - top, Math.ceil(chartBottom - top)),
    },
  });
  await context.close();
  return file;
}

async function shotOccasions(browser) {
  const { context, page } = await openApp(browser);
  await page.getByLabel('اعلانات و مناسبت‌ها').click();
  await page.waitForTimeout(300);
  await page.getByTestId('tab-occasions').click();
  await page.waitForTimeout(500);
  // Scroll the panel down to the colourful monthly calendar and capture the
  // panel itself — not the whole viewport, which would include the dimmed
  // home page behind it.
  const panel = page.getByTestId('bell-panel');
  await panel.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(500);
  const file = path.join(TMP, 'occasions.png');
  await panel.screenshot({ path: file });
  await context.close();
  return file;
}

function toDataUri(file) {
  return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
}

const COMPOSE_HTML = (images) => `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@700&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; }
  body { background: transparent; font-family: 'Vazirmatn', sans-serif; }
  #collage { display: flex; gap: 22px; align-items: flex-start; padding: 0; width: max-content; }
  .col { display: flex; flex-direction: column; gap: 22px; }
  figure { position: relative; margin: 0; border-radius: 26px; overflow: hidden;
           border: 6px solid #fff; box-shadow: 0 14px 34px rgba(20, 45, 20, 0.18); background: #fff; }
  figure img { display: block; }
  .small img { width: 392px; height: auto; }
  .big img  { width: auto; }
  figcaption { position: absolute; bottom: 12px; left: 12px; background: hsl(92, 42%, 32%);
               color: #fff; font-size: 19px; font-weight: 700; padding: 5px 14px; border-radius: 999px; }
</style></head>
<body>
  <div id="collage">
    <figure class="big"><img id="big" src="${images.counter}" /><figcaption>شمارش ذکر</figcaption></figure>
    <div class="col">
      <figure class="small"><img src="${images.home}" /><figcaption>خانه</figcaption></figure>
      <figure class="small"><img src="${images.stats}" /><figcaption>ریزآمار</figcaption></figure>
      <figure class="small"><img src="${images.occasions}" /><figcaption>مناسبت‌ها</figcaption></figure>
    </div>
  </div>
</body></html>`;

async function compose(browser, files) {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1600 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.setContent(
    COMPOSE_HTML({
      counter: toDataUri(files.counter),
      home: toDataUri(files.home),
      stats: toDataUri(files.stats),
      occasions: toDataUri(files.occasions),
    }),
    { waitUntil: 'load' }
  );
  await page.evaluate(() => document.fonts.ready);
  // Make the big screenshot's height EXACTLY the column's height.
  const measured = await page.evaluate(() => {
    const col = document.querySelector('.col');
    const big = document.getElementById('big');
    const columnHeight = col.getBoundingClientRect().height - 12; // minus the figure's own border
    big.style.height = `${columnHeight}px`;
    return { columnHeight, bigHeight: big.getBoundingClientRect().height };
  });
  await page.waitForTimeout(200);
  const collage = page.locator('#collage');
  const box = await collage.boundingBox();
  await collage.screenshot({ path: OUT_FILE, omitBackground: true });
  await context.close();
  return { ...measured, width: box.width, height: box.height };
}

async function main() {
  fs.mkdirSync(TMP, { recursive: true });
  const server = await serveDist(DIST, PORT);
  const browser = await launchChromium();
  try {
    const files = {
      counter: await shotCounter(browser),
      home: await shotHome(browser),
      stats: await shotStats(browser),
      occasions: await shotOccasions(browser),
    };
    const info = await compose(browser, files);
    console.log('collage written to', OUT_FILE, info);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
