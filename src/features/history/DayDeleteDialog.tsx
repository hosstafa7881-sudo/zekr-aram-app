import React from 'react';
import { AlertTriangle, X, ListChecks, NotebookPen, Trash2 } from 'lucide-react';
import {
  DELETE_DAY_CONFIRM_MESSAGE,
  DELETE_DAY_DHIKR_LABEL,
  DELETE_DAY_NOTEBOOK_LABEL,
  DELETE_DAY_BOTH_LABEL,
  DELETE_DAY_TITLE,
} from '../../lib/messages';

/** What the user chose to remove from a day. */
export type DayDeleteScope = 'dhikr' | 'notebook' | 'both';

interface DayDeleteDialogProps {
  isOpen: boolean;
  /** Whether the day has dhikr counts — a day without them is never offered «حذف ذکرها». */
  hasDhikr: boolean;
  /** Whether the day has anything written in the notebook. */
  hasNotebook: boolean;
  onCancel: () => void;
  onConfirm: (scope: DayDeleteScope) => void;
}

/**
 * دور نهم / مورد ۶ — deleting one day, with a choice.
 *
 * Before, the delete icon removed the day's dhikr counts and nothing else, and
 * the notebook the user had filled in that day stayed behind with no way to
 * remove it. Now the choice is theirs: ذکرها، دفترچه، or both.
 *
 * Only the choices that have something to delete are offered. A day with dhikr
 * and no notebook shows one button, not a menu of three where two do nothing —
 * the same rule the share popup already follows (مورد ۱۵), so the app behaves
 * consistently with itself.
 *
 * The warning sentence is the confirmation: choosing is confirming, so there is
 * no second «مطمئنی؟» step to tap through.
 */
export const DayDeleteDialog: React.FC<DayDeleteDialogProps> = ({
  isOpen,
  hasDhikr,
  hasNotebook,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const choices: { scope: DayDeleteScope; label: string; icon: React.ReactNode }[] = [];
  if (hasDhikr) {
    choices.push({
      scope: 'dhikr',
      label: DELETE_DAY_DHIKR_LABEL,
      icon: <ListChecks className="w-3.5 h-3.5 shrink-0" />,
    });
  }
  if (hasNotebook) {
    choices.push({
      scope: 'notebook',
      label: DELETE_DAY_NOTEBOOK_LABEL,
      icon: <NotebookPen className="w-3.5 h-3.5 shrink-0" />,
    });
  }
  if (hasDhikr && hasNotebook) {
    choices.push({
      scope: 'both',
      label: DELETE_DAY_BOTH_LABEL,
      icon: <Trash2 className="w-3.5 h-3.5 shrink-0" />,
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div
        data-testid="day-delete-dialog"
        className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[var(--danger)]" />
            <h3 className="text-sm font-bold text-[var(--text)]">{DELETE_DAY_TITLE}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="بستن"
            className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[var(--muted)] leading-relaxed mt-3.5">
          {DELETE_DAY_CONFIRM_MESSAGE}
        </p>

        <div className="flex flex-col gap-2 pt-4">
          {choices.map((c) => (
            <button
              key={c.scope}
              type="button"
              data-testid={`day-delete-${c.scope}`}
              onClick={() => onConfirm(c.scope)}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--danger)] text-white text-xs font-bold shadow-md hover:opacity-90"
            >
              {c.icon}
              <span>{c.label}</span>
            </button>
          ))}
          <button
            type="button"
            data-testid="day-delete-cancel"
            onClick={onCancel}
            className="py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
};
