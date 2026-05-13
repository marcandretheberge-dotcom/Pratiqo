// Edge runtime Sentry initialization.
// Loaded by instrumentation.ts when NEXT_RUNTIME === "edge".
// Cache-bust marker: see sentry.client.config.ts for the rationale.
//
// Edge has a much smaller SDK footprint than the Node SDK. Performance tracing
// is intentionally off here — edge functions are short-lived and tracing
// overhead matters more than the data.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ??
      (process.env.NODE_ENV === "production" ? "production" : "development"),
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    ignoreErrors: ["NEXT_NOT_FOUND", "NEXT_REDIRECT"],
  });
}
