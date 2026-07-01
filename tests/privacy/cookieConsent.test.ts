/**
 * Cookie consent, analytics gating, Sentry privacy, and CSP contract tests.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  acceptAllCookieConsent,
  acceptNecessaryOnlyCookieConsent,
  COOKIE_CONSENT_STORAGE_KEY,
  hasAnalyticsConsent,
  hasDiagnosticsConsent,
  hasRecordedCookieConsent,
  readCookieConsent,
  writeCookieConsent,
} from "@/lib/privacy/cookieConsent";
import { getAnalyticsAnonymousId, ANALYTICS_ANON_STORAGE_KEY } from "@/lib/privacy/analyticsAnonymousId";
import { isSensitiveAnalyticsRoute } from "@/lib/privacy/sensitiveAnalyticsRoutes";
import { capturePostHogEvent, readPostHogConfig } from "@/lib/analytics/posthog";
import {
  captureMonitoringError,
  isForbiddenMonitoringKey,
  scrubMonitoringMessage,
} from "@/lib/monitoring/sentry";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
const test = (name: string, fn: TestFn) => tests.push({ name, fn });

const READ = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

type StorageMock = {
  store: Record<string, string>;
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function installBrowserMocks() {
  const storage: StorageMock = {
    store: {},
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
    },
    setItem(key, value) {
      this.store[key] = value;
    },
    removeItem(key) {
      delete this.store[key];
    },
  };

  const g = globalThis as typeof globalThis & {
    window?: Window & typeof globalThis;
    localStorage?: StorageMock;
    fetch?: typeof fetch;
  };

  g.localStorage = storage;
  g.window = {
    localStorage: storage,
    location: { pathname: "/", href: "https://www.pratiqo.ca/", host: "www.pratiqo.ca" },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as Window & typeof globalThis;

  return storage;
}

function clearBrowserMocks() {
  const g = globalThis as typeof globalThis & { window?: unknown; localStorage?: unknown };
  delete g.window;
  delete g.localStorage;
}

// ── Consent model ───────────────────────────────────────────────────────────

test("consent defaults: analytics false until saved", () => {
  const storage = installBrowserMocks();
  try {
    assert.equal(hasRecordedCookieConsent(), false);
    assert.equal(hasAnalyticsConsent(), false);
    assert.equal(hasDiagnosticsConsent(), true);
    assert.equal(storage.getItem(COOKIE_CONSENT_STORAGE_KEY), null);
  } finally {
    clearBrowserMocks();
  }
});

test("accept analytics enables analytics and diagnostics", () => {
  installBrowserMocks();
  try {
    const record = acceptAllCookieConsent("fr", "banner");
    assert.ok(record);
    assert.equal(record!.analytics, true);
    assert.equal(record!.diagnostics, true);
    assert.equal(record!.necessary, true);
    assert.equal(hasAnalyticsConsent(), true);
    assert.equal(hasDiagnosticsConsent(), true);
  } finally {
    clearBrowserMocks();
  }
});

test("necessary only disables analytics but keeps diagnostics", () => {
  installBrowserMocks();
  try {
    const record = acceptNecessaryOnlyCookieConsent("en", "banner");
    assert.ok(record);
    assert.equal(record!.analytics, false);
    assert.equal(record!.diagnostics, true);
    assert.equal(hasAnalyticsConsent(), false);
    assert.equal(hasDiagnosticsConsent(), true);
  } finally {
    clearBrowserMocks();
  }
});

test("preferences save persists source=preferences", () => {
  installBrowserMocks();
  try {
    const record = writeCookieConsent({
      analytics: true,
      diagnostics: false,
      locale: "es",
      source: "preferences",
    });
    assert.equal(record?.source, "preferences");
    assert.equal(readCookieConsent()?.analytics, true);
    assert.equal(readCookieConsent()?.diagnostics, false);
  } finally {
    clearBrowserMocks();
  }
});

test("search analytics anonymous id is not created before analytics consent", () => {
  const storage = installBrowserMocks();
  try {
    assert.equal(getAnalyticsAnonymousId(), "");
    assert.equal(storage.getItem(ANALYTICS_ANON_STORAGE_KEY), null);
    acceptAllCookieConsent("fr", "banner");
    const id = getAnalyticsAnonymousId();
    assert.ok(id);
    assert.equal(storage.getItem(ANALYTICS_ANON_STORAGE_KEY), id);
  } finally {
    clearBrowserMocks();
  }
});

test("PostHog capture no-ops before analytics consent", () => {
  installBrowserMocks();
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
  let fetchCalled = false;
  globalThis.fetch = (() => {
    fetchCalled = true;
    return Promise.resolve(new Response("ok"));
  }) as typeof fetch;
  try {
    capturePostHogEvent("landing_viewed", { path: "/" });
    assert.equal(fetchCalled, false);
    acceptAllCookieConsent("fr", "banner");
    capturePostHogEvent("landing_viewed", { path: "/" });
    assert.equal(fetchCalled, true);
  } finally {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    clearBrowserMocks();
  }
});

test("PostHog capture no-ops on sensitive routes even with consent", () => {
  installBrowserMocks();
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
  (globalThis as typeof globalThis & { window: Window }).window.location.pathname = "/login";
  let fetchCalled = false;
  globalThis.fetch = (() => {
    fetchCalled = true;
    return Promise.resolve(new Response("ok"));
  }) as typeof fetch;
  try {
    acceptAllCookieConsent("fr", "banner");
    capturePostHogEvent("landing_viewed", { path: "/login" });
    assert.equal(fetchCalled, false);
  } finally {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    clearBrowserMocks();
  }
});

test("search analytics module gates on hasAnalyticsConsent", () => {
  const src = READ("lib/searchAnalytics.ts");
  assert.match(src, /hasAnalyticsConsent\(\)/);
  assert.doesNotMatch(src, /localStorage\.setItem\(ANON_KEY/);
});

test("Sentry browser diagnostics are errors-only necessary monitoring", () => {
  installBrowserMocks();
  process.env.NEXT_PUBLIC_SENTRY_DSN = "https://abc@o123.ingest.sentry.io/456";
  let fetchCalled = false;
  globalThis.fetch = (() => {
    fetchCalled = true;
    return Promise.resolve(new Response("ok"));
  }) as typeof fetch;
  try {
    assert.equal(captureMonitoringError("test error"), true);
    assert.equal(fetchCalled, true);
    writeCookieConsent({ analytics: false, diagnostics: false, locale: "fr", source: "preferences" });
    fetchCalled = false;
    assert.equal(captureMonitoringError("test error"), false);
    assert.equal(fetchCalled, false);
  } finally {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    clearBrowserMocks();
  }
});

test("Sentry scrubber removes emails and sensitive keys", () => {
  assert.match(scrubMonitoringMessage("Contact user@example.com now"), /\[redacted-email\]/);
  assert.equal(isForbiddenMonitoringKey("access_token"), true);
  assert.equal(isForbiddenMonitoringKey("booking_note"), true);
  assert.equal(isForbiddenMonitoringKey("area"), false);
});

test("Sentry Replay SDK is absent", () => {
  const pkg = JSON.parse(READ("package.json")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const names = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
  for (const name of names) {
    assert.ok(!/@sentry\/replay/.test(name), `Sentry Replay must not be installed: ${name}`);
  }
  const src = READ("lib/monitoring/sentry.ts").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(src, /replayIntegration|SessionReplay|@sentry\/replay/);
});

test("CSP includes exact PostHog host without wildcards", () => {
  const src = READ("next.config.ts");
  assert.match(src, /https:\/\/us\.i\.posthog\.com/);
  assert.doesNotMatch(src, /https:\/\/\*\.i\.posthog\.com/);
});

test("cookie banner UI is mounted once in providers", () => {
  const providers = READ("app/providers.tsx");
  assert.match(providers, /CookieConsentProvider/);
  assert.match(providers, /PostHogPageView/);
  const banner = READ("components/privacy/CookieConsentBanner.tsx");
  assert.match(banner, /cookieAcceptAnalytics|cookieNecessaryOnly|cookieManageChoices/);
});

test("FR EN ES cookie copy keys exist", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const json = JSON.parse(READ(`lib/i18n/locales/${locale}.json`)) as Record<string, string>;
    assert.equal(json.cookieAcceptAnalytics?.length > 0, true, `${locale} cookieAcceptAnalytics`);
    assert.equal(json.cookieNecessaryOnly?.length > 0, true, `${locale} cookieNecessaryOnly`);
    assert.equal(json.cookieManageChoices?.length > 0, true, `${locale} cookieManageChoices`);
  }
});

test("privacy policy mentions PostHog, Sentry, and support contact", () => {
  for (const lang of ["fr", "en", "es"] as const) {
    const md = READ(`content/legal/confidentialite.${lang}.md`);
    assert.match(md, /PostHog/i);
    assert.match(md, /Sentry/i);
    assert.match(md, /support@pratiqo\.ca/);
    assert.match(md, /session replay|relectura de sesión|sin relectura/i);
  }
});

test("sensitive analytics routes include auth and booking paths", () => {
  assert.equal(isSensitiveAnalyticsRoute("/login"), true);
  assert.equal(isSensitiveAnalyticsRoute("/connexion"), true);
  assert.equal(isSensitiveAnalyticsRoute("/student/consent"), true);
  assert.equal(isSensitiveAnalyticsRoute("/booking/abc"), true);
  assert.equal(isSensitiveAnalyticsRoute("/"), false);
});

test("posthog.ts gates on consent and sensitive routes", () => {
  const src = READ("lib/analytics/posthog.ts");
  assert.match(src, /hasAnalyticsConsent\(\)/);
  assert.match(src, /isSensitiveAnalyticsRoute/);
  assert.match(src, /getAnalyticsAnonymousId/);
  assert.doesNotMatch(src, /localStorage\.setItem\(ANON_KEY/);
});

test("readPostHogConfig unchanged when key missing", () => {
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  assert.equal(readPostHogConfig(), null);
});

// ── Runner ──────────────────────────────────────────────────────────────────

async function run() {
  let passed = 0;
  for (const { name, fn } of tests) {
    await fn();
    passed++;
    console.log(`ok - ${name}`);
  }
  console.log(`[privacy:cookieConsent] ${passed} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
