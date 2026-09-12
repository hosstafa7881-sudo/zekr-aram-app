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
  /** Called when neither sharing nor the fallback worked. */
  onFailed?: () => void;
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
      await navigator.share({ text: fullText, title: 'ذکرآرام' });
      return;
    }
  } catch {
    // User cancelled or the share sheet failed — fall through to clipboard.
    return;
  }
  try {
    await navigator.clipboard.writeText(fullText);
    handlers.onCopiedToClipboard?.();
  } catch {
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
  try {
    const file = new File([blob], fileName, { type: blob.type || 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: fullText, title: 'ذکرآرام' });
      return;
    }
  } catch {
    // Cancelled or rejected by the OS share sheet — don't then silently
    // dump a file into the user's downloads folder.
    return;
  }
  try {
    downloadImageFile(blob, fileName);
    handlers.onDownloadedInstead?.();
  } catch {
    handlers.onFailed?.();
  }
}
