/**
 * Run planned package checkout preflight (read-only).
 * Revalidates draft sessions; never creates payment, bookings, or entitlements.
 */

import { createClient } from "@supabase/supabase-js";
import { slotStartMinutes } from "@/lib/slots";
import { teacherPaymentReadinessFailureReasons } from "@/lib/teachers/readinessContracts";
import { canBookTeacherOnDate } from "@/lib/teachers/availabilityStartDate";
import { loadOwnedPlannedPackageSessionDraft } from "./createPlannedPackageSessionDraft";
import {
  canUsePlannedPackageCheckoutPreflight,
  isPlannedPackageCheckoutEnabled,
  uniqueBlockers,
  type PlannedPackageCheckoutPreflightResult,
  type PlannedPackagePreflightBlocker,
  type PlannedPackagePreflightSessionResult,
  type PlannedPackagePreflightWarning,
} from "./plannedPackageCheckoutPreflight";
import {
  canUsePlannedPackageSessionDrafts,
  isPlannedPackageSessionDraftsEnabled,
} from "./plannedPackageSessionDrafts";
import {
  getPlannedPackagePublicLaunchBlockers,
  isPackageLegalReviewCompleted,
  isPlannedPackageOfferType,
  isPlannedPackagesEnabled,
} from "./plannedPackages";
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

function mapSlotErrorToBlocker(error: string): PlannedPackagePreflightBlocker {
  switch (error) {
    case "teacher_not_available_yet":
      return "teacher_not_available_yet";
    case "slot_conflict":
      return "slot_conflict";
    case "slot_outside_teacher_exception_hours":
      return "slot_outside_teacher_exception_hours";
    case "teacher_unavailable_on_date":
      return "teacher_unavailable_on_date";
    case "offer_not_found":
      return "offer_not_found";
    default:
      return "session_slot_no_longer_available";
  }
}

async function hasBookingConflict(args: {
  admin: ReturnType<typeof adminClient>;
  teacherId: string;
  slotDate: string;
  timeSlot: string;
  durationMinutes: number;
}): Promise<boolean> {
  const { data } = await args.admin
    .from("bookings")
    .select("time_slot, duration_minutes")
    .eq("teacher_id", args.teacherId)
    .eq("slot_date", args.slotDate)
    .in("status", ["pending_payment", "confirmed"])
    .not("time_slot", "is", null);

  const candidateStart = slotStartMinutes(args.timeSlot);
  if (candidateStart < 0) return true;
  const candidateEnd = candidateStart + args.durationMinutes;

  for (const row of data ?? []) {
    const bookedSlot = typeof row.time_slot === "string" ? row.time_slot : "";
    const bookedStart = slotStartMinutes(bookedSlot);
    if (bookedStart < 0) continue;
    const bookedDur =
      typeof row.duration_minutes === "number" && row.duration_minutes > 0
        ? row.duration_minutes
        : 60;
    const bookedEnd = bookedStart + bookedDur;
    if (candidateStart < bookedEnd && bookedStart < candidateEnd) return true;
  }
  return false;
}

export type RunPreflightOutcome =
  | { ok: true; result: PlannedPackageCheckoutPreflightResult }
  | { ok: false; status: number; error: PlannedPackagePreflightBlocker };

export async function runPlannedPackageCheckoutPreflight(args: {
  studentId: string;
  draftId: string;
}): Promise<RunPreflightOutcome> {
  if (!isPlannedPackagesEnabled()) {
    return { ok: false, status: 403, error: "planned_packages_disabled" };
  }
  if (!isPlannedPackageSessionDraftsEnabled() || !canUsePlannedPackageSessionDrafts()) {
    return { ok: false, status: 403, error: "session_drafts_disabled" };
  }
  if (!canUsePlannedPackageCheckoutPreflight()) {
    return { ok: false, status: 403, error: "checkout_preflight_disabled" };
  }

  const draft = await loadOwnedPlannedPackageSessionDraft({
    studentId: args.studentId,
    draftId: args.draftId,
  });
  if (!draft) {
    return { ok: false, status: 404, error: "draft_not_found" };
  }
  if (draft.status !== "draft") {
    return { ok: false, status: 409, error: "draft_not_active" };
  }

  const admin = adminClient();
  const { data: offer, error: offerErr } = await admin
    .from("teacher_offers")
    .select(
      "id, teacher_id, title, offer_type, status, price_cents, currency, duration_minutes, session_count, published_at",
    )
    .eq("id", draft.teacherOfferId)
    .maybeSingle();

  const globalBlockers: PlannedPackagePreflightBlocker[] = [];

  if (offerErr || !offer?.id) {
    globalBlockers.push("offer_not_found");
  } else if (!isPlannedPackageOfferType(offer.offer_type as string)) {
    globalBlockers.push("offer_not_planned_package");
  } else if (offer.status !== "published" || !offer.published_at) {
    globalBlockers.push("offer_not_available");
  } else if (offer.teacher_id !== draft.teacherId) {
    globalBlockers.push("offer_not_available");
  }

  if (draft.sessions.length !== draft.sessionCount) {
    globalBlockers.push("invalid_session_count");
  }

  const sessionResults: PlannedPackagePreflightSessionResult[] = [];

  for (const item of draft.sessions) {
    const sessionBlockers: PlannedPackagePreflightBlocker[] = [];
    const parsed = parseStartsAtToBookingSlot(item.startsAt, draft.durationMinutes);
    if (!parsed) {
      sessionBlockers.push("session_slot_no_longer_available");
    } else {
      const { data: teacher } = await admin
        .from("teachers")
        .select("id, available_from_date")
        .eq("id", draft.teacherId)
        .maybeSingle();

      if (teacher && !canBookTeacherOnDate(teacher.available_from_date ?? null, parsed.slotDate)) {
        sessionBlockers.push("teacher_not_available_yet");
      } else {
        const check = await validatePlannedPackageDraftSlot({
          admin: admin as unknown as PlannedPackageSlotAdmin,
          teacherId: draft.teacherId,
          slot: parsed,
          durationMinutes: draft.durationMinutes,
        });
        if (!check.ok) {
          sessionBlockers.push(mapSlotErrorToBlocker(check.error));
        } else {
          const conflict = await hasBookingConflict({
            admin,
            teacherId: draft.teacherId,
            slotDate: parsed.slotDate,
            timeSlot: parsed.timeSlot,
            durationMinutes: draft.durationMinutes,
          });
          if (conflict) sessionBlockers.push("slot_conflict");
        }
      }
    }

    sessionResults.push({
      sessionIndex: item.sessionIndex,
      startsAt: item.startsAt,
      endsAt: item.endsAt,
      valid: sessionBlockers.length === 0,
      blockers: uniqueBlockers(sessionBlockers),
    });
  }

  const { data: teacherPay } = await admin
    .from("teachers")
    .select(
      "stripe_account_id, stripe_connect_onboarding_complete, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_requirements_due, stripe_connect_disabled_reason",
    )
    .eq("id", draft.teacherId)
    .maybeSingle();

  const paymentReasons = teacherPaymentReadinessFailureReasons({
    stripe_account_id: teacherPay?.stripe_account_id as string | null | undefined,
    stripe_connect_onboarding_complete: teacherPay?.stripe_connect_onboarding_complete as
      | boolean
      | null
      | undefined,
    stripe_connect_charges_enabled: teacherPay?.stripe_connect_charges_enabled as
      | boolean
      | null
      | undefined,
    stripe_connect_requirements_due: teacherPay?.stripe_connect_requirements_due,
    stripe_connect_disabled_reason: teacherPay?.stripe_connect_disabled_reason as
      | string
      | null
      | undefined,
  });
  if (paymentReasons.length > 0) {
    globalBlockers.push("teacher_payment_not_ready");
  }

  if (!isPackageLegalReviewCompleted()) {
    globalBlockers.push("package_legal_review_required");
  }
  if (!isPlannedPackageCheckoutEnabled()) {
    globalBlockers.push("planned_package_checkout_not_enabled");
  }

  for (const code of getPlannedPackagePublicLaunchBlockers()) {
    if (code === "package_legal_review_required") continue;
    if (code === "planned_packages_disabled") continue;
    globalBlockers.push(code as PlannedPackagePreflightBlocker);
  }

  const warnings: PlannedPackagePreflightWarning[] = [
    "sessions_not_reserved_until_payment",
    "availability_rechecked_before_payment",
    "payment_coming_soon",
  ];

  const sessionsValid = sessionResults.every((s) => s.valid);
  const blockers = uniqueBlockers(globalBlockers);
  const readyForFutureCheckout =
    sessionsValid &&
    blockers.length === 0 &&
    isPlannedPackageCheckoutEnabled() &&
    isPackageLegalReviewCompleted();

  return {
    ok: true,
    result: {
      draftId: draft.id,
      readyForFutureCheckout,
      package: {
        title: draft.titleSnapshot,
        sessionCount: draft.sessionCount,
        durationMinutes: draft.durationMinutes,
        priceCents: draft.priceCentsSnapshot,
        currency: draft.currencySnapshot,
      },
      sessions: sessionResults,
      blockers,
      warnings,
    },
  };
}
