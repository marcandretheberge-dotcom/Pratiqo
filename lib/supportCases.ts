import type { TranslationKey } from "@/lib/translations";

export const SUPPORT_CASE_CATEGORIES = [
  "teacher_no_show",
  "student_no_show",
  "late_cancellation",
  "lesson_too_short",
  "technical_issue",
  "wrong_address_or_location",
  "refund_request",
  "payment_or_receipt_issue",
  "inappropriate_behavior",
  "other",
] as const;

export const REQUESTED_RESOLUTIONS = [
  "refund",
  "credit",
  "reschedule",
  "payout_review",
  "information_only",
  "other",
] as const;

export type SupportCaseCategory = (typeof SUPPORT_CASE_CATEGORIES)[number];
export type RequestedResolution = (typeof REQUESTED_RESOLUTIONS)[number];
export type SupportCaseRole = "student" | "teacher" | "admin";
export type SupportCaseStatus =
  | "new"
  | "waiting_other_party"
  | "under_review"
  | "resolved"
  | "refunded"
  | "credited"
  | "closed";
export type SupportCasePriority = "low" | "normal" | "high" | "urgent";

export type BookingForSupportCase = {
  id: string;
  student_id: string;
  teacher_id: string;
};

const PAYOUT_HOLD_CATEGORIES = new Set<SupportCaseCategory>([
  "teacher_no_show",
  "lesson_too_short",
  "technical_issue",
  "wrong_address_or_location",
  "refund_request",
  "inappropriate_behavior",
]);

export function isSupportCaseCategory(value: unknown): value is SupportCaseCategory {
  return SUPPORT_CASE_CATEGORIES.includes(value as SupportCaseCategory);
}

export function isRequestedResolution(value: unknown): value is RequestedResolution {
  return REQUESTED_RESOLUTIONS.includes(value as RequestedResolution);
}

export function shouldHoldPayout(category: SupportCaseCategory): boolean {
  return PAYOUT_HOLD_CATEGORIES.has(category);
}

export function getSupportCasePriority(category: SupportCaseCategory, description = ""): SupportCasePriority {
  const text = description.toLowerCase();
  if (category === "inappropriate_behavior") return "urgent";
  if (category === "payment_or_receipt_issue" || category === "refund_request") return "high";
  if (/\b(minor|child|enfant|menace|threat|harass|harc[eè]lement|safety|danger)\b/i.test(text)) return "urgent";
  if (category === "teacher_no_show" || category === "technical_issue") return "high";
  return "normal";
}

export function getSupportCaseTitle(category: SupportCaseCategory): string {
  return category.replaceAll("_", " ");
}

export function canUserOpenCaseForBooking(
  userId: string,
  booking: BookingForSupportCase,
  teacherOwnerUserId?: string | null,
): boolean {
  return booking.student_id === userId || teacherOwnerUserId === userId;
}

export function inferSupportCaseRole(
  userId: string,
  booking: BookingForSupportCase,
  teacherOwnerUserId?: string | null,
): Exclude<SupportCaseRole, "admin"> | null {
  if (booking.student_id === userId) return "student";
  if (teacherOwnerUserId === userId) return "teacher";
  return null;
}

export function buildSupportCasePayload(input: {
  userId: string;
  booking: BookingForSupportCase;
  role: Exclude<SupportCaseRole, "admin">;
  category: SupportCaseCategory;
  description: string;
  requestedResolution?: RequestedResolution | null;
  evidenceUrls?: string[];
  paymentTransferStatus?: string | null;
}) {
  const transferStatus = String(input.paymentTransferStatus || "").toLowerCase();
  const payoutAlreadyFinal = transferStatus === "transferred" || transferStatus === "reversed";
  const payoutHold = shouldHoldPayout(input.category) && !payoutAlreadyFinal;
  return {
    booking_id: input.booking.id,
    opened_by_user_id: input.userId,
    student_id: input.booking.student_id,
    teacher_id: input.booking.teacher_id,
    role: input.role,
    category: input.category,
    status: "new" as const,
    priority: getSupportCasePriority(input.category, input.description),
    title: getSupportCaseTitle(input.category),
    description: input.description.trim(),
    requested_resolution: input.requestedResolution ?? null,
    evidence_urls: input.evidenceUrls ?? [],
    payout_hold: payoutHold,
    payout_hold_reason: payoutHold ? `Open support case: ${input.category}` : null,
  };
}

export function supportCategoryLabelKey(category: SupportCaseCategory): TranslationKey {
  const map: Record<SupportCaseCategory, TranslationKey> = {
    teacher_no_show: "supportCategoryTeacherNoShow",
    student_no_show: "supportCategoryStudentNoShow",
    late_cancellation: "supportCategoryLateCancellation",
    lesson_too_short: "supportCategoryLessonTooShort",
    technical_issue: "supportCategoryTechnicalIssue",
    wrong_address_or_location: "supportCategoryWrongAddress",
    refund_request: "supportCategoryRefundRequest",
    payment_or_receipt_issue: "supportCategoryPaymentIssue",
    inappropriate_behavior: "supportCategoryInappropriateBehavior",
    other: "supportCategoryOther",
  };
  return map[category];
}

export function supportStatusLabelKey(status: SupportCaseStatus | string): TranslationKey {
  const map: Record<SupportCaseStatus, TranslationKey> = {
    new: "supportStatusNew",
    waiting_other_party: "supportStatusWaitingOtherParty",
    under_review: "supportStatusUnderReview",
    resolved: "supportStatusResolved",
    refunded: "supportStatusRefunded",
    credited: "supportStatusCredited",
    closed: "supportStatusClosed",
  };
  return map[status as SupportCaseStatus] ?? "supportStatusNew";
}

export function requestedResolutionLabelKey(value: RequestedResolution | string | null | undefined): TranslationKey {
  const map: Record<RequestedResolution, TranslationKey> = {
    refund: "requestedResolutionRefund",
    credit: "requestedResolutionCredit",
    reschedule: "requestedResolutionReschedule",
    payout_review: "requestedResolutionPayoutReview",
    information_only: "requestedResolutionInformationOnly",
    other: "requestedResolutionOther",
  };
  return map[value as RequestedResolution] ?? "requestedResolutionOther";
}
