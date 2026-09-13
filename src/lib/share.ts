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
  return getAvailableStoreLinks()
    .map((s) => `📥 ${s.label}: ${s.url}`)
    .join('\n');
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
  const block = buildStoreLinksBlock();
  return block ? `${text}\n${block}` : text;
}

export interface ShareResultHandlers {
  /** Called when the text had to be copied to the clipboard instead of shared. */
  onCopiedToClipboard?: () => void;
  /** Called when an image had to be downloaded instead of shared. */
  onDownloadedInstead?: () => void;
  /**
   * Called after an image was handed to the OS share sheet, telling the caller
   * whether the caption also made it into the clipboard as a safety net.
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

/**
 * Shares plain text through the Web Share API, appending the store links.
 * Clipboard copy is only a fallback for browsers without navigator.share.
 */
export async function shareAppText(
  text: string,
  handlers: ShareResultHandlers = {}
): Promise<void> {
  const fullText = appendStoreLinks(text);
  try {
    if (navigator.share) {
      await navigator.share({ text: fullText, title: SHARE_TITLE });
      return;
    }
  } catch {
    // User cancelled or the share sheet failed — fall through to clipboard.
    return;
  }
  if (await copyTextToClipboard(fullText)) {
    handlers.onCopiedToClipboard?.();
  } else {
    handlers.onFailed?.();
  }
}

/** Triggers a plain browser download of a generated image file. */
export function downloadImageFile(blob: Blob, fileName: string) {
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

/**
 * دور هفتم / مورد ۱ — the caption MUST always travel with the image, because
 * the writing burnt into the picture isn't clickable and the store links only
 * work as real text.
 *
 * Two things could silently swallow it before:
 *
 *  1. `navigator.canShare` was asked about `{ files }` only, while `share()`
 *     was then called with `{ files, text, title }` — an unvalidated payload.
 *     A browser that accepts files but not files+text rejects that call, and
 *     the old `catch` treated the rejection as "user cancelled" and gave up,
 *     so neither the image nor the caption went anywhere.
 *  2. On any browser without file sharing the image was simply downloaded and
 *     the caption was dropped on the floor with nothing left to paste.
 *
 * So now: validate the exact payload, step down one field at a time
 * (files+text+title → files+text → files), and always keep the caption in the
 * clipboard so it can be pasted next to the picture whichever app receives it
 * — several Android share targets accept an image but ignore the text that
 * comes with it, and that is invisible to the page.
 */
function canSharePayload(data: ShareData): boolean {
  // No canShare at all (older browsers): trust share() with files only when it
  // exists, and let the try/catch below sort out the rest.
  if (typeof navigator.canShare !== 'function') return true;
  try {
    return navigator.canShare(data);
  } catch {
    return false;
  }
}

/**
 * Shares a generated image (with the text as its caption) through the
 * standard Web Share API `files` flow, after checking navigator.canShare.
 * Falls back to downloading the file when file sharing isn't available.
 */
export async function shareAppImage(
  blob: Blob,
  fileName: string,
  caption: string,
  handlers: ShareResultHandlers = {}
): Promise<void> {
  const fullText = appendStoreLinks(caption);

  // Started (not awaited) before share() so the click's user activation is
  // still alive for BOTH calls; the result is read once sharing is over.
  const clipboardPromise = copyTextToClipboard(fullText);

  let file: File | null = null;
  try {
    file = new File([blob], fileName, { type: blob.type || 'image/png' });
  } catch {
    file = null;
  }

  if (file && typeof navigator.share === 'function') {
    // Richest payload first; each step down only drops a field, never the
    // caption's own delivery (the clipboard copy above backs that up).
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
        // AbortError = the user closed the share sheet on purpose. Anything
        // else means this payload shape was refused, so try a simpler one.
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }
  }

  try {
    downloadImageFile(blob, fileName);
  } catch {
    handlers.onFailed?.();
    return;
  }
  await clipboardPromise;
  handlers.onDownloadedInstead?.();
}
