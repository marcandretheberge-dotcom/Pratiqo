// Admin -> update an ambassador link.

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { updateAdminAmbassadorLink } from "@/lib/admin/ambassadors";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type PatchBody = {
  destinationPath?: unknown;
  campaign?: unknown;
  active?: unknown;
};

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

  const result = await updateAdminAmbassadorLink(admin, actor, id, {
    destinationPath: body.destinationPath,
    campaign: body.campaign,
    active: body.active,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  console.log(`[admin/ambassador-links] update actor=${actor.id} link=${id}`);
  return NextResponse.json({ ok: true, link: result.value });
}
