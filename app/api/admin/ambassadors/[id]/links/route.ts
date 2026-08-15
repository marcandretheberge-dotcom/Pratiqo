// Admin -> create ambassador campaign links.

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { createAdminAmbassadorLink } from "@/lib/admin/ambassadors";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type PostBody = {
  preferredCode?: unknown;
  destinationPath?: unknown;
  campaign?: unknown;
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

  const result = await createAdminAmbassadorLink(admin, actor, id, {
    preferredCode: body.preferredCode,
    destinationPath: body.destinationPath,
    campaign: body.campaign,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  console.log(`[admin/ambassadors] link-create actor=${actor.id} ambassador=${id}`);
  return NextResponse.json({ ok: true, link: result.value });
}
