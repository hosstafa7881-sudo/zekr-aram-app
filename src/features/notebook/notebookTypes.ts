export interface NotebookItemDef {
  id: string;
  text: string;
  isCustom: boolean;
}

export interface NotebookReasonEntry {
  why: string;
  solution: string;
}

export interface NotebookDayEntry {
  dateKey: string;
  checkedItemIds: string[];
  reasons: Record<string, NotebookReasonEntry>;
  feelingText: string;
  stickers: string[];
}

export const DEFAULT_NOTEBOOK_ITEMS: NotebookItemDef[] = [
  { id: 'default-1', text: 'خواندن نمازهای روزانه', isCustom: false },
  { id: 'default-2', text: 'نماز اول وقت', isCustom: false },
  { id: 'default-3', text: 'راستگویی با خانواده', isCustom: false },
  { id: 'default-4', text: 'دروغ نگفتن به دیگران', isCustom: false },
  { id: 'default-5', text: 'مهربانی با خانواده', isCustom: false },
  { id: 'default-6', text: 'مهربانی با دیگران', isCustom: false },
  { id: 'default-7', text: 'صدقه و کمک به دیگران', isCustom: false },
  { id: 'default-8', text: 'خواندن دعا', isCustom: false },
  { id: 'default-9', text: 'ذکر گفتن', isCustom: false },
  { id: 'default-10', text: 'به یاد خدا بودن', isCustom: false },
];

export const FEELING_STICKERS = ['😊', '🙏', '❤️', '🌿', '😌', '😔', '💪', '✨', '😢', '🤲'];
