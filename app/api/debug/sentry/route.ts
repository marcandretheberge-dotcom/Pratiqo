import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Development-only endpoint to verify the Sentry pipeline.
 *
 * - Throws when called with no query param → tests `onRequestError` capture.
 * - `?mode=capture` → tests explicit `captureException`.
 * - `?mode=message` → tests `captureMessage`.
 *
 * Hard-gated to non-production environments. In production this returns 404,
 * matching Next's default missing-route behavior, so it cannot be probed.
 *
 * Lives under /api/debug/ rather than a leading-underscore folder because
 * Next.js App Router treats `_folder` as a private folder and excludes it
 * from routing.
 */
export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const env =
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
  if (env === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const mode = new URL(request.url).searchParams.get("mode");

  if (mode === "capture") {
    Sentry.captureException(new Error("Pratiqo Sentry pipeline probe (capture)"), {
      tags: { surface: "sentry-test", phase: "explicit" },
    });
    return NextResponse.json({ ok: true, mode: "capture" });
  }

  if (mode === "message") {
    Sentry.captureMessage("Pratiqo Sentry pipeline probe (message)", "info");
    return NextResponse.json({ ok: true, mode: "message" });
  }

  // Default: throw so the framework + instrumentation.ts pathway captures it.
  throw new Error("Pratiqo Sentry pipeline probe (uncaught throw)");
}
