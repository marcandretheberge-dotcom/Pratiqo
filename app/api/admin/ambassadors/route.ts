// Admin -> Ambassadors management API
//
// GET  /api/admin/ambassadors  -> list ambassador memberships
// POST /api/admin/ambassadors  -> activate an existing teacher as ambassador
//
// This surface only manages membership, links and admin reporting. It does
// not create payouts, touch Stripe, or change reward economics.

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import {
  activateAdminAmbassador,
  listAdminAmbassadors,
} from "@/lib/admin/ambassadors";

export const runtime = "nodejs";

type PostBody = {
  userIdentifier?: unknown;
  teacherId?: unknown; // legacy admin links may still prefill this
  preferredCode?: unknown;
  internalNote?: unknown;
};

export async function GET(req: Request) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin } = auth;

  try {
    const ambassadors = await listAdminAmbassadors(admin);
    return NextResponse.json({ ambassadors });
  } catch (e) {
    console.error("[admin/ambassadors] GET failed", e);
    return NextResponse.json(
      { error: "Impossible de charger les ambassadeurs." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: actor } = auth;

  let body: PostBody = {};
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const result = await activateAdminAmbassador(admin, actor, {
    userIdentifier: body.userIdentifier ?? body.teacherId,
    preferredCode: body.preferredCode,
    internalNote: body.internalNote,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  console.log(`[admin/ambassadors] activate actor=${actor.id}`);
  return NextResponse.json({ ok: true, ...result.value });
}
