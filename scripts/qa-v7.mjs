// دور هفتم — regression sweep.
//
// مورد ۱: the caption («ذکرهای امروز») must ALWAYS travel with the picture
// shared from the counting page. The Web Share API can't really run inside
// headless Chromium, so each realistic phone behaviour is installed as a stub
// BEFORE the app loads and the payload the app hands to the OS is recorded:
//
//   A. Chrome on Android, everything supported   → files + text + title
//   B. share sheet that refuses text next to a file → steps down to files only,
//      caption still reaches the user through the clipboard
//   C. share() throws for the rich payload        → steps down, never gives up
//   D. no Web Share at all                        → downloads AND copies the caption
//   E. the user closes the share sheet            → nothing is downloaded behind their back
//
//   node scripts/qa-v7.mjs

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './lib/browser.mjs';
import { serveDist } from './lib/server.mjs';
import { applySeed, buildSeedState, patchActiveDhikr } from './lib/seed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.qa-screens');
const PORT = 4191;

const VIEWPORTS = [
  { name: 'گوشی ۳۶۰', width: 360, height: 740 },
  { name: 'گوشی ۳۹۰', width: 390, height: 844 },
  { name: 'گوشی ۴۱۲ (ردمی نوت ۸ پرو)', width: 412, height: 892 },
  { name: 'تبلت ۸۰۰', width: 800, height: 1280 },
];

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

/** Installed before the app loads; `mode` picks which phone behaviour to fake. */
function installShareStub(mode) {
  window.__share = { calls: [], mode };
  const canShareFor = {
    full: () => true,
    filesOnly: (d) => !!(d && d.files && d.files.length && !d.text && !d.title),
    throwRich: () => true,
    none: null,
    abort: () => true,
  }[mode];
  if (canShareFor) {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: canShareFor });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data) => {
        window.__share.calls.push({
          title: data.title ?? null,
          text: data.text ?? null,
          files: (data.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size })),
        });
        if (mode === 'throwRich' && (data.title || data.text)) {
          throw new TypeError('unsupported payload');
        }
        if (mode === 'abort') {
          const err = new Error('cancelled');
          err.name = 'AbortError';
          throw err;
        }
      },
    });
  } else {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  }
}

async function openCounterImageShare(page) {
  await page.getByRole('button', { name: 'شمارنده', exact: true }).first().click();
  await page.waitForTimeout(300);
  await page.getByTestId('counter-share-icon').click();
  await page.waitForTimeout(200);
  await page.getByTestId('counter-share-option-image').click();
}

async function makePage(browser, state, viewport, mode) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    locale: 'fa-IR',
    permissions: ['clipboard-read', 'clipboard-write'],
    acceptDownloads: true,
  });
  await context.addInitScript(`(${applySeed.toString()})(${JSON.stringify(state)})`);
  await context.addInitScript(`(${installShareStub.toString()})(${JSON.stringify(mode)})`);
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(`(${patchActiveDhikr.toString()})(${JSON.stringify(state)})`);
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  return { context, page };
}

/** The caption's exact shape, per بخش ۴ of the spec. */
function captionLooksRight(text) {
  if (!text) return false;
  return (
    text.startsWith('📿 ذکرهای امروز من — ') &&
    /\nمجموع: .+ ذکر/.test(text) &&
    text.includes('من با برنامه‌ی «ذکرآرام» ذکر می‌گم 🌿 تو هم می‌تونی امتحانش کنی')
  );
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serveDist(DIST, PORT);
  const browser = await launchChromium();
  const state = buildSeedState();

  try {
    // ── A. Full Web Share level 2, on every screen size ──────────────────
    for (const vp of VIEWPORTS) {
      const { context, page } = await makePage(browser, state, vp, 'full');
      await openCounterImageShare(page);
      await page.getByTestId('counter-share-submit').click();
      await page.waitForTimeout(4000);
      const calls = await page.evaluate(() => window.__share.calls);
      const call = calls[0];
      check(`مورد۱ (${vp.name}) عکس با کپشن فرستاده شد`,
        calls.length === 1 && call?.files?.length === 1 && captionLooksRight(call?.text),
        call ? `${call.files.length} فایل، کپشن ${call.text ? call.text.length : 0} کاراکتر` : 'هیچ فراخوانی ثبت نشد');
      check(`مورد۱ (${vp.name}) کپشن شامل ذکرهای امروز و مجموع است`,
        !!call?.text && call.text.includes('مجموع: ') && /:\s*[۰-۹]/.test(call.text));
      // دور نهم — the کافه‌بازار and مایکت addresses are shipped now, so the
      // caption carries them; گوگل‌پلی has none and must still stay out.
      check(`مورد۱ (${vp.name}) بین متن و لینک‌ها یک خط خالی هست`,
        !!call?.text && call.text.includes('امتحانش کنی:\n\n📥'),
        call?.text ? call.text.trim().split('\n').slice(-2).join(' ⏎ ') : 'بدون کپشن');
      check(`مورد۱ (${vp.name}) فروشگاه بدون لینک در کپشن نیست`,
        !!call?.text && !call.text.includes('گوگل‌پلی') && !call.text.includes('مایکت'));
      // The new toast must sit fully inside the phone's screen (قانون بخش ۳).
      const toast = page.locator('.animate-fade-in', { hasText: 'کپی شد' }).first();
      await toast.waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForTimeout(700); // let the fade-in transform settle
      const box = await toast.boundingBox();
      check(`مورد۱ (${vp.name}) پیام «کپی شد» کامل داخل صفحه است`,
        !!box && box.x >= 0 && box.y >= 0 &&
        box.x + box.width <= vp.width + 0.5 && box.y + box.height <= vp.height + 0.5,
        box ? `x=${Math.round(box.x)} y=${Math.round(box.y)} w=${Math.round(box.width)} h=${Math.round(box.height)}` : 'پیدا نشد');
      if (vp.width === 390) {
        fs.writeFileSync(path.join(OUT, 'v7-counter-share-caption.txt'), call?.text || '');
        await page.screenshot({ path: path.join(OUT, 'v7-counter-share-toast.png') });
      }
      await context.close();
    }

    // ── B. Share sheet that refuses text next to a file ──────────────────
    {
      const { context, page } = await makePage(browser, state, VIEWPORTS[1], 'filesOnly');
      await openCounterImageShare(page);
      await page.getByTestId('counter-share-submit').click();
      await page.waitForTimeout(4000);
      const calls = await page.evaluate(() => window.__share.calls);
      check('مورد۱ (سهم‌گذاری بدون پشتیبانی از متن) عکس همچنان فرستاده می‌شود',
        calls.length === 1 && calls[0].files.length === 1 && calls[0].text === null,
        `${calls.length} فراخوانی`);
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      check('مورد۱ (سهم‌گذاری بدون پشتیبانی از متن) کپشن در حافظه‌ی موقت هست',
        captionLooksRight(clip), `${clip.length} کاراکتر`);
      await context.close();
    }

    // ── C. share() throws for the rich payload ───────────────────────────
    {
      const { context, page } = await makePage(browser, state, VIEWPORTS[1], 'throwRich');
      await openCounterImageShare(page);
      await page.getByTestId('counter-share-submit').click();
      await page.waitForTimeout(4000);
      const calls = await page.evaluate(() => window.__share.calls);
      const last = calls[calls.length - 1];
      check('مورد۱ (پرداخت غنی رد می‌شود) تا رسیدن به یک قالب قابل‌قبول پایین می‌آید',
        calls.length === 3 && last.files.length === 1 && last.text === null,
        `${calls.length} تلاش`);
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      check('مورد۱ (پرداخت غنی رد می‌شود) کپشن باز هم از دست نمی‌رود', captionLooksRight(clip));
      await context.close();
    }

    // ── D. No Web Share at all → download + caption in the clipboard ─────
    {
      const { context, page } = await makePage(browser, state, VIEWPORTS[1], 'none');
      await openCounterImageShare(page);
      const [dl] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }),
        page.getByTestId('counter-share-submit').click(),
      ]);
      const file = path.join(OUT, 'v7-counter-image-fallback.png');
      await dl.saveAs(file);
      check('مورد۱ (بدون Web Share) تصویر دانلود می‌شود', fs.statSync(file).size > 10000);
      await page.waitForTimeout(800);
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      check('مورد۱ (بدون Web Share) کپشن هم کپی می‌شود', captionLooksRight(clip));
      await context.close();
    }

    // ── E. The user closes the share sheet ───────────────────────────────
    {
      const { context, page } = await makePage(browser, state, VIEWPORTS[1], 'abort');
      let downloaded = false;
      page.on('download', () => { downloaded = true; });
      await openCounterImageShare(page);
      await page.getByTestId('counter-share-submit').click();
      await page.waitForTimeout(4000);
      const calls = await page.evaluate(() => window.__share.calls);
      check('مورد۱ (کاربر پنجره را می‌بندد) هیچ فایلی پنهانی دانلود نمی‌شود',
        !downloaded && calls.length === 1);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exitCode = 1;
}

run().catch((e) => { console.error(e); process.exit(1); });
