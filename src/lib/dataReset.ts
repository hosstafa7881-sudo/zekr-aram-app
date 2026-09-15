// دور دهم — what «پاک کردن کامل داده‌ها» actually erases.
//
// WHY THIS FILE EXISTS
//
// The reset promises to erase everything and quietly did not. Round nine found
// the notebook surviving it and fixed that one; the star and medal state was
// surviving it too and was missed, which is why the user's first star after a
// wipe stopped announcing itself. Fixing survivors one at a time as they are
// reported is how the same bug keeps coming back.
//
// So the decision is made once, here, for every key the app stores — and adding
// a key without deciding its side is now a visible omission rather than an
// invisible one.
//
// THE ONES THAT DELIBERATELY SURVIVE
//
// Three keys hold the subscription's own accounting, not the user's data. If a
// wipe cleared them, «پاک کردن داده‌ها» would become a way to restart the
// 30-day trial for ever and to re-earn the ۱۰۰٪ code past its ۱۸۰-day wait.
// That is the same reasoning that already locks the multi-stage custom dhikr
// (SKILL.md §۵): a convenience must not become a bypass.

/** Everything a full reset erases — the user's own data and progress. */
export const RESET_KEYS = [
  'zikraram_dhikrs_v1',
  'zikraram_active_id_v1',
  'zikraram_daily_logs_v1',
  'zikraram_settings_v1',
  'zikraram_notebook_items_v1',
  'zikraram_notebook_entries_v1',
  // دور دهم — the survivors this round found:
  'zikraram_gamification_v1', // ستاره، مدال، رکورد و زنجیره‌ی روزها
  'zikraram_count_discount_state_v1',
  'zikraram_discount_cycle_start_v1',
  'zikraram_occasion_notified_v1',
  'zikraram_reminder_last_notified_v1',
  'zikraram_trial_warning_shown_v1',
] as const;

/**
 * Deliberately NOT cleared. Listed explicitly so the choice is visible and can
 * be argued with, rather than looking like something that was forgotten.
 */
export const PRESERVED_KEYS = [
  'zikraram_trial_start_v1', // وگرنه دوره‌ی آزمایشی بی‌نهایت تمدید می‌شود
  'zikraram_free_extension_until_v1', // وگرنه کد ۱۰۰٪ مکرر گرفته می‌شود
  'zikraram_referral_last_used_v1', // وگرنه فاصله‌ی ۱۸۰ روز دور زده می‌شود
  'zikraram_reloaded_for_version_v1', // داخلی، بی‌اثر برای کاربر
] as const;

/** The IndexedDB mirror db.ts writes for durability. */
const IDB_NAME = 'ZikrAramDB';
const IDB_STORE = 'state';

/**
 * The mirror is written but never read, so it cannot resurrect anything — but
 * leaving a user's whole dhikr history sitting on the device after they asked
 * for it to be erased is still not what the button promises.
 */
async function clearMirror(): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;
  await new Promise<void>((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME);
      req.onerror = () => resolve();
      req.onsuccess = () => {
        const db = req.result;
        try {
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            resolve();
            return;
          }
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
          tx.onabort = () => resolve();
        } catch {
          resolve();
        }
      };
    } catch {
      resolve();
    }
  });
}

export function clearAllUserData() {
  for (const key of RESET_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // One unreadable key must not stop the rest of the reset.
    }
  }
  void clearMirror();
}
