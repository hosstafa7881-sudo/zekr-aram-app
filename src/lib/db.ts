import { DhikrItem, INITIAL_DHIKR_LIST } from './seedData';
import { getShamsiDateInfo } from '../utils/persian';

export interface DailyLog {
  dateKey: string; // e.g. '2025-03-29'
  shamsiDate: string; // e.g. 'شنبه ۹ فروردین ۱۴۰۴'
  totalCount: number;
  breakdown: Record<string, { title: string; count: number }>;
}

export interface UserSettings {
  vibrationEnabled: boolean;
  vibrationIntensity: 'light' | 'medium' | 'strong';
  soundEnabled: boolean;
  wakeLockEnabled: boolean;
  showDiacritics: boolean;
  fullScreenTapArea: boolean;
  onboardingSeen: boolean;
  themeMode: 'day' | 'night';
  colorPalette: string;
  reminderEnabled: boolean;
  reminderTime: string;
  /** مورد ۲۰ — the user's own reminder wording ('' means "use the default message"). Max 100 characters so it fits in a phone notification. */
  reminderCustomMessage: string;
  /** مورد ۲۱ — «اعلان مناسبت‌های مذهبی» switch. */
  occasionReligiousNotifyEnabled: boolean;
  /** مورد ۲۱ — «اعلان روزهای رسمی دیگر» switch. */
  occasionNationalNotifyEnabled: boolean;
  isProUser: boolean;
  /** Timestamp until which a temporary discount-granted Pro access lasts (referral discount). Null when there's no active temporary grant (a real/simulated purchase leaves this null and isProUser permanently true). */
  proGrantExpiresAt: number | null;
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  dhikrs: DhikrItem[];
  activeDhikrId: string;
  dailyLogs: DailyLog[];
  settings: UserSettings;
  notebookItems?: import('../features/notebook/notebookTypes').NotebookItemDef[];
  notebookEntries?: import('../features/notebook/notebookTypes').NotebookDayEntry[];
  /** مورد ۱۸ — the (possibly extended) end of the user's free access, so restoring a backup doesn't silently throw away days they earned with the ۱۰۰٪ code. */
  freeExtensionUntil?: number | null;
  /** مورد ۱۸ — when the ۱۰۰٪ code was last used, so the ۱۸۰-day cooldown survives a restore. */
  referralLastUsedAt?: number | null;
}

const STORAGE_KEYS = {
  DHIKRS: 'zikraram_dhikrs_v1',
  ACTIVE_ID: 'zikraram_active_id_v1',
  DAILY_LOGS: 'zikraram_daily_logs_v1',
  SETTINGS: 'zikraram_settings_v1',
};

export const DEFAULT_SETTINGS: UserSettings = {
  vibrationEnabled: true,
  vibrationIntensity: 'medium',
  soundEnabled: true,
  wakeLockEnabled: true,
  showDiacritics: true,
  fullScreenTapArea: true,
  onboardingSeen: false,
  themeMode: 'day',
  colorPalette: 'green',
  // دور ششم / مورد ۷ — the daily-reminder switch starts ON for a brand-new
  // user and after «بازنشانی کامل», so the time, message and buttons are
  // visible the first time the tab is opened. It only makes the app WANT to
  // remind: nothing is shown on the phone until the user also allows
  // notifications (see the standing guide box in the reminder tab, مورد ۹).
  reminderEnabled: true,
  reminderTime: '20:00',
  reminderCustomMessage: '',
  occasionReligiousNotifyEnabled: true,
  occasionNationalNotifyEnabled: true,
  isProUser: false,
  proGrantExpiresAt: null,
};

// IndexedDB helper for background durability
const DB_NAME = 'ZikrAramDB';
const DB_VERSION = 1;

function openIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('state')) {
          db.createObjectStore('state');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveToIDB(key: string, value: unknown) {
  const db = await openIDB();
  if (!db) return;
  try {
    const tx = db.transaction('state', 'readwrite');
    tx.objectStore('state').put(value, key);
  } catch {
    // Ignore IDB write error
  }
}

export function loadDhikrs(): DhikrItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DHIKRS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DHIKRS, JSON.stringify(INITIAL_DHIKR_LIST));
      return INITIAL_DHIKR_LIST;
    }
    const parsed = JSON.parse(raw) as DhikrItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return INITIAL_DHIKR_LIST;
    }
    return parsed;
  } catch {
    return INITIAL_DHIKR_LIST;
  }
}

export function saveDhikrs(dhikrs: DhikrItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.DHIKRS, JSON.stringify(dhikrs));
    saveToIDB(STORAGE_KEYS.DHIKRS, dhikrs);
  } catch {
    // Ignore storage quota issues
  }
}

export function loadActiveDhikrId(dhikrs: DhikrItem[]): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
    if (saved && dhikrs.some((d) => d.id === saved)) {
      return saved;
    }
    // Default to today's weekday dhikr or salawat
    return dhikrs[0]?.id || 'salawat-main';
  } catch {
    return dhikrs[0]?.id || 'salawat-main';
  }
}

export function saveActiveDhikrId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id);
    saveToIDB(STORAGE_KEYS.ACTIVE_ID, id);
  } catch {
    // Ignore
  }
}

export function loadDailyLogs(): DailyLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_LOGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDailyLogs(logs: DailyLog[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(logs));
    saveToIDB(STORAGE_KEYS.DAILY_LOGS, logs);
  } catch {
    // Ignore
  }
}

export function recordDhikrIncrementInDailyLog(
  dhikrId: string,
  dhikrTitle: string,
  delta: number,
  currentLogs: DailyLog[]
): DailyLog[] {
  if (delta === 0) return currentLogs;
  const shamsi = getShamsiDateInfo(new Date());
  const dateKey = shamsi.dateKey;

  const existingIdx = currentLogs.findIndex((log) => log.dateKey === dateKey);
  const updatedLogs = [...currentLogs];

  if (existingIdx >= 0) {
    const log = { ...updatedLogs[existingIdx] };
    const breakdown = { ...log.breakdown };
    const prevEntry = breakdown[dhikrId] || { title: dhikrTitle, count: 0 };
    const newEntryCount = Math.max(0, prevEntry.count + delta);

    breakdown[dhikrId] = {
      title: dhikrTitle,
      count: newEntryCount,
    };

    const totalCount = Object.values(breakdown).reduce((sum, item) => sum + item.count, 0);
    log.breakdown = breakdown;
    log.totalCount = totalCount;
    log.shamsiDate = shamsi.formattedFull;
    updatedLogs[existingIdx] = log;
  } else if (delta > 0) {
    updatedLogs.unshift({
      dateKey,
      shamsiDate: shamsi.formattedFull,
      totalCount: delta,
      breakdown: {
        [dhikrId]: {
          title: dhikrTitle,
          count: delta,
        },
      },
    });
  }

  // Full unlimited history is kept — no trimming.
  saveDailyLogs(updatedLogs);
  return updatedLogs;
}

export function deleteDailyLog(dateKey: string, currentLogs: DailyLog[]): DailyLog[] {
  const filtered = currentLogs.filter((log) => log.dateKey !== dateKey);
  saveDailyLogs(filtered);
  return filtered;
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    saveToIDB(STORAGE_KEYS.SETTINGS, settings);
  } catch {
    // Ignore
  }
}

export function exportBackupJSON(
  dhikrs: DhikrItem[],
  activeDhikrId: string,
  dailyLogs: DailyLog[],
  settings: UserSettings,
  notebookItems?: import('../features/notebook/notebookTypes').NotebookItemDef[],
  notebookEntries?: import('../features/notebook/notebookTypes').NotebookDayEntry[],
  extras?: { freeExtensionUntil: number | null; referralLastUsedAt: number | null }
): string {
  const payload: BackupPayload = {
    version: 3,
    exportedAt: new Date().toISOString(),
    dhikrs,
    activeDhikrId,
    dailyLogs,
    settings,
    notebookItems,
    notebookEntries,
    freeExtensionUntil: extras?.freeExtensionUntil ?? null,
    referralLastUsedAt: extras?.referralLastUsedAt ?? null,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseAndValidateBackupJSON(jsonString: string): BackupPayload {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('فایل پشتیبان نامعتبر است.');
  }
  if (!Array.isArray(parsed.dhikrs) || parsed.dhikrs.length === 0) {
    throw new Error('فهرست ذکرها در فایل پشتیبان یافت نشد.');
  }
  return {
    version: parsed.version || 1,
    exportedAt: parsed.exportedAt || new Date().toISOString(),
    dhikrs: parsed.dhikrs,
    activeDhikrId: parsed.activeDhikrId || parsed.dhikrs[0].id,
    dailyLogs: Array.isArray(parsed.dailyLogs) ? parsed.dailyLogs : [],
    settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    notebookItems: Array.isArray(parsed.notebookItems) ? parsed.notebookItems : undefined,
    notebookEntries: Array.isArray(parsed.notebookEntries) ? parsed.notebookEntries : undefined,
    freeExtensionUntil:
      typeof parsed.freeExtensionUntil === 'number' ? parsed.freeExtensionUntil : null,
    referralLastUsedAt:
      typeof parsed.referralLastUsedAt === 'number' ? parsed.referralLastUsedAt : null,
  };
}
