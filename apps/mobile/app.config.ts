import type { ExpoConfig, ConfigContext } from "expo/config";

const configure = ({ config }: ConfigContext): ExpoConfig => {
  if (process.env.EAS_BUILD_PROFILE === "preview") {
    const origin = new URL(process.env.EXPO_PUBLIC_WEB_ORIGIN ?? "");
    if (process.env.EXPO_PUBLIC_NATIVE_MODE !== "isolated" ||
      origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" ||
      origin.search || origin.hash || ["pratiqo.ca", "www.pratiqo.ca"].includes(origin.hostname)) {
      throw new Error("Preview requires an explicit isolated HTTPS origin; production is refused.");
    }
    if ([process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY].some(value => value?.trim() && value !== "disabled-in-isolated-preview")) {
      throw new Error("Preview uses gateway-local Auth only; remove bundled Supabase configuration.");
    }
  }
  return ({
  ...config,
  name: "Pratiqo",
  slug: "pratiqo-mobile",
  owner: "markitos2222s-organization",
  extra: {
    ...config.extra,
    eas: { projectId: "b52003f2-c064-4aba-a272-2b949b62751e" },
  },
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
};
export default configure;
