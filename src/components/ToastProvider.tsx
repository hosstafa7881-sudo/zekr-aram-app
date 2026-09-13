import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, Info, PartyPopper } from 'lucide-react';

export type ToastKind = 'info' | 'success' | 'celebration';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
  durationMs: number;
}

interface ToastContextValue {
  showToast: (message: string, options?: { kind?: ToastKind; durationMs?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS: Record<ToastKind, React.ReactNode> = {
  info: <Info className="w-4 h-4 shrink-0" />,
  success: <CheckCircle2 className="w-4 h-4 shrink-0" />,
  celebration: <PartyPopper className="w-4 h-4 shrink-0" />,
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback(
    (message: string, options?: { kind?: ToastKind; durationMs?: number }) => {
      const id = ++idRef.current;
      const kind = options?.kind || 'info';
      const durationMs = options?.durationMs ?? 3500;
      setToasts((prev) => [...prev, { id, message, kind, durationMs }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/*
        دور هشتم / مورد ۹ — toasts live at the BOTTOM now.

        They used to sit at `top-3`, which is exactly where every full-screen
        view puts its own `sticky top-0` header and where the trial banner sits.
        A toast landed straight on top of them and both texts became
        unreadable. The bottom strip is the one area no header or banner
        claims; the padding clears the bottom nav bar (and the phone's gesture
        bar via env(safe-area-inset-bottom)) so it never covers that either.
      */}
      <div className="fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] pointer-events-none">
        {toasts.map((t) => (
          /*
            The outer layer is deliberately OPAQUE. The success tint is only
            20% alpha, so whatever sat behind a toast used to show straight
            through the text — the second half of the unreadable-text bug. The
            tint now composites over this solid surface instead of over the
            page, which keeps the designed colour and makes the words legible.
          */
          <div
            key={t.id}
            // A stable hook for the QA scripts. They used to locate toasts by
            // `.fixed.top-3`, which silently found nothing the moment مورد ۹
            // moved the stack to the bottom — a test must not be pinned to a
            // layout class.
            data-testid="toast"
            className="pointer-events-auto w-full max-w-sm rounded-2xl shadow-2xl bg-[var(--surface)]"
          >
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold border animate-fade-in ${
                t.kind === 'celebration'
                  ? 'bg-[var(--accent)] text-white border-[var(--accent-dark)]'
                  : t.kind === 'success'
                  ? 'bg-[var(--success)]/20 text-[var(--text)] border-[var(--success)]'
                  : 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)]'
              }`}
            >
              {ICONS[t.kind]}
              <span className="leading-relaxed">{t.message}</span>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
