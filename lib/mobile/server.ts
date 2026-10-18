import {
  MOBILE_AUTH_RETURN, MOBILE_PAYMENT_RETURN, MOBILE_PROTOCOL,
  httpsOrigin, isNativeAgent, validState, type MobileConfig,
} from "../../shared/mobileProtocol";

type Env = Record<string, string | undefined>;
const privateHeaders = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

export function mobileConfig(env: Env = process.env): MobileConfig {
  const webOrigin = httpsOrigin(env.NATIVE_WRAPPER_WEB_ORIGIN);
  const authOrigin = httpsOrigin(env.NEXT_PUBLIC_SUPABASE_URL);
  const enabled = env.ENABLE_NATIVE_WRAPPER_BETA === "true" && !!webOrigin && !!authOrigin;
  return {
    protocol: MOBILE_PROTOCOL, enabled, webOrigin, authOrigin: enabled ? authOrigin : null,
    sandboxCheckoutEnabled: enabled && env.ENABLE_NATIVE_WRAPPER_CHECKOUT === "true" &&
      /^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY ?? ""),
  };
}

export function nativeRequest(request: Request): boolean {
  return isNativeAgent(request.headers.get("user-agent")) || request.headers.get("x-pratiqo-native") === "1";
}

/** A feature gate, not authentication. Existing ownership/role checks still apply. */
export function blockUnsupportedNativePurchase(request: Request): Response | null {
  return nativeRequest(request) ? Response.json({
    code: "native_purchase_unavailable", error: "Cet achat n’est pas disponible dans la bêta mobile.",
  }, { status: 403, headers: privateHeaders }) : null;
}

export function nativeCheckoutContext(request: Request, env: Env = process.env):
  { state: string; origin: string } | Response | null {
  if (!nativeRequest(request)) return null;
  const config = mobileConfig(env);
  const state = request.headers.get("x-pratiqo-native-state");
  if (!config.sandboxCheckoutEnabled || !config.webOrigin || !validState(state) ||
      new URL(request.url).origin !== config.webOrigin) {
    return Response.json({ code: "native_checkout_unavailable", error: "Le paiement de test mobile n’est pas disponible." },
      { status: 403, headers: privateHeaders });
  }
  return { state, origin: config.webOrigin };
}

export function nativeCheckoutUrls(context: { state: string; origin: string }) {
  const base = `${context.origin}/mobile/payment-return?state=${context.state}`;
  return {
    success: `${base}&session_id={CHECKOUT_SESSION_ID}`,
    cancel: `${base}&cancelled=1`,
  };
}

/** Return the one-use authorization code to the WebView that owns its PKCE verifier. */
export function nativeAuthReturn(requestUrl: URL, env: Env = process.env): Response | null {
  if (!requestUrl.searchParams.has("native")) return null;
  const config = mobileConfig(env);
  const state = requestUrl.searchParams.get("native_state");
  if (!config.enabled || requestUrl.origin !== config.webOrigin ||
      requestUrl.searchParams.get("native") !== "1" || !validState(state)) {
    return new Response("Retour mobile indisponible. Reviens à Pratiqo pour réessayer.", { status: 400, headers: privateHeaders });
  }
  const target = new URL(MOBILE_AUTH_RETURN);
  target.searchParams.set("state", state);
  const code = requestUrl.searchParams.get("code");
  if (code && /^[A-Za-z0-9_-]{10,2048}$/.test(code) && !requestUrl.searchParams.has("error")) {
    target.searchParams.set("code", code);
  } else {
    target.searchParams.set("error", "auth_incomplete");
  }
  return new Response(null, { status: 302, headers: { ...privateHeaders, Location: target.toString() } });
}

export function nativePaymentReturn(requestUrl: URL, env: Env = process.env): Response {
  const config = mobileConfig(env);
  const state = requestUrl.searchParams.get("state");
  const session = requestUrl.searchParams.get("session_id");
  const cancelled = requestUrl.searchParams.get("cancelled") === "1";
  if (!config.sandboxCheckoutEnabled || requestUrl.origin !== config.webOrigin || !validState(state) ||
      (!cancelled && (!session || !/^cs_test_[A-Za-z0-9]{1,300}$/.test(session)))) {
    return new Response("Retour mobile indisponible.", { status: 400, headers: privateHeaders });
  }
  const target = new URL(MOBILE_PAYMENT_RETURN);
  target.searchParams.set("state", state);
  if (cancelled) target.searchParams.set("cancelled", "1");
  else target.searchParams.set("session_id", session!);
  return new Response(null, { status: 302, headers: { ...privateHeaders, Location: target.toString() } });
}
