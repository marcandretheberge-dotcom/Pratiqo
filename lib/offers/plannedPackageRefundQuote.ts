/**
 * Planned package refund quote calculation — draft, conservative, admin-reviewed.
 * Not legal advice. Does NOT execute Stripe refunds.
 */

import { allocatePlannedPackageSessionCents } from "./plannedPackageAllocation";
import {
  classifyPlannedPackageSessions,
  type PlannedPackageSessionDeliveryRow,
} from "./plannedPackageSessionDelivery";
import { PLANNED_PACKAGE_REFUND_POLICY_VERSION } from "./plannedPackageRefundQuotes";

const PENALTY_CAP_CENTS = 5000;
const PENALTY_RATE_BPS = 1000; // 10%

export type PlannedPackageRefundQuoteInput = {
  orderId: string;
  orderStatus: string;
  packageTotalCents: number;
  currency: string;
  sessionCount: number;
  bookings: PlannedPackageSessionDeliveryRow[];
  cancellationAt?: Date;
  policyVersion?: string;
  adminAdjustmentCents?: number;
  adminAdjustmentReason?: string | null;
  legalReviewCompleted?: boolean;
};

export type PlannedPackageRefundQuoteResult = {
  policyVersion: string;
  packageTotalCents: number;
  currency: string;
  completedSessionCount: number;
  undeliveredSessionCount: number;
  totalSessionCount: number;
  completedValueCents: number;
  undeliveredValueCents: number;
  penaltyCents: number;
  estimatedRefundCents: number;
  adminAdjustmentCents: number;
  adminAdjustmentReason: string | null;
  manualReviewRequired: boolean;
  legalReviewRequired: boolean;
  blockers: string[];
  warnings: string[];
  calculationSnapshot: Record<string, unknown>;
};

const QUOTE_ELIGIBLE_ORDER_STATUSES = new Set(["fulfilled", "payment_confirmed", "fulfilling"]);

function computePenaltyCents(undeliveredValueCents: number): number {
  if (undeliveredValueCents <= 0) return 0;
  const tenPercent = Math.floor((undeliveredValueCents * PENALTY_RATE_BPS) / 10_000);
  return Math.min(PENALTY_CAP_CENTS, tenPercent);
}

export function calculatePlannedPackageRefundQuote(
  input: PlannedPackageRefundQuoteInput,
): PlannedPackageRefundQuoteResult {
  const policyVersion = input.policyVersion ?? PLANNED_PACKAGE_REFUND_POLICY_VERSION;
  const blockers: string[] = [];
  const warnings: string[] = [];

  const packageTotalCents = Number(input.packageTotalCents);
  const sessionCount = Number(input.sessionCount);
  const currency = String(input.currency ?? "CAD").toUpperCase();

  if (!Number.isInteger(packageTotalCents) || packageTotalCents < 0) {
    blockers.push("invalid_package_total");
  }
  if (!Number.isInteger(sessionCount) || sessionCount < 1) {
    blockers.push("invalid_session_count");
  }
  if (currency !== "CAD") {
    blockers.push("unsupported_currency");
  }
  if (!QUOTE_ELIGIBLE_ORDER_STATUSES.has(String(input.orderStatus ?? ""))) {
    blockers.push("order_not_quote_eligible");
  }

  const classification = classifyPlannedPackageSessions({
    bookings: input.bookings,
    expectedSessionCount: sessionCount,
    now: input.cancellationAt,
  });

  blockers.push(...classification.blockers);
  warnings.push(...classification.warnings);

  let allocations: number[] = [];
  try {
    allocations = allocatePlannedPackageSessionCents(packageTotalCents, sessionCount);
    const allocSum = allocations.reduce((a, b) => a + b, 0);
    if (allocSum !== packageTotalCents) {
      blockers.push("allocation_sum_mismatch");
    }
  } catch {
    blockers.push("allocation_failed");
    allocations = [];
  }

  let completedValueCents = 0;
  let undeliveredValueCents = 0;
  const sessionBreakdown: Array<Record<string, unknown>> = [];

  for (const session of classification.sessions) {
    const idx = session.sessionIndex - 1;
    const allocated = allocations[idx] ?? 0;
    sessionBreakdown.push({
      session_index: session.sessionIndex,
      booking_id: session.bookingId,
      status: session.status,
      delivery_class: session.deliveryClass,
      allocated_cents: allocated,
    });

    if (session.deliveryClass === "completed") {
      completedValueCents += allocated;
    } else if (session.deliveryClass === "future_undelivered") {
      undeliveredValueCents += allocated;
    }
  }

  if (classification.completedCount === 0 && classification.undeliveredCount === 0 && sessionCount > 0) {
    if (classification.sessions.every((s) => s.deliveryClass !== "completed")) {
      undeliveredValueCents = packageTotalCents;
      completedValueCents = 0;
    }
  }

  if (completedValueCents + undeliveredValueCents > packageTotalCents) {
    warnings.push("delivered_value_exceeds_total");
  }

  let penaltyCents = 0;
  let estimatedRefundCents = packageTotalCents;

  if (classification.completedCount === 0 && blockers.length === 0) {
    completedValueCents = 0;
    undeliveredValueCents = packageTotalCents;
    penaltyCents = 0;
    estimatedRefundCents = packageTotalCents;
  } else if (classification.completedCount > 0) {
    penaltyCents = computePenaltyCents(undeliveredValueCents);
    estimatedRefundCents = Math.max(0, undeliveredValueCents - penaltyCents);
  }

  const adminAdjustmentCents = Number(input.adminAdjustmentCents ?? 0) || 0;
  if (adminAdjustmentCents !== 0) {
    estimatedRefundCents = Math.max(0, estimatedRefundCents + adminAdjustmentCents);
    warnings.push("admin_adjustment_applied");
  }

  const legalReviewRequired = input.legalReviewCompleted !== true;
  const manualReviewRequired =
    legalReviewRequired ||
    classification.manualReviewRequired ||
    blockers.length > 0 ||
    warnings.length > 0;

  return {
    policyVersion,
    packageTotalCents,
    currency,
    completedSessionCount: classification.completedCount,
    undeliveredSessionCount: classification.undeliveredCount,
    totalSessionCount: sessionCount,
    completedValueCents,
    undeliveredValueCents,
    penaltyCents,
    estimatedRefundCents,
    adminAdjustmentCents,
    adminAdjustmentReason: input.adminAdjustmentReason ?? null,
    manualReviewRequired,
    legalReviewRequired,
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
    calculationSnapshot: {
      order_id: input.orderId,
      order_status: input.orderStatus,
      policy_version: policyVersion,
      cancellation_at: (input.cancellationAt ?? new Date()).toISOString(),
      penalty_cap_cents: PENALTY_CAP_CENTS,
      penalty_rate_bps: PENALTY_RATE_BPS,
      allocations,
      sessions: sessionBreakdown,
      classification,
      formula:
        classification.completedCount === 0
          ? "no_sessions_completed_full_refund_quote"
          : "completed_value_plus_penalty_on_undelivered",
    },
  };
}
