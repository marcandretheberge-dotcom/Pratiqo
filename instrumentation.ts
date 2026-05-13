// Next.js bootstrap hook (called once per server process per runtime).
// Dispatches to the right Sentry init file based on which runtime is loading.

import * as Sentry from "@sentry/nextjs";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Next 16: route handler errors are surfaced here. Without this hook,
// uncaught throws from route.ts files reach Sentry only via the SDK's
// catch-alls, which lose useful context (request URL, method, etc.).
export const onRequestError = Sentry.captureRequestError;
