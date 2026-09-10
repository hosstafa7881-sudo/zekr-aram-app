import React from 'react';

// The "ذکرآرام" wordmark was intentionally removed from this header (and every
// other in-app page title) per user decision — it no longer appears anywhere
// inside the app UI. It's still the app's name in manifest.json and the
// document <title>, just not repeated as a visual header inside the app.
export const AppHeader: React.FC = () => {
  return (
    <header className="w-full bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border)] px-4 py-2.5 sticky top-0 z-30 h-[45px]">
      <div className="max-w-2xl mx-auto flex items-center h-full" />
    </header>
  );
};
