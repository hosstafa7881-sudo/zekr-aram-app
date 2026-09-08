import React from 'react';

export const AppHeader: React.FC = () => {
  return (
    <header className="w-full bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border)] px-4 py-2.5 sticky top-0 z-30">
      <div className="max-w-2xl mx-auto flex items-center">
        <h1 className="text-base font-black text-[var(--text)] tracking-tight">ذکرآرام</h1>
      </div>
    </header>
  );
};
