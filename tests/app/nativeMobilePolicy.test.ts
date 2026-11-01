import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  resolveOrigin, navigationPolicy, internalTarget, deepLinkTarget, parseBridgeMessage,
  oauthCode, validIsolatedConfig,
} from "../../apps/mobile/src/policy";

const origin = "https://isolated.example.test";
test("explicit isolated origin, no production default or ambiguous mode", () => {
  for (const value of [undefined, "http://localhost:55441", "https://www.pratiqo.ca", "https://pratiqo.ca", origin + "/path", origin + "?x=1", "https://user:pass@example.test"]) {
    assert.equal(resolveOrigin(value, "isolated"), null);
  }
  assert.equal(resolveOrigin(origin, undefined), null);
  assert.equal(resolveOrigin(origin, "isolated"), origin);
  assert.equal(resolveOrigin("https://www.pratiqo.ca", "production"), "https://www.pratiqo.ca");
});
test("only configured origin is internal, including query and deep link destinations", () => {
  assert.equal(navigationPolicy(origin + "/student/search?discipline=piano", origin, true), "internal");
  assert.equal(deepLinkTarget("pratiqo://open?path=%2Fstudent%2Fsearch%3Fdiscipline%3Dpiano", origin, true), origin + "/student/search?discipline=piano");
  for (const path of ["//evil.test", "/\\evil.test", "/%2f%2fevil.test", "/%252f%252fevil.test", "/%75pgrade", "/yo/checkout"]) {
    assert.equal(internalTarget(path, origin, true), null, path);
  }
  assert.equal(deepLinkTarget("pratiqo://auth/callback?code=123", origin, true), null);
  assert.equal(deepLinkTarget("https://www.pratiqo.ca", origin, true), null);
});
test("all schemes, external hosts and financial routes fail closed in the isolated build", () => {
  for (const url of ["javascript:alert(1)", "file:///tmp/a", "data:text/html,x", "about:blank", "tel:123", "mailto:test@example.invalid", "https://checkout.stripe.com/c/pay/cs_live_x", "https://www.pratiqo.ca/", origin + "/api/stripe/checkout", origin + "/booking/new", origin + "/messages", origin + "/teacher/setup-payments"]) {
    assert.equal(navigationPolicy(url, origin, true), "blocked", url);
  }
  assert.equal(navigationPolicy("https://example.org", origin, false), "external");
  assert.equal(navigationPolicy(origin + "/upgrade", origin, false), "blocked");
  assert.equal(navigationPolicy("https://checkout.stripe.com", origin, false), "blocked");
});
test("bridge requires exact page origin and validates provider, intent, version and size", () => {
  const raw = JSON.stringify({ type: "auth.oauth", provider: "google", intent: "teacher", forceAccountSelection: true });
  assert.equal(parseBridgeMessage(raw, origin + "/login", origin)?.type, "auth.oauth");
  assert.equal(parseBridgeMessage(raw, "https://evil.test", origin), null);
  for (const value of [{ type: "auth.oauth", provider: "evil" }, { type: "auth.oauth", provider: "google", intent: "admin" }, { type: "bridge.ready", version: 2 }, { type: "unknown" }]) {
    assert.equal(parseBridgeMessage(JSON.stringify(value), origin, origin), null);
  }
  assert.equal(parseBridgeMessage("x".repeat(12001), origin, origin), null);
});
test("OAuth only accepts exact PKCE callback and rejects implicit tokens and duplicate codes", () => {
  const callback = "pratiqo://auth/callback", code = "valid_pkce_code_123";
  assert.equal(oauthCode(callback + "?code=" + code, callback), code);
  for (const raw of ["https://evil.test?code=" + code, "pratiqo://open?code=" + code, callback + "#access_token=x&refresh_token=y", callback + "?code=" + code + "&code=other", callback + "?error=denied", "pratiqo://user@auth/callback?code=" + code]) {
    assert.equal(oauthCode(raw, callback), null);
  }
});
test("isolated preflight requires unexpired synthetic backend with all side effects disabled", () => {
  const now = 1000;
  const value = { protocol: 1, environment: "local-synthetic", webOrigin: origin, paymentsEnabled: false, outboundEnabled: false, oauthEnabled: false, expiresAt: now + 3600000 };
  assert.equal(validIsolatedConfig(value, origin, now), true);
  for (const change of [{ environment: "production" }, { webOrigin: "https://www.pratiqo.ca" }, { paymentsEnabled: true }, { outboundEnabled: true }, { oauthEnabled: true }, { expiresAt: now }, { expiresAt: now + 86400001 }]) {
    assert.equal(validIsolatedConfig({ ...value, ...change }, origin, now), false);
  }
});
test("shell routes new windows through same policy, preserves recovery and has only one implementation", () => {
  const app = readFileSync("apps/mobile/App.tsx", "utf8");
  assert.match(app, /originWhitelist=\{\["\*"\]\}/);
  assert.match(app, /onOpenWindow/);
  assert.match(app, /onRenderProcessGone/);
  assert.match(app, /onContentProcessDidTerminate=\{\(\) => setWebFailed\(true\)\}/);
  assert.match(app, /mixedContentMode="never"/);
  assert.match(app, /if \(IS_ISOLATED\) return/);
  assert.doesNotMatch(app, /console\.error|replace\("#", "\?"\)/);
  const config = JSON.parse(readFileSync("apps/mobile/eas.json", "utf8"));
  assert.equal(config.build.preview.env.EXPO_PUBLIC_NATIVE_MODE, "isolated");
  assert.equal(config.build.preview.ios.simulator, false);
});
