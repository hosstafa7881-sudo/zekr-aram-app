// Remaining checks: the auto-update reload (مورد ۲ب) and the new-user defaults
// for sound + vibration (مورد ۳).
//
//   node scripts/qa-misc.mjs

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './lib/browser.mjs';
import { serveDist } from './lib/server.mjs';
import { APP_VERSION } from './lib/appVersion.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.qa-screens');
const PORT = 4189;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function testAutoUpdate(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' });
  const page = await context.newPage();
  let versionRequests = 0;
  // Pretend the server already carries a NEWER build than the bundle.
  await page.route('**/version.json*', (route) => {
    versionRequests += 1;
    // Always exactly one ahead of whatever the bundle carries.
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ version: APP_VERSION + 1 }),
    });
  });
  // Counting document navigations rather than 'load' events: a reload driven
  // by the app is a fresh document request for the page itself.
  let documentRequests = 0;
  page.on('request', (req) => {
    if (req.resourceType() === 'document') documentRequests += 1;
  });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.waitForTimeout(6000);
  check('مورد۲ب برنامه فایل version.json را می‌خواند', versionRequests > 0, `${versionRequests} request(s)`);
  check('مورد۲ب با دیدن نسخه‌ی جدیدتر، خودش صفحه را دوباره بارگذاری می‌کند',
    documentRequests >= 2, `${documentRequests} document request(s)`);
  check('مورد۲ب اگر سرور همچنان نسخه‌ی قدیمی بدهد، در حلقه‌ی بارگذاری مکرر نمی‌افتد',
    documentRequests <= 3, `${documentRequests} document request(s) in 6s`);
  await context.close();
}

async function testNoReloadOnSameVersion(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' });
  const page = await context.newPage();
  let documentRequests = 0;
  page.on('request', (req) => {
    if (req.resourceType() === 'document') documentRequests += 1;
  });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  check('مورد۲ب وقتی نسخه یکی است، بارگذاری مجدد بی‌مورد انجام نمی‌شود',
    documentRequests === 1, `${documentRequests} document request(s)`);
  await context.close();
}

async function testDefaults(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  // Skip the onboarding tour that a genuinely new user sees first.
  await page.getByRole('button', { name: 'بستن راهنما' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'تنظیمات', exact: true }).first().click();
  await page.waitForTimeout(400);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('zikraram_settings_v1') || '{}'));
  check('مورد۳ صدای کلیک شمارش برای کاربر جدید پیش‌فرض روشن است', stored.soundEnabled === true, String(stored.soundEnabled));
  check('مورد۳ ویبره برای کاربر جدید پیش‌فرض روشن است', stored.vibrationEnabled === true, String(stored.vibrationEnabled));
  check('مورد۳ شدت ویبره پیش‌فرض «متوسط» است', stored.vibrationIntensity === 'medium', String(stored.vibrationIntensity));
  const intensityPressed = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')];
    const medium = buttons.find((b) => b.textContent.trim() === 'متوسط');
    return medium ? medium.className.includes('bg-[var(--accent)]') : null;
  });
  check('مورد۳ دکمه‌ی «متوسط» در تنظیمات انتخاب‌شده نمایش داده می‌شود', intensityPressed === true);
  await page.screenshot({ path: path.join(OUT, 'settings-defaults.png'), fullPage: true });

  // After a full reset the same defaults must come back.
  await page.getByRole('button', { name: /پاک کردن کامل داده‌ها/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'بله، پاک شود' }).click();
  await page.waitForTimeout(600);
  const afterReset = await page.evaluate(() => JSON.parse(localStorage.getItem('zikraram_settings_v1') || '{}'));
  check('مورد۳ بعد از «بازنشانی کامل» هم صدا و ویبره روشن‌اند',
    afterReset.soundEnabled === true && afterReset.vibrationEnabled === true && afterReset.vibrationIntensity === 'medium',
    JSON.stringify({ s: afterReset.soundEnabled, v: afterReset.vibrationEnabled, i: afterReset.vibrationIntensity }));
  await context.close();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serveDist(DIST, PORT);
  const browser = await launchChromium();
  try {
    await testAutoUpdate(browser);
    await testNoReloadOnSameVersion(browser);
    await testDefaults(browser);
  } finally {
    await browser.close();
    server.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
