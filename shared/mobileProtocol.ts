/** Public protocol only. Never put a session, token or server key in this bridge. */
export const MOBILE_PROTOCOL = 1;
export const MOBILE_AGENT = "PratiqoMobileBeta/1";
export const MOBILE_SCHEME = "ca.pratiqo.app.beta";
export const MOBILE_AUTH_RETURN = `${MOBILE_SCHEME}://auth/callback`;
export const MOBILE_PAYMENT_RETURN = `${MOBILE_SCHEME}://payment/return`;

export type MobileConfig = {
  protocol: number;
  enabled: boolean;
  webOrigin: string | null;
  authOrigin: string | null;
  sandboxCheckoutEnabled: boolean;
};

export function httpsOrigin(value: string | null | undefined): string | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && !url.username && !url.password &&
      url.pathname === "/" && !url.search && !url.hash ? url.origin : null;
  } catch { return null; }
}

export function validState(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
}

export function isNativeAgent(value: string | null): boolean {
  return (value ?? "").split(/\s+/).includes(MOBILE_AGENT);
}

export function validConfig(value: unknown, webOrigin: string): value is MobileConfig {
  if (!value || typeof value !== "object") return false;
  const c = value as MobileConfig;
  return c.protocol === MOBILE_PROTOCOL && c.enabled === true &&
    c.webOrigin === webOrigin && httpsOrigin(c.authOrigin) !== null &&
    typeof c.sandboxCheckoutEnabled === "boolean";
}

export type Navigation = "internal" | "external" | "contact" | "blocked";
export function navigationPolicy(raw: string, webOrigin: string): Navigation {
  try {
    const url = new URL(raw);
    if (url.username || url.password) return "blocked";
    if (url.protocol === "mailto:" || url.protocol === "tel:") return "contact";
    if (url.protocol !== "https:") return "blocked";
    if (url.origin !== webOrigin) {
      // Authentication and payments must use correlated browser sessions, never arbitrary links.
      if (/\.(supabase\.co|stripe\.com|google\.com)$/.test(url.hostname) ||
          ["stripe.com", "google.com"].includes(url.hostname)) return "blocked";
      return "external";
    }
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, "");
    if (/^\/(upgrade|yo\/checkout|group-sessions|planned-packages)(\/|$)/.test(path) ||
        /^\/api\//.test(path)) return "blocked";
    return "internal";
  } catch { return "blocked"; }
}

export function prepareGoogleUrl(raw: string, config: MobileConfig, state: string) {
  if (!validState(state)) throw new Error("Invalid native state");
  const url = new URL(raw);
  if (url.origin !== config.authOrigin || url.username || url.password ||
      url.pathname !== "/auth/v1/authorize" || url.searchParams.get("provider") !== "google" ||
      url.searchParams.get("code_challenge_method")?.toLowerCase() !== "s256" ||
      !/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get("code_challenge") ?? "")) {
    throw new Error("Invalid OAuth request");
  }
  const callback = new URL(url.searchParams.get("redirect_to") ?? "");
  if (callback.origin !== config.webOrigin || callback.pathname !== "/auth/callback" ||
      callback.username || callback.password || callback.hash ||
      ["native", "native_state", "code", "error"].some(key => callback.searchParams.has(key))) {
    throw new Error("Invalid OAuth callback");
  }
  const webCallback = callback.toString();
  callback.searchParams.set("native", "1");
  callback.searchParams.set("native_state", state);
  url.searchParams.set("redirect_to", callback.toString());
  return { browserUrl: url.toString(), webCallback };
}

export function isSandboxCheckoutUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.origin === "https://checkout.stripe.com" && !url.username && !url.password &&
      /^\/c\/pay\/cs_test_[A-Za-z0-9]+$/.test(url.pathname);
  } catch { return false; }
}

export type PendingReturn = {
  kind: "auth" | "payment";
  state: string;
  expiresAt: number;
  webCallback?: string;
};

/** In-memory, single-use correlation. A cold start cannot resume an old browser flow. */
export class ReturnGate {
  private pending: PendingReturn | null = null;
  start(pending: PendingReturn) {
    if (this.pending) throw new Error("A browser flow is already pending");
    if (!validState(pending.state)) throw new Error("Invalid state");
    this.pending = pending;
  }
  clear() { this.pending = null; }
  consume(raw: string, webOrigin: string, now = Date.now()): string | null {
    const pending = this.pending;
    this.pending = null;
    if (!pending || now >= pending.expiresAt) return null;
    try {
      const url = new URL(raw);
      const expected = new URL(pending.kind === "auth" ? MOBILE_AUTH_RETURN : MOBILE_PAYMENT_RETURN);
      if (url.protocol !== expected.protocol || url.host !== expected.host ||
          url.pathname !== expected.pathname || url.username || url.password || url.hash ||
          url.searchParams.getAll("state").length !== 1 || url.searchParams.get("state") !== pending.state ||
          url.searchParams.has("error")) return null;
      if (pending.kind === "auth") {
        const code = url.searchParams.get("code");
        if (!code || !/^[A-Za-z0-9_-]{10,2048}$/.test(code) || !pending.webCallback) return null;
        const target = new URL(pending.webCallback);
        if (target.origin !== webOrigin || target.pathname !== "/auth/callback") return null;
        target.searchParams.set("code", code);
        return target.toString();
      }
      if (url.searchParams.get("cancelled") === "1") return null;
      const session = url.searchParams.get("session_id");
      if (!session || !/^cs_test_[A-Za-z0-9]{1,300}$/.test(session)) return null;
      // This existing page verifies the server result; a deep link never confirms payment.
      return `${webOrigin}/booking/success?session_id=${encodeURIComponent(session)}`;
    } catch { return null; }
  }
}
