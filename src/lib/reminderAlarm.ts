// دور دهم — the daily reminder's clock.
//
// WHAT WENT WRONG
//
// The reminder was never dropped; it arrived an hour late, every time. The user
// set ۲۱:۲۸ and got the notification at ۲۲:۲۸.
//
// The old code turned a wall-clock time into a UTC instant in JavaScript:
//
//     const d = new Date(); d.setHours(hour, minute, 0, 0);
//
// The WebView works out the offset, Android works it out again in reverse, and
// when the two disagree the reminder lands wherever the difference puts it.
// They do disagree: Iran dropped daylight saving in 2022, but many ROMs — MIUI
// on Android 11 above all — still ship the old rule, which in شهریور puts Iran
// an hour ahead. A current JS engine inside a stale framework is exactly one
// hour of error.
//
// It also explains the one thing that always worked: «ارسال پیام آزمایشی» uses
// `Date.now() + 800`, a duration rather than a time of day, so it never touches
// a timezone at all.
//
// THE RULE THIS MODULE ENFORCES
//
// No instant crosses the bridge. Only `hour` and `minute` travel; Android
// computes the moment with its own Calendar in its own zone. Whatever either
// side believes about daylight saving, ۲۱:۲۸ means ۲۱:۲۸ on the clock the user
// is looking at.

import { registerPlugin } from '@capacitor/core';
import { isNativePlatform } from './native';

export interface ReminderSlot {
  /** Our own index; becomes the alarm id. Reused so re-arming replaces. */
  slot: number;
  /** Days ahead of today. Ignored when `inMinutes` is given. */
  dayOffset?: number;
  /** Wall-clock hour, 0-23 — NEVER converted to an instant in JavaScript. */
  hour: number;
  /** Wall-clock minute, 0-59. */
  minute: number;
  /** For the «۲ دقیقه بعد» test: a duration, which is the right tool for "shortly". */
  inMinutes?: number;
  title: string;
  body: string;
  channelId?: string;
}

export interface ArmedAlarm {
  id: number;
  /** Epoch millis the SYSTEM settled on — useful for showing the user the real time. */
  at: number;
}

export interface DeliveredReminder {
  id: number;
  at: number;
  title: string;
  body: string;
}

interface ReminderAlarmPluginShape {
  schedule(options: { reminders: ReminderSlot[] }): Promise<{ armed: ArmedAlarm[] }>;
  cancelAll(options: { from: number; count: number }): Promise<void>;
  listPending(options: { from: number; count: number }): Promise<{ ids: number[]; nextAlarmAt?: number }>;
  deliveryLog(): Promise<{ entries: DeliveredReminder[] }>;
  clearDeliveryLog(): Promise<void>;
}

/** Implemented in android/app/src/main/java/com/zekraram/app/ReminderAlarmPlugin.java */
const ReminderAlarm = registerPlugin<ReminderAlarmPluginShape>('ReminderAlarm');

// Slot ranges, kept apart so arming one kind never cancels another.
/** Daily reminders: the rolling 14-day window. */
export const REMINDER_SLOT_BASE = 0;
export const REMINDER_SLOT_COUNT = 16;
/** The «۲ دقیقه بعد» test, alone in its own slot. */
export const TEST_REMINDER_SLOT = 16;
/** Occasion notices — only days that actually have one get a slot. */
export const OCCASION_SLOT_BASE = 20;
export const OCCASION_SLOT_COUNT = 40;

export function isReminderAlarmAvailable(): boolean {
  return isNativePlatform();
}

/** Replaces every alarm in a slot range with this set. Returns what the system really armed. */
export async function armAlarms(
  from: number,
  count: number,
  reminders: ReminderSlot[]
): Promise<ArmedAlarm[]> {
  if (!isNativePlatform()) return [];
  await ReminderAlarm.cancelAll({ from, count });
  if (reminders.length === 0) return [];
  const { armed } = await ReminderAlarm.schedule({ reminders });
  return armed || [];
}

/** The daily reminder's rolling window. */
export function armReminders(reminders: ReminderSlot[]): Promise<ArmedAlarm[]> {
  return armAlarms(REMINDER_SLOT_BASE, REMINDER_SLOT_COUNT, reminders);
}

/** The occasion notices — same wall-clock guarantee as the daily reminder. */
export function armOccasionNotices(notices: ReminderSlot[]): Promise<ArmedAlarm[]> {
  return armAlarms(OCCASION_SLOT_BASE, OCCASION_SLOT_COUNT, notices);
}

/** Arms one reminder without touching the others — used by the 2-minute test. */
export async function armSingleReminder(reminder: ReminderSlot): Promise<ArmedAlarm | null> {
  if (!isNativePlatform()) return null;
  const { armed } = await ReminderAlarm.schedule({ reminders: [reminder] });
  return armed?.[0] || null;
}

export async function cancelAllReminders(): Promise<void> {
  if (!isNativePlatform()) return;
  await ReminderAlarm.cancelAll({ from: REMINDER_SLOT_BASE, count: REMINDER_SLOT_COUNT });
}

/**
 * Which alarms the SYSTEM is holding — asked of the system, not of our own
 * bookkeeping. The previous round's status card read the Capacitor plugin's
 * saved records, which answer "did the app write this down", and so it claimed
 * more than it knew.
 */
export async function readArmedAlarms(): Promise<{ count: number; nextAt: Date | null }> {
  if (!isNativePlatform()) return { count: 0, nextAt: null };
  try {
    const { ids, nextAlarmAt } = await ReminderAlarm.listPending({
      from: REMINDER_SLOT_BASE,
      count: REMINDER_SLOT_COUNT,
    });
    return {
      count: ids?.length || 0,
      nextAt: nextAlarmAt ? new Date(nextAlarmAt) : null,
    };
  } catch {
    return { count: 0, nextAt: null };
  }
}

/** When our reminders actually fired — «نیامد» vs «آمد و ندیدمش». */
export async function readDeliveryLog(): Promise<DeliveredReminder[]> {
  if (!isNativePlatform()) return [];
  try {
    const { entries } = await ReminderAlarm.deliveryLog();
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

export async function clearDeliveryLog(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await ReminderAlarm.clearDeliveryLog();
  } catch {
    // Nothing depends on the log being empty.
  }
}
