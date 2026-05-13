// Browser-side Sentry initialization.
// Auto-discovered by @sentry/nextjs at build time (no explicit import needed).

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ??
      (process.env.NODE_ENV === "production" ? "production" : "development"),
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0.1,
    // Session Replay is intentionally off — captures user input which is a
    // privacy concern for a marketplace handling PII. Enable later behind a
    // separate toggle if/when we want it.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    ignoreErrors: [
      // Browser extension noise — not our code.
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      // Adblockers occasionally cancel fetches mid-flight.
      "AbortError: The operation was aborted",
    ],
  });
}
