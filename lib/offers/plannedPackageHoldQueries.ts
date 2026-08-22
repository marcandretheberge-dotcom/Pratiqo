/**
 * Query / expire / conflict-check planned package session holds.
 * No Stripe, bookings, or entitlements.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { formatLocalISODate, formatSlotLabel, slotStartMinutes } from "@/lib/slots";
import {
  isActiveHold,
  isPlannedPackageTemporaryHoldsEnabled,
  rangesOverlap,
} from "./plannedPackageTemporaryHolds";

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_admin");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type HoldIntervalRow = {
  id: string;
  teacher_id: string;
  student_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  expires_at: string;
  pending_order_id: string;
};

/** Opportunistically mark expired holds/orders. */
export async function expireStalePlannedPackageHolds(
  admin: SupabaseClient = adminClient(),
  now: Date = new Date(),
): Promise<void> {
  if (!isPlannedPackageTemporaryHoldsEnabled()) return;
  const nowIso = now.toISOString();
  await admin
    .from("planned_package_session_holds")
    .update({ status: "expired" })
    .eq("status", "active")
    .lte("expires_at", nowIso);
  await admin
    .from("planned_package_pending_orders")
    .update({ status: "expired" })
    .eq("status", "pending_payment")
    .lte("hold_expires_at", nowIso);
}

export async function listActiveHoldsForTeacherDay(args: {
  admin?: SupabaseClient;
  teacherId: string;
  slotDate: string;
  now?: Date;
}): Promise<HoldIntervalRow[]> {
  if (!isPlannedPackageTemporaryHoldsEnabled()) return [];
  const admin = args.admin ?? adminClient();
  const now = args.now ?? new Date();
  await expireStalePlannedPackageHolds(admin, now);

  const dayStart = new Date(`${args.slotDate}T00:00:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const { data } = await admin
    .from("planned_package_session_holds")
    .select("id, teacher_id, student_id, starts_at, ends_at, status, expires_at, pending_order_id")
    .eq("teacher_id", args.teacherId)
    .eq("status", "active")
    .gt("expires_at", now.toISOString())
    .lt("starts_at", dayEnd.toISOString())
    .gt("ends_at", dayStart.toISOString());

  return ((data ?? []) as HoldIntervalRow[]).filter((h) =>
    isActiveHold({ status: h.status, expires_at: h.expires_at }, now),
  );
}

/** BookableSlots bookedIntervals shape from active holds for a day. */
export function holdRowsToBookedIntervals(
  holds: HoldIntervalRow[],
): Array<{ startMin: number; durationMin: number }> {
  const out: Array<{ startMin: number; durationMin: number }> = [];
  for (const hold of holds) {
    const start = new Date(hold.starts_at);
    if (Number.isNaN(start.getTime())) continue;
    const end = new Date(hold.ends_at);
    const startMin = start.getHours() * 60 + start.getMinutes();
    const durationMin = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
    out.push({ startMin, durationMin });
  }
  return out;
}

export async function hasActivePlannedPackageHoldConflict(args: {
  admin?: SupabaseClient;
  teacherId: string;
  startsAt: string;
  endsAt: string;
  /** Exclude holds belonging to this pending order (renewal). */
  excludePendingOrderId?: string | null;
  /** Exclude holds owned by this student when checking own reuse (optional). */
  excludeStudentId?: string | null;
  now?: Date;
}): Promise<boolean> {
  if (!isPlannedPackageTemporaryHoldsEnabled()) return false;
  const admin = args.admin ?? adminClient();
  const now = args.now ?? new Date();
  await expireStalePlannedPackageHolds(admin, now);

  const { data } = await admin
    .from("planned_package_session_holds")
    .select("id, teacher_id, student_id, starts_at, ends_at, status, expires_at, pending_order_id")
    .eq("teacher_id", args.teacherId)
    .eq("status", "active")
    .gt("expires_at", now.toISOString())
    .lt("starts_at", args.endsAt)
    .gt("ends_at", args.startsAt);

  for (const row of (data ?? []) as HoldIntervalRow[]) {
    if (args.excludePendingOrderId && row.pending_order_id === args.excludePendingOrderId) {
      continue;
    }
    if (args.excludeStudentId && row.student_id === args.excludeStudentId) {
      // Still conflict for other learners; own holds are handled by reuse/cancel path.
      // When checking availability for another learner, don't exclude.
    }
    if (!isActiveHold({ status: row.status, expires_at: row.expires_at }, now)) continue;
    if (rangesOverlap(args.startsAt, args.endsAt, row.starts_at, row.ends_at)) return true;
  }
  return false;
}

/** Conflict check from booking slotDate + timeSlot labels. */
export async function hasActiveHoldConflictForBookingSlot(args: {
  admin?: SupabaseClient;
  teacherId: string;
  slotDate: string;
  timeSlot: string;
  durationMinutes: number;
  excludeStudentId?: string | null;
  now?: Date;
}): Promise<boolean> {
  const startMin = slotStartMinutes(args.timeSlot);
  if (startMin < 0) return false;
  const [y, m, d] = args.slotDate.split("-").map(Number);
  if (!y || !m || !d) return false;
  const start = new Date(y, m - 1, d, Math.floor(startMin / 60), startMin % 60, 0, 0);
  const end = new Date(start.getTime() + args.durationMinutes * 60_000);
  return hasActivePlannedPackageHoldConflict({
    admin: args.admin,
    teacherId: args.teacherId,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    excludeStudentId: args.excludeStudentId,
    now: args.now,
  });
}

export function localSlotPartsFromIso(startsAt: string, durationMinutes: number): {
  slotDate: string;
  timeSlot: string;
  endsAt: string;
} | null {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return null;
  return {
    slotDate: formatLocalISODate(start),
    timeSlot: formatSlotLabel(start.getHours(), start.getMinutes()),
    endsAt: new Date(start.getTime() + durationMinutes * 60_000).toISOString(),
  };
}
