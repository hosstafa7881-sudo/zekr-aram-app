// The sandbox ships a pinned Chromium build that doesn't match this
// Playwright version's expected revision, so every script launches through
// this helper with an explicit executablePath instead of downloading one.
import { chromium } from 'playwright';
import fs from 'node:fs';

const PINNED_CHROMIUM = '/opt/pw-browsers/chromium';

export function launchChromium(options = {}) {
  const executablePath = fs.existsSync(PINNED_CHROMIUM) ? PINNED_CHROMIUM : undefined;
  return chromium.launch({ ...options, ...(executablePath ? { executablePath } : {}) });
}
