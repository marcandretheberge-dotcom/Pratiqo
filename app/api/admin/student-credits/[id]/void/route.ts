// Admin → Void a student credit (unused only)
//
//   POST /api/admin/student-credits/:id/void
//
// Security: requireAdminApi + mandatory void reason.
// Atomic RPC (migration 088) rejects partial use / insufficient balance.
// Does not change Stripe checkout math or create refunds.

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { voidStudentCredit } from "@/lib/admin/studentCredits";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type PostBody = {
  voidReason?: unknown;
  reason?: unknown;
};

export async function POST(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: actor } = auth;

  const { id } = await ctx.params;

  let body: PostBody = {};
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const result = await voidStudentCredit(
    admin,
    actor,
    id,
    body.voidReason ?? body.reason,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  console.log(
    `[admin/student-credits] void actor=${actor.id} credit=${result.credit.id} balance=${result.credit.new_credit_balance ?? "?"}`,
  );
  return NextResponse.json({ ok: true, credit: result.credit });
}
