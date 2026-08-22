/**
 * Create / load / cancel planned package session drafts (service role).
 * No bookings, entitlements, Stripe, or permanent holds.
 */

import { createClient } from "@supabase/supabase-js";
import {
  canUsePlannedPackageSessionDrafts,
  hasDuplicateSessionStarts,
  sessionsOverlap,
  type PlannedPackageSessionDraftDto,
  type PlannedPackageSessionDraftItemDto,
  type PlannedPackageSessionDraftStatus,
} from "./plannedPackageSessionDrafts";
import { isPlannedPackageOfferType } from "./plannedPackages";
import {
  parseStartsAtToBookingSlot,
  validatePlannedPackageDraftSlot,
  type PlannedPackageSlotAdmin,
} from "./validatePlannedPackageDraftSessions";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_admin");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function mapItem(row: Record<string, unknown>): PlannedPackageSessionDraftItemDto | null {
  const id = typeof row.id === "string" ? row.id : null;
  const sessionIndex = typeof row.session_index === "number" ? row.session_index : null;
  const startsAt = typeof row.starts_at === "string" ? row.starts_at : null;
  const endsAt = typeof row.ends_at === "string" ? row.ends_at : null;
  if (!id || sessionIndex == null || !startsAt || !endsAt) return null;
  return {
    id,
    sessionIndex,
    startsAt,
    endsAt,
    availabilitySource: typeof row.availability_source === "string" ? row.availability_source : null,
  };
}

function mapDraft(
  row: Record<string, unknown>,
  sessions: PlannedPackageSessionDraftItemDto[],
): PlannedPackageSessionDraftDto | null {
  const id = typeof row.id === "string" ? row.id : null;
  const studentId = typeof row.student_id === "string" ? row.student_id : null;
  const teacherId = typeof row.teacher_id === "string" ? row.teacher_id : null;
  const teacherOfferId = typeof row.teacher_offer_id === "string" ? row.teacher_offer_id : null;
  const status = typeof row.status === "string" ? row.status : null;
  const sessionCount = typeof row.session_count === "number" ? row.session_count : null;
  const durationMinutes = typeof row.duration_minutes === "number" ? row.duration_minutes : null;
  const priceCentsSnapshot =
    typeof row.price_cents_snapshot === "number" ? row.price_cents_snapshot : null;
  const currencySnapshot =
    typeof row.currency_snapshot === "string" ? row.currency_snapshot : null;
  const titleSnapshot = typeof row.title_snapshot === "string" ? row.title_snapshot : null;
  const offerTypeSnapshot =
    typeof row.offer_type_snapshot === "string" ? row.offer_type_snapshot : null;
  const createdAt = typeof row.created_at === "string" ? row.created_at : null;
  const updatedAt = typeof row.updated_at === "string" ? row.updated_at : null;
  if (
    !id ||
    !studentId ||
    !teacherId ||
    !teacherOfferId ||
    !status ||
    sessionCount == null ||
    durationMinutes == null ||
    priceCentsSnapshot == null ||
    !currencySnapshot ||
    !titleSnapshot ||
    !offerTypeSnapshot ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }
  return {
    id,
    studentId,
    teacherId,
    teacherOfferId,
    status: status as PlannedPackageSessionDraftStatus,
    sessionCount,
    durationMinutes,
    priceCentsSnapshot,
    currencySnapshot,
    titleSnapshot,
    offerTypeSnapshot,
    expiresAt: typeof row.expires_at === "string" ? row.expires_at : null,
    createdAt,
    updatedAt,
    sessions: sessions.sort((a, b) => a.sessionIndex - b.sessionIndex),
  };
}

export type CreatePlannedPackageSessionDraftResult =
  | { ok: true; draft: PlannedPackageSessionDraftDto }
  | { ok: false; status: number; error: string };

export async function createPlannedPackageSessionDraft(args: {
  studentId: string;
  teacherOfferId: string;
  startsAt: string[];
}): Promise<CreatePlannedPackageSessionDraftResult> {
  if (!canUsePlannedPackageSessionDrafts()) {
    return { ok: false, status: 403, error: "session_drafts_disabled" };
  }

  const admin = adminClient();
  const { data: offer, error: offerErr } = await admin
    .from("teacher_offers")
    .select(
      "id, teacher_id, title, offer_type, status, price_cents, currency, duration_minutes, session_count, published_at",
    )
    .eq("id", args.teacherOfferId)
    .maybeSingle();

  if (offerErr || !offer?.id || typeof offer.teacher_id !== "string") {
    return { ok: false, status: 404, error: "offer_not_found" };
  }

  if (!isPlannedPackageOfferType(offer.offer_type as string)) {
    return { ok: false, status: 409, error: "offer_not_available_for_package_draft" };
  }

  // Drafts can target teacher-owned package offers even while public purchase is blocked.
  // Prefer published packages in controlled preview; also allow draft/paused for teacher testing is out of scope — require published for learner drafts.
  if (offer.status !== "published" || !offer.published_at) {
    return { ok: false, status: 409, error: "offer_not_available_for_package_draft" };
  }

  const sessionCount = offer.session_count;
  const durationMinutes = offer.duration_minutes;
  const priceCents = offer.price_cents;
  if (
    typeof sessionCount !== "number" ||
    sessionCount < 2 ||
    typeof durationMinutes !== "number" ||
    durationMinutes < 15 ||
    typeof priceCents !== "number" ||
    priceCents < 0
  ) {
    return { ok: false, status: 409, error: "offer_not_available_for_package_draft" };
  }

  if (args.startsAt.length !== sessionCount) {
    return { ok: false, status: 400, error: "invalid_session_count" };
  }
  if (hasDuplicateSessionStarts(args.startsAt)) {
    return { ok: false, status: 400, error: "duplicate_session_time" };
  }
  if (sessionsOverlap(args.startsAt, durationMinutes)) {
    return { ok: false, status: 400, error: "duplicate_session_time" };
  }

  const parsedSlots = [];
  for (const iso of args.startsAt) {
    const parsed = parseStartsAtToBookingSlot(iso, durationMinutes);
    if (!parsed) {
      return { ok: false, status: 400, error: "slot_outside_teacher_availability" };
    }
    parsedSlots.push(parsed);
  }

  const sources: string[] = [];
  for (const slot of parsedSlots) {
    const check = await validatePlannedPackageDraftSlot({
      admin: admin as unknown as PlannedPackageSlotAdmin,
      teacherId: offer.teacher_id,
      slot,
      durationMinutes,
    });
    if (!check.ok) {
      return { ok: false, status: 409, error: check.error };
    }
    sources.push(check.availabilitySource);
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: draftRow, error: insertErr } = await admin
    .from("planned_package_session_drafts")
    .insert({
      student_id: args.studentId,
      teacher_id: offer.teacher_id,
      teacher_offer_id: offer.id,
      status: "draft",
      session_count: sessionCount,
      duration_minutes: durationMinutes,
      price_cents_snapshot: priceCents,
      currency_snapshot: typeof offer.currency === "string" ? offer.currency : "CAD",
      title_snapshot: typeof offer.title === "string" ? offer.title : "Forfait planifié",
      offer_type_snapshot: "package",
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (insertErr || !draftRow) {
    return { ok: false, status: 500, error: "draft_creation_failed" };
  }

  const itemRows = parsedSlots.map((slot, index) => ({
    draft_id: draftRow.id,
    session_index: index + 1,
    starts_at: slot.startsAtIso,
    ends_at: slot.endsAtIso,
    availability_source: sources[index] ?? null,
  }));

  const { data: items, error: itemsErr } = await admin
    .from("planned_package_session_draft_items")
    .insert(itemRows)
    .select("*");

  if (itemsErr || !items) {
    await admin.from("planned_package_session_drafts").delete().eq("id", draftRow.id);
    return { ok: false, status: 500, error: "draft_creation_failed" };
  }

  const mappedItems = (items as Record<string, unknown>[])
    .map(mapItem)
    .filter((row): row is PlannedPackageSessionDraftItemDto => row != null);
  const draft = mapDraft(draftRow as Record<string, unknown>, mappedItems);
  if (!draft) {
    return { ok: false, status: 500, error: "draft_creation_failed" };
  }
  return { ok: true, draft };
}

export async function loadOwnedPlannedPackageSessionDraft(args: {
  studentId: string;
  draftId: string;
}): Promise<PlannedPackageSessionDraftDto | null> {
  const admin = adminClient();
  const { data: draftRow, error } = await admin
    .from("planned_package_session_drafts")
    .select("*")
    .eq("id", args.draftId)
    .eq("student_id", args.studentId)
    .maybeSingle();
  if (error || !draftRow) return null;

  const { data: items } = await admin
    .from("planned_package_session_draft_items")
    .select("*")
    .eq("draft_id", args.draftId);

  const mappedItems = ((items ?? []) as Record<string, unknown>[])
    .map(mapItem)
    .filter((row): row is PlannedPackageSessionDraftItemDto => row != null);
  return mapDraft(draftRow as Record<string, unknown>, mappedItems);
}

export async function cancelOwnedPlannedPackageSessionDraft(args: {
  studentId: string;
  draftId: string;
}): Promise<CreatePlannedPackageSessionDraftResult> {
  if (!canUsePlannedPackageSessionDrafts()) {
    return { ok: false, status: 403, error: "session_drafts_disabled" };
  }
  const existing = await loadOwnedPlannedPackageSessionDraft(args);
  if (!existing) return { ok: false, status: 404, error: "offer_not_found" };
  if (existing.status !== "draft") {
    return { ok: true, draft: existing };
  }

  const admin = adminClient();
  const { data, error } = await admin
    .from("planned_package_session_drafts")
    .update({ status: "cancelled" })
    .eq("id", args.draftId)
    .eq("student_id", args.studentId)
    .select("*")
    .single();
  if (error || !data) {
    return { ok: false, status: 500, error: "draft_creation_failed" };
  }
  const draft = mapDraft(data as Record<string, unknown>, existing.sessions);
  if (!draft) return { ok: false, status: 500, error: "draft_creation_failed" };
  return { ok: true, draft };
}
