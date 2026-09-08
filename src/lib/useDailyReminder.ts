import { useEffect } from 'react';
import { maybeFireDailyReminder } from './notifications';

interface UseDailyReminderOptions {
  reminderEnabled: boolean;
  reminderTime: string;
  todayDateKey: string;
  todayHasAnyDhikr: boolean;
}

/** Checks roughly once a minute whether the daily reminder notification should fire. See notifications.ts for limitations. */
export function useDailyReminder(options: UseDailyReminderOptions) {
  const { reminderEnabled, reminderTime, todayDateKey, todayHasAnyDhikr } = options;

  useEffect(() => {
    maybeFireDailyReminder({ reminderEnabled, reminderTime, todayDateKey, todayHasAnyDhikr });
    const intervalId = window.setInterval(() => {
      maybeFireDailyReminder({ reminderEnabled, reminderTime, todayDateKey, todayHasAnyDhikr });
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [reminderEnabled, reminderTime, todayDateKey, todayHasAnyDhikr]);
}
