import { NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/cron/auth";
import { processLearnerDemandMatches } from "@/lib/learnerDemandNotifications";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

async function runCron(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  const admin = getSupabaseAdmin();
  const summary = await processLearnerDemandMatches(admin, { limit: 100 });
  console.info("[cron/learner-demand]", summary);
  return NextResponse.json({ ok: true, ...summary });
}

/** Vercel Cron issues GET requests by default. */
export async function GET(request: Request) {
  try {
    return await runCron(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron failed";
    console.error("[cron/learner-demand]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Allow secured manual reruns with the same cron secret. */
export async function POST(request: Request) {
  return GET(request);
}
