// Server (Node.js) runtime Sentry initialization.
// Loaded by instrumentation.ts when NEXT_RUNTIME === "nodejs".

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ??
      (process.env.NODE_ENV === "production" ? "production" : "development"),
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    // Performance: sample modestly to stay under quota. Increase per route via
    // tracesSampler in code if a specific endpoint needs full tracing.
    tracesSampleRate: 0.1,
    // Capture printed messages from logWarn / console.error as breadcrumbs so
    // Sentry events include the lead-up to the exception.
    sendDefaultPii: false,
    // Don't double-report Next.js render errors that the framework already
    // formats into responses — let Next's onRequestError handle those.
    ignoreErrors: [
      // Routine HTTP errors that aren't actionable.
      "NEXT_NOT_FOUND",
      "NEXT_REDIRECT",
    ],
  });
}
