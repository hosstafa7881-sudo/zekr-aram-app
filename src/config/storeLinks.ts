// App store download links, shown under medal/record share dialogs.
// The app has not been published yet, so these are intentionally empty.
// Fill them in once the app is live on each store — any store whose link is
// left empty is simply hidden from the share UI (no broken/dead buttons).

export interface StoreLink {
  id: 'cafebazaar' | 'myket' | 'googleplay';
  label: string;
  url: string;
}

export const STORE_LINKS: StoreLink[] = [
  { id: 'cafebazaar', label: 'کافه‌بازار', url: '' },
  { id: 'myket', label: 'مایکت', url: '' },
  { id: 'googleplay', label: 'گوگل‌پلی', url: '' },
];

export function getAvailableStoreLinks(): StoreLink[] {
  return STORE_LINKS.filter((s) => s.url.trim().length > 0);
}
