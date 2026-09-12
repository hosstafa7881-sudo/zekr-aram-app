// Part two of the behaviour sweep: history sharing (موارد ۱۳–۱۶), the ۱۰۰٪
// code window and its day stacking (موارد ۱۷–۱۹), the reminder tab and the
// occasion switches (موارد ۲۰–۲۱), and the backup round-trip.
//
//   node scripts/qa-flows2.mjs

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './lib/browser.mjs';
import { serveDist } from './lib/server.mjs';
import { applySeed, buildSeedState, patchActiveDhikr } from './lib/seed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.qa-screens');
const PORT = 4186;
const VIEWPORT = { width: 390, height: 844 };
const DAY_MS = 24 * 60 * 60 * 1000;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

function dateKey(offsetDays) {
  const d = new Date(Date.now() - offsetDays * DAY_MS);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function open(browser, state, { permissions = ['clipboard-read', 'clipboard-write'] } = {}) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    locale: 'fa-IR',
    permissions,
    acceptDownloads: true,
  });
  await context.addInitScript(`(${applySeed.toString()})(${JSON.stringify(state)})`);
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(`(${patchActiveDhikr.toString()})(${JSON.stringify(state)})`);
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
  return { context, page };
}

const readClipboard = (page) => page.evaluate(() => navigator.clipboard.readText());

async function openLast30Days(page) {
  await page.getByRole('button', { name: 'تاریخچه', exact: true }).first().click();
  await page.waitForTimeout(250);
  await page.getByText('ریزآمار روزهای گذشته').click();
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: /۳۰ روز اخیر/ }).first().click();
  await page.waitForTimeout(450);
}

// ---------------------------------------------------------------------------

async function testHistory(browser) {
  const state = buildSeedState();
  const notebookOnlyKey = dateKey(4);
  const dhikrOnlyKey = dateKey(6);
  // Day with a notebook but no dhikr at all.
  state.logs = state.logs.filter((l) => l.dateKey !== notebookOnlyKey);
  state.notebookEntries.push({
    dateKey: notebookOnlyKey,
    checkedItemIds: ['default-1', 'default-4'],
    reasons: { 'default-2': { why: 'وقت نشد', solution: 'فردا زودتر بیدار می‌شم' } },
    feelingText: 'روز آرومی بود',
    stickers: ['🌿'],
  });
  // (dhikrOnlyKey keeps its log and has no notebook entry.)

  const { context, page } = await open(browser, state);
  await openLast30Days(page);
  await page.screenshot({ path: path.join(OUT, 'last30days.png'), fullPage: true });

  // مورد ۱۴
  const noDhikrCount = await page.getByTestId('day-card-no-dhikr').count();
  check('مورد۱۴ متن «در این روز هیچ ذکری ثبت نشده» برای روز بدون ذکر', noDhikrCount === 1);
  const noDhikrText = await page.getByTestId('day-card-no-dhikr').first().textContent();
  check('مورد۱۴ متن دقیقاً مطابق پرامپت', noDhikrText.trim() === 'در این روز هیچ ذکری ثبت نشده', noDhikrText.trim());

  // مورد ۱۳ — دلیل و راه‌حل در دو خط جدا داخل خود صفحه
  const whyBox = await page.getByTestId('reason-why').first().boundingBox();
  const solutionBox = await page.getByTestId('reason-solution').first().boundingBox();
  check('مورد۱۳ «دلیل» و «راه‌حل» در صفحه در دو خط جدا هستند',
    !!whyBox && !!solutionBox && solutionBox.y > whyBox.y + whyBox.height - 2,
    `why.y=${whyBox?.y?.toFixed(0)} solution.y=${solutionBox?.y?.toFixed(0)}`);

  // مورد ۱۶ — آیکون اشتراک‌گذاری کنار سطل‌زباله، هر دو سمت چپ کارت
  const geom = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="day-card"]');
    const group = card.querySelector('[data-testid="day-card-actions"]');
    const buttons = group.querySelectorAll('button');
    const share = buttons[0].getBoundingClientRect();
    const trash = buttons[1].getBoundingClientRect();
    const date = card.querySelector('span').getBoundingClientRect();
    return {
      gap: Math.round(share.left - trash.right),
      shareRight: Math.round(share.right),
      dateLeft: Math.round(date.left),
      cardLeft: Math.round(card.getBoundingClientRect().left),
      trashLeft: Math.round(trash.left),
    };
  });
  check('مورد۱۶ فاصله‌ی آیکون اشتراک‌گذاری و سطل‌زباله ۸ تا ۱۲ پیکسل',
    geom.gap >= 8 && geom.gap <= 12, `gap=${geom.gap}px`);
  check('مورد۱۶ هر دو آیکون سمت چپ و تاریخ سمت راست',
    geom.shareRight < geom.dateLeft, `share.right=${geom.shareRight} < date.left=${geom.dateLeft}`);

  // مورد ۱۵ — روزی که فقط دفترچه دارد: بدون پاپ‌آپ، مستقیم اشتراک‌گذاری
  const notebookOnlyCard = page.locator('[data-testid="day-card"]', {
    has: page.locator('[data-testid="day-card-no-dhikr"]'),
  });
  await notebookOnlyCard.getByLabel('اشتراک‌گذاری').click();
  await page.waitForTimeout(400);
  check('مورد۱۵ روز بدون ذکر: پاپ‌آپ انتخاب باز نمی‌شود',
    (await page.getByTestId('day-share-submit').count()) === 0);
  const notebookText = await readClipboard(page);
  fs.writeFileSync(path.join(OUT, 'share-text-notebook-only.txt'), notebookText);
  check('مورد۱۳ متن «فقط دفترچه» کامل و با سرصفحه‌ی درست',
    notebookText.startsWith('📔 دفترچه‌ی کارهای خوب من — ') && notebookText.includes('✅') && notebookText.includes('❌'),
    notebookText.split('\n')[0]);
  check('مورد۱۳ «دلیل» و «راه‌حل» در متن هرکدام یک خط جدا',
    /\n {4}دلیل: وقت نشد\n {4}راه‌حل: فردا زودتر بیدار می‌شم/.test(notebookText));
  check('مورد۱۳ خط «حس امروز» در متن کامل هست', notebookText.includes('حس امروز: روز آرومی بود 🌿'));

  // مورد ۱۵ — روزی که هر دو را دارد: سه گزینه با پیش‌فرض «فقط ذکرها»
  const bothCard = page.locator('[data-testid="day-card"]').first();
  await bothCard.getByLabel('اشتراک‌گذاری').click();
  await page.waitForTimeout(350);
  const optionCount = await page.locator('[data-testid^="day-share-option-"]').count();
  check('مورد۱۵ روز کامل: هر سه گزینه نمایش داده می‌شوند', optionCount === 3, `options=${optionCount}`);
  await page.screenshot({ path: path.join(OUT, 'day-share-popup.png') });
  await page.getByTestId('day-share-option-both').click();
  await page.getByTestId('day-share-submit').click();
  await page.waitForTimeout(400);
  const bothText = await readClipboard(page);
  fs.writeFileSync(path.join(OUT, 'share-text-day-both.txt'), bothText);
  check('مورد۱۳ متن «ذکرها و دفترچه» کامل است',
    bothText.startsWith('📿 ذکرها و دفترچه‌ی من — ') && bothText.includes('📔 دفترچه‌ی کارهای خوب ('),
    bothText.split('\n')[0]);

  // مورد ۱۵ — روزی که فقط ذکر دارد (دفترچه ندارد)
  const dhikrOnlyCard = page
    .locator('[data-testid="day-card"][data-has-dhikr="yes"][data-has-notebook="no"]')
    .first();
  check('سناریوی آزمایشی: روزی با ذکر و بدون دفترچه وجود دارد',
    (await dhikrOnlyCard.count()) === 1, `key=${dhikrOnlyKey}`);
  await dhikrOnlyCard.getByLabel('اشتراک‌گذاری').click();
  await page.waitForTimeout(400);
  check('مورد۱۵ روز بدون دفترچه: پاپ‌آپ باز نمی‌شود',
    (await page.getByTestId('day-share-submit').count()) === 0);
  const dhikrText = await readClipboard(page);
  fs.writeFileSync(path.join(OUT, 'share-text-dhikr-only.txt'), dhikrText);
  check('مورد۱۳ متن «فقط ذکرها»', dhikrText.startsWith('📿 ذکرهای من — '), dhikrText.split('\n')[0]);

  await context.close();
}

async function testDiscountWindow(browser) {
  // روز سوم دوره‌ی آزمایشی: ۲۷ روز باقی مانده + ۳۰ = ۵۷
  const state = buildSeedState({ trialStartedDaysAgo: 3 });
  const { context, page } = await open(browser, state);

  await page.getByRole('button', { name: /کد تخفیف ۱۰۰ درصدی/ }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'discount-state-a.png'), fullPage: true });
  const before = await page.getByTestId('referral-state-before').textContent();
  check('مورد۱۷ حالت الف: عنوان و متن اصلی',
    before.includes('🎁 یک ماه اشتراک کامل، هدیه‌ی معرفی ذکرآرام') &&
    before.includes('دو راه ساده داری:') &&
    before.includes('این هدیه هر ۱۸۰ روز یک‌بار قابل استفاده‌ست.'));
  check('مورد۱۷ حدیث در انتهای پنجره',
    before.includes('«الدَّالُّ عَلَى الْخَيْرِ كَفَاعِلِهِ»') &&
    before.includes('«کسی که به کار خیر راهنمایی کند، مانند انجام‌دهنده‌ی آن است.»'));
  check('مورد۱۹ کادر متن دلخواه و شمارنده‌ی ۷۰ حرفی',
    (await page.getByTestId('story-custom-text').count()) === 1 && before.includes('۰ / ۷۰'));
  check('مورد۱۹ دکمه‌های تصویر در حالت الف',
    (await page.getByTestId('story-download-button').count()) === 1 &&
    (await page.getByTestId('story-share-button').count()) === 1);
  check('مورد۱۹ پیش‌نمایش تصویر نمایش داده می‌شود',
    (await page.getByTestId('story-preview').count()) === 1);

  // Default-text story image
  const [dl1] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.getByTestId('story-download-button').click(),
  ]);
  await dl1.saveAs(path.join(OUT, 'story-default.png'));
  check('مورد۱۹ تصویر آماده با متن پیش‌فرض ساخته شد',
    fs.statSync(path.join(OUT, 'story-default.png')).size > 20000,
    `${Math.round(fs.statSync(path.join(OUT, 'story-default.png')).size / 1024)}KB`);

  // Custom-text story image
  await page.getByTestId('story-custom-text').fill('من هر شب با این برنامه تسبیحات حضرت زهرا (س) می‌گم');
  await page.waitForTimeout(700);
  const counterLabel = await page.getByTestId('referral-state-before').textContent();
  check('مورد۱۹ شمارنده‌ی حروف به‌روز می‌شود', counterLabel.includes('۵۰ / ۷۰'));
  const [dl2] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.getByTestId('story-download-button').click(),
  ]);
  await dl2.saveAs(path.join(OUT, 'story-custom.png'));
  check('مورد۱۹ تصویر آماده با متن دلخواه ساخته شد',
    fs.statSync(path.join(OUT, 'story-custom.png')).size > 20000);

  // Activate → state B
  await page.getByTestId('referral-claim-button').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'discount-state-b.png'), fullPage: true });
  const after = await page.getByTestId('referral-state-activated').textContent();
  check('مورد۱۷ حالت ب: عنوان و تاریخ فعال‌سازی',
    after.includes('🎁 کد تخفیف ۱۰۰٪') && after.includes('برات فعال شد 🎁') &&
    after.includes('می‌تونی دوباره ازش استفاده کنی 🌹'));
  const freeDays = await page.getByTestId('referral-free-days').textContent();
  check('مورد۱۸ ۲۷ روز باقی‌مانده + ۳۰ = ۵۷ روز',
    freeDays.includes('۵۷ روز دیگه'), freeDays.trim());
  check('مورد۱۹ دکمه‌های تصویر در حالت ب هم هستند',
    (await page.getByTestId('story-download-button').count()) === 1 &&
    (await page.getByTestId('story-share-button').count()) === 1);

  // Close and verify every label in the app agrees.
  await page.getByLabel('بستن').first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'تنظیمات', exact: true }).first().click();
  await page.waitForTimeout(300);
  const settingsText = await page.locator('main').textContent();
  check('مورد۱۸ برچسب بخش «ظاهر» در تنظیمات هم ۵۷ روز نشان می‌دهد',
    settingsText.includes('۵۷ روز دیگه رایگانه'),
    (settingsText.match(/[۰-۹]+ روز (دیگه )?رایگانه/) || [''])[0]);

  // Backup round-trip
  await page.getByRole('button', { name: 'تاریخچه', exact: true }).first().click();
  await page.waitForTimeout(300);
  const [backup] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    page.getByRole('button', { name: /دانلود فایل پشتیبان/ }).click(),
  ]);
  const backupPath = path.join(OUT, 'backup.json');
  await backup.saveAs(backupPath);
  const payload = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  check('مورد۱۸ تاریخ پایان جدید در فایل پشتیبان ذخیره می‌شود',
    typeof payload.freeExtensionUntil === 'number' && payload.freeExtensionUntil > Date.now());
  check('مورد۱۸ تاریخ آخرین استفاده از کد ۱۰۰٪ در فایل پشتیبان ذخیره می‌شود',
    typeof payload.referralLastUsedAt === 'number');
  await context.close();
}

async function testNotifications(browser) {
  const state = buildSeedState();
  const { context, page } = await open(browser, state, {
    permissions: ['notifications', 'clipboard-read', 'clipboard-write'],
  });

  await page.getByLabel('اعلانات و مناسبت‌ها').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'reminder-off.png') });
  check('مورد۲۰ با سوییچ خاموش، بقیه‌ی بخش‌ها دیده نمی‌شوند',
    (await page.getByTestId('reminder-body').count()) === 0);

  await page.getByRole('switch', { name: 'یادآوری روزانه' }).click();
  await page.waitForTimeout(500);
  check('مورد۲۰ با روشن شدن سوییچ، بقیه‌ی بخش‌ها ظاهر می‌شوند',
    (await page.getByTestId('reminder-body').count()) === 1);
  await page.screenshot({ path: path.join(OUT, 'reminder-on.png') });

  const panelText = await page.getByTestId('bell-panel').textContent();
  check('مورد۲۰ متن توضیح جدید دقیقاً مطابق پرامپت',
    panelText.includes('هر روز سر ساعتی که انتخاب می‌کنی، اگه هنوز ذکری نگفته باشی، با یه پیام کوچیک، بهت یادآوری میشه 🌿') &&
    panelText.includes('(اگه قبلش ذکر گفته باشی، پیامی نمیاد.)'));
  const preview = await page.getByTestId('reminder-preview').textContent();
  check('مورد۲۰ کادر «پیامی که روی گوشیت می‌بینی» پیام پیش‌فرض را نشان می‌دهد',
    preview.includes('امروز هنوز ذکری نگفتی، می‌خوای با گفتن ذکر، بیشتر به یاد خدا باشی؟ 📿'));

  await page.getByTestId('reminder-custom-toggle').click();
  await page.waitForTimeout(200);
  await page.getByTestId('reminder-custom-input').fill('یادت نره امشب صلوات بفرستی 🌿');
  await page.waitForTimeout(300);
  const preview2 = await page.getByTestId('reminder-preview').textContent();
  check('مورد۲۰ پیش‌نمایش با پیام دلخواه زنده به‌روز می‌شود',
    preview2.includes('یادت نره امشب صلوات بفرستی 🌿'), preview2.trim());
  const maxLen = await page.getByTestId('reminder-custom-input').getAttribute('maxlength');
  check('مورد۲۰ حداکثر ۱۰۰ حرف برای پیام دلخواه', maxLen === '100', `maxlength=${maxLen}`);

  await page.getByTestId('reminder-custom-reset').click();
  await page.waitForTimeout(300);
  const preview3 = await page.getByTestId('reminder-preview').textContent();
  check('مورد۲۰ «برگشت به پیام پیش‌فرض» کار می‌کند',
    preview3.includes('امروز هنوز ذکری نگفتی'));

  await page.getByTestId('reminder-save-button').click();
  await page.waitForTimeout(600);
  const body = await page.locator('body').textContent();
  check('مورد۲۰ toast ثبت یادآوری دقیقاً مطابق پرامپت',
    body.includes('ثبت شد ✅ هر روز ساعت ۲۱:۳۰ یادت میندازیم 🌿'),
    (body.match(/ثبت شد[^\n]{0,50}/) || [''])[0]);
  await page.screenshot({ path: path.join(OUT, 'reminder-saved-toast.png') });

  // مورد ۲۱
  await page.getByTestId('tab-occasions').click();
  await page.waitForTimeout(400);
  const occText = await page.getByTestId('bell-panel').textContent();
  check('مورد۲۱الف نام تب «مناسبت‌ها» است',
    (await page.getByTestId('tab-occasions').textContent()).trim() === 'مناسبت‌ها');
  check('مورد۲۱ب دو سوییچ جدید وجود دارند',
    occText.includes('اعلان مناسبت‌های مذهبی') && occText.includes('اعلان روزهای رسمی دیگر'));
  const religiousOn = await page.getByRole('switch', { name: 'اعلان مناسبت‌های مذهبی' }).getAttribute('aria-checked');
  const nationalOn = await page.getByRole('switch', { name: 'اعلان روزهای رسمی دیگر' }).getAttribute('aria-checked');
  check('مورد۲۱ب هر دو سوییچ پیش‌فرض روشن هستند',
    religiousOn === 'true' && nationalOn === 'true', `${religiousOn}/${nationalOn}`);
  await page.screenshot({ path: path.join(OUT, 'occasions-tab.png') });
  await context.close();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serveDist(DIST, PORT);
  const browser = await launchChromium();
  const tests = [
    ['history', testHistory],
    ['discount window', testDiscountWindow],
    ['notifications', testNotifications],
  ];
  try {
    for (const [name, fn] of tests) {
      try {
        await fn(browser);
      } catch (err) {
        check(`اجرای سناریوی «${name}»`, false, String(err).split('\n')[0]);
      }
    }
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
