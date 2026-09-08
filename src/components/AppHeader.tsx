import React from 'react';
import { getShamsiDateInfo } from '../utils/persian';
import { ShieldCheck, MoonStar } from 'lucide-react';

export const AppHeader: React.FC = () => {
  const shamsi = getShamsiDateInfo();

  return (
    <header className="w-full bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border)] px-4 py-2.5 sticky top-0 z-30">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        {/* Identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] flex items-center justify-center text-[var(--bg)] shadow-md">
            <MoonStar className="w-5 h-5 fill-[var(--bg)]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black text-[var(--text)] tracking-tight">
                ذکرآرام
              </h1>
              <span className="text-[10px] font-bold bg-[var(--accent)]/15 text-[var(--accent)] px-1.5 py-0.5 rounded-md border border-[var(--accent)]/30">
                بدون تبلیغ
              </span>
            </div>
            <div className="text-[11px] text-[var(--muted)] font-medium">
              {shamsi.formattedFull}
            </div>
          </div>
        </div>

        {/* Offline Guarantee Pill */}
        <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] text-[11px] px-2.5 py-1 rounded-xl">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--success)]" />
          <span>ذخیره خودکار</span>
        </div>
      </div>
    </header>
  );
};
