import { DhikrItem } from './seedData';

export const MAX_CUSTOM_DHIKRS = 7;

export function countCustomDhikrs(dhikrs: DhikrItem[]): number {
  return dhikrs.filter((d) => d.category === 'custom').length;
}

export function canAddCustomDhikr(dhikrs: DhikrItem[]): boolean {
  return countCustomDhikrs(dhikrs) < MAX_CUSTOM_DHIKRS;
}

export const CUSTOM_DHIKR_LIMIT_MESSAGE =
  'شما به سقف ۷ ذکر دلخواه رسیدی. برای افزودن ذکر جدید، باید یکی از ذکرهای قبلی رو حذف کنی. نگران نباش، اطلاعات ثبت‌شده‌ی این ذکر حذف نخواهد شد.';

export const CUSTOM_DHIKR_DELETE_CONFIRM_MESSAGE =
  'آیا از حذف این ذکر مطمئنی؟ اطلاعات ذخیره‌شده‌ی روزهای قبل از این ذکر همچنان در تاریخچه باقی می‌مونه.';
