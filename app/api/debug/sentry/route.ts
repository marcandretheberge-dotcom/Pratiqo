import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Sentry pipeline diagnostic + probe.
 *
 * Behavior depends on query param + environment:
 *
 *   GET /api/debug/sentry              → ALL ENVS: returns env-var presence
 *                                        report (booleans + lengths only;
 *                                        never leaks DSN values).
 *   GET /api/debug/sentry?mode=capture → non-prod only: explicit captureException.
 *   GET /api/debug/sentry?mode=message → non-prod only: captureMessage.
 *   GET /api/debug/sentry?mode=throw   → non-prod only: uncaught throw.
 *
 * The diagnostic mode is intentionally exposed in production. It reveals:
 *   - whether process.env.NEXT_PUBLIC_SENTRY_DSN was set when the build ran
 *     (Next.js inlines NEXT_PUBLIC_* at build time)
 *   - whether process.env.SENTRY_DSN is set at server runtime
 *   - the runtime tag and the deployment's Vercel env
 *
 * No part of the DSN value is ever returned — only `present: boolean` + length.
 */
export const runtime = "nodejs";

function isNonProd(): boolean {
  const env =
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
  return env !== "production";
}

export async function GET(request: Request): Promise<NextResponse> {
  const mode = new URL(request.url).searchParams.get("mode");

  // -----------------------------------------------------------------
  // Non-prod-only modes (these actually fire events / throw)
  // -----------------------------------------------------------------
  if (mode === "capture") {
    if (!isNonProd()) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    Sentry.captureException(new Error("Pratiqo Sentry pipeline probe (capture)"), {
      tags: { surface: "sentry-test", phase: "explicit" },
    });
    return NextResponse.json({ ok: true, mode: "capture" });
  }

  if (mode === "message") {
    if (!isNonProd()) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    Sentry.captureMessage("Pratiqo Sentry pipeline probe (message)", "info");
    return NextResponse.json({ ok: true, mode: "message" });
  }

  if (mode === "throw") {
    if (!isNonProd()) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    throw new Error("Pratiqo Sentry pipeline probe (uncaught throw)");
  }

  // -----------------------------------------------------------------
  // Default: read-only diagnostic, safe in ALL environments
  // -----------------------------------------------------------------
  // process.env.NEXT_PUBLIC_SENTRY_DSN: Next inlines NEXT_PUBLIC_* at build,
  // so the value we read here on a server route is the same string that the
  // browser bundle saw. If absent here, it was absent at build time.
  const npDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const srvDsn = process.env.SENTRY_DSN;
  const sha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;

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
  });
}
