// Reads the app's real version number straight out of src/lib/version.ts, so
// no QA script ever has to hard-code it (round six's bump to ۶ silently broke
// two checks that had ۵ written into them).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const APP_VERSION = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/version.ts'), 'utf8');
  const m = src.match(/APP_VERSION\s*=\s*(\d+)/);
  if (!m) throw new Error('could not read APP_VERSION from src/lib/version.ts');
  return parseInt(m[1], 10);
})();

export const APP_VERSION_LABEL = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/version.ts'), 'utf8');
  const m = src.match(/APP_VERSION_LABEL\s*=\s*'([^']+)'/);
  if (!m) throw new Error('could not read APP_VERSION_LABEL from src/lib/version.ts');
  return m[1];
})();
