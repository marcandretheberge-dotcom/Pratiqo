import type { ExpoConfig } from 'expo/config';

const projectId = process.env.EAS_PROJECT_ID;

const config: ExpoConfig = {
  name: 'Pratiqo Bêta',
  slug: 'pratiqo-mobile-beta',
  version: '0.1.0',
  scheme: 'ca.pratiqo.app.beta',
  userInterfaceStyle: 'light',
  orientation: 'default',
  icon: '../public/icon-512.png',
  ios: {
    bundleIdentifier: 'ca.pratiqo.app.beta',
    supportsTablet: true,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: 'ca.pratiqo.app.beta',
    permissions: ['INTERNET'],
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
    adaptiveIcon: { foregroundImage: '../public/icons/icon-512-maskable.png', backgroundColor: '#F4F9F5' },
  },
  plugins: ['expo-router', 'expo-web-browser'],
  updates: { enabled: false },
  extra: {
    webOrigin: process.env.EXPO_PUBLIC_WEB_ORIGIN ?? null,
    ...(projectId ? { eas: { projectId } } : {}),
  },
};

export default config;
