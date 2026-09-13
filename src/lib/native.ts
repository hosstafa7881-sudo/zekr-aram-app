// دور هشتم — the single place that answers "are we inside the Android app or
// in a browser?".
//
// Every native capability in this app is written to work BOTH ways: the
// Capacitor plugin when running inside the APK, the Web API when running in a
// browser (which is how the app is developed and tested). Nothing may branch
// on the platform anywhere else — one answer, one import.
//
// THE RULE THIS ROUND EXISTS TO ENFORCE (قانون جدید SKILL.md):
// never tell the user something succeeded unless it actually did. Every helper
// below returns an explicit outcome, never a silent boolean-ish "probably".

import { Capacitor } from '@capacitor/core';

/** True only inside the real Android app, false in any browser. */
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** e.g. 'android' | 'ios' | 'web'. Used only for reporting, never for branching. */
export function getPlatformName(): string {
  try {
    return Capacitor.getPlatform();
  } catch {
    return 'web';
  }
}

/** Reads a Blob as a base64 string (no data: prefix) — what Filesystem.writeFile wants. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('could not read the generated image'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}
