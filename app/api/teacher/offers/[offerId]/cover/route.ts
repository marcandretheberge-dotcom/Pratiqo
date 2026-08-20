import { NextResponse } from "next/server";
import {
  extractTeacherOfferCoverStoragePath,
  buildTeacherOfferCoverStoragePath,
  processTeacherOfferCoverImage,
  publicUrlForTeacherOfferCoverPath,
  TEACHER_OFFER_COVER_BUCKET,
  validateTeacherOfferCoverFile,
  assertSafeCoverImageUrlForPersist,
  isTeacherOfferCoverStoragePath,
} from "@/lib/offers/offerCoverImages";
import {
  loadOwnedTeacherOffer,
  offerNotFoundResponse,
  requireOwnedTeacher,
} from "@/lib/offers/requireOwnedTeacher";
import {
  mapTeacherOfferRow,
  TEACHER_OFFER_SELECT_COLUMNS,
} from "@/lib/offers/teacherOfferDto";

export const runtime = "nodejs";

type Params = { params: Promise<{ offerId: string }> };

async function reloadOffer(
  admin: ReturnType<typeof import("@/lib/supabaseAdmin").getSupabaseAdmin>,
  teacherId: string,
  offerId: string,
) {
  const { data, error } = await admin
    .from("teacher_offers")
    .select(TEACHER_OFFER_SELECT_COLUMNS)
    .eq("id", offerId)
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (error || !data) return null;
  return mapTeacherOfferRow(data as unknown);
}

/**
 * POST /api/teacher/offers/[offerId]/cover
 * Multipart field "file". Sets image_url on the owned offer only.
 */
export async function POST(req: Request, ctx: Params): Promise<Response> {
  const auth = await requireOwnedTeacher(req);
  if (!auth.ok) return auth.response;

  const { offerId } = await ctx.params;
  const { admin, teacherId } = auth.context;
  const current = await loadOwnedTeacherOffer(admin, teacherId, offerId);
  if (!current) return offerNotFoundResponse();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }

  const validated = validateTeacherOfferCoverFile({
    mime: file.type,
    size: file.size,
  });
  if (!validated.ok) {
    const status = validated.error === "image_too_large" ? 413 : 400;
    return NextResponse.json({ error: validated.error }, { status });
  }

  let processed: { buffer: Buffer; contentType: "image/webp" };
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    processed = await processTeacherOfferCoverImage(bytes);
  } catch (error) {
    console.error("[teacher/offers/cover] process failed", error);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  if (processed.buffer.byteLength > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "image_too_large" }, { status: 413 });
  }

  let storagePath: string;
  try {
    storagePath = buildTeacherOfferCoverStoragePath({ teacherId, offerId });
  } catch {
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const { error: uploadErr } = await admin.storage
    .from(TEACHER_OFFER_COVER_BUCKET)
    .upload(storagePath, processed.buffer, {
      contentType: processed.contentType,
      upsert: false,
    });

  if (uploadErr) {
    console.error("[teacher/offers/cover] storage upload failed", uploadErr.message);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const publicUrl = publicUrlForTeacherOfferCoverPath(storagePath);
  if (!publicUrl || !assertSafeCoverImageUrlForPersist(publicUrl)) {
    await admin.storage.from(TEACHER_OFFER_COVER_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const previousPath = extractTeacherOfferCoverStoragePath(current.imageUrl);
  const { error: updateErr } = await admin
    .from("teacher_offers")
    .update({ image_url: publicUrl })
    .eq("id", offerId)
    .eq("teacher_id", teacherId);

  if (updateErr) {
    await admin.storage.from(TEACHER_OFFER_COVER_BUCKET).remove([storagePath]);
    console.error("[teacher/offers/cover] db update failed", updateErr.message);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  // Best-effort cleanup of previous cover in the same offer folder.
  if (
    previousPath &&
    previousPath !== storagePath &&
    isTeacherOfferCoverStoragePath(previousPath, teacherId, offerId)
  ) {
    try {
      await admin.storage.from(TEACHER_OFFER_COVER_BUCKET).remove([previousPath]);
    } catch {
      // Future PR: scheduled orphan cleanup if delete is flaky.
    }
  }

  const offer = await reloadOffer(admin, teacherId, offerId);
  if (!offer) return offerNotFoundResponse();
  return NextResponse.json({ offer, imageUrl: offer.imageUrl });
}

/**
 * DELETE /api/teacher/offers/[offerId]/cover
 * Clears image_url on the owned offer; best-effort storage delete.
 */
export async function DELETE(req: Request, ctx: Params): Promise<Response> {
  const auth = await requireOwnedTeacher(req);
  if (!auth.ok) return auth.response;

  const { offerId } = await ctx.params;
  const { admin, teacherId } = auth.context;
  const current = await loadOwnedTeacherOffer(admin, teacherId, offerId);
  if (!current) return offerNotFoundResponse();

  const previousPath = extractTeacherOfferCoverStoragePath(current.imageUrl);

  const { error: updateErr } = await admin
    .from("teacher_offers")
    .update({ image_url: null })
    .eq("id", offerId)
    .eq("teacher_id", teacherId);

  if (updateErr) {
    console.error("[teacher/offers/cover] clear failed", updateErr.message);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  if (previousPath && isTeacherOfferCoverStoragePath(previousPath, teacherId, offerId)) {
    try {
      await admin.storage.from(TEACHER_OFFER_COVER_BUCKET).remove([previousPath]);
    } catch {
      // Future PR: orphan cleanup job.
    }
  }

  const offer = await reloadOffer(admin, teacherId, offerId);
  if (!offer) return offerNotFoundResponse();
  return NextResponse.json({ offer, imageUrl: null });
}
