// Lightweight Sentry capture — fetch-based, dependency-free.
//
// Why not @sentry/nextjs
// ----------------------
// `@sentry/nextjs` is excellent BUT it:
//   - adds a new npm dependency, source maps upload, build-time
//     `next.config` wrapping, and an `instrumentation.ts` file,
//   - injects a ~150KB browser SDK that auto-captures DOM events that
//     could include message bodies / addresses (similar concern to
//     PostHog autocapture).
//
// Pratiqo is shipping a closed-beta launch. The senior-engineer move is
// to ship a minimal capture path now that:
//   1. unblocks production error visibility,
//   2. never throws,
//   3. costs zero bundle weight when DSN is missing (no-op).
//
// When the team wants tracing / replays / source-maps / breadcrumbs, the
// brief calls out `@sentry/nextjs` as the documented upgrade path
// (see `docs/ANALYTICS_AND_MONITORING.md`).
//
// What this does
// --------------
// `captureMonitoringError()` parses the configured DSN, builds a Sentry
// "envelope" (event payload), and POSTs it to the Sentry ingest URL with
// `keepalive`. Same redaction floor as PostHog: the message is truncated,
// extra context is sanitized to drop sensitive keys.

import { sanitizeAnalyticsProperties } from "@/lib/analytics/posthog";
import { hasDiagnosticsConsent } from "@/lib/privacy/cookieConsent";

type ParsedDsn = {
  publicKey: string;
  projectId: string;
  ingestUrl: string;
};

const MAX_MESSAGE_LENGTH = 1024;

const MONITORING_FORBIDDEN_KEY_FRAGMENTS = [
  "password",
  "token",
  "secret",
  "auth",
  "cookie",
  "stripe",
  "card",
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
  "geo",
  "body",
  "content",
  "message_body",
  "raw_query",
  "email",
  "phone",
  "mobile",
  "refresh",
  "access_token",
  "payment",
  "booking_note",
  "note",
  "name",
  "profile",
  "student",
  "teacher",
  "replay",
  "session_recording",
] as const;

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/g;

export function isForbiddenMonitoringKey(key: string): boolean {
  const lower = key.toLowerCase();
  return MONITORING_FORBIDDEN_KEY_FRAGMENTS.some((frag) => lower.includes(frag));
}

export function scrubMonitoringMessage(message: string): string {
  if (!message) return "";
  const redacted = message
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(PHONE_PATTERN, "[redacted-phone]");
  if (redacted.length <= MAX_MESSAGE_LENGTH) return redacted;
  return `${redacted.slice(0, MAX_MESSAGE_LENGTH)}…[truncated]`;
}

function sanitizeMonitoringProperties(
  input: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const base = sanitizeAnalyticsProperties(input);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(base)) {
    if (isForbiddenMonitoringKey(key)) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Parse a Sentry DSN of the form
 *   https://<publicKey>@<host>/<projectId>
 * into the pieces we need to build an ingest URL. Returns null on any
 * shape we don't understand — capture then no-ops.
 */
export function parseSentryDsn(dsn: string | null | undefined): ParsedDsn | null {
  if (!dsn?.trim()) return null;
  try {
    const url = new URL(dsn.trim());
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\/+/, "").split("/").pop() ?? "";
    if (!publicKey || !projectId || !/^\d+$/.test(projectId)) return null;
    const ingestUrl = `${url.protocol}//${url.host}/api/${projectId}/store/`;
    return { publicKey, projectId, ingestUrl };
  } catch {
    return null;
  }
}

function readDsn(): string | null {
  // Server first, then the public-readable copy for browser code paths.
  // We intentionally do NOT default the public DSN from the server DSN —
  // a misconfigured deploy would silently leak the server DSN to the
  // browser bundle. Keep them separate.
  if (typeof window === "undefined") {
    return process.env.SENTRY_DSN?.trim() || null;
  }
  return process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || null;
}

export type MonitoringLevel = "error" | "warning" | "info";

export type MonitoringContext = {
  /** Free-form tags. Keys/values pass through the analytics sanitizer. */
  tags?: Record<string, string | number | boolean | null | undefined>;
  /** Extra context. Same redaction rules — no message bodies, addresses, secrets. */
  extra?: Record<string, unknown>;
  /** Logical area: "messaging", "booking", "admin", "yopratiqo", "auth", … */
  area?: string;
  /** Optional internal user id; never an email. */
  userId?: string | null;
};

function truncateMessage(msg: string): string {
  return scrubMonitoringMessage(msg);
}

type SentryStoreBody = {
  event_id: string;
  timestamp: number;
  level: MonitoringLevel;
  platform: "javascript" | "node";
  logger: string;
  release?: string;
  environment?: string;
  message: { formatted: string };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id: string };
};

function shouldCaptureInBrowser(): boolean {
  if (typeof window === "undefined") return true;
  return hasDiagnosticsConsent();
}

/**
 * Fire-and-forget structured error report to Sentry. Never throws.
 * Returns true if a request was issued, false if no-op (missing DSN, no
 * message, etc.) — useful for tests + dev diagnostics.
 */
export function captureMonitoringError(
  message: string,
  context?: MonitoringContext,
  level: MonitoringLevel = "error",
): boolean {
  if (!shouldCaptureInBrowser()) return false;
  const dsnRaw = readDsn();
  const parsed = parseSentryDsn(dsnRaw);
  if (!parsed) return false;
  if (!message || typeof message !== "string") return false;

  const sanitizedExtra = sanitizeMonitoringProperties(context?.extra ?? {});
  const sanitizedTagsRaw = sanitizeMonitoringProperties(context?.tags ?? {});
  const tags: Record<string, string> = {};
  for (const [k, v] of Object.entries(sanitizedTagsRaw)) {
    if (v === null || v === undefined) continue;
    if (isForbiddenMonitoringKey(k)) continue;
    tags[k] = String(v);
  }
  if (context?.area && !isForbiddenMonitoringKey("area")) tags["area"] = context.area;

  const body: SentryStoreBody = {
    event_id: randomEventId(),
    timestamp: Math.floor(Date.now() / 1000),
    level,
    platform: typeof window === "undefined" ? "node" : "javascript",
    logger: "pratiqo",
    environment: process.env.NODE_ENV,
    message: { formatted: truncateMessage(message) },
    tags,
    extra: sanitizedExtra,
  };
  if (context?.userId && !context.userId.includes("@")) {
    body.user = { id: context.userId };
  }

  // Sentry public envelope auth header. The public key is safe to embed
  // — Sentry treats it as a write-only ingest credential.
  const authHeader = `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=pratiqo-fetch/0.1`;

  try {
    void fetch(parsed.ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": authHeader,
      },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      /* best-effort */
    });
    return true;
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[monitoring/sentry] capture threw", e);
    }
    return false;
  }
}

function randomEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  // Fallback for older runtimes — 32 hex chars.
  const a = Math.random().toString(16).slice(2).padStart(16, "0");
  const b = Math.random().toString(16).slice(2).padStart(16, "0");
  return (a + b).slice(0, 32);
}
