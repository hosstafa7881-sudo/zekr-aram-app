import { useEffect } from 'react';
import { maybeFireDailyReminder, syncDailyReminderSchedule } from './notifications';
import { isNativePlatform } from './native';

interface UseDailyReminderOptions {
  reminderEnabled: boolean;
  reminderTime: string;
  todayDateKey: string;
  todayHasAnyDhikr: boolean;
  customMessage: string;
}

/**
 * دور هشتم / مورد ۳ — two completely different mechanisms behind one hook.
 *
 * Native: the rolling reminder window is handed to the OS, so it arrives even
 * with the app closed. It is re-armed whenever any input changes — crucially
 * including `todayHasAnyDhikr`, which is what drops today's reminder the
 * instant the user counts a dhikr.
 *
 * Browser: the old once-a-minute poll, which can only fire while the page is
 * open. Kept so development in a browser still behaves.
 */
export function useDailyReminder(options: UseDailyReminderOptions) {
  const { reminderEnabled, reminderTime, todayDateKey, todayHasAnyDhikr, customMessage } = options;

  useEffect(() => {
    if (isNativePlatform()) {
      void syncDailyReminderSchedule({
        reminderEnabled,
        reminderTime,
        todayHasAnyDhikr,
        customMessage,
      });
      return;
    }

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
