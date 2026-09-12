import { useEffect } from 'react';
import { maybeFireDailyReminder } from './notifications';

interface UseDailyReminderOptions {
  reminderEnabled: boolean;
  reminderTime: string;
  todayDateKey: string;
  todayHasAnyDhikr: boolean;
  customMessage: string;
}

/** Checks roughly once a minute whether the daily reminder notification should fire. See notifications.ts for limitations. */
export function useDailyReminder(options: UseDailyReminderOptions) {
  const { reminderEnabled, reminderTime, todayDateKey, todayHasAnyDhikr, customMessage } = options;

  useEffect(() => {
    const fire = () =>
      maybeFireDailyReminder({
        reminderEnabled,
        reminderTime,
        todayDateKey,
        todayHasAnyDhikr,
        customMessage,
      });
    fire();
    const intervalId = window.setInterval(fire, 60_000);
    return () => window.clearInterval(intervalId);
  }, [reminderEnabled, reminderTime, todayDateKey, todayHasAnyDhikr, customMessage]);
}
