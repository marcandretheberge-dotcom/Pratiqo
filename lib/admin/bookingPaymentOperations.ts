/**
 * Admin read-only bookings + payments operations helpers.
 *
 * Service-role only after requireAdminApi. Never mutates booking/payment
 * state, Stripe, commissions, or credits. Missing optional fields surface
 * as null so the UI can show "Non disponible".
 *
 * DO NOT import from client components.
 */

import type { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  deriveAdminPricingSource,
  extractPricingSourceFromPaymentMetadata,
  mapAdminOfferSnapshotFromBookingRow,
  type AdminBookingOfferSnapshotFields,
  type AdminPricingSource,
  ADMIN_BOOKING_OFFER_SNAPSHOT_SELECT,
} from "@/lib/offers/adminOfferSnapshotDisplay";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export const ADMIN_OPS_UNAVAILABLE = "Non disponible";

/** Canonical booking statuses from migration 034. */
export const ADMIN_BOOKING_STATUSES = [
  "pending_payment",
  "confirmed",
  "completed",
  "cancelled",
  "cancelled_conflict",
] as const;

export type AdminBookingStatus = (typeof ADMIN_BOOKING_STATUSES)[number];

/** Canonical payment_status values from migration 038. */
export const ADMIN_PAYMENT_STATUSES = [
  "unpaid",
  "requires_action",
  "paid",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded",
  "disputed",
] as const;

export type AdminPaymentStatus = (typeof ADMIN_PAYMENT_STATUSES)[number];

/** Canonical transfer_status values from migration 038. */
export const ADMIN_TRANSFER_STATUSES = [
  "not_ready",
  "ready",
  "transferred",
  "failed",
  "reversed",
  "not_required",
] as const;

export type AdminTransferStatus = (typeof ADMIN_TRANSFER_STATUSES)[number];

export type AdminAttentionCode =
  | "payment_failed"
  | "payment_pending_long"
  | "booking_pending_long"
  | "teacher_stripe_incomplete"
  | "payout_failed"
  | "refund_attention"
  | "missing_party"
  | "inconsistent_state";

export type AdminAttentionLabel =
  | "À surveiller"
  | "Problème paiement"
  | "Stripe prof incomplet"
  | "Réservation en attente"
  | "Données incohérentes";

export type AdminPersonSummary = {
  id: string;
  name: string | null;
  email: string | null;
};

export type { AdminBookingOfferSnapshotFields } from "@/lib/offers/adminOfferSnapshotDisplay";

export type AdminBookingOpsRow = {
  id: string;
  shortId: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  lessonDate: string | null;
  lessonTime: string | null;
  teachingMode: string | null;
  lessonType: string | null;
  durationMinutes: number | null;
  price: number | null;
  creditsApplied: number | null;
  student: AdminPersonSummary | null;
  teacher: AdminPersonSummary | null;
  teacherRowId: string | null;
  paymentStatus: string | null;
  transferStatus: string | null;
  refundStatus: string | null;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  attentionCodes: AdminAttentionCode[];
  attentionLabels: AdminAttentionLabel[];
} & AdminBookingOfferSnapshotFields;

export type AdminPaymentOpsRow = {
  id: string;
  shortId: string;
  bookingId: string;
  createdAt: string | null;
  updatedAt: string | null;
  student: AdminPersonSummary | null;
  teacher: AdminPersonSummary | null;
  teacherRowId: string | null;
  amountCents: number | null;
  subtotalCents: number | null;
  platformFeeCents: number | null;
  teacherNetCents: number | null;
  refundedCents: number | null;
  currency: string | null;
  creditsApplied: number | null;
  promoCode: null; // not stored on payments yet
  stripeFeeCents: null; // not stored
  paymentStatus: string | null;
  transferStatus: string | null;
  refundStatus: string | null;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  stripeChargeId: string | null;
  stripeTransferId: string | null;
  paidAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  attentionCodes: AdminAttentionCode[];
  attentionLabels: AdminAttentionLabel[];
} & AdminBookingOfferSnapshotFields;

export type AdminBookingsSummary = {
  total: number;
  pendingPayment: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  needsAttention: number;
};

export type AdminPaymentsSummary = {
  grossCents: number;
  platformFeeCents: number;
  teacherNetCents: number;
  creditsAppliedTotal: number;
  failedOrPending: number;
  refundOrDispute: number;
  count: number;
};

const BOOKING_SELECT =
  "id, teacher_id, student_id, status, date, time, slot_date, time_slot, teaching_mode, price, duration_minutes, credits_applied, created_at, cancelled_at, cancellation_reason, refund_status, refund_amount, refund_method, stripe_payment_intent_id, lesson_type, " +
  ADMIN_BOOKING_OFFER_SNAPSHOT_SELECT;

const PAYMENT_SELECT =
  "id, booking_id, teacher_id, student_id, amount_cents, subtotal_cents, platform_fee_cents, teacher_net_cents, refunded_cents, currency, payment_status, transfer_status, refund_status, stripe_checkout_session_id, stripe_payment_intent_id, stripe_charge_id, stripe_transfer_id, paid_at, failed_at, failure_reason, created_at, updated_at, metadata";

const PENDING_BOOKING_HOURS = 24;
const PENDING_PAYMENT_HOURS = 24;

export function shortAdminId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.slice(0, 8);
}

export function mapAttentionLabel(code: AdminAttentionCode): AdminAttentionLabel {
  switch (code) {
    case "payment_failed":
    case "refund_attention":
      return "Problème paiement";
    case "teacher_stripe_incomplete":
      return "Stripe prof incomplet";
    case "booking_pending_long":
    case "payment_pending_long":
      return "Réservation en attente";
    case "inconsistent_state":
    case "missing_party":
      return "Données incohérentes";
    case "payout_failed":
      return "À surveiller";
    default:
      return "À surveiller";
  }
}

function hoursAgo(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (now.getTime() - t) / (1000 * 60 * 60);
}

function isTeacherStripeIncomplete(teacher: {
  stripe_account_id?: string | null;
  stripe_connect_onboarding_complete?: boolean | null;
  stripe_connect_charges_enabled?: boolean | null;
} | null): boolean {
  if (!teacher) return true;
  if (!teacher.stripe_account_id?.trim()) return true;
  if (!teacher.stripe_connect_onboarding_complete) return true;
  if (!teacher.stripe_connect_charges_enabled) return true;
  return false;
}

export function computeBookingAttention(input: {
  status: string;
  createdAt: string | null;
  student: AdminPersonSummary | null;
  teacher: AdminPersonSummary | null;
  teacherStripeIncomplete: boolean;
  paymentStatus: string | null;
  transferStatus: string | null;
  refundStatus: string | null;
  now?: Date;
}): { codes: AdminAttentionCode[]; labels: AdminAttentionLabel[] } {
  const now = input.now ?? new Date();
  const codes: AdminAttentionCode[] = [];

  if (!input.student || !input.teacher) codes.push("missing_party");

  if (input.paymentStatus === "failed" || input.paymentStatus === "disputed") {
    codes.push("payment_failed");
  }

  if (
    input.refundStatus === "pending" ||
    input.refundStatus === "pending_review" ||
    input.refundStatus === "failed"
  ) {
    codes.push("refund_attention");
  }

  if (input.transferStatus === "failed") codes.push("payout_failed");

  const ageHours = hoursAgo(input.createdAt, now);
  if (
    input.status === "pending_payment" &&
    ageHours !== null &&
    ageHours >= PENDING_BOOKING_HOURS
  ) {
    codes.push("booking_pending_long");
  }

  if (
    (input.paymentStatus === "unpaid" || input.paymentStatus === "requires_action") &&
    ageHours !== null &&
    ageHours >= PENDING_PAYMENT_HOURS
  ) {
    codes.push("payment_pending_long");
  }

  if (
    (input.status === "confirmed" || input.status === "completed" || input.status === "pending_payment") &&
    input.teacherStripeIncomplete
  ) {
    codes.push("teacher_stripe_incomplete");
  }

  if (
    (input.status === "confirmed" || input.status === "completed") &&
    (input.paymentStatus === "failed" || input.paymentStatus === "unpaid")
  ) {
    codes.push("inconsistent_state");
  }

  if (input.status === "cancelled" && input.paymentStatus === "paid") {
    // Paid + cancelled may be legitimate pending refund — flag for review.
    codes.push("refund_attention");
  }

  const unique = Array.from(new Set(codes));
  const labels = Array.from(new Set(unique.map(mapAttentionLabel)));
  return { codes: unique, labels };
}

export function computePaymentAttention(input: {
  paymentStatus: string | null;
  transferStatus: string | null;
  refundStatus: string | null;
  createdAt: string | null;
  student: AdminPersonSummary | null;
  teacher: AdminPersonSummary | null;
  teacherStripeIncomplete: boolean;
  now?: Date;
}): { codes: AdminAttentionCode[]; labels: AdminAttentionLabel[] } {
  const now = input.now ?? new Date();
  const codes: AdminAttentionCode[] = [];

  if (!input.student || !input.teacher) codes.push("missing_party");

  if (input.paymentStatus === "failed" || input.paymentStatus === "disputed") {
    codes.push("payment_failed");
  }

  if (
    input.refundStatus === "pending" ||
    input.refundStatus === "pending_review" ||
    input.refundStatus === "failed"
  ) {
    codes.push("refund_attention");
  }

  if (input.transferStatus === "failed") codes.push("payout_failed");

  const ageHours = hoursAgo(input.createdAt, now);
  if (
    (input.paymentStatus === "unpaid" || input.paymentStatus === "requires_action") &&
    ageHours !== null &&
    ageHours >= PENDING_PAYMENT_HOURS
  ) {
    codes.push("payment_pending_long");
  }

  if (input.paymentStatus === "paid" && input.teacherStripeIncomplete) {
    codes.push("teacher_stripe_incomplete");
  }

  if (input.paymentStatus === "paid" && input.transferStatus === "failed") {
    codes.push("inconsistent_state");
  }

  const unique = Array.from(new Set(codes));
  const labels = Array.from(new Set(unique.map(mapAttentionLabel)));
  return { codes: unique, labels };
}

type ProfileLite = { id: string; name: string | null; email: string | null };
type TeacherLite = {
  id: string;
  user_id: string | null;
  stripe_account_id: string | null;
  stripe_connect_onboarding_complete: boolean | null;
  stripe_connect_charges_enabled: boolean | null;
};

async function loadProfilesByIds(
  admin: AdminClient,
  ids: string[],
): Promise<Map<string, ProfileLite>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, ProfileLite>();
  if (unique.length === 0) return map;
  const { data, error } = await admin
    .from("profiles")
    .select("id, name, email")
    .in("id", unique);
  if (error) {
    console.error("[admin/ops] profiles load failed", error.message);
    return map;
  }
  for (const row of (data ?? []) as ProfileLite[]) {
    map.set(row.id, row);
  }
  return map;
}

async function loadTeachersByIds(
  admin: AdminClient,
  ids: string[],
): Promise<Map<string, TeacherLite>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, TeacherLite>();
  if (unique.length === 0) return map;
  const { data, error } = await admin
    .from("teachers")
    .select(
      "id, user_id, stripe_account_id, stripe_connect_onboarding_complete, stripe_connect_charges_enabled",
    )
    .in("id", unique);
  if (error) {
    console.error("[admin/ops] teachers load failed", error.message);
    return map;
  }
  for (const row of (data ?? []) as TeacherLite[]) {
    map.set(row.id, row);
  }
  return map;
}

function personFrom(
  profile: ProfileLite | undefined,
  fallbackId: string | null,
): AdminPersonSummary | null {
  if (!fallbackId) return null;
  if (!profile) return { id: fallbackId, name: null, email: null };
  return { id: profile.id, name: profile.name, email: profile.email };
}

function mapBookingOfferSnapshotFields(
  row: Record<string, unknown>,
  metadataPricingSource?: string | null,
): AdminBookingOfferSnapshotFields {
  const snapshotState = mapAdminOfferSnapshotFromBookingRow(row);
  return {
    offerSnapshot: snapshotState.kind === "complete" ? snapshotState.snapshot : null,
    offerSnapshotIncomplete: snapshotState.kind === "incomplete",
    offerSnapshotTeacherOfferId:
      snapshotState.kind === "incomplete"
        ? snapshotState.teacherOfferId
        : snapshotState.kind === "complete"
          ? snapshotState.snapshot.teacherOfferId
          : null,
    pricingSource: deriveAdminPricingSource(snapshotState, metadataPricingSource),
  };
}

export type ListAdminBookingsInput = {
  status?: string | null;
  q?: string | null;
  studentId?: string | null;
  teacherId?: string | null;
  needsAttention?: boolean;
  from?: string | null;
  to?: string | null;
  limit?: number;
};

export async function listAdminBookings(
  admin: AdminClient,
  input: ListAdminBookingsInput = {},
): Promise<{ bookings: AdminBookingOpsRow[]; summary: AdminBookingsSummary }> {
  const limit = Math.min(Math.max(1, input.limit ?? 100), 200);
  let query = admin
    .from("bookings")
    .select(BOOKING_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (input.status?.trim()) query = query.eq("status", input.status.trim());
  if (input.studentId?.trim()) query = query.eq("student_id", input.studentId.trim());
  if (input.teacherId?.trim()) query = query.eq("teacher_id", input.teacherId.trim());
  if (input.from?.trim()) query = query.gte("created_at", new Date(input.from).toISOString());
  if (input.to?.trim()) query = query.lte("created_at", new Date(input.to).toISOString());

  const { data, error } = await query;
  if (error) {
    console.error("[admin/ops] bookings list failed", error.message);
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const studentIds = rows.map((r) => String(r.student_id ?? ""));
  const teacherIds = rows.map((r) => String(r.teacher_id ?? ""));
  const bookingIds = rows.map((r) => String(r.id ?? ""));

  const [profiles, teachers, payments] = await Promise.all([
    loadProfilesByIds(admin, studentIds),
    loadTeachersByIds(admin, teacherIds),
    (async () => {
      if (bookingIds.length === 0) return [] as Array<Record<string, unknown>>;
      const { data: payData, error: payErr } = await admin
        .from("booking_payments")
        .select(
          "booking_id, payment_status, transfer_status, refund_status, stripe_payment_intent_id, stripe_checkout_session_id",
        )
        .in("booking_id", bookingIds);
      if (payErr) {
        console.error("[admin/ops] booking payments join failed", payErr.message);
        return [];
      }
      return (payData ?? []) as Array<Record<string, unknown>>;
    })(),
  ]);

  const teacherUserIds = Array.from(teachers.values())
    .map((t) => t.user_id)
    .filter((id): id is string => Boolean(id));
  const teacherProfiles = await loadProfilesByIds(admin, teacherUserIds);

  const paymentByBooking = new Map<string, Record<string, unknown>>();
  for (const p of payments) {
    paymentByBooking.set(String(p.booking_id), p);
  }

  const q = input.q?.trim().toLowerCase() ?? "";

  const bookings: AdminBookingOpsRow[] = [];
  for (const row of rows) {
    const id = String(row.id);
    const studentId = String(row.student_id ?? "");
    const teacherRowId = String(row.teacher_id ?? "");
    const teacher = teachers.get(teacherRowId) ?? null;
    const student = personFrom(profiles.get(studentId), studentId || null);
    const teacherPerson = personFrom(
      teacher?.user_id ? teacherProfiles.get(teacher.user_id) : undefined,
      (teacher?.user_id ?? teacherRowId) || null,
    );
    const pay = paymentByBooking.get(id);
    const paymentStatus = pay ? String(pay.payment_status ?? "") || null : null;
    const transferStatus = pay ? String(pay.transfer_status ?? "") || null : null;
    const refundStatus =
      (pay ? String(pay.refund_status ?? "") : "") ||
      (row.refund_status ? String(row.refund_status) : null) ||
      null;

    const attention = computeBookingAttention({
      status: String(row.status ?? ""),
      createdAt: (row.created_at as string | null) ?? null,
      student,
      teacher: teacherPerson,
      teacherStripeIncomplete: isTeacherStripeIncomplete(teacher),
      paymentStatus,
      transferStatus,
      refundStatus,
    });

    const lessonDate =
      (row.slot_date as string | null) || (row.date as string | null) || null;
    const lessonTime =
      (row.time_slot as string | null) || (row.time as string | null) || null;

    const opsRow: AdminBookingOpsRow = {
      id,
      shortId: shortAdminId(id),
      status: String(row.status ?? ""),
      createdAt: (row.created_at as string | null) ?? null,
      updatedAt: null,
      lessonDate,
      lessonTime,
      teachingMode: (row.teaching_mode as string | null) ?? null,
      lessonType: (row.lesson_type as string | null) ?? null,
      durationMinutes:
        row.duration_minutes === null || row.duration_minutes === undefined
          ? null
          : Number(row.duration_minutes),
      price: row.price === null || row.price === undefined ? null : Number(row.price),
      creditsApplied:
        row.credits_applied === null || row.credits_applied === undefined
          ? null
          : Number(row.credits_applied),
      student,
      teacher: teacherPerson,
      teacherRowId: teacherRowId || null,
      paymentStatus,
      transferStatus,
      refundStatus,
      stripePaymentIntentId:
        (pay?.stripe_payment_intent_id as string | null) ||
        (row.stripe_payment_intent_id as string | null) ||
        null,
      stripeCheckoutSessionId: (pay?.stripe_checkout_session_id as string | null) || null,
      attentionCodes: attention.codes,
      attentionLabels: attention.labels,
      ...mapBookingOfferSnapshotFields(row),
    };

    if (q) {
      const hay = [
        opsRow.shortId,
        opsRow.id,
        opsRow.status,
        opsRow.student?.name,
        opsRow.student?.email,
        opsRow.teacher?.name,
        opsRow.teacher?.email,
        opsRow.paymentStatus,
        opsRow.offerSnapshot?.title,
        opsRow.offerSnapshotTeacherOfferId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) continue;
    }

    if (input.needsAttention && attention.codes.length === 0) continue;

    bookings.push(opsRow);
  }

  const summary: AdminBookingsSummary = {
    total: bookings.length,
    pendingPayment: bookings.filter((b) => b.status === "pending_payment").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter(
      (b) => b.status === "cancelled" || b.status === "cancelled_conflict",
    ).length,
    needsAttention: bookings.filter((b) => b.attentionCodes.length > 0).length,
  };

  return { bookings, summary };
}

export type ListAdminPaymentsInput = {
  paymentStatus?: string | null;
  q?: string | null;
  studentId?: string | null;
  teacherId?: string | null;
  needsAttention?: boolean;
  from?: string | null;
  to?: string | null;
  limit?: number;
};

export async function listAdminPayments(
  admin: AdminClient,
  input: ListAdminPaymentsInput = {},
): Promise<{ payments: AdminPaymentOpsRow[]; summary: AdminPaymentsSummary }> {
  const limit = Math.min(Math.max(1, input.limit ?? 100), 200);
  let query = admin
    .from("booking_payments")
    .select(PAYMENT_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (input.paymentStatus?.trim()) {
    query = query.eq("payment_status", input.paymentStatus.trim());
  }
  if (input.studentId?.trim()) query = query.eq("student_id", input.studentId.trim());
  if (input.teacherId?.trim()) query = query.eq("teacher_id", input.teacherId.trim());
  if (input.from?.trim()) query = query.gte("created_at", new Date(input.from).toISOString());
  if (input.to?.trim()) query = query.lte("created_at", new Date(input.to).toISOString());

  const { data, error } = await query;
  if (error) {
    console.error("[admin/ops] payments list failed", error.message);
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const studentIds = rows.map((r) => String(r.student_id ?? ""));
  const teacherIds = rows.map((r) => String(r.teacher_id ?? ""));
  const bookingIds = rows.map((r) => String(r.booking_id ?? ""));

  const [profiles, teachers, bookings] = await Promise.all([
    loadProfilesByIds(admin, studentIds),
    loadTeachersByIds(admin, teacherIds),
    (async () => {
      if (bookingIds.length === 0) return [] as Array<Record<string, unknown>>;
      const { data: bData, error: bErr } = await admin
        .from("bookings")
        .select(`id, credits_applied, ${ADMIN_BOOKING_OFFER_SNAPSHOT_SELECT}`)
        .in("id", bookingIds);
      if (bErr) {
        console.error("[admin/ops] payments bookings join failed", bErr.message);
        return [];
      }
      return (bData ?? []) as Array<Record<string, unknown>>;
    })(),
  ]);

  const teacherUserIds = Array.from(teachers.values())
    .map((t) => t.user_id)
    .filter((id): id is string => Boolean(id));
  const teacherProfiles = await loadProfilesByIds(admin, teacherUserIds);
  const creditsByBooking = new Map<string, number>();
  const bookingById = new Map<string, Record<string, unknown>>();
  for (const b of bookings) {
    const bookingId = String(b.id);
    creditsByBooking.set(bookingId, Number(b.credits_applied ?? 0));
    bookingById.set(bookingId, b);
  }

  const q = input.q?.trim().toLowerCase() ?? "";
  const payments: AdminPaymentOpsRow[] = [];

  for (const row of rows) {
    const id = String(row.id);
    const studentId = String(row.student_id ?? "");
    const teacherRowId = String(row.teacher_id ?? "");
    const teacher = teachers.get(teacherRowId) ?? null;
    const student = personFrom(profiles.get(studentId), studentId || null);
    const teacherPerson = personFrom(
      teacher?.user_id ? teacherProfiles.get(teacher.user_id) : undefined,
      (teacher?.user_id ?? teacherRowId) || null,
    );
    const paymentStatus = (row.payment_status as string | null) ?? null;
    const transferStatus = (row.transfer_status as string | null) ?? null;
    const refundStatus = (row.refund_status as string | null) ?? null;

    const attention = computePaymentAttention({
      paymentStatus,
      transferStatus,
      refundStatus,
      createdAt: (row.created_at as string | null) ?? null,
      student,
      teacher: teacherPerson,
      teacherStripeIncomplete: isTeacherStripeIncomplete(teacher),
    });

    const bookingRow = bookingById.get(String(row.booking_id ?? "")) ?? {};
    const metadataPricingSource = extractPricingSourceFromPaymentMetadata(row.metadata);
    const snapshotFields = mapBookingOfferSnapshotFields(bookingRow, metadataPricingSource);

    const opsRow: AdminPaymentOpsRow = {
      id,
      shortId: shortAdminId(id),
      bookingId: String(row.booking_id ?? ""),
      createdAt: (row.created_at as string | null) ?? null,
      updatedAt: (row.updated_at as string | null) ?? null,
      student,
      teacher: teacherPerson,
      teacherRowId: teacherRowId || null,
      amountCents:
        row.amount_cents === null || row.amount_cents === undefined
          ? null
          : Number(row.amount_cents),
      subtotalCents:
        row.subtotal_cents === null || row.subtotal_cents === undefined
          ? null
          : Number(row.subtotal_cents),
      platformFeeCents:
        row.platform_fee_cents === null || row.platform_fee_cents === undefined
          ? null
          : Number(row.platform_fee_cents),
      teacherNetCents:
        row.teacher_net_cents === null || row.teacher_net_cents === undefined
          ? null
          : Number(row.teacher_net_cents),
      refundedCents:
        row.refunded_cents === null || row.refunded_cents === undefined
          ? null
          : Number(row.refunded_cents),
      currency: (row.currency as string | null) ?? null,
      creditsApplied: creditsByBooking.get(String(row.booking_id ?? "")) ?? null,
      promoCode: null,
      stripeFeeCents: null,
      paymentStatus,
      transferStatus,
      refundStatus,
      stripePaymentIntentId: (row.stripe_payment_intent_id as string | null) ?? null,
      stripeCheckoutSessionId: (row.stripe_checkout_session_id as string | null) ?? null,
      stripeChargeId: (row.stripe_charge_id as string | null) ?? null,
      stripeTransferId: (row.stripe_transfer_id as string | null) ?? null,
      paidAt: (row.paid_at as string | null) ?? null,
      failedAt: (row.failed_at as string | null) ?? null,
      failureReason: (row.failure_reason as string | null) ?? null,
      attentionCodes: attention.codes,
      attentionLabels: attention.labels,
      ...snapshotFields,
    };

    if (q) {
      const hay = [
        opsRow.shortId,
        opsRow.id,
        opsRow.bookingId,
        opsRow.paymentStatus,
        opsRow.student?.name,
        opsRow.student?.email,
        opsRow.teacher?.name,
        opsRow.teacher?.email,
        opsRow.stripePaymentIntentId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) continue;
    }

    if (input.needsAttention && attention.codes.length === 0) continue;
    payments.push(opsRow);
  }

  const summary: AdminPaymentsSummary = {
    count: payments.length,
    grossCents: payments.reduce((s, p) => s + (p.amountCents ?? 0), 0),
    platformFeeCents: payments.reduce((s, p) => s + (p.platformFeeCents ?? 0), 0),
    teacherNetCents: payments.reduce((s, p) => s + (p.teacherNetCents ?? 0), 0),
    creditsAppliedTotal: payments.reduce((s, p) => s + (p.creditsApplied ?? 0), 0),
    failedOrPending: payments.filter((p) =>
      ["failed", "unpaid", "requires_action"].includes(p.paymentStatus ?? ""),
    ).length,
    refundOrDispute: payments.filter((p) =>
      ["refunded", "partially_refunded", "disputed"].includes(p.paymentStatus ?? "") ||
      ["pending", "pending_review", "failed"].includes(p.refundStatus ?? ""),
    ).length,
  };

  return { payments, summary };
}

/** Keys that must never appear in admin ops JSON responses. */
export const ADMIN_OPS_FORBIDDEN_RESPONSE_KEYS = [
  "client_secret",
  "CLIENT_SECRET",
  "secret_key",
  "SECRET_KEY",
  "webhook_secret",
  "SUPABASE_SERVICE_ROLE_KEY",
  "metadata",
  "raw",
  "payload",
] as const;
