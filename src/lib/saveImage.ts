// دور هشتم / مورد ۴ — saving a generated picture onto the phone.
//
// The bug this replaces: the app called `<a download>` on a blob URL and then
// showed «عکس تو گوشی دانلود شد» unconditionally. Inside an Android WebView
// that anchor does nothing whatsoever — no file was ever written — so the
// message was simply false.
//
// Now the outcome is a value, not an assumption. Callers MUST branch on it and
// may only claim success for 'saved'. (قانون جدید SKILL.md: هیچ پیام موفقیتی
// بدون موفقیت واقعی.)

import { registerPlugin } from '@capacitor/core';
import { blobToBase64, isNativePlatform } from './native';
import { downloadImageFile } from './share';

export interface SaveImageResult {
  /**
   * 'saved'    — really written; safe to tell the user so.
   * 'denied'   — the user refused the storage permission (Android 9 and below).
   * 'failed'   — everything else. Never report this as success.
   */
  status: 'saved' | 'denied' | 'failed';
  /** Where it landed, when we know. Only for the report, never shown raw. */
  uri?: string;
  /** The underlying reason, for the error message and for debugging. */
  reason?: string;
}

interface SaveImagePluginShape {
  saveToGallery(options: { data: string; fileName: string }): Promise<{ uri: string }>;
}

/** Implemented in android/app/src/main/java/com/zekraram/app/SaveImagePlugin.java */
const SaveImage = registerPlugin<SaveImagePluginShape>('SaveImage');

/**
 * Writes the picture into the phone's gallery (native) or triggers a browser
 * download (web). Returns what actually happened.
 */
export async function saveImageToDevice(blob: Blob, fileName: string): Promise<SaveImageResult> {
  if (isNativePlatform()) {
    try {
      const data = await blobToBase64(blob);
      if (!data) return { status: 'failed', reason: 'the image came out empty' };
      const { uri } = await SaveImage.saveToGallery({ data, fileName });
      return { status: 'saved', uri };
    } catch (err) {
      const reason = String((err as Error)?.message || err || 'unknown');
      if (reason.includes('PERMISSION_DENIED')) return { status: 'denied', reason };
      return { status: 'failed', reason };
    }
  }

  // Web: a real download. `<a download>` works in a desktop/mobile BROWSER —
  // it is only the Android WebView where it silently does nothing.
  try {
    downloadImageFile(blob, fileName);
    return { status: 'saved' };
  } catch (err) {
    return { status: 'failed', reason: String((err as Error)?.message || err) };
  }
}

/** A file name that never collides, so saving twice keeps both pictures. */
export function timestampedFileName(prefix: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}.png`;
}
