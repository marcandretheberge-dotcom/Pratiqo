import { isNativeAgent, validConfig } from "../../shared/mobileProtocol";

type BridgeWindow = Window & { ReactNativeWebView?: { postMessage(message: string): void } };
let authBusy = false;

function nativeBridge() {
  if (typeof window === "undefined" || !isNativeAgent(navigator.userAgent)) return null;
  const bridge = (window as BridgeWindow).ReactNativeWebView;
  if (!bridge) throw new Error("Reviens à Pratiqo pour réessayer.");
  return bridge;
}

async function checkedConfig() {
  const response = await fetch("/api/mobile/config", { cache: "no-store", signal: AbortSignal.timeout(10000) });
  const config: unknown = await response.json();
  if (!response.ok || !validConfig(config, window.location.origin)) {
    throw new Error("Cette version mobile n’est pas encore disponible. Réessaie plus tard.");
  }
  return config;
}

function browserRequest(kind: "auth" | "payment", url: string, id: string): Promise<void> {
  const bridge = nativeBridge();
  if (!bridge) throw new Error("Retour mobile indisponible.");
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener("pratiqo:native-result", listener);
      clearTimeout(timer);
    };
    const listener = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.id !== id) return;
      cleanup();
      if (detail.ok === true) resolve();
      else reject(new Error("L’opération n’a pas été confirmée. Tu peux réessayer."));
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error("Le délai est écoulé. Tu peux réessayer.")); },
      kind === "auth" ? 5 * 60_000 : 30 * 60_000);
    window.addEventListener("pratiqo:native-result", listener);
    try { bridge.postMessage(JSON.stringify({ protocol: 1, kind, id, url })); }
    catch { cleanup(); reject(new Error("Retour mobile indisponible.")); }
  });
}

/** Acquire before creating a PKCE verifier: overlapping attempts would overwrite its cookie. */
export async function beginNativeGoogle() {
  if (!nativeBridge()) return null;
  if (authBusy) throw new Error("Une connexion est déjà en cours.");
  authBusy = true;
  try {
    await checkedConfig();
    return {
      open: (url: string) => browserRequest("auth", url, crypto.randomUUID()),
      release: () => { authBusy = false; },
    };
  } catch (error) { authBusy = false; throw error; }
}

/** Call before creating a booking, so a disabled native checkout has no booking side effect. */
export async function prepareNativeCheckout() {
  if (!nativeBridge()) return null;
  const config = await checkedConfig();
  if (!config.sandboxCheckoutEnabled) throw new Error("Le paiement de test n’est pas disponible dans cette bêta.");
  const id = crypto.randomUUID();
  return {
    headers: { "X-Pratiqo-Native": "1", "X-Pratiqo-Native-State": id },
    open: (url: string) => browserRequest("payment", url, id),
  };
}
