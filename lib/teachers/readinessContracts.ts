export type TeacherStripeReadinessBlocker =
  | "missing_stripe_account"
  | "onboarding_incomplete"
  | "charges_disabled"
  | "payouts_disabled"
  | "requirements_due"
  | "disabled_reason";

export type TeacherBookingReadinessBlocker =
  | "profile_not_visible"
  | "no_availability"
  | "payment_not_ready"
  | "payout_not_ready";

export type TeacherStripeReadinessInput = {
  stripe_account_id?: string | null;
  stripe_connect_onboarding_complete?: boolean | null;
  stripe_connect_charges_enabled?: boolean | null;
  stripe_connect_payouts_enabled?: boolean | null;
  stripe_connect_requirements_due?: unknown;
  stripe_connect_disabled_reason?: string | null;
};

export type TeacherReadinessContractInput = TeacherStripeReadinessInput & {
  profileVisibilityReady: boolean;
  hasBookableAvailability?: boolean;
  requiresOnlinePayment?: boolean;
};

export type TeacherReadinessContract = {
  profileVisibilityReady: boolean;
  paymentReady: boolean;
  paymentBlockers: TeacherStripeReadinessBlocker[];
  payoutReady: boolean;
  payoutBlockers: TeacherStripeReadinessBlocker[];
  bookingReady: boolean;
  bookingBlockers: TeacherBookingReadinessBlocker[];
};

function normalizeRequirementsDue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return normalizeRequirementsDue(parsed);
    } catch {
      return [trimmed];
    }
  }
  return [];
}

export function teacherPaymentReadinessFailureReasons(
  input: TeacherStripeReadinessInput,
): TeacherStripeReadinessBlocker[] {
  const reasons: TeacherStripeReadinessBlocker[] = [];
  if (!input.stripe_account_id?.trim()) reasons.push("missing_stripe_account");
  if (!input.stripe_connect_onboarding_complete) reasons.push("onboarding_incomplete");
  if (!input.stripe_connect_charges_enabled) reasons.push("charges_disabled");
  if (normalizeRequirementsDue(input.stripe_connect_requirements_due).length > 0) {
    reasons.push("requirements_due");
  }
  if (input.stripe_connect_disabled_reason?.trim()) reasons.push("disabled_reason");
  return reasons;
}

export function teacherPayoutReadinessContractFailureReasons(
  input: TeacherStripeReadinessInput,
): TeacherStripeReadinessBlocker[] {
  const reasons: TeacherStripeReadinessBlocker[] = [];
  if (!input.stripe_account_id?.trim()) reasons.push("missing_stripe_account");
  if (!input.stripe_connect_onboarding_complete) reasons.push("onboarding_incomplete");
  if (!input.stripe_connect_payouts_enabled) reasons.push("payouts_disabled");
  if (normalizeRequirementsDue(input.stripe_connect_requirements_due).length > 0) {
    reasons.push("requirements_due");
  }
  if (input.stripe_connect_disabled_reason?.trim()) reasons.push("disabled_reason");
  return reasons;
}

export function deriveTeacherReadinessContract(
  input: TeacherReadinessContractInput,
): TeacherReadinessContract {
  const paymentBlockers = teacherPaymentReadinessFailureReasons(input);
  const payoutBlockers = teacherPayoutReadinessContractFailureReasons(input);
  const paymentReady = paymentBlockers.length === 0;
  const payoutReady = payoutBlockers.length === 0;
  const requiresOnlinePayment = input.requiresOnlinePayment !== false;

  const bookingBlockers: TeacherBookingReadinessBlocker[] = [];
  if (!input.profileVisibilityReady) bookingBlockers.push("profile_not_visible");
  if (input.hasBookableAvailability === false) bookingBlockers.push("no_availability");
  if (requiresOnlinePayment && !paymentReady) bookingBlockers.push("payment_not_ready");
  if (requiresOnlinePayment && !payoutReady) bookingBlockers.push("payout_not_ready");

  return {
    profileVisibilityReady: input.profileVisibilityReady,
    paymentReady,
    paymentBlockers,
    payoutReady,
    payoutBlockers,
    bookingReady: bookingBlockers.length === 0,
    bookingBlockers,
  };
}
