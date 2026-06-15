// Regression suite for feat/posthog-sentry-instrumentation.
//
// Two layers of pins:
//   - Behavioral: directly imports the helpers and asserts no-op,
//     sanitizer drops, DSN parsing, etc.
//   - Source-scan: walks the wired call-sites and asserts they import
//     ONLY the typed helpers, that they never embed message bodies /
//     emails / addresses in the event payloads, and that the docs stay
//     in sync with the taxonomy.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ANALYTICS_EVENTS,
  trackAdminRoleChangeCompleted,
  trackAdminRoleChangeFailed,
  trackAdminRoleChangeStarted,
  trackAdminUsersViewed,
  trackBookingCheckoutStarted,
  trackBookingSlotSelected,
  trackBookingStarted,
  trackLandingViewed,
  trackMessageSent,
  trackMessageThreadOpened,
  trackSearchAvailabilityFilterUsed,
  trackSearchFormatSelected,
  trackSearchLocationSelected,
  trackSearchStarted,
  trackSearchSubjectSelected,
  trackTeacherCardClicked,
  trackTeacherProfileViewed,
  trackYopratiqoIntroStarted,
  trackYopratiqoLandingViewed,
  type AnalyticsEventName,
} from "@/lib/analytics/events";
import {
  capturePostHogEvent,
  isForbiddenAnalyticsKey,
  readPostHogConfig,
  sanitizeAnalyticsProperties,
} from "@/lib/analytics/posthog";
import {
  captureMonitoringError,
  parseSentryDsn,
} from "@/lib/monitoring/sentry";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
const test = (name: string, fn: TestFn) => tests.push({ name, fn });

const READ = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

// ── Event-name taxonomy ─────────────────────────────────────────────────────

test("ANALYTICS_EVENTS contains every event the brief enumerates", () => {
  const required = [
    "landing_viewed",
    "search_started",
    "search_subject_selected",
    "search_location_selected",
    "search_format_selected",
    "search_availability_filter_used",
    "teacher_card_clicked",
    "teacher_profile_viewed",
    "booking_started",
    "booking_slot_selected",
    "booking_checkout_started",
    "booking_completed",
    "booking_cancel_started",
    "booking_cancel_completed",
    "message_sent",
    "message_thread_opened",
    "message_email_notification_queued",
    "message_email_notification_failed",
    "yopratiqo_landing_viewed",
    "yopratiqo_intro_started",
    "yopratiqo_lesson_started",
    "yopratiqo_lesson_completed",
    "yopratiqo_printable_opened",
    "admin_users_viewed",
    "admin_role_change_started",
    "admin_role_change_completed",
    "admin_role_change_failed",
  ] satisfies AnalyticsEventName[];
  const present = new Set(Object.values(ANALYTICS_EVENTS) as string[]);
  for (const ev of required) {
    assert.ok(present.has(ev), `taxonomy missing required event: ${ev}`);
  }
});

test("ANALYTICS_EVENTS has no duplicate event names", () => {
  const values = Object.values(ANALYTICS_EVENTS) as string[];
  const unique = new Set(values);
  assert.equal(unique.size, values.length, "duplicate event name detected in ANALYTICS_EVENTS");
});

test("ANALYTICS_EVENTS values are snake_case (no kebab, no camel, no spaces)", () => {
  for (const v of Object.values(ANALYTICS_EVENTS) as string[]) {
    assert.match(v, /^[a-z0-9]+(?:_[a-z0-9]+)*$/, `non-snake_case event name: ${v}`);
  }
});

// ── PostHog capture no-op + sanitizer contract ──────────────────────────────

test("readPostHogConfig returns null when NEXT_PUBLIC_POSTHOG_KEY is missing", () => {
  const prev = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  try {
    assert.equal(readPostHogConfig(), null);
  } finally {
    if (prev !== undefined) process.env.NEXT_PUBLIC_POSTHOG_KEY = prev;
  }
});

test("readPostHogConfig defaults host to the US ingest when only key is set", () => {
  const prevKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const prevHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
  delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  try {
    const cfg = readPostHogConfig();
    assert.ok(cfg);
    assert.equal(cfg!.apiKey, "phc_test");
    assert.match(cfg!.host, /posthog\.com$/);
  } finally {
    if (prevKey !== undefined) process.env.NEXT_PUBLIC_POSTHOG_KEY = prevKey;
    else delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (prevHost !== undefined) process.env.NEXT_PUBLIC_POSTHOG_HOST = prevHost;
  }
});

test("capturePostHogEvent never throws when env is missing", () => {
  const prev = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  try {
    assert.doesNotThrow(() =>
      capturePostHogEvent("landing_viewed", { path: "/" }),
    );
  } finally {
    if (prev !== undefined) process.env.NEXT_PUBLIC_POSTHOG_KEY = prev;
  }
});

test("sanitizeAnalyticsProperties drops every forbidden key fragment", () => {
  // Hardcoded list of keys the brief and the docs both promise to drop.
  const forbidden = [
    "password",
    "passwordHash",
    "auth_token",
    "secret_key",
    "Authorization",
    "cookie",
    "stripe_session_id",
    "card_number",
    "cvc",
    "cvv",
    "iban",
    "ssn",
    "sin",
    "address",
    "street",
    "postal",
    "zip",
    "lat",
    "lng",
    "latitude",
    "longitude",
    "coords",
    "geo_point",
    "body",
    "message_body",
    "content",
    "raw_query",
    "email",
    "user_email",
  ];
  const input: Record<string, unknown> = {
    teacher_id: "abc",
    keep_me: 42,
  };
  for (const f of forbidden) input[f] = "leak-me";
  const out = sanitizeAnalyticsProperties(input);
  assert.equal(out.teacher_id, "abc");
  assert.equal(out.keep_me, 42);
  for (const f of forbidden) {
    assert.ok(!(f in out), `sanitizer leaked forbidden key: ${f}`);
  }
});

test("sanitizeAnalyticsProperties truncates strings over 256 chars", () => {
  const long = "x".repeat(1000);
  const out = sanitizeAnalyticsProperties({ note: long });
  assert.ok(typeof out.note === "string");
  assert.ok((out.note as string).length <= 256 + 16, "string was not truncated");
  assert.match(out.note as string, /\[truncated\]$/);
});

test("sanitizeAnalyticsProperties caps payload at 32 properties", () => {
  const input: Record<string, unknown> = {};
  for (let i = 0; i < 100; i++) input[`k${i}`] = i;
  const out = sanitizeAnalyticsProperties(input);
  assert.ok(Object.keys(out).length <= 32, `payload not capped: ${Object.keys(out).length}`);
});

test("sanitizeAnalyticsProperties drops nested objects / arrays / functions", () => {
  const out = sanitizeAnalyticsProperties({
    keep: "yes",
    nested: { secret: "leak" },
    list: ["leak"],
    fn: () => "leak",
  });
  assert.equal(out.keep, "yes");
  assert.ok(!("nested" in out));
  assert.ok(!("list" in out));
  assert.ok(!("fn" in out));
});

test("isForbiddenAnalyticsKey is case-insensitive and substring-based", () => {
  assert.equal(isForbiddenAnalyticsKey("UserEmail"), true);
  assert.equal(isForbiddenAnalyticsKey("MyAuth"), true);
  assert.equal(isForbiddenAnalyticsKey("STRIPE_SESSION"), true);
  assert.equal(isForbiddenAnalyticsKey("benign_property"), false);
  assert.equal(isForbiddenAnalyticsKey("teacher_id"), false);
});

// ── Sentry shim contract ────────────────────────────────────────────────────

test("parseSentryDsn returns null for empty / malformed input", () => {
  assert.equal(parseSentryDsn(null), null);
  assert.equal(parseSentryDsn(undefined), null);
  assert.equal(parseSentryDsn(""), null);
  assert.equal(parseSentryDsn("not-a-url"), null);
  assert.equal(parseSentryDsn("https://no-project@example.com/"), null);
  assert.equal(parseSentryDsn("https://nokey-host/123"), null);
});

test("parseSentryDsn extracts publicKey + projectId + ingestUrl from a valid DSN", () => {
  const parsed = parseSentryDsn("https://abc123@o123.ingest.sentry.io/45678");
  assert.ok(parsed);
  assert.equal(parsed!.publicKey, "abc123");
  assert.equal(parsed!.projectId, "45678");
  assert.match(parsed!.ingestUrl, /\/api\/45678\/store\/$/);
});

test("captureMonitoringError returns false (no-op) when DSN env is empty", () => {
  const prevServer = process.env.SENTRY_DSN;
  const prevPublic = process.env.NEXT_PUBLIC_SENTRY_DSN;
  delete process.env.SENTRY_DSN;
  delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  try {
    assert.equal(captureMonitoringError("test message"), false);
  } finally {
    if (prevServer !== undefined) process.env.SENTRY_DSN = prevServer;
    if (prevPublic !== undefined) process.env.NEXT_PUBLIC_SENTRY_DSN = prevPublic;
  }
});

test("captureMonitoringError never throws even with a malformed DSN", () => {
  const prev = process.env.SENTRY_DSN;
  process.env.SENTRY_DSN = "not-a-dsn";
  try {
    assert.doesNotThrow(() => captureMonitoringError("test"));
  } finally {
    if (prev !== undefined) process.env.SENTRY_DSN = prev;
    else delete process.env.SENTRY_DSN;
  }
});

// ── Typed track helpers exist + no-op safely ────────────────────────────────

test("All typed track helpers are safely no-ops without env", () => {
  const prev = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  try {
    assert.doesNotThrow(() => {
      trackLandingViewed({ path: "/" });
      trackSearchStarted({ source: "landing" });
      trackSearchSubjectSelected({ source: "landing", subject_id: "piano", query_length: 5 });
      trackSearchLocationSelected({ source: "landing", region: "qc", country_code: "ca" });
      trackSearchFormatSelected({ source: "landing", format: "online" });
      trackSearchAvailabilityFilterUsed({ source: "landing", day: "monday", period: "evening" });
      trackTeacherCardClicked({ source: "landing", teacher_id: "abc", position: 1 });
      trackTeacherProfileViewed({ teacher_id: "abc" });
      trackBookingStarted({ teacher_id: "abc" });
      trackBookingSlotSelected({ teacher_id: "abc", period: "evening" });
      trackBookingCheckoutStarted({ teacher_id: "abc", price_cad: 50 });
      trackMessageSent({ thread_id: "c1" });
      trackMessageThreadOpened({ thread_id: "c1" });
      trackYopratiqoLandingViewed({ language: "espagnol", locale: "fr" });
      trackYopratiqoIntroStarted({ language: "espagnol", locale: "fr" });
      trackAdminUsersViewed({ rendered_count: 12 });
      trackAdminRoleChangeStarted({ previous_role: "student", new_role: "teacher" });
      trackAdminRoleChangeCompleted({
        previous_role: "student",
        new_role: "teacher",
        target_id: "uuid",
      });
      trackAdminRoleChangeFailed({
        previous_role: "student",
        new_role: "teacher",
        reason_code: "self_mutation",
      });
    });
  } finally {
    if (prev !== undefined) process.env.NEXT_PUBLIC_POSTHOG_KEY = prev;
  }
});

// ── Source-scan: call-site wiring ───────────────────────────────────────────

test("PostHogPageView is mounted in app/providers.tsx", () => {
  const providers = READ("app/providers.tsx");
  assert.match(providers, /from\s+["']@\/components\/analytics\/PostHogPageView["']/);
  assert.match(providers, /<PostHogPageView\s*\/>/);
});

test("LandingPageClient wires trackSearchStarted / trackTeacherProfileViewed / trackBookingStarted", () => {
  const src = READ("app/LandingPageClient.tsx");
  assert.match(src, /from\s+["']@\/lib\/analytics\/events["']/);
  assert.match(src, /trackSearchStarted\(/);
  assert.match(src, /trackTeacherCardClicked\(/);
  assert.match(src, /trackTeacherProfileViewed\(/);
  assert.match(src, /trackBookingStarted\(/);
});

test("BookingModal wires trackBookingSlotSelected + trackBookingCheckoutStarted (intent only, before Stripe)", () => {
  const src = READ("components/BookingModal.tsx");
  assert.match(src, /trackBookingSlotSelected\(/);
  // Checkout-started must appear BEFORE the Stripe fetch call.
  const checkoutCallIdx = src.indexOf("trackBookingCheckoutStarted(");
  const stripeFetchIdx = src.indexOf("/api/stripe/checkout");
  assert.ok(checkoutCallIdx > 0, "trackBookingCheckoutStarted must be wired");
  assert.ok(stripeFetchIdx > checkoutCallIdx, "checkout-started event must fire BEFORE Stripe fetch");
});

test("Messages page wires trackMessageThreadOpened + trackMessageSent and never sends message body", () => {
  const src = READ("app/(app)/messages/page.tsx");
  assert.match(src, /trackMessageThreadOpened\(/);
  assert.match(src, /trackMessageSent\(/);
  // The trackMessageSent call must NOT include "content" / "body" /
  // "contentToSend" / "input" in its payload.
  const sentCallStart = src.indexOf("trackMessageSent(");
  assert.ok(sentCallStart > 0);
  const sentCallSnippet = src.slice(sentCallStart, sentCallStart + 400);
  for (const forbidden of ["content", "body", "contentToSend", "input", "message"]) {
    assert.doesNotMatch(
      sentCallSnippet,
      new RegExp(`\\b${forbidden}\\b\\s*:`),
      `trackMessageSent payload must not include "${forbidden}"`,
    );
  }
});

test("Admin users page wires viewed / role-change events and never sends target email", () => {
  const src = READ("app/(app)/admin/users/page.tsx");
  assert.match(src, /trackAdminUsersViewed\(/);
  assert.match(src, /trackAdminRoleChangeStarted\(/);
  assert.match(src, /trackAdminRoleChangeCompleted\(/);
  assert.match(src, /trackAdminRoleChangeFailed\(/);
  // None of the track*Admin payloads may include a property named
  // "email" / "target_email" / "actor_email" — those belong in the
  // server-side audit table, not in PostHog.
  for (const call of [
    "trackAdminRoleChangeStarted(",
    "trackAdminRoleChangeCompleted(",
    "trackAdminRoleChangeFailed(",
  ]) {
    const start = src.indexOf(call);
    assert.ok(start > 0, `${call} must be wired`);
    const snippet = src.slice(start, start + 500);
    for (const forbidden of ["email", "target_email", "actor_email", "name:"]) {
      assert.doesNotMatch(
        snippet,
        new RegExp(`\\b${forbidden}`),
        `${call} payload must not include "${forbidden}"`,
      );
    }
  }
});

test("YoPratiqo intro/landing tracked via PostHogPageView (pathname-driven)", () => {
  const src = READ("components/analytics/PostHogPageView.tsx");
  assert.match(src, /trackYopratiqoLandingViewed/);
  assert.match(src, /trackYopratiqoIntroStarted/);
  assert.match(src, /\/yo\/langues\//);
});

// ── No-Stripe-internals guard in analytics modules ──────────────────────────

test("Analytics modules do not import Stripe / payment / messaging internals", () => {
  for (const rel of [
    "lib/analytics/events.ts",
    "lib/analytics/posthog.ts",
    "lib/monitoring/sentry.ts",
    "components/analytics/PostHogPageView.tsx",
  ]) {
    const src = READ(rel);
    for (const forbidden of [
      /from\s+["']stripe["']/,
      /@\/lib\/stripe/,
      /@\/lib\/messages/,
      /@\/lib\/messaging/,
      /@\/lib\/email/,
      /SUPABASE_SERVICE_ROLE_KEY/,
      /getSupabaseAdmin/,
    ]) {
      assert.doesNotMatch(src, forbidden, `${rel} must not import ${forbidden}`);
    }
  }
});

test("logError forwards to Sentry shim via lazy import (defense in depth, never throws)", () => {
  const src = READ("lib/log.ts");
  // Lazy dynamic import is used so non-monitored runtimes (scripts,
  // tests) don't pay for the module load. Accept either static `from`
  // or dynamic `import(...)`.
  assert.match(
    src,
    /(?:from\s+["']@\/lib\/monitoring\/sentry["']|import\(["']@\/lib\/monitoring\/sentry["']\))/,
    "lib/log.ts must reference @/lib/monitoring/sentry (static or dynamic import)",
  );
  assert.match(src, /captureMonitoringError/);
  // The forward must live inside logError() AND must be wrapped in a
  // try/catch so the monitoring path never breaks the product.
  const logErrorIdx = src.indexOf("export function logError");
  assert.ok(logErrorIdx >= 0, "logError export must exist");
  const logErrorBody = src.slice(logErrorIdx, logErrorIdx + 1500);
  assert.match(logErrorBody, /captureMonitoringError/);
  assert.match(logErrorBody, /try\s*\{/);
  assert.match(logErrorBody, /catch/);
});

// ── Docs sync ──────────────────────────────────────────────────────────────

test("docs/ANALYTICS_AND_MONITORING.md lists every event in the taxonomy", () => {
  const doc = READ("docs/ANALYTICS_AND_MONITORING.md");
  for (const event of Object.values(ANALYTICS_EVENTS) as string[]) {
    assert.ok(
      doc.includes(event),
      `docs/ANALYTICS_AND_MONITORING.md is missing event ${event}`,
    );
  }
});

test("docs/ANALYTICS_AND_MONITORING.md covers privacy restrictions explicitly", () => {
  const doc = READ("docs/ANALYTICS_AND_MONITORING.md");
  for (const must of [
    /Privacy rules/i,
    /never be tracked/i,
    /message bodies/i,
    /raw .*addresses/i,
    /[Ss]tripe/,
    /Sentry/,
    /PostHog/,
    /Deferred events/i,
  ]) {
    assert.match(doc, must, `docs missing required section: ${must}`);
  }
});

// ── .env.example placeholders still present ─────────────────────────────────

test(".env.example exposes the four analytics/observability placeholders without real values", () => {
  const env = READ(".env.example");
  for (const v of [
    "NEXT_PUBLIC_POSTHOG_KEY",
    "NEXT_PUBLIC_POSTHOG_HOST",
    "SENTRY_DSN",
    "NEXT_PUBLIC_SENTRY_DSN",
  ]) {
    // Each must appear AND be followed only by a newline (no committed value).
    assert.match(env, new RegExp(`${v}=\\s*$`, "m"), `${v} should be present with empty value`);
  }
});

// ── Run ────────────────────────────────────────────────────────────────────

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[analytics:postHogSentryInstrumentation] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
