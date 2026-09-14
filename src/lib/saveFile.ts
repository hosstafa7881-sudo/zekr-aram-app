// دور هشتم — saving a file onto the phone, truthfully.
//
// The bug this replaces: the app called `<a download>` on a blob URL and then
// announced success unconditionally. Inside an Android WebView that anchor does
// nothing whatsoever — no file is ever written — so the message was simply
// false. It affected the generated pictures AND, far more seriously, the backup
// file: «فایل پشتیبان با موفقیت دانلود شد» while nothing had been saved, which
// is the one thing standing between the user and losing years of history.
//
// Now the outcome is a value, not an assumption. Callers MUST branch on it and
// may only claim success for 'saved'. (قانون طلایی SKILL.md: هیچ پیام موفقیتی
// بدون موفقیت واقعی.)

import { registerPlugin } from '@capacitor/core';
import { blobToBase64, isNativePlatform } from './native';

export interface SaveResult {
  /**
   * 'saved'  — really written; safe to tell the user so.
   * 'denied' — the user refused the storage permission (Android 9 and below).
   * 'failed' — everything else. Never report this as success.
   */
  status: 'saved' | 'denied' | 'failed';
  /** Where it landed, when known. For the report, never shown raw. */
  uri?: string;
  /** The underlying reason, for the error message and for debugging. */
  reason?: string;
}

interface FileSaverPluginShape {
  saveImageToGallery(options: { data: string; fileName: string; mimeType: string }): Promise<{ uri: string }>;
  saveFileToDownloads(options: { data: string; fileName: string; mimeType: string }): Promise<{ uri: string }>;
}

/** Implemented in android/app/src/main/java/com/zekraram/app/FileSaverPlugin.java */
const FileSaver = registerPlugin<FileSaverPluginShape>('FileSaver');

/** Triggers a plain browser download. Works in a BROWSER; inert in a WebView. */
export function downloadInBrowser(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give the browser a tick to start the download before revoking.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function save(
  blob: Blob,
  fileName: string,
  mimeType: string,
  where: 'gallery' | 'downloads'
): Promise<SaveResult> {
  if (isNativePlatform()) {
    try {
      const data = await blobToBase64(blob);
      if (!data) return { status: 'failed', reason: 'the file came out empty' };
      const options = { data, fileName, mimeType };
      const { uri } =
        where === 'gallery'
          ? await FileSaver.saveImageToGallery(options)
          : await FileSaver.saveFileToDownloads(options);
      return { status: 'saved', uri };
    } catch (err) {
      const reason = String((err as Error)?.message || err || 'unknown');
      if (reason.includes('PERMISSION_DENIED')) return { status: 'denied', reason };
      return { status: 'failed', reason };
    }
  }

  try {
    downloadInBrowser(blob, fileName);
    return { status: 'saved' };
  } catch (err) {
    return { status: 'failed', reason: String((err as Error)?.message || err) };
  }
}

/** A generated picture → the phone's gallery. */
export function saveImageToDevice(blob: Blob, fileName: string): Promise<SaveResult> {
  return save(blob, fileName, 'image/png', 'gallery');
}

/** Any other file — the backup above all → the Downloads folder. */
export function saveDocumentToDevice(
  blob: Blob,
  fileName: string,
  mimeType = 'application/json'
): Promise<SaveResult> {
  return save(blob, fileName, mimeType, 'downloads');
}

/** A file name that never collides, so saving twice keeps both files. */
export function timestampedFileName(prefix: string, extension = 'png'): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}.${extension}`;
}
