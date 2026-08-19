import { NextResponse } from "next/server";
import {
  loadOwnedTeacherOffer,
  offerNotFoundResponse,
  requireOwnedTeacher,
} from "@/lib/offers/requireOwnedTeacher";
import { buildTeacherOfferStatusPatch } from "@/lib/offers/statusTransitions";
import {
  isPostgresUniqueViolation,
  mapTeacherOfferRow,
  TEACHER_OFFER_SELECT_COLUMNS,
} from "@/lib/offers/teacherOfferDto";
import {
  mergedOfferRangeError,
  parseTeacherOfferUpdateInput,
  teacherOfferUpdateToPatchRow,
} from "@/lib/offers/validation";

export const runtime = "nodejs";

type Params = { params: Promise<{ offerId: string }> };

export async function GET(req: Request, ctx: Params) {
  const auth = await requireOwnedTeacher(req);
  if (!auth.ok) return auth.response;

  const { offerId } = await ctx.params;
  const offer = await loadOwnedTeacherOffer(auth.context.admin, auth.context.teacherId, offerId);
  if (!offer) return offerNotFoundResponse();

  return NextResponse.json({ offer });
}

export async function PATCH(req: Request, ctx: Params) {
  const auth = await requireOwnedTeacher(req);
  if (!auth.ok) return auth.response;

  const { offerId } = await ctx.params;
  const { admin, teacherId } = auth.context;
  const current = await loadOwnedTeacherOffer(admin, teacherId, offerId);
  if (!current) return offerNotFoundResponse();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const parsed = parseTeacherOfferUpdateInput(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues },
      { status: 400 },
    );
  }

  const rangeError = mergedOfferRangeError(current, parsed.data);
  if (rangeError) {
    return NextResponse.json(
      { error: rangeError.error, issues: rangeError.issues },
      { status: 400 },
    );
  }

  const patchRow = teacherOfferUpdateToPatchRow(parsed.data);
  if (parsed.data.status !== undefined) {
    const statusPatch = buildTeacherOfferStatusPatch(
      current.status,
      parsed.data.status,
      new Date().toISOString(),
      {
        publishedAt: current.publishedAt,
        pausedAt: current.pausedAt,
        archivedAt: current.archivedAt,
      },
    );
    if ("error" in statusPatch) {
      return NextResponse.json({ error: "invalid_status_transition" }, { status: 409 });
    }
    Object.assign(patchRow, statusPatch);
  }

  // teacher_id, created_by, created_at, updated_at, and client status timestamps
  // are never copied from the request body.
  const { data, error } = await admin
    .from("teacher_offers")
    .update(patchRow)
    .eq("id", current.id)
    .eq("teacher_id", teacherId)
    .select(TEACHER_OFFER_SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    if (isPostgresUniqueViolation(error)) {
      return NextResponse.json({ error: "slug_conflict" }, { status: 409 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!data) return offerNotFoundResponse();

  const offer = mapTeacherOfferRow(data as unknown);
  if (!offer) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ offer });
}

export async function DELETE(req: Request, ctx: Params) {
  const auth = await requireOwnedTeacher(req);
  if (!auth.ok) return auth.response;

  const { offerId } = await ctx.params;
  const { admin, teacherId } = auth.context;
  const current = await loadOwnedTeacherOffer(admin, teacherId, offerId);
  if (!current) return offerNotFoundResponse();

  if (current.status !== "archived") {
    const nowIso = new Date().toISOString();
    const { error } = await admin
      .from("teacher_offers")
      .update({
        status: "archived",
        archived_at: nowIso,
      })
      .eq("id", current.id)
      .eq("teacher_id", teacherId);

    if (error) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
