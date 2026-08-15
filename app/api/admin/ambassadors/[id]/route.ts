// Admin -> Ambassador detail/status API.

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import {
  getAdminAmbassadorDetail,
  setAdminAmbassadorStatus,
} from "@/lib/admin/ambassadors";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type PatchBody = {
  status?: unknown;
  internalNote?: unknown;
};

export async function GET(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin } = auth;
  const { id } = await ctx.params;

  try {
    const ambassador = await getAdminAmbassadorDetail(admin, id);
    if (!ambassador) {
      return NextResponse.json({ error: "Ambassadeur introuvable." }, { status: 404 });
    }
    return NextResponse.json({ ambassador });
  } catch (e) {
    console.error("[admin/ambassadors] detail failed", e);
    return NextResponse.json(
      { error: "Impossible de charger l'ambassadeur." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: actor } = auth;
  const { id } = await ctx.params;

  let body: PatchBody = {};
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const result = await setAdminAmbassadorStatus(
    admin,
    actor,
    id,
    body.status,
    body.internalNote,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  console.log(`[admin/ambassadors] status actor=${actor.id} ambassador=${id}`);
  return NextResponse.json({ ok: true, ambassador: result.value });
}
