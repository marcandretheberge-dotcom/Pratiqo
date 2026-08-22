import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cancelPlannedPackagePendingOrder } from "@/lib/offers/createPlannedPackagePendingOrder";
import { canUsePlannedPackageTemporaryHolds } from "@/lib/offers/plannedPackageTemporaryHolds";

export const runtime = "nodejs";

type Params = { params: Promise<{ orderId: string }> };

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
  if (!canUsePlannedPackageTemporaryHolds()) {
    return NextResponse.json({ error: "temporary_holds_disabled" }, { status: 403 });
  }
  const auth = await requireStudentUser(req);
  if (!auth.ok) return auth.response;
  const { orderId } = await ctx.params;
  try {
    const result = await cancelPlannedPackagePendingOrder({
      studentId: auth.userId,
      orderId,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ order: result.order });
  } catch {
    return NextResponse.json({ error: "pending_order_creation_failed" }, { status: 500 });
  }
}
