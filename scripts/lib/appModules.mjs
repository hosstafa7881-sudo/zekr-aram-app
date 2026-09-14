// دور نهم — runs the app's OWN modules in Node.
//
// Checks about dates used to re-implement the conversion with `Intl` inside a
// browser page, which was fine only while the app itself used `Intl`. Now that
// the Hijri conversion comes from the published Iranian calendar table, any
// re-implementation would quietly test the wrong thing — and print wrong dates
// while reporting PASS. So the checks bundle and import the real source files.

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * @param {string[]} exports lines like "getHijriDateInfo from 'src/utils/hijri'"
 */
export async function loadAppModules(specs) {
  const stamp = `${process.pid}-${Date.now()}`;
  const entry = path.join(os.tmpdir(), `zekraram-entry-${stamp}.ts`);
  const outfile = path.join(os.tmpdir(), `zekraram-bundle-${stamp}.mjs`);
  fs.writeFileSync(
    entry,
    specs
      .map(({ names, from }) => `export { ${names.join(', ')} } from '${path.join(ROOT, from)}';`)
      .join('\n')
  );
  try {
    await build({
      entryPoints: [entry],
      bundle: true,
      format: 'esm',
      platform: 'node',
      outfile,
      logLevel: 'silent',
    });
    return await import(`file://${outfile}`);
  } finally {
    fs.rmSync(entry, { force: true });
    fs.rmSync(outfile, { force: true });
  }
}
