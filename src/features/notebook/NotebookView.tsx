import React, { useState } from 'react';
import { NotebookItemDef, NotebookDayEntry, FEELING_STICKERS } from './notebookTypes';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Trash2, Check, Smile } from 'lucide-react';

interface NotebookViewProps {
  items: NotebookItemDef[];
  todayEntry: NotebookDayEntry;
  onAddItem: (text: string) => void;
  onDeleteItem: (id: string) => void;
  onToggleItem: (id: string) => void;
  onUpdateReason: (id: string, why: string, solution: string) => void;
  onUpdateFeelingText: (text: string) => void;
  onToggleSticker: (emoji: string) => void;
}

export const NotebookView: React.FC<NotebookViewProps> = ({
  items,
  todayEntry,
  onAddItem,
  onDeleteItem,
  onToggleItem,
  onUpdateReason,
  onUpdateFeelingText,
  onToggleSticker,
}) => {
  const [newItemText, setNewItemText] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    onAddItem(trimmed);
    setNewItemText('');
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto px-3 pt-2 pb-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--text)]">دفترچهٔ کارهای خوب امروز</h2>
        <p className="text-xs text-[var(--muted)]">
          هر روز کارهای خوبتون رو ثبت کنید و اگه کاری انجام نشد، دلیلش رو یادداشت کنید تا بهتر بشید.
        </p>
      </div>

      {/* Checklist */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-2.5">
        {items.map((item) => {
          const isChecked = todayEntry.checkedItemIds.includes(item.id);
          const reason = todayEntry.reasons[item.id];

          return (
            <div key={item.id} className="border-b border-[var(--border)] last:border-b-0 pb-2.5 last:pb-0">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onToggleItem(item.id)}
                  aria-label={isChecked ? 'انجام شد' : 'انجام نشد'}
                  className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-lg border-2 transition-all ${
                    isChecked
                      ? 'bg-[var(--success)] border-[var(--success)] text-white'
                      : 'border-[var(--border)] text-transparent'
                  }`}
                >
                  <Check className="w-4 h-4" />
                </button>
                <span className="flex-1 text-sm text-[var(--text)]">{item.text}</span>
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(item.id)}
                  title="حذف این مورد"
                  className="shrink-0 p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {!isChecked && (
                <div className="mt-2 mr-9 space-y-1.5">
                  <input
                    type="text"
                    placeholder="چرا این کار انجام نشد؟"
                    value={reason?.why || ''}
                    onChange={(e) => onUpdateReason(item.id, e.target.value, reason?.solution || '')}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-3 py-1.5 text-xs text-[var(--text)] outline-none"
                  />
                  <input
                    type="text"
                    placeholder="راه‌حل پیشنهادی برای دفعهٔ بعد"
                    value={reason?.solution || ''}
                    onChange={(e) => onUpdateReason(item.id, reason?.why || '', e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-3 py-1.5 text-xs text-[var(--text)] outline-none"
                  />
                </div>
              )}
            </div>
          );
        })}

        <form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            placeholder="افزودن مورد دلخواه..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            className="flex-1 bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2 text-xs text-[var(--text)] outline-none"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-1 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-[var(--bg)] text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            افزودن
          </button>
        </form>
      </div>

      {/* Daily feeling */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
          <Smile className="w-4 h-4 text-[var(--accent)]" />
          امروز چه احساسی داشتید؟
        </h3>
        <textarea
          rows={3}
          placeholder="چند خط دربارهٔ احساس امروزتان بنویسید..."
          value={todayEntry.feelingText}
          onChange={(e) => onUpdateFeelingText(e.target.value)}
          className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text)] outline-none leading-relaxed"
        />
        <div className="flex items-center flex-wrap gap-1.5">
          {FEELING_STICKERS.map((emoji) => {
            const selected = todayEntry.stickers.includes(emoji);
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onToggleSticker(emoji)}
                className={`text-lg w-9 h-9 rounded-xl border transition-all flex items-center justify-center ${
                  selected
                    ? 'bg-[var(--accent)]/20 border-[var(--accent)]'
                    : 'bg-[var(--bg)] border-[var(--border)] grayscale opacity-60 hover:opacity-100 hover:grayscale-0'
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        isOpen={pendingDeleteId !== null}
        title="حذف مورد از دفترچه"
        message="آیا از حذف این مورد از چک‌لیست مطمئنی؟"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId) onDeleteItem(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
};
