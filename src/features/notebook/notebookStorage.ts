import { NotebookItemDef, NotebookDayEntry, DEFAULT_NOTEBOOK_ITEMS } from './notebookTypes';

const KEYS = {
  ITEMS: 'zikraram_notebook_items_v1',
  ENTRIES: 'zikraram_notebook_entries_v1',
};

export function loadNotebookItems(): NotebookItemDef[] {
  try {
    const raw = localStorage.getItem(KEYS.ITEMS);
    if (!raw) return DEFAULT_NOTEBOOK_ITEMS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_NOTEBOOK_ITEMS;
  } catch {
    return DEFAULT_NOTEBOOK_ITEMS;
  }
}

export function saveNotebookItems(items: NotebookItemDef[]) {
  try {
    localStorage.setItem(KEYS.ITEMS, JSON.stringify(items));
  } catch {
    // Ignore storage quota issues
  }
}

export function loadNotebookEntries(): NotebookDayEntry[] {
  try {
    const raw = localStorage.getItem(KEYS.ENTRIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNotebookEntries(entries: NotebookDayEntry[]) {
  try {
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
  } catch {
    // Ignore storage quota issues
  }
}

export function createEmptyEntry(dateKey: string): NotebookDayEntry {
  return {
    dateKey,
    checkedItemIds: [],
    reasons: {},
    feelingText: '',
    stickers: [],
  };
}
