// دور دهم — the reminder's clock, guarded.
//
//   node scripts/qa-v10-clock.mjs
//
// The user set a reminder for ۲۱:۲۸ and it fired at ۲۲:۲۸, every time. The cause
// was a wall-clock time turned into a UTC instant in JavaScript and turned back
// into wall-clock time by Android: two tzdata copies that disagree about Iran's
// (abolished) daylight saving produce exactly one hour of error.
//
// The fix is a rule, and a rule needs a guard: NO instant computed from a
// user-chosen hour may cross the bridge. Only `hour` and `minute` travel. This
// checks the rule directly in the shipped source, because the failure it
// prevents cannot be reproduced in a browser — it needs two disagreeing
// timezone databases.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const notifications = fs.readFileSync(path.join(ROOT, 'src/lib/notifications.ts'), 'utf8');
const alarm = fs.readFileSync(path.join(ROOT, 'src/lib/reminderAlarm.ts'), 'utf8');
const plugin = fs.readFileSync(
  path.join(ROOT, 'android/app/src/main/java/com/zekraram/app/ReminderAlarmPlugin.java'),
  'utf8'
);

// Strip comments so prose about the old bug never satisfies or trips a check.
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const notifCode = code(notifications);

check(
  'مورد۶ هیچ ساعتِ دیواری‌ای در جاوااسکریپت به لحظه تبدیل نمی‌شود',
  !/setHours\s*\(/.test(notifCode.split('maybeFireDailyReminder')[0]),
  'setHours در مسیر زمان‌بندی پیدا شد'
);

check(
  'مورد۶ تابع atTimeOnDay دیگر وجود ندارد',
  !/function atTimeOnDay/.test(notifCode)
);

check(
  'مورد۶ یادآوری روزانه از پلاگین آلارم خودمان می‌رود',
  /armReminders\s*\(/.test(notifCode)
);

check(
  'مورد۶ اعلان مناسبت‌ها هم از همان مسیر می‌رود',
  /armOccasionNotices\s*\(/.test(notifCode)
);

check(
  'مورد۶ فقط ساعت و دقیقه از پل رد می‌شوند (نه Date)',
  /hour:\s*hh/.test(notifCode) && /minute:\s*mm/.test(notifCode)
);

const alarmCode = code(alarm);
check(
  'مورد۶ رابط پلاگین ساعت و دقیقه می‌گیرد، نه لحظه',
  /hour:\s*number/.test(alarmCode) && /minute:\s*number/.test(alarmCode)
);
check(
  'مورد۶ هیچ فیلد at/timestamp ی به پلاگین فرستاده نمی‌شود',
  !/\bat:\s*(number|Date)/.test(alarmCode.split('export interface ArmedAlarm')[0])
);

const pluginCode = code(plugin);
check(
  'مورد۷ سمت اندروید با Calendar و منطقه‌ی زمانی خودِ گوشی حساب می‌کند',
  /Calendar\.getInstance\(\)/.test(pluginCode) && /HOUR_OF_DAY/.test(pluginCode)
);
check(
  'مورد۷ از setAlarmClock استفاده می‌شود',
  /setAlarmClock\s*\(/.test(pluginCode)
);
check(
  'مورد۱۰ listPending از خود سیستم می‌پرسد (FLAG_NO_CREATE)',
  /FLAG_NO_CREATE/.test(pluginCode)
);

// «ارسال پیام آزمایشی» is a DURATION and must stay one — it is the one path
// that always worked, precisely because it never touches a time of day.
check(
  'مورد۶ پیام آزمایشی فوری همچنان بر پایه‌ی مدت است، نه ساعت',
  /Date\.now\(\)\s*\+\s*800/.test(notifCode)
);
check(
  'مورد۹ یادآوری آزمایشی ۲ دقیقه‌ای هم مدت است، نه ساعت',
  /inMinutes/.test(notifCode) && /inMinutes/.test(pluginCode)
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
