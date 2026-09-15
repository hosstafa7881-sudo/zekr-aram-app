import type { CapacitorConfig } from '@capacitor/cli';

/**
 * فاز اول Capacitor — the Android shell around the existing web app.
 *
 * دور هشتم — the Web APIs are now backed by real plugins (share, haptics,
 * local-notifications, filesystem) plus the app's own SaveImage plugin. None
 * of them needs configuration here.
 *
 * دور هشتم / مورد ۷ — the splash screen is gone entirely: the plugin is
 * uninstalled, its config block removed, and the Android launch theme is a
 * flat fill of the colour below (see android/app/src/main/res/values/styles.xml).
 */
const config: CapacitorConfig = {
  // ⚠️ Fixed forever once the app is published to a store. Ask before changing.
  appId: 'com.zekraram.app',
  // The label shown under the launcher icon.
  appName: 'ذکرآرام',
  webDir: 'dist',

  android: {
    // The very colour index.html paints first (سبز ملایم، پالت پیش‌فرض). With
    // the splash gone this is also what the launch window is filled with, so
    // opening the app shows nothing but that colour for a fraction of a second.
    backgroundColor: '#F3F7EE',
  },
};

export default config;
