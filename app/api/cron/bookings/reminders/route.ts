import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron/auth";
import { processBookingReminders } from "@/lib/bookings/reminders";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

async function runCron(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  const admin = getSupabaseAdmin();
  const summary = await processBookingReminders(admin);

  console.info("[cron/bookings/reminders]", summary);

  return NextResponse.json({ ok: true, ...summary });
}

/** Vercel Cron issues GET requests by default. */
export async function GET(req: Request) {
  try {
    return await runCron(req);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cron failed";
    console.error("[cron/bookings/reminders]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Allow manual POST triggers with the same secret. */
export async function POST(req: Request) {
  return GET(req);
}
