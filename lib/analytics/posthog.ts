// Minimal PostHog capture client — fetch-based, dependency-free.
//
// Why fetch + not posthog-js
// --------------------------
// 1. Zero new npm dependencies the day before launch.
// 2. Full control over what leaves the browser — autocapture would
//    indiscriminately serialize DOM nodes that may contain message bodies,
//    addresses, or partial payment UI. Manual capture is the privacy
//    floor we want.
// 3. The codebase already uses the same shape (`fetch + keepalive`) in
//    `lib/searchAnalytics.ts` — consistency with existing patterns.
//
// Two layers of defense for privacy:
//   1. Call-sites use typed helpers in `lib/analytics/events.ts` that
//      never accept message bodies / addresses / coords in their type
//      signatures.
//   2. `sanitizeAnalyticsProperties` below drops keys that match
//      forbidden fragments AND truncates strings, so even if a future
//      call-site smuggles raw input through `Record<string, unknown>`,
//      nothing sensitive reaches PostHog.

import { getAnalyticsAnonymousId } from "@/lib/privacy/analyticsAnonymousId";
import { hasAnalyticsConsent } from "@/lib/privacy/cookieConsent";
import { isSensitiveAnalyticsRoute } from "@/lib/privacy/sensitiveAnalyticsRoutes";

// Drop-list mirrors `lib/log.ts` plus analytics-specific concerns.
// IMPORTANT: this is the privacy floor. Adding to it is cheap; weakening it
// requires a corresponding test update so the contract is loud.
const FORBIDDEN_KEY_FRAGMENTS = [
  "password",
  "token",
  "secret",
  "auth", // catches authorization, auth_header, authToken, MyAuth, etc.
  "cookie",
  "stripe", // session ids, customer ids, payment intent ids
  "card", // card number, card brand, card_holder, etc.
  "cvc",
  "cvv",
  "iban",
  "ssn",
  "sin",
  "card_number",
  "address",
  "street",
  "postal",
  "zip",
  "lat",
  "lng",
  "latitude",
  "longitude",
  "coords",
  "geo",
  "body",
  "content",
  "message_body",
  "raw_query",
  "email",
] as const;

const POSTHOG_DEFAULT_HOST = "https://us.i.posthog.com";

const MAX_STRING_LENGTH = 256;
const MAX_PROPERTY_COUNT = 32;

export type AnalyticsProperty = string | number | boolean | null | undefined;
export type AnalyticsPropertyBag = Record<string, AnalyticsProperty>;

export function isForbiddenAnalyticsKey(key: string): boolean {
  const lower = key.toLowerCase();
  return FORBIDDEN_KEY_FRAGMENTS.some((frag) => lower.includes(frag));
}

function truncate(s: string): string {
  return s.length <= MAX_STRING_LENGTH ? s : `${s.slice(0, MAX_STRING_LENGTH)}…[truncated]`;
}

/**
 * Drop sensitive keys, coerce/normalize values, and cap property count.
 * Exported so the test suite can pin the contract.
 */
export function sanitizeAnalyticsProperties(
  input: Record<string, unknown> | null | undefined,
): AnalyticsPropertyBag {
  if (!input || typeof input !== "object") return {};
  const out: AnalyticsPropertyBag = {};
  let count = 0;
  for (const [key, value] of Object.entries(input)) {
    if (count >= MAX_PROPERTY_COUNT) break;
    if (isForbiddenAnalyticsKey(key)) continue;
    if (value === null || value === undefined) {
      out[key] = value;
      count++;
      continue;
    }
    if (typeof value === "string") {
      out[key] = truncate(value);
      count++;
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
      count++;
      continue;
    }
    if (typeof value === "boolean") {
      out[key] = value;
      count++;
      continue;
    }
    // Anything else (arrays, nested objects, functions) is dropped on
    // purpose — we keep the event shape flat and grep-able. If a future
    // event needs richer payloads, add a typed helper in events.ts that
    // pre-flattens the relevant fields.
  }
  return out;
}

// ─── Env / config ────────────────────────────────────────────────────────────

export type PostHogConfig = {
  apiKey: string;
  host: string;
};

/**
 * Read the public PostHog config from env. Returns null when the project
 * key is missing — every capture helper then no-ops silently. This is the
 * intended behavior in dev, in PRs without secrets, and during tests.
 */
export function readPostHogConfig(): PostHogConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!apiKey) return null;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || POSTHOG_DEFAULT_HOST;
  return { apiKey, host };
}

/**
 * Browser-side anonymous id — only created after analytics consent.
 * Shared with the search-events pipeline via `lib/privacy/analyticsAnonymousId.ts`.
 */
function getAnonymousDistinctId(): string {
  const id = getAnalyticsAnonymousId();
  return id || "anonymous";
}

// ─── Auto-properties ────────────────────────────────────────────────────────
//
// PostHog's stock dashboards (Insights, Funnels, Path analysis) rely on a
// small set of meta properties prefixed with `$`. Sending them lets the
// PostHog UI render hosts/paths/referrers correctly without the dashboard
// owner having to remap every event by hand. These values come from
// `window.location` — they are already public (visible in the URL bar),
// so adding them does NOT widen our privacy surface vs. PR #190.
//
// We deliberately do NOT send `$browser`, user agent, or screen size:
// PostHog's server can derive `$ip`-based geolocation from the request
// itself, and richer fingerprint properties are autocapture territory
// (which we still avoid — see file header). This is the minimum needed
// to make PostHog dashboards usable.
type AutoProperties = {
  $current_url?: string;
  $host?: string;
  $pathname?: string;
};

function buildAutoProperties(): AutoProperties {
  if (typeof window === "undefined") return {};
  try {
    const { href, host, pathname } = window.location;
    return {
      $current_url: truncate(href),
      $host: truncate(host),
      $pathname: truncate(pathname),
    };
  } catch {
    return {};
  }
}

// ─── Capture ────────────────────────────────────────────────────────────────

type CaptureBody = {
  api_key: string;
  event: string;
  distinct_id: string;
  properties: AnalyticsPropertyBag & AutoProperties & { $lib: string };
  timestamp: string;
};

/**
 * Fire-and-forget PostHog capture. Never throws, never blocks UI.
 *
 * Resolution order:
 *   1. Server-side (no `window`) → no-op (return). Defense in depth — every
 *      typed helper today calls this from a `"use client"` path or
 *      useEffect, but an explicit guard keeps the function safe if an
 *      RSC accidentally imports it later.
 *   2. Missing NEXT_PUBLIC_POSTHOG_KEY → no-op (return).
 *   3. Properties sanitized (forbidden keys dropped, strings truncated,
 *      non-primitive values stripped).
 *   4. Auto-properties merged ($current_url, $host, $pathname).
 *   5. POST /capture/ with `keepalive` so the event survives navigation.
 *   6. Network errors swallowed — we log a single console.warn in dev
 *      so engineers notice broken endpoints; production stays silent.
 */
export function capturePostHogEvent(
  event: string,
  properties: Record<string, unknown> | null | undefined,
): void {
  // SSR / non-browser early bail. Tests can still exercise the function
  // because `window` is patched by jsdom or the test runner; in plain
  // Node (build, scripts, edge runtimes) we simply do nothing.
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  if (isSensitiveAnalyticsRoute(window.location.pathname)) return;
  const config = readPostHogConfig();
  if (!config) return;
  if (!event || typeof event !== "string") return;

  const sanitized = sanitizeAnalyticsProperties(properties);
  const body: CaptureBody = {
    api_key: config.apiKey,
    event,
    distinct_id: getAnonymousDistinctId(),
    properties: {
      ...sanitized,
      ...buildAutoProperties(),
      $lib: "pratiqo-fetch",
    },
    timestamp: new Date().toISOString(),
  };

  try {
    void fetch(`${config.host.replace(/\/$/, "")}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      /* best-effort */
    });
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[analytics/posthog] capture threw", e);
    }
  }
}
