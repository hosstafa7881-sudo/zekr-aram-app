// فاز اول Capacitor — post-step after `capacitor-assets generate --android`.
//
// The generator writes both adaptive-icon layers wrapped in
// `<inset android:inset="16.7%">`. That is wrong for our artwork twice over:
//
//  * the BACKGROUND layer must reach the edge of the 108dp canvas, otherwise a
//    launcher mask that shows more than the inner 72dp exposes empty corners;
//  * build-app-icons.mjs already draws the FOREGROUND at 72/108 of its canvas,
//    so a second 16.7% inset shrinks the logo to ~55% of its intended size and
//    it ends up looking like a small dot on a big field.
//
// So the insets are stripped and the two mipmaps are referenced directly.
// Re-run this any time the assets are regenerated (npm run icons:android).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'android/app/src/main/res/mipmap-anydpi-v26');

const XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

const files = ['ic_launcher.xml', 'ic_launcher_round.xml'];
let changed = 0;
for (const name of files) {
  const file = path.join(DIR, name);
  if (!fs.existsSync(file)) throw new Error(`missing ${name} — run capacitor-assets generate --android first`);
  if (fs.readFileSync(file, 'utf8') !== XML) {
    fs.writeFileSync(file, XML);
    changed++;
  }
  console.log(`  ✓ ${name} — layers drawn full-bleed, no inset`);
}
console.log(changed ? `${changed} file(s) rewritten.` : 'already correct.');
