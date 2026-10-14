/**
 * Query / expire / conflict-check planned package session holds.
 * No Stripe, bookings, or entitlements.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { formatLocalISODate, formatSlotLabel } from "@/lib/slots";
import { teacherDayBounds, teacherBookingTimeZone, zonedWallTimeToUtc } from "@/lib/timezones";
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

/**
 * Opportunistically mark expired holds/orders.
 * Only pending_payment orders expire — payment_confirmed+ holds stay until fulfillment converts them.
 */
export async function expireStalePlannedPackageHolds(
  admin: SupabaseClient = adminClient(),
  now: Date = new Date(),
): Promise<void> {
  if (!isPlannedPackageTemporaryHoldsEnabled()) return;
  const nowIso = now.toISOString();

  const { data: expiredOrders } = await admin
    .from("planned_package_pending_orders")
    .update({ status: "expired" })
    .eq("status", "pending_payment")
    .lte("hold_expires_at", nowIso)
    .select("id");

  const ids = ((expiredOrders ?? []) as { id?: string }[])
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string");

  if (ids.length === 0) return;

  await admin
    .from("planned_package_session_holds")
    .update({ status: "expired" })
    .eq("status", "active")
    .lte("expires_at", nowIso)
    .in("pending_order_id", ids);
}

export async function listActiveHoldsForTeacherDay(args: {
  admin?: SupabaseClient;
  teacherId: string;
  slotDate: string;
  now?: Date;
  timeZone?: string | null;
}): Promise<HoldIntervalRow[]> {
  if (!isPlannedPackageTemporaryHoldsEnabled()) return [];
  const admin = args.admin ?? adminClient();
  const now = args.now ?? new Date();
  // Public GET callers must never expire orders. Explicit order/checkout commands
  // retain that lifecycle operation; reads exclude expired holds by timestamp.

  const { start: dayStart, end: dayEnd } = teacherDayBounds(args.slotDate, args.timeZone);
  const { data, error } = await admin
    .from("planned_package_session_holds")
    .select("id, teacher_id, student_id, starts_at, ends_at, status, expires_at, pending_order_id")
    .eq("teacher_id", args.teacherId)
    .eq("status", "active")
    .gt("expires_at", now.toISOString())
    .lt("starts_at", dayEnd.toISOString())
    .gt("ends_at", dayStart.toISOString());

  if (error) throw new Error("planned_package_holds_lookup_failed");

  return ((data ?? []) as HoldIntervalRow[]).filter((h) =>
    isActiveHold({ status: h.status, expires_at: h.expires_at }, now),
  );
}

/** BookableSlots bookedIntervals shape from active holds for a day. */
export function holdRowsToBookedIntervals(
  holds: HoldIntervalRow[],
  timeZone?: string | null,
): Array<{ startMin: number; durationMin: number }> {
  const out: Array<{ startMin: number; durationMin: number }> = [];
  for (const hold of holds) {
    const start = new Date(hold.starts_at);
    if (Number.isNaN(start.getTime())) continue;
    const end = new Date(hold.ends_at);
    const parts = new Intl.DateTimeFormat("en", { timeZone: teacherBookingTimeZone(timeZone), hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(start);
    const startMin = Number(parts.find(p => p.type === "hour")?.value) * 60 + Number(parts.find(p => p.type === "minute")?.value);
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
  const { data, error } = await admin
    .from("planned_package_session_holds")
    .select("id, teacher_id, student_id, starts_at, ends_at, status, expires_at, pending_order_id")
    .eq("teacher_id", args.teacherId)
    .eq("status", "active")
    .gt("expires_at", now.toISOString())
    .lt("starts_at", args.endsAt)
    .gt("ends_at", args.startsAt);

  if (error) throw new Error("planned_package_holds_lookup_failed");

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
  timeZone?: string | null;
}): Promise<boolean> {
  const [y, m, d] = args.slotDate.split("-").map(Number);
  if (!y || !m || !d) return false;
  const start = zonedWallTimeToUtc({ dateIso: args.slotDate, slot: args.timeSlot, timeZone: teacherBookingTimeZone(args.timeZone) });
  if (!start) return true;
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
