import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logError } from "@/lib/log";
import { rateLimitByIp, rateLimitResponse } from "@/lib/rateLimit";
import { validateJsonBody } from "@/lib/validation/api";
import { waitlistPostSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const validated = await validateJsonBody(waitlistPostSchema, req);
    if (!validated.ok) return validated.response;
    const { email, feature } = validated.data;

    const rl = await rateLimitByIp(req, "waitlist", { limit: 5, windowSeconds: 600 });
    if (!rl.allowed && rl.retryAfterSeconds != null) {
      return rateLimitResponse(rl.retryAfterSeconds, {
        limit: rl.limit,
        remaining: rl.remaining,
        reset: rl.reset,
      });
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin.from("waitlist").insert({ email, feature });
    if (error) {
      logError("[waitlist] insert failed", {
        message: error.message,
        code: (error as { code?: string }).code,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    logError("[waitlist] unexpected error", { err: e });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
