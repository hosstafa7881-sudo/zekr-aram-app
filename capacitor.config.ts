import type { CapacitorConfig } from '@capacitor/cli';

/**
 * فاز اول Capacitor — the Android shell around the existing web app.
 *
 * Nothing here changes how the app behaves: the same `dist/` build that
 * GitHub Pages serves is copied into the APK and runs inside the WebView.
 * Native replacements for the Web APIs (اعلان، ویبره، اشتراک‌گذاری) belong to
 * the NEXT phase — no plugin for them is declared yet.
 */
const config: CapacitorConfig = {
  // ⚠️ Fixed forever once the app is published to a store. Ask before changing.
  appId: 'com.zekraram.app',
  // The label shown under the launcher icon.
  appName: 'ذکرآرام',
  webDir: 'dist',

  android: {
    // The very colour index.html paints first (سبز ملایم، پالت پیش‌فرض), so the
    // handover splash → WebView has no white flash in between.
    backgroundColor: '#F3F7EE',
  },

  plugins: {
    SplashScreen: {
      // Short and plain, per the spec: ~1.2s, no spinner, no animation.
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#F3F7EE',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
  },
};

export default config;
