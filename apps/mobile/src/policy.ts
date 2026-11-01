/** Origin and navigation safeguards consolidated from PR411; no second native protocol. */
export function httpsOrigin(value: string | undefined): string | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && !url.username && !url.password &&
      url.pathname === "/" && !url.search && !url.hash ? url.origin : null;
  } catch { return null; }
}

export function resolveOrigin(value: string | undefined, mode: string | undefined): string | null {
  const origin = httpsOrigin(value);
  if (!origin || !["isolated", "production"].includes(mode ?? "")) return null;
  const production = ["pratiqo.ca", "www.pratiqo.ca"].includes(new URL(origin).hostname);
  return mode === "isolated" ? (production ? null : origin) : (production ? origin : null);
}

function pathname(url: URL): string {
  // Reject encoded separators rather than allowing normalization to bypass a route guard.
  if (/%2f|%5c|%25|\\/i.test(url.pathname)) throw new Error("Unsafe path");
  return decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/";
}

export type Navigation = "internal" | "external" | "contact" | "blocked";
export function navigationPolicy(raw: string, origin: string | null, isolated: boolean): Navigation {
  if (!origin) return "blocked";
  try {
    const url = new URL(raw);
    if (url.username || url.password) return "blocked";
    if (["mailto:", "tel:"].includes(url.protocol)) return isolated ? "blocked" : "contact";
    if (url.protocol !== "https:") return "blocked";
    if (url.origin !== origin) {
      if (isolated || /(^|\.)(supabase\.co|stripe\.com|google\.com|apple\.com)$/.test(url.hostname)) return "blocked";
      return "external";
    }
    const path = pathname(url);
    if (/^\/(upgrade|yo\/checkout|api|group-sessions|planned-packages)(\/|$)/.test(path)) return "blocked";
    if (isolated && /^\/(booking|checkout|messages|admin|teacher\/(setup-payments|verification)|student\/payments)(\/|$)/.test(path)) return "blocked";
    return "internal";
  } catch { return "blocked"; }
}

export function internalTarget(path: string, origin: string | null, isolated: boolean): string | null {
  if (!origin || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return null;
  try {
    const url = new URL(path, origin).href;
    return navigationPolicy(url, origin, isolated) === "internal" ? url : null;
  } catch { return null; }
}

export function deepLinkTarget(raw: string, origin: string | null, isolated: boolean): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol === "https:") return navigationPolicy(raw, origin, isolated) === "internal" ? raw : null;
    if (url.protocol !== "pratiqo:" || url.username || url.password || url.port || url.hostname === "auth") return null;
    const path = url.hostname === "open" ? url.searchParams.get("path") ?? "/"
      : "/" + [url.hostname, url.pathname.replace(/^\//, "")].filter(Boolean).join("/") + url.search;
    return internalTarget(path, origin, isolated);
  } catch { return null; }
}

export type BridgeMessage =
  | { type: "bridge.ready"; version: 1 }
  | { type: "auth.oauth"; provider: "google" | "apple"; intent?: "learner" | "teacher" | null; forceAccountSelection?: boolean }
  | { type: "auth.logout" }
  | { type: "auth.web-session-error" };

export function parseBridgeMessage(raw: string, page: string, origin: string | null): BridgeMessage | null {
  try {
    if (!origin || new URL(page).origin !== origin || raw.length > 12000) return null;
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    if (value.type === "bridge.ready") return value.version === 1 ? value : null;
    if (value.type === "auth.logout" || value.type === "auth.web-session-error") return value;
    if (value.type !== "auth.oauth" || !["google", "apple"].includes(value.provider) ||
      ![undefined, null, "learner", "teacher"].includes(value.intent) ||
      (value.forceAccountSelection !== undefined && typeof value.forceAccountSelection !== "boolean")) return null;
    return value;
  } catch { return null; }
}

/** Only a pending PKCE exchange may consume this callback; implicit tokens are rejected. */
export function oauthCode(raw: string, callback: string): string | null {
  try {
    const url = new URL(raw), expected = new URL(callback);
    if (url.protocol !== expected.protocol || url.host !== expected.host || url.pathname !== expected.pathname ||
      url.username || url.password || url.hash || url.searchParams.has("error") ||
      url.searchParams.getAll("code").length !== 1) return null;
    const code = url.searchParams.get("code");
    return code && /^[A-Za-z0-9_-]{10,2048}$/.test(code) ? code : null;
  } catch { return null; }
}

export function validIsolatedConfig(value: unknown, origin: string, now = Date.now()): boolean {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return c.protocol === 1 && c.environment === "local-synthetic" && c.webOrigin === origin &&
    c.paymentsEnabled === false && c.outboundEnabled === false && c.oauthEnabled === false &&
    typeof c.expiresAt === "number" && c.expiresAt > now && c.expiresAt <= now + 86400000;
}
