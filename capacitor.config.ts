/**
 * EMR-051: Native Mobile App config
 */
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.leafjourney.emr',
  appName: 'Leafjourney EMR',
  webDir: 'out', // Next.js static export directory
  bundledWebRuntime: false,
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
