/**
 * Create / cancel planned package pending orders with temporary holds.
 * No Stripe, confirmed bookings, entitlements, or redemptions.
 */

import { createClient } from "@supabase/supabase-js";
import { loadOwnedPlannedPackageSessionDraft } from "./createPlannedPackageSessionDraft";
import {
  expireStalePlannedPackageHolds,
  hasActivePlannedPackageHoldConflict,
} from "./plannedPackageHoldQueries";
import {
  canUsePlannedPackageTemporaryHolds,
  getPlannedPackageHoldMinutes,
  isActiveHold,
  type PlannedPackagePendingOrderDto,
  type PlannedPackageSessionHoldDto,
} from "./plannedPackageTemporaryHolds";
import { runPlannedPackageCheckoutPreflight } from "./runPlannedPackageCheckoutPreflight";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_admin");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function mapHold(row: Record<string, unknown>): PlannedPackageSessionHoldDto | null {
  const id = typeof row.id === "string" ? row.id : null;
  const sessionIndex = typeof row.session_index === "number" ? row.session_index : null;
  const startsAt = typeof row.starts_at === "string" ? row.starts_at : null;
  const endsAt = typeof row.ends_at === "string" ? row.ends_at : null;
  const status = typeof row.status === "string" ? row.status : null;
  const expiresAt = typeof row.expires_at === "string" ? row.expires_at : null;
  if (!id || sessionIndex == null || !startsAt || !endsAt || !status || !expiresAt) return null;
  return {
    id,
    sessionIndex,
    startsAt,
    endsAt,
    status: status as PlannedPackageSessionHoldDto["status"],
    expiresAt,
  };
}

function mapOrder(
  row: Record<string, unknown>,
  holds: PlannedPackageSessionHoldDto[],
): PlannedPackagePendingOrderDto | null {
  const id = typeof row.id === "string" ? row.id : null;
  const draftId = typeof row.draft_id === "string" ? row.draft_id : null;
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
  const holdExpiresAt = typeof row.hold_expires_at === "string" ? row.hold_expires_at : null;
  const createdAt = typeof row.created_at === "string" ? row.created_at : null;
  const updatedAt = typeof row.updated_at === "string" ? row.updated_at : null;
  if (
    !id ||
    !draftId ||
    !studentId ||
    !teacherId ||
    !teacherOfferId ||
    !status ||
    sessionCount == null ||
    durationMinutes == null ||
    priceCentsSnapshot == null ||
    !currencySnapshot ||
    !titleSnapshot ||
    !holdExpiresAt ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }
  return {
    id,
    draftId,
    studentId,
    teacherId,
    teacherOfferId,
    status: status as PlannedPackagePendingOrderDto["status"],
    sessionCount,
    durationMinutes,
    priceCentsSnapshot,
    currencySnapshot,
    titleSnapshot,
    holdExpiresAt,
    createdAt,
    updatedAt,
    holds: holds.sort((a, b) => a.sessionIndex - b.sessionIndex),
  };
}

async function loadOrderWithHolds(
  admin: ReturnType<typeof adminClient>,
  orderId: string,
  studentId: string,
): Promise<PlannedPackagePendingOrderDto | null> {
  const { data: order } = await admin
    .from("planned_package_pending_orders")
    .select("*")
    .eq("id", orderId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!order) return null;
  const { data: holds } = await admin
    .from("planned_package_session_holds")
    .select("*")
    .eq("pending_order_id", orderId);
  const mappedHolds = ((holds ?? []) as Record<string, unknown>[])
    .map(mapHold)
    .filter((h): h is PlannedPackageSessionHoldDto => h != null);
  return mapOrder(order as Record<string, unknown>, mappedHolds);
}

export type CreatePendingOrderResult =
  | { ok: true; order: PlannedPackagePendingOrderDto; reused: boolean }
  | { ok: false; status: number; error: string };

export async function createPlannedPackagePendingOrder(args: {
  studentId: string;
  draftId: string;
}): Promise<CreatePendingOrderResult> {
  if (!canUsePlannedPackageTemporaryHolds()) {
    return { ok: false, status: 403, error: "temporary_holds_disabled" };
  }

  const admin = adminClient();
  await expireStalePlannedPackageHolds(admin);

  const draft = await loadOwnedPlannedPackageSessionDraft({
    studentId: args.studentId,
    draftId: args.draftId,
  });
  if (!draft) return { ok: false, status: 404, error: "draft_not_found" };
  if (draft.status !== "draft") return { ok: false, status: 409, error: "draft_not_active" };

  // Reuse existing unexpired pending order for this draft when still active.
  const { data: existingOrders } = await admin
    .from("planned_package_pending_orders")
    .select("*")
    .eq("student_id", args.studentId)
    .eq("draft_id", args.draftId)
    .eq("status", "pending_payment")
    .order("created_at", { ascending: false })
    .limit(1);

  const existing = existingOrders?.[0] as Record<string, unknown> | undefined;
  if (existing && typeof existing.id === "string" && typeof existing.hold_expires_at === "string") {
    if (isActiveHold({ status: "active", expires_at: existing.hold_expires_at })) {
      const order = await loadOrderWithHolds(admin, existing.id, args.studentId);
      if (order && order.holds.every((h) => isActiveHold(h))) {
        return { ok: true, order, reused: true };
      }
    }
  }

  // Cancel any stale pending orders for this draft owned by the student.
  const { data: stale } = await admin
    .from("planned_package_pending_orders")
    .select("id")
    .eq("student_id", args.studentId)
    .eq("draft_id", args.draftId)
    .eq("status", "pending_payment");
  for (const row of stale ?? []) {
    if (typeof row.id !== "string") continue;
    await admin
      .from("planned_package_pending_orders")
      .update({ status: "cancelled" })
      .eq("id", row.id);
    await admin
      .from("planned_package_session_holds")
      .update({ status: "cancelled" })
      .eq("pending_order_id", row.id)
      .eq("status", "active");
  }

  const preflight = await runPlannedPackageCheckoutPreflight({
    studentId: args.studentId,
    draftId: args.draftId,
  });
  if (!preflight.ok) {
    return { ok: false, status: preflight.status, error: "preflight_failed" };
  }
  if (!preflight.result.sessions.every((s) => s.valid)) {
    return { ok: false, status: 409, error: "session_slot_no_longer_available" };
  }

  for (const session of draft.sessions) {
    const conflict = await hasActivePlannedPackageHoldConflict({
      admin,
      teacherId: draft.teacherId,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
    });
    if (conflict) {
      return { ok: false, status: 409, error: "active_hold_conflict" };
    }
  }

  const holdMinutes = getPlannedPackageHoldMinutes();
  const holdExpiresAt = new Date(Date.now() + holdMinutes * 60_000).toISOString();

  const { data: orderRow, error: orderErr } = await admin
    .from("planned_package_pending_orders")
    .insert({
      student_id: args.studentId,
      teacher_id: draft.teacherId,
      teacher_offer_id: draft.teacherOfferId,
      draft_id: draft.id,
      status: "pending_payment",
      session_count: draft.sessionCount,
      duration_minutes: draft.durationMinutes,
      price_cents_snapshot: draft.priceCentsSnapshot,
      currency_snapshot: draft.currencySnapshot,
      title_snapshot: draft.titleSnapshot,
      hold_expires_at: holdExpiresAt,
    })
    .select("*")
    .single();

  if (orderErr || !orderRow) {
    return { ok: false, status: 500, error: "pending_order_creation_failed" };
  }

  const holdRows = draft.sessions.map((s) => ({
    pending_order_id: orderRow.id,
    teacher_id: draft.teacherId,
    student_id: args.studentId,
    session_index: s.sessionIndex,
    starts_at: s.startsAt,
    ends_at: s.endsAt,
    status: "active",
    expires_at: holdExpiresAt,
  }));

  const { data: holds, error: holdsErr } = await admin
    .from("planned_package_session_holds")
    .insert(holdRows)
    .select("*");

  if (holdsErr || !holds) {
    await admin.from("planned_package_pending_orders").delete().eq("id", orderRow.id);
    return { ok: false, status: 500, error: "pending_order_creation_failed" };
  }

  const mappedHolds = (holds as Record<string, unknown>[])
    .map(mapHold)
    .filter((h): h is PlannedPackageSessionHoldDto => h != null);
  const order = mapOrder(orderRow as Record<string, unknown>, mappedHolds);
  if (!order) {
    return { ok: false, status: 500, error: "pending_order_creation_failed" };
  }
  return { ok: true, order, reused: false };
}

export async function cancelPlannedPackagePendingOrder(args: {
  studentId: string;
  orderId: string;
}): Promise<CreatePendingOrderResult> {
  if (!canUsePlannedPackageTemporaryHolds()) {
    return { ok: false, status: 403, error: "temporary_holds_disabled" };
  }
  const admin = adminClient();
  const existing = await loadOrderWithHolds(admin, args.orderId, args.studentId);
  if (!existing) return { ok: false, status: 404, error: "draft_not_found" };
  if (existing.status === "cancelled" || existing.status === "expired") {
    return { ok: true, order: existing, reused: false };
  }
  if (existing.status !== "pending_payment") {
    return { ok: false, status: 409, error: "draft_not_active" };
  }

  await admin
    .from("planned_package_pending_orders")
    .update({ status: "cancelled" })
    .eq("id", args.orderId)
    .eq("student_id", args.studentId);
  await admin
    .from("planned_package_session_holds")
    .update({ status: "cancelled" })
    .eq("pending_order_id", args.orderId)
    .eq("status", "active");

  const order = await loadOrderWithHolds(admin, args.orderId, args.studentId);
  if (!order) return { ok: false, status: 500, error: "pending_order_creation_failed" };
  return { ok: true, order, reused: false };
}
