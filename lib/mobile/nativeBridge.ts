export type PratiqoNativePlatform = "ios" | "android" | null;

export type PratiqoNativeMessage =
  | {
      type: "auth.oauth";
      provider: "google" | "apple";
      intent?: "learner" | "teacher" | null;
      forceAccountSelection?: boolean;
    }
  | { type: "auth.logout" }
  | { type: "bridge.ready"; version: 1 }
  | { type: "auth.web-session-error"; message?: string };

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
    __PRATIQO_NATIVE_APP__?: boolean;
    __PRATIQO_NATIVE_PLATFORM__?: "ios" | "android";
  }
}

export function isPratiqoNativeApp(): boolean {
  return typeof window !== "undefined" && Boolean(window.ReactNativeWebView || window.__PRATIQO_NATIVE_APP__);
}

export function getPratiqoNativePlatform(): PratiqoNativePlatform {
  if (!isPratiqoNativeApp()) return null;
  return window.__PRATIQO_NATIVE_PLATFORM__ ?? null;
}

export function postPratiqoNativeMessage(message: PratiqoNativeMessage): boolean {
  if (typeof window === "undefined" || !window.ReactNativeWebView) return false;
  window.ReactNativeWebView.postMessage(JSON.stringify(message));
  return true;
}
