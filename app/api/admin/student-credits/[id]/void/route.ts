// Admin → Void a student credit
//
//   POST /api/admin/student-credits/:id/void
//
// Security: requireAdminApi + mandatory void reason + ledger + audit.
// Does not mutate profiles.credit_balance or Stripe.

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

  console.log(`[admin/student-credits] void actor=${actor.id} credit=${result.credit.id}`);
  return NextResponse.json({ ok: true, credit: result.credit });
}
