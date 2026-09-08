export interface PaletteOption {
  id: string;
  label: string;
  swatch: string; // representative color for the picker UI
}

export const PALETTE_OPTIONS: PaletteOption[] = [
  { id: 'emerald', label: 'زمردی (پیش‌فرض)', swatch: 'hsl(156 65% 45%)' },
  { id: 'sapphire', label: 'یاقوت آبی', swatch: 'hsl(205 65% 48%)' },
  { id: 'plum', label: 'بنفش آلویی', swatch: 'hsl(280 55% 50%)' },
  { id: 'amber', label: 'کهربایی گرم', swatch: 'hsl(26 65% 48%)' },
];

export function applyTheme(themeMode: 'day' | 'night', colorPalette: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', themeMode);
  root.setAttribute('data-palette', colorPalette);
}
