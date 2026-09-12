// Single source of truth for the app's user-visible version number.
//
// Bumped by one on every review round (round 5 → ۵). Two things read it:
//  - the small muted line at the bottom of the Settings page (مورد ۲الف)
//  - the auto-update check in useAppUpdate.ts, which compares this built-in
//    number against the freshly-fetched `version.json` on the server so a
//    user on GitHub Pages never has to clear their browser cache (مورد ۲ب).
//
// IMPORTANT: keep this in sync with `public/version.json` — the file is the
// server-side copy of the very same number.
export const APP_VERSION = 5;

/** "نسخه‌ی ۵" — already localized with a Persian digit. */
export const APP_VERSION_LABEL = 'نسخه‌ی ۵';
