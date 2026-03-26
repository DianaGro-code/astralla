import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.astralla.app',
  appName: 'Astralla',
  webDir: 'dist',
  server: {
    // Use https scheme on Android so origin matches what the backend allows
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
