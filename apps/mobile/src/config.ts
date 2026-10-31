export const WEB_ORIGIN = (process.env.EXPO_PUBLIC_WEB_ORIGIN || "https://www.pratiqo.ca").replace(/\/$/, "");
export const AUTH_REDIRECT_URI = "pratiqo://auth/callback";

export const BLOCKED_NATIVE_PURCHASE_PATHS = ["/upgrade", "/yo/checkout"] as const;

export function isBlockedNativePurchase(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["pratiqo.ca", "www.pratiqo.ca"].includes(parsed.hostname)) return false;
    return BLOCKED_NATIVE_PURCHASE_PATHS.some(
      (prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(prefix + "/"),
    );
  } catch {
    return false;
  }
}

export function isPratiqoWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ["pratiqo.ca", "www.pratiqo.ca"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function webUrl(path = "/"): string {
  return new URL(path, WEB_ORIGIN).toString();
}
