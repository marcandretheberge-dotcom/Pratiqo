import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canUsePlannedPackageCheckoutPreflight } from "@/lib/offers/plannedPackageCheckoutPreflight";
import { runPlannedPackageCheckoutPreflight } from "@/lib/offers/runPlannedPackageCheckoutPreflight";

export const runtime = "nodejs";

type Params = { params: Promise<{ draftId: string }> };

async function requireStudentUser(req: Request): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { ok: false, response: NextResponse.json({ error: "server_error" }, { status: 500 }) };
  }
  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  }
  return { ok: true, userId: data.user.id };
}

export async function POST(req: Request, ctx: Params) {
  if (!canUsePlannedPackageCheckoutPreflight()) {
    return NextResponse.json({ error: "checkout_preflight_disabled" }, { status: 403 });
  }

  const auth = await requireStudentUser(req);
  if (!auth.ok) return auth.response;

  const { draftId } = await ctx.params;
  try {
    const outcome = await runPlannedPackageCheckoutPreflight({
      studentId: auth.userId,
      draftId,
    });
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }
    return NextResponse.json(outcome.result);
  } catch {
    return NextResponse.json({ error: "checkout_preflight_disabled" }, { status: 500 });
  }
}
