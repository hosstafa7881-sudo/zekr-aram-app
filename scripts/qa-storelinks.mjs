// Verifies everything that only becomes visible ONCE the store links are
// filled in (مورد ۴ و مورد ۱۹): the links block at the end of shared texts,
// the "دانلود از …" line on the generated counter image, the bottom box of the
// story image, and — most importantly — that the QR code on it really decodes
// back to the Cafe Bazaar URL.
//
//   node scripts/qa-storelinks.mjs
//
// It temporarily fills src/config/storeLinks.ts, rebuilds, runs the checks and
// always restores the original file (which must stay empty until the app is
// actually published).

import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './lib/browser.mjs';
import { serveDist } from './lib/server.mjs';
import { applySeed, buildSeedState, patchActiveDhikr } from './lib/seed.mjs';
import { cropTo, imageSize, pixelAt, whiteBoxHeight } from './lib/pixels.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.qa-screens');
const LINKS_FILE = path.join(ROOT, 'src/config/storeLinks.ts');
const JSQR = path.join(ROOT, 'node_modules/jsqr/dist/jsQR.js');
const PORT = 4187;

const BAZAAR_URL = 'https://cafebazaar.ir/app/com.zekraram.app';
const MYKET_URL = 'https://myket.ir/app/com.zekraram.app';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function run() {
  const original = fs.readFileSync(LINKS_FILE, 'utf8');
  const patched = original
    .replace("{ id: 'cafebazaar', label: 'کافه‌بازار', url: '' }", `{ id: 'cafebazaar', label: 'کافه‌بازار', url: '${BAZAAR_URL}' }`)
    .replace("{ id: 'myket', label: 'مایکت', url: '' }", `{ id: 'myket', label: 'مایکت', url: '${MYKET_URL}' }`);
  if (patched === original) throw new Error('could not patch storeLinks.ts');
  fs.writeFileSync(LINKS_FILE, patched);

  let server;
  let browser;
  try {
    execSync('npm run build', { cwd: ROOT, stdio: 'ignore' });
    server = await serveDist(DIST, PORT);
    browser = await launchChromium();
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'fa-IR',
      permissions: ['clipboard-read', 'clipboard-write'],
      acceptDownloads: true,
    });
    const state = buildSeedState();
    await context.addInitScript(`(${applySeed.toString()})(${JSON.stringify(state)})`);
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
    await page.evaluate(`(${patchActiveDhikr.toString()})(${JSON.stringify(state)})`);
    await page.reload({ waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);

    // مورد ۴ — links block at the end of a shared text, google play omitted.
    await page.getByRole('button', { name: 'شمارنده', exact: true }).first().click();
    await page.waitForTimeout(300);
    await page.getByTestId('counter-share-icon').click();
    await page.waitForTimeout(200);
    await page.getByTestId('counter-share-submit').click();
    await page.waitForTimeout(400);
    const text = await page.evaluate(() => navigator.clipboard.readText());
    fs.writeFileSync(path.join(OUT, 'share-text-with-links.txt'), text);
    check('مورد۴ قالب لینک‌ها در انتهای متن',
      text.includes(`📥 کافه‌بازار: ${BAZAAR_URL}`) && text.includes(`📥 مایکت: ${MYKET_URL}`));
    check('مورد۴ فروشگاه بدون لینک (گوگل‌پلی) در متن نمی‌آید', !text.includes('گوگل‌پلی'));
    check('مورد۶ با وجود لینک، جمله‌ی دعوت با دونقطه تمام می‌شود',
      text.includes('تو هم می‌تونی امتحانش کنی:\n📥'));

    // مورد ۶ — the generated counter image gains its "دانلود از …" line.
    await page.getByTestId('counter-share-icon').click();
    await page.waitForTimeout(200);
    await page.getByTestId('counter-share-option-image').click();
    const [counterDl] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.getByTestId('counter-share-submit').click(),
    ]);
    const counterFile = path.join(OUT, 'counter-image-with-links.png');
    await counterDl.saveAs(counterFile);
    check('مورد۶ تصویر شمارش با لینک فروشگاه ساخته شد',
      fs.statSync(counterFile).size > 10000);

    // دور ششم / مورد ۴الف — the white promo box that replaces the reset row
    // must carry THREE lines once a store has a link («ذکرآرام» + tagline +
    // «دانلود از …»), which makes it 280px tall instead of 210px. Measuring
    // the real white run in the produced PNG proves the third line's row was
    // actually laid out, not just that the code path exists.
    const counterSize = await imageSize(context, counterFile);
    // Scan at x=120: inside the box but well clear of its centred text, so a
    // glyph never breaks the white run being measured.
    const promoHeight = await whiteBoxHeight(context, counterFile, 120, 40);
    check('مورد۴الف کادر سفید تصویر شمارش سه‌خطی است (۲۸۰ پیکسل، نه ۲۱۰)',
      Math.abs(promoHeight - 280) <= 6, `height=${promoHeight}px`);
    await cropTo(context, counterFile, path.join(OUT, 'v6-counter-promo-box.png'), {
      x: 40,
      y: counterSize.height - 350,
      width: 1000,
      height: 320,
    });

    // مورد ۱۹ — story image with the bottom box + a REAL QR code.
    await page.getByRole('button', { name: 'خانه', exact: true }).first().click();
    await page.waitForTimeout(250);
    await page.getByRole('button', { name: /کد تخفیف ۱۰۰ درصدی/ }).click();
    await page.waitForTimeout(600);
    const [storyDl] = await Promise.all([
      page.waitForEvent('download', { timeout: 40000 }),
      page.getByTestId('story-download-button').click(),
    ]);
    const storyFile = path.join(OUT, 'story-with-links.png');
    await storyDl.saveAs(storyFile);
    check('مورد۱۹ تصویر استوری با کادر فروشگاه‌ها ساخته شد',
      fs.statSync(storyFile).size > 20000);

    // دور ششم / مورد ۲ — the bottom white box (store names + QR) really is
    // painted at 1420..1720 on the 1080×1920 canvas. A pixel in the middle of
    // it is pure white; without any store link that same pixel is the dotted
    // green background instead.
    const boxPixel = await pixelAt(context, storyFile, 540, 1500);
    const isPureWhite = (px) => px[0] >= 252 && px[1] >= 252 && px[2] >= 252;
    check('مورد۲ کادر سفید پایین تصویر استوری واقعاً کشیده شده',
      isPureWhite(boxPixel),
      `rgb(${boxPixel.join(',')}) در (۵۴۰، ۱۵۰۰)`);
    const outsideBox = await pixelAt(context, storyFile, 540, 1380);
    check('مورد۲ بالای کادر همچنان پس‌زمینه‌ی سبز است (کادر بیش از حد بزرگ نشده)',
      !isPureWhite(outsideBox),
      `rgb(${outsideBox.join(',')})`);
    await cropTo(context, storyFile, path.join(OUT, 'v6-story-bottom-box.png'), {
      x: 40,
      y: 1400,
      width: 1000,
      height: 340,
    });

    // Decode the QR straight out of the produced PNG.
    const decoder = await context.newPage();
    await decoder.setContent('<canvas id="c"></canvas>');
    await decoder.addScriptTag({ path: JSQR });
    const decoded = await decoder.evaluate(async (dataUri) => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = dataUri;
      });
      const canvas = document.getElementById('c');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // eslint-disable-next-line no-undef
      const result = jsQR(data.data, canvas.width, canvas.height);
      return result ? result.data : null;
    }, `data:image/png;base64,${fs.readFileSync(storyFile).toString('base64')}`);
    check('مورد۱۹ QR روی تصویر واقعاً خوانده می‌شود و به لینک کافه‌بازار اشاره می‌کند',
      decoded === BAZAAR_URL, decoded || 'not decoded');

    await context.close();
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
    fs.writeFileSync(LINKS_FILE, original);
    execSync('npm run build', { cwd: ROOT, stdio: 'ignore' });
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
