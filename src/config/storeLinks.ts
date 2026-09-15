// App store download links — used by the share dialogs and by the white box at
// the bottom of the ready-made story image.
//
// دور نهم — these two were empty, and that is why the story image had no bottom
// box at all: `drawBottomBox` correctly refuses to draw a QR code that points
// nowhere. The rule stays («any store whose link is left empty is hidden — no
// dead buttons»); what changes is that two of the links are now known.
//
// Both Iranian stores address an app purely by its package name, and this app's
// package name is fixed and cannot change after publication
// (`com.zekraram.app`, see android/app/build.gradle). So the addresses are
// already decided:
//
//     کافه‌بازار → https://cafebazaar.ir/app/com.zekraram.app
//     مایکت      → https://myket.ir/app/com.zekraram.app
//
// ⚠️ They start working the day the app is published on each store, and not
// before. Google Play is left empty on purpose — this app is not headed there.

export interface StoreLink {
  id: 'cafebazaar' | 'myket' | 'googleplay';
  label: string;
  url: string;
}

const ANDROID_PACKAGE_NAME = 'com.zekraram.app';

export const STORE_LINKS: StoreLink[] = [
  { id: 'cafebazaar', label: 'کافه‌بازار', url: `https://cafebazaar.ir/app/${ANDROID_PACKAGE_NAME}` },
  // دور دهم — عمداً خالی تا انتشار اول در کافه‌بازار انجام شود.
  //
  // نگرانی کاربر بجاست: بردن نام یک فروشگاه دیگر داخل برنامه‌ای که برای بررسی
  // به کافه‌بازار می‌رود، ممکن است حساسیت ایجاد کند. برداشتنش یک خط است و هیچ
  // هزینه‌ای ندارد؛ یک دور رد شدن هزینه دارد. ردیف سر جایش می‌ماند تا برای
  // انتشار در مایکت فقط همین آدرس برگردد:
  //     `https://myket.ir/app/${ANDROID_PACKAGE_NAME}`
  { id: 'myket', label: 'مایکت', url: '' },
  { id: 'googleplay', label: 'گوگل‌پلی', url: '' },
];

export function getAvailableStoreLinks(): StoreLink[] {
  return STORE_LINKS.filter((s) => s.url.trim().length > 0);
}
