// Admin -> mark ambassador reward as manually paid.
//
// This does NOT trigger Stripe, Connect transfers or any automated payout.
// It records the manual/admin payout decision in the ambassador reward ledger.

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { markAdminAmbassadorRewardPaid } from "@/lib/admin/ambassadors";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type PostBody = {
  paymentNote?: unknown;
};

export async function POST(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: actor } = auth;
  const { id } = await ctx.params;

  let body: PostBody = {};
  try {
    body = (await req.json().catch(() => ({}))) as PostBody;
  } catch {
    body = {};
  }

  const result = await markAdminAmbassadorRewardPaid(
    admin,
    actor,
    id,
    body.paymentNote,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  console.log(`[admin/ambassador-rewards] mark-paid actor=${actor.id} reward=${id}`);
  return NextResponse.json({ ok: true, reward: result.value });
}
