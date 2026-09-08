export interface PaletteOption {
  id: string;
  label: string;
  swatch: string; // representative color for the picker UI
}

// Soft background tints only — the brand green (buttons/icons/highlights)
// stays fixed everywhere and does not change with the palette.
export const PALETTE_OPTIONS: PaletteOption[] = [
  { id: 'green', label: 'سبز ملایم (پیش‌فرض)', swatch: 'hsl(100 32% 87%)' },
  { id: 'cream', label: 'کرمی روشن', swatch: 'hsl(46 55% 87%)' },
  { id: 'gray', label: 'طوسی ملایم', swatch: 'hsl(250 6% 89%)' },
  { id: 'lilac', label: 'یاسی', swatch: 'hsl(263 40% 90%)' },
  { id: 'blue', label: 'آبی کم‌رنگ', swatch: 'hsl(200 48% 90%)' },
  { id: 'pink', label: 'صورتی', swatch: 'hsl(344 50% 90%)' },
];

export function applyTheme(themeMode: 'day' | 'night', colorPalette: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', themeMode);
  root.setAttribute('data-palette', colorPalette);
}
