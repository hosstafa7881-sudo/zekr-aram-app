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
      <div className="fixed top-3 inset-x-0 z-[70] flex flex-col items-center gap-2 px-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-full max-w-sm flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold shadow-2xl border animate-fade-in ${
              t.kind === 'celebration'
                ? 'bg-[var(--accent)] text-[var(--bg)] border-[var(--accent-dark)]'
                : t.kind === 'success'
                ? 'bg-[var(--success)]/20 text-[var(--text)] border-[var(--success)]'
                : 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)]'
            }`}
          >
            {ICONS[t.kind]}
            <span className="leading-relaxed">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
