import { internalTarget, navigationPolicy, resolveOrigin } from "./policy";

export const IS_ISOLATED = process.env.EXPO_PUBLIC_NATIVE_MODE !== "production";
export const WEB_ORIGIN = resolveOrigin(process.env.EXPO_PUBLIC_WEB_ORIGIN, process.env.EXPO_PUBLIC_NATIVE_MODE);
export const AUTH_REDIRECT_URI = "pratiqo://auth/callback";

export function isPratiqoWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.origin === WEB_ORIGIN;
  } catch {
    return false;
  }
}

export function webUrl(path = "/"): string {
  return internalTarget(path, WEB_ORIGIN, IS_ISOLATED) ?? "";
}

export const navigation = (url: string) => navigationPolicy(url, WEB_ORIGIN, IS_ISOLATED);
