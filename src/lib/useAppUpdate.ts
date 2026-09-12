import { useEffect } from 'react';
import { APP_VERSION } from './version';

// مورد ۲ب — automatic update on GitHub Pages.
//
// This app is bundled by vite-plugin-singlefile: the whole app is ONE
// index.html with the JS/CSS inlined, so there is no hashed asset filename
// to act as a natural cache-buster, and GitHub Pages serves that HTML with
// a short but non-zero max-age. That's exactly how round four's tester ended
// up looking at a stale build and reporting an already-fixed item as broken.
//
// There is no service worker in this project (and adding one would risk the
// classic "stuck on an old SW" failure mode), so instead we do the simplest
// standard thing: keep the version number in two places — compiled into the
// bundle (version.ts) and as a tiny separate `version.json` next to it —
// then poll that file with `cache: 'no-store'`. A mismatch means a newer
// build is live, so we force-refresh the HTML entry in the HTTP cache and
// reload.
//
// `version.json` is a real separate file in dist/ (public/ assets are copied
// as-is even with the singlefile plugin), so it is never inlined and always
// fetchable on its own.

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

async function fetchServerVersion(): Promise<number | null> {
  try {
    // Resolved against document.baseURI so it works both at the domain root
    // and under a GitHub Pages project sub-path.
    const url = new URL('version.json', document.baseURI);
    url.searchParams.set('t', String(Date.now()));
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const version = Number(data?.version);
    return Number.isFinite(version) ? version : null;
  } catch {
    // Offline or blocked — nothing to do, the app keeps working as-is.
    return null;
  }
}

async function reloadWithFreshHtml() {
  try {
    // Revalidate the cached index.html itself before reloading, otherwise a
    // reload can be served the very same stale HTML we're trying to escape.
    await fetch(window.location.href, { cache: 'reload' });
  } catch {
    // Ignore — the reload below is still worth attempting.
  }
  window.location.reload();
}

/**
 * Checks once on mount, whenever the app is brought back to the foreground,
 * and every few minutes, whether a newer build has been published; reloads
 * itself if so. Reloading is safe: all user data lives in localStorage +
 * IndexedDB, never in memory only.
 */
export function useAppUpdate() {
  useEffect(() => {
    let cancelled = false;
    let reloading = false;

    const check = async () => {
      if (cancelled || reloading) return;
      const serverVersion = await fetchServerVersion();
      if (cancelled || serverVersion === null) return;
      if (serverVersion > APP_VERSION) {
        reloading = true;
        reloadWithFreshHtml();
      }
    };

    check();
    const intervalId = window.setInterval(check, CHECK_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
}
