// مورد ۴ — the ONE shared share module every share button in the app goes
// through. It owns two responsibilities so no caller ever re-implements them:
//
//  1. Appending the store download links (read from config/storeLinks.ts) to
//     the end of the shared text, skipping any store whose link is still
//     empty — an unpublished store must appear NOWHERE, neither in text nor
//     on a generated image.
//  2. Actually handing the text (and optionally an image file) to the
//     standard Web Share API, with clipboard copy / file download only as a
//     fallback.
//
// Call sites: HomeView (اشتراک‌گذاری برنامه) · MedalEarnedModal (مورد ۸) ·
// CounterShareModal (مورد ۶, text + generated image) · DayShareModal
// (تقویم، جزئیات بیشتر، ۳۰ روز اخیر) · CelebrationModal (رکورد شکسته‌شده) ·
// ReferralDiscountModal (تصویر آماده‌ی استوری، مورد ۱۹).

import { getAvailableStoreLinks } from '../config/storeLinks';
import { blobToBase64, isNativePlatform } from './native';
import { downloadInBrowser } from './saveFile';

/** True when at least one store link has been filled in. */
export function hasStoreLinks(): boolean {
  return getAvailableStoreLinks().length > 0;
}

/**
 * The download-links block appended to the end of every shared text:
 *
 *   📥 کافه‌بازار: [لینک]
 *   📥 مایکت: [لینک]
 *   📥 گوگل‌پلی: [لینک]
 *
 * Returns '' while no store link is configured (nothing is shown at all).
 */
export function buildStoreLinksBlock(): string {
  // دور دهم — هر فروشگاه دو خط: نامش، و آدرسش روی خط خودش.
  //
  // «📥 کافه‌بازار: https://…» روی یک خط، در تلگرام و اینستاگرام وسط آدرس
  // می‌شکند و به‌هم‌ریخته دیده می‌شود. آدرس روی خط خودش هم مرتب‌تر است هم
  // راحت‌تر لمس می‌شود. بلوک هر فروشگاه با یک خط خالی از بعدی جدا می‌شود.
  return getAvailableStoreLinks()
    .map((s) => `📥 ${s.label}:\n${s.url}`)
    .join('\n\n');
}

/** "دانلود از کافه‌بازار و مایکت" — store NAMES only, for generated images. Returns '' when no store has a link. */
export function buildStoreNamesSentence(): string {
  const names = getAvailableStoreLinks().map((s) => s.label);
  if (names.length === 0) return '';
  if (names.length === 1) return `دانلود از ${names[0]}`;
  return `دانلود از ${names.slice(0, -1).join('، ')} و ${names[names.length - 1]}`;
}

/**
 * The closing invitation line. Ends with a colon when store links follow it,
 * and with a full stop when there are none (مورد ۶).
 */
export function buildInviteLine(): string {
  const base = 'من با برنامه‌ی «ذکرآرام» ذکر می‌گم 🌿 تو هم می‌تونی امتحانش کنی';
  return hasStoreLinks() ? `${base}:` : `${base}.`;
}

/** Appends the store-links block to a text, when there is one. */
export function appendStoreLinks(text: string): string {
  // دور دهم — یک خط خالی، نه یک خط. متن و لینک‌ها دو چیزند و چسبیدنشان به هم
  // کل کپشن را بی‌نظم نشان می‌داد. همه‌ی متن‌های اشتراک‌گذاری از همین‌جا رد
  // می‌شوند، پس این یک تغییر همه‌جا را مرتب می‌کند.
  const block = buildStoreLinksBlock();
  return block ? `${text}\n\n${block}` : text;
}

export interface ShareResultHandlers {
  /** Called when the text had to be copied to the clipboard instead of shared. */
  onCopiedToClipboard?: () => void;
  /** Called when an image had to be downloaded instead of shared. */
  onDownloadedInstead?: () => void;
  /**
   * دور دهم — called the moment the caption is safely on the clipboard, BEFORE
   * the OS share sheet opens.
   *
   * This is the whole point: on Android `Share.share()` does not resolve until
   * the user comes back from the app they shared into, so anything announced
   * after it is announced to an empty room. The user put a story on Instagram,
   * came back minutes later, and only then read «متن هم کپی شد» — exactly when
   * it was no longer any use. The clipboard write already happens first, so
   * there is nothing to wait for.
   */
  onCaptionCopied?: () => void;
  /**
   * Called after an image was handed to the OS share sheet, telling the caller
   * whether the caption also had to ride the clipboard as a safety net.
   * Browser path only — on native, `onCaptionCopied` fires up front instead.
   */
  onImageShared?: (captionCopied: boolean) => void;
  /** Called when neither sharing nor the fallback worked. */
  onFailed?: () => void;
}

const SHARE_TITLE = 'ذکرآرام';

/**
 * Copies text to the clipboard, falling back to the old `execCommand` path for
 * the Android WebViews that still don't expose `navigator.clipboard`.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea trick below.
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** True when the user deliberately closed the OS share sheet. Never an error. */
function isUserCancellation(err: unknown): boolean {
  if ((err as DOMException)?.name === 'AbortError') return true;
  const message = String((err as Error)?.message || '').toLowerCase();
  // The Capacitor Share plugin reports a dismissed sheet as a rejection with
  // these wordings rather than as an AbortError.
  return message.includes('canceled') || message.includes('cancelled') || message.includes('abort');
}

/**
 * دور هشتم / مورد ۱ — shares plain text.
 *
 * Inside the Android app this now opens the real OS share sheet through
 * @capacitor/share. Before this round it went straight to `navigator.share`,
 * which the Android WebView does not implement, so every share button in the
 * app fell through to the clipboard and told the user «در حافظه موقت ذخیره
 * شد» — the bug this round exists to fix.
 *
 * The clipboard is a fallback ONLY, and only ever reported as what it is.
 */
export async function shareAppText(
  text: string,
  handlers: ShareResultHandlers = {}
): Promise<void> {
  const fullText = appendStoreLinks(text);

  if (isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: SHARE_TITLE, text: fullText, dialogTitle: SHARE_TITLE });
      return;
    } catch (err) {
      if (isUserCancellation(err)) return;
      // A real failure — fall through to the clipboard and SAY so.
    }
  } else {
    try {
      if (navigator.share) {
        await navigator.share({ text: fullText, title: SHARE_TITLE });
        return;
      }
    } catch (err) {
      if (isUserCancellation(err)) return;
    }
  }

  if (await copyTextToClipboard(fullText)) {
    handlers.onCopiedToClipboard?.();
  } else {
    handlers.onFailed?.();
  }
}

/**
 * Re-exported so the one browser-download implementation lives in saveFile.ts
 * alongside the native one it is the fallback for.
 */
export { downloadInBrowser as downloadImageFile } from './saveFile';

function canSharePayload(data: ShareData): boolean {
  if (typeof navigator.canShare !== 'function') return true;
  try {
    return navigator.canShare(data);
  } catch {
    return false;
  }
}

/**
 * دور هشتم / مورد ۱ — shares a generated image WITH its caption.
 *
 * Native: the PNG is written into the app's cache directory and its real file
 * URI handed to the OS share sheet, so an actual picture travels — not just
 * text. Web: the Web Share level-2 `files` flow, stepping down one field at a
 * time, exactly as دور هفتم left it.
 *
 * The caption is also kept in the clipboard in both cases, because a number of
 * Android share targets accept a picture and drop the text that comes with it,
 * and the page cannot tell when that happens (دور هفتم / مورد ۱).
 */
export async function shareAppImage(
  blob: Blob,
  fileName: string,
  caption: string,
  handlers: ShareResultHandlers = {}
): Promise<void> {
  const fullText = appendStoreLinks(caption);

  // Started (not awaited) before the share so the click's user activation is
  // still alive for both calls; the result is read once sharing is over.
  const clipboardPromise = copyTextToClipboard(fullText);

  if (isNativePlatform()) {
    try {
      const [{ Share }, { Filesystem, Directory }] = await Promise.all([
        import('@capacitor/share'),
        import('@capacitor/filesystem'),
      ]);
      const data = await blobToBase64(blob);
      // Cache, not Documents: this copy exists only to hand the OS a file URI.
      // «ذخیره در گالری» is a separate, deliberate action (مورد ۴).
      const written = await Filesystem.writeFile({
        path: fileName,
        data,
        directory: Directory.Cache,
      });
      // دور دهم — tell the user the caption is on the clipboard NOW, while they
      // are still looking at the app. Awaiting the clipboard here is safe on
      // native: the share sheet is opened by the OS, not by a click's user
      // activation, so nothing is lost by resolving one promise first.
      if (await clipboardPromise) handlers.onCaptionCopied?.();
      await Share.share({
        title: SHARE_TITLE,
        text: fullText,
        url: written.uri,
        dialogTitle: SHARE_TITLE,
      });
      return;
    } catch (err) {
      if (isUserCancellation(err)) return;
      handlers.onFailed?.();
      return;
    }
  }

  let file: File | null = null;
  try {
    file = new File([blob], fileName, { type: blob.type || 'image/png' });
  } catch {
    file = null;
  }

  if (file && typeof navigator.share === 'function') {
    const attempts: ShareData[] = [
      { files: [file], text: fullText, title: SHARE_TITLE },
      { files: [file], text: fullText },
      { files: [file] },
    ];
    for (const payload of attempts) {
      if (!canSharePayload(payload)) continue;
      try {
        await navigator.share(payload);
        handlers.onImageShared?.(await clipboardPromise);
        return;
      } catch (err) {
        if (isUserCancellation(err)) return;
      }
    }
  }

  try {
    downloadInBrowser(blob, fileName);
  } catch {
    handlers.onFailed?.();
    return;
  }
  await clipboardPromise;
  handlers.onDownloadedInstead?.();
}

// ──────────────────────────────────────────────────────────────────────────
// دور نهم — a second way out for the backup file.
//
// Saving into the phone's Downloads folder is the primary route, but it runs
// through the OEM's media provider, and some of them refuse. The backup is the
// only thing protecting years of the user's history, so it may not depend on a
// single door: this hands the file straight to the share sheet, where the user
// can put it in Telegram, Drive, email, or their own files app.
//
// Like everything else since the golden rule, it returns what actually
// happened. 'cancelled' is not a failure and must not be reported as one.
// ──────────────────────────────────────────────────────────────────────────

export type ShareFileResult = 'shared' | 'cancelled' | 'unavailable' | 'failed';

export async function shareFile(
  blob: Blob,
  fileName: string,
  mimeType: string,
  caption: string
): Promise<ShareFileResult> {
  if (isNativePlatform()) {
    try {
      const [{ Share }, { Filesystem, Directory }] = await Promise.all([
        import('@capacitor/share'),
        import('@capacitor/filesystem'),
      ]);
      const data = await blobToBase64(blob);
      const written = await Filesystem.writeFile({
        path: fileName,
        data,
        directory: Directory.Cache,
      });
      await Share.share({
        title: SHARE_TITLE,
        text: caption,
        url: written.uri,
        dialogTitle: SHARE_TITLE,
      });
      return 'shared';
    } catch (err) {
      if (isUserCancellation(err)) return 'cancelled';
      return 'failed';
    }
  }

  let file: File | null = null;
  try {
    file = new File([blob], fileName, { type: mimeType });
  } catch {
    file = null;
  }
  if (!file || typeof navigator.share !== 'function') return 'unavailable';

  const payload: ShareData = { files: [file], title: SHARE_TITLE, text: caption };
  if (!canSharePayload(payload)) return 'unavailable';
  try {
    await navigator.share(payload);
    return 'shared';
  } catch (err) {
    if (isUserCancellation(err)) return 'cancelled';
    return 'failed';
  }
}
