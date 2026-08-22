/**
 * Classify planned package session bookings for refund quote calculation.
 * Read-only — does not mutate bookings.
 */

export type PlannedPackageSessionDeliveryClass =
  | "completed"
  | "future_undelivered"
  | "cancelled"
  | "no_show"
  | "disputed"
  | "unknown";

export type PlannedPackageSessionDeliveryRow = {
  bookingId: string;
  sessionIndex: number;
  status: string;
  lessonDate: string | null;
  lessonTime: string | null;
};

export type ClassifyPlannedPackageSessionsResult = {
  sessions: Array<{
    bookingId: string;
    sessionIndex: number;
    status: string;
    deliveryClass: PlannedPackageSessionDeliveryClass;
  }>;
  completedCount: number;
  undeliveredCount: number;
  manualReviewRequired: boolean;
  warnings: string[];
  blockers: string[];
};

const COMPLETED_STATUSES = new Set(["completed"]);
const FUTURE_STATUSES = new Set(["confirmed", "pending_payment"]);
const CANCELLED_STATUSES = new Set(["cancelled", "cancelled_conflict"]);
const NO_SHOW_STATUSES = new Set(["no_show"]);
const DISPUTED_STATUSES = new Set(["disputed"]);

export function classifyPlannedPackageSessionStatus(
  status: string,
): PlannedPackageSessionDeliveryClass {
  const s = String(status ?? "").toLowerCase();
  if (COMPLETED_STATUSES.has(s)) return "completed";
  if (FUTURE_STATUSES.has(s)) return "future_undelivered";
  if (CANCELLED_STATUSES.has(s)) return "cancelled";
  if (NO_SHOW_STATUSES.has(s)) return "no_show";
  if (DISPUTED_STATUSES.has(s)) return "disputed";
  return "unknown";
}

export function classifyPlannedPackageSessions(args: {
  bookings: PlannedPackageSessionDeliveryRow[];
  expectedSessionCount: number;
  now?: Date;
}): ClassifyPlannedPackageSessionsResult {
  const warnings: string[] = [];
  const blockers: string[] = [];
  const now = args.now ?? new Date();

  if (args.bookings.length === 0) {
    blockers.push("bookings_missing");
  }
  if (args.bookings.length !== args.expectedSessionCount) {
    blockers.push("booking_count_mismatch");
  }

  const indexSet = new Set<number>();
  const sessions = args.bookings.map((b) => {
    const deliveryClass = classifyPlannedPackageSessionStatus(b.status);
    if (!Number.isInteger(b.sessionIndex) || b.sessionIndex < 1) {
      blockers.push("session_index_missing");
    } else if (indexSet.has(b.sessionIndex)) {
      blockers.push("duplicate_session_index");
    } else {
      indexSet.add(b.sessionIndex);
    }

    if (deliveryClass === "no_show" || deliveryClass === "disputed" || deliveryClass === "unknown") {
      warnings.push(`session_${b.sessionIndex}_${deliveryClass}`);
    }
    if (deliveryClass === "cancelled") {
      warnings.push(`session_${b.sessionIndex}_cancelled`);
    }

    return {
      bookingId: b.bookingId,
      sessionIndex: b.sessionIndex,
      status: b.status,
      deliveryClass,
    };
  });

  let completedCount = 0;
  let undeliveredCount = 0;
  for (const s of sessions) {
    if (s.deliveryClass === "completed") completedCount += 1;
    else if (s.deliveryClass === "future_undelivered") undeliveredCount += 1;
  }

  const manualReviewRequired =
    blockers.length > 0 ||
    warnings.some((w) => !w.endsWith("_cancelled")) ||
    sessions.some((s) =>
      ["no_show", "disputed", "unknown", "cancelled"].includes(s.deliveryClass),
    );

  return {
    sessions,
    completedCount,
    undeliveredCount,
    manualReviewRequired,
    warnings,
    blockers: Array.from(new Set(blockers)),
  };
}
