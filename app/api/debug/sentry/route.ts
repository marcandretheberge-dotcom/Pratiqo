import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Sentry pipeline diagnostic + probe (non-production only).
 *
 *   GET /api/debug/sentry              → env-var presence report (lengths only).
 *   GET /api/debug/sentry?mode=capture → explicit captureException.
 *   GET /api/debug/sentry?mode=message → captureMessage.
 *   GET /api/debug/sentry?mode=throw   → uncaught throw.
 *
 * Returns 404 in production — no public diagnostic or intentional throws.
 */
export const runtime = "nodejs";

function isNonProd(): boolean {
  const env =
    process.env.VERCEL_ENV ??
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.NODE_ENV ??
    "development";
  return env !== "production";
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isNonProd()) {
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

  if (mode === "throw") {
    throw new Error("Pratiqo Sentry pipeline probe (uncaught throw)");
  }

  const npDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const srvDsn = process.env.SENTRY_DSN;
  const sha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;

  const client = Sentry.getClient();
  const transportName = client?.getTransport()?.constructor?.name ?? null;

  return NextResponse.json({
    runtime: "nodejs",
    vercelEnv: vercelEnv ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
    releaseSha: sha ? `${sha.slice(0, 7)}…` : null,
    NEXT_PUBLIC_SENTRY_DSN: {
      present: typeof npDsn === "string" && npDsn.length > 0,
      length: npDsn?.length ?? 0,
    },
    SENTRY_DSN: {
      present: typeof srvDsn === "string" && srvDsn.length > 0,
      length: srvDsn?.length ?? 0,
    },
    sdkLoaded: typeof Sentry.captureException === "function",
    sentryClientInitialized: Boolean(client),
    transportName,
  });
}
