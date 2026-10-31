import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Pratiqo",
  slug: "pratiqo-mobile",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "pratiqo",
  userInterfaceStyle: "light",
  icon: "../../public/icons/icon-512.png",
  ios: {
    bundleIdentifier: "ca.pratiqo.app",
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "ca.pratiqo.app",
    adaptiveIcon: {
      foregroundImage: "../../public/icons/icon-512.png",
      backgroundColor: "#ffffff",
    },
  },
  plugins: [
    ["expo-web-browser", { experimentalLauncherActivity: false }],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#ffffff",
        image: "../../public/icons/icon-512.png",
        imageWidth: 180,
      },
    ],
  ],
});
