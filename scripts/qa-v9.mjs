// دور نهم — the items that CAN be verified in a browser.
//
//   node scripts/qa-v9.mjs
//
//   مورد ۶الف — a day with nothing written in the notebook must not show the
//               notebook at all (it used to draw the whole checklist with every
//               item ❌, which reads as "you failed all ten today")
//   مورد ۶ب   — the delete button offers حذف ذکرها / حذف دفترچه / حذف ذکرها و
//               دفترچه, and each one removes exactly what it says
//   مورد ۶ج   — the confirmation wording
//   مورد ۶د   — «پاک کردن کامل داده‌ها» really clears the notebook too
//   مورد ۲    — the ready-made story image carries no discount buttons
//
// Items 1 and 4 (saving the backup file, the scheduled reminder) are native by
// definition and cannot be verified anywhere but on the phone.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './lib/browser.mjs';
import { serveDist } from './lib/server.mjs';
import { applySeed, buildSeedState } from './lib/seed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.qa-screens');
const PORT = 4196;
const DAY_MS = 86_400_000;

const VIEWPORTS = [
  { name: 'گوشی ۳۶۰', width: 360, height: 740 },
  { name: 'گوشی ۳۹۰', width: 390, height: 844 },
  { name: 'گوشی ۴۱۲ (ردمی نوت ۸ پرو)', width: 412, height: 915 },
  { name: 'تبلت ۸۰۰', width: 800, height: 1280 },
];

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

function dateKeyOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function open(browser, { viewport = VIEWPORTS[1], state } = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    locale: 'fa-IR',
  });
  await context.addInitScript(`(${applySeed.toString()})(${JSON.stringify(state)})`);
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
  return { context, page };
}

/** Opens تاریخچه ⟵ ریزآمار ⟵ ۳۰ روز اخیر. */
async function gotoLast30(page) {
  await page.getByRole('button', { name: 'تاریخچه', exact: true }).first().click();
  await page.waitForTimeout(300);
  await page.getByText('ریزآمار روزهای گذشته').click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /۳۰ روز اخیر/ }).first().click();
  await page.waitForTimeout(500);
}

const todayKey = dateKeyOf(new Date());
const yesterdayKey = dateKeyOf(new Date(Date.now() - DAY_MS));
const twoDaysAgoKey = dateKeyOf(new Date(Date.now() - 2 * DAY_MS));

/** Seed where today has dhikr AND a notebook, and two days ago has dhikr only. */
function seedMixed() {
  const state = buildSeedState();
  // Drop every notebook entry except today's — two days ago then has dhikr
  // recorded (buildDailyLogs covers 12 days) and nothing in the notebook.
  state.notebookEntries = state.notebookEntries.filter((e) => e.dateKey === todayKey);
  return state;
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serveDist(DIST, PORT);
  const browser = await launchChromium();

  // ── مورد ۶الف — the notebook is absent on a day it was never written in ──
  for (const vp of VIEWPORTS) {
    const { context, page } = await open(browser, { viewport: vp, state: seedMixed() });
    await gotoLast30(page);

    const todayCard = page.locator(`[data-testid="day-card"]`).first();
    const noNotebookCard = page.locator('[data-testid="day-card"][data-has-notebook="no"]').first();

    check(`مورد۶الف (${vp.name}) روزی که دفترچه دارد، دفترچه‌اش را نشان می‌دهد`,
      (await todayCard.getAttribute('data-has-notebook')) === 'yes' &&
        (await todayCard.locator('[data-testid="day-card-notebook"]').count()) === 1);

    const withoutCount = await noNotebookCard.count();
    check(`مورد۶الف (${vp.name}) روزی بدون دفترچه در فهرست هست (شرط آزمون)`, withoutCount === 1);
    if (withoutCount === 1) {
      check(`مورد۶الف (${vp.name}) روز بدون دفترچه، هیچ چک‌لیستی نشان نمی‌دهد`,
        (await noNotebookCard.locator('[data-testid="day-card-notebook"]').count()) === 0);
      // And specifically none of the ten items is rendered as «انجام نشده».
      check(`مورد۶الف (${vp.name}) هیچ موردی از دفترچه با ❌ نمایش داده نمی‌شود`,
        !(await noNotebookCard.innerText()).includes('خواندن نمازهای روزانه'));
    }

    if (vp.width === 390) {
      await page.screenshot({ path: path.join(OUT, 'v9-last30-no-notebook.png'), fullPage: false });
    }
    await context.close();
  }

  // ── مورد ۶ب و ۶ج — the three choices, and what each one removes ─────────
  {
    const { context, page } = await open(browser, { state: seedMixed() });
    await gotoLast30(page);
    await page.locator('[data-testid="day-card"]').first().getByLabel('حذف این روز').click();
    await page.waitForTimeout(300);

    const dialog = page.getByTestId('day-delete-dialog');
    check('مورد۶ب پنجره‌ی حذف باز می‌شود', await dialog.isVisible());
    check('مورد۶ب گزینه‌ی «حذف ذکرها» هست',
      (await page.getByTestId('day-delete-dhikr').innerText()) === 'حذف ذکرها');
    check('مورد۶ب گزینه‌ی «حذف دفترچه» هست',
      (await page.getByTestId('day-delete-notebook').innerText()) === 'حذف دفترچه');
    check('مورد۶ب گزینه‌ی «حذف ذکرها و دفترچه» هست',
      (await page.getByTestId('day-delete-both').innerText()) === 'حذف ذکرها و دفترچه');
    check('مورد۶ج متن تأیید دقیقاً «مطمئنی؟ بعد از حذف، این عمل قابل بازگشت نیست.» است',
      (await dialog.innerText()).includes('مطمئنی؟ بعد از حذف، این عمل قابل بازگشت نیست.'),
      (await dialog.innerText()).split('\n').find((l) => l.includes('مطمئنی')) || '—');
    await page.screenshot({ path: path.join(OUT, 'v9-delete-dialog.png') });

    // «حذف دفترچه» must leave the dhikr counts alone.
    await page.getByTestId('day-delete-notebook').click();
    await page.waitForTimeout(500);
    const after = page.locator('[data-testid="day-card"]').first();
    check('مورد۶ب «حذف دفترچه» فقط دفترچه را حذف می‌کند',
      (await after.getAttribute('data-has-notebook')) === 'no' &&
        (await after.getAttribute('data-has-dhikr')) === 'yes');
    const storedAfterNotebookDelete = await page.evaluate(
      (k) => JSON.parse(localStorage.getItem('zikraram_notebook_entries_v1') || '[]').some((e) => e.dateKey === k),
      todayKey
    );
    check('مورد۶ب دفترچه‌ی آن روز از حافظه هم پاک شد', storedAfterNotebookDelete === false);
    await context.close();
  }

  {
    const { context, page } = await open(browser, { state: seedMixed() });
    await gotoLast30(page);
    await page.locator('[data-testid="day-card"]').first().getByLabel('حذف این روز').click();
    await page.waitForTimeout(300);
    await page.getByTestId('day-delete-dhikr').click();
    await page.waitForTimeout(500);
    const card = page.locator('[data-testid="day-card"]').first();
    check('مورد۶ب «حذف ذکرها» فقط ذکرها را حذف می‌کند و دفترچه می‌ماند',
      (await card.getAttribute('data-has-dhikr')) === 'no' &&
        (await card.getAttribute('data-has-notebook')) === 'yes');
    await context.close();
  }

  {
    const { context, page } = await open(browser, { state: seedMixed() });
    await gotoLast30(page);
    const before = await page.locator('[data-testid="day-card"]').count();
    await page.locator('[data-testid="day-card"]').first().getByLabel('حذف این روز').click();
    await page.waitForTimeout(300);
    await page.getByTestId('day-delete-both').click();
    await page.waitForTimeout(500);
    check('مورد۶ب «حذف ذکرها و دفترچه» آن روز را کامل از فهرست برمی‌دارد',
      (await page.locator('[data-testid="day-card"]').count()) === before - 1,
      `${before} ⟵ ${await page.locator('[data-testid="day-card"]').count()}`);
    await context.close();
  }

  // A day with only dhikr is offered one choice, not a menu of three.
  {
    const { context, page } = await open(browser, { state: seedMixed() });
    await gotoLast30(page);
    const plain = page.locator('[data-testid="day-card"][data-has-notebook="no"]').first();
    await plain.getByLabel('حذف این روز').click();
    await page.waitForTimeout(300);
    check('مورد۶ب روزی که فقط ذکر دارد، فقط «حذف ذکرها» را پیشنهاد می‌دهد',
      (await page.getByTestId('day-delete-dhikr').count()) === 1 &&
        (await page.getByTestId('day-delete-notebook').count()) === 0 &&
        (await page.getByTestId('day-delete-both').count()) === 0);
    await context.close();
  }

  // ── مورد ۶د — the full wipe clears the notebook too ─────────────────────
  {
    const { context, page } = await open(browser, { state: seedMixed() });
    await page.getByRole('button', { name: 'تنظیمات', exact: true }).first().click();
    await page.waitForTimeout(400);
    const seeded = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('zikraram_notebook_entries_v1') || '[]').length
    );
    check('مورد۶د قبل از پاک‌کردن، دفترچه داده دارد (شرط آزمون)', seeded > 0, `${seeded} روز`);

    await page.getByRole('button', { name: /پاک کردن کامل داده‌ها/ }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'بله، پاک شود' }).click();
    await page.waitForTimeout(800);

    const left = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('zikraram_notebook_entries_v1') || '[]').length
    );
    check('مورد۶د بعد از پاک‌کردن کامل، هیچ روزی در دفترچه نمانده', left === 0, `${left} روز`);

    const items = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('zikraram_notebook_items_v1') || '[]')
    );
    check('مورد۶د فهرست کارهای دفترچه به حالت اولیه برگشت',
      Array.isArray(items) && items.length === 10 && items.every((i) => i.isCustom === false),
      `${items.length} مورد`);
    await context.close();
  }

  await browser.close();
  server.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
