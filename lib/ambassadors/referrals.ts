import type { SupabaseClient } from "@supabase/supabase-js";

export const AMBASSADOR_REF_COOKIE = "pratiqo_amb_ref";
export const AMBASSADOR_REFERRAL_DEFAULT_WINDOW_DAYS = 30;
export const AMBASSADOR_REFERRAL_COOKIE_MAX_AGE_DAYS = 180;
export const AMBASSADOR_REFERRAL_RATE_LIMIT = {
  limit: 20,
  windowSeconds: 60,
} as const;
export const AMBASSADOR_REWARD_RULE_V1 = {
  paymentCostReserveBps: 420,
  paymentCostReserveFixedCents: 55,
  learnerRewardShareBps: 5000,
  learnerPerBookingCapCents: 500,
  learnerLifetimeCapCents: 1000,
  teacherMinimumNetContributionCents: 4000,
  teacherActivationBonusCents: 1000,
} as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_RE = /^[a-z0-9][a-z0-9-]{2,63}$/;
const ENCODED_BACKSLASH_RE = /%5c/i;

export function normalizeAmbassadorCode(value: string): string | null {
  const code = value.trim().toLowerCase();
  return CODE_RE.test(code) ? code : null;
}

export function parseAmbassadorReferralSessionId(value: string | null | undefined): string | null {
  const sessionId = value?.trim() ?? "";
  return UUID_RE.test(sessionId) ? sessionId : null;
}

export function safeAmbassadorDestination(value: string | null | undefined): string {
  const path = value?.trim() ?? "";
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  if (path.includes("\\") || ENCODED_BACKSLASH_RE.test(path)) return "/";

  try {
    const base = "https://www.pratiqo.ca";
    const parsed = new URL(path, base);
    if (parsed.origin !== base) return "/";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

export function clampAmbassadorReferralWindowDays(value: unknown): number {
  const days = Number(value ?? AMBASSADOR_REFERRAL_DEFAULT_WINDOW_DAYS);
  if (!Number.isFinite(days)) return AMBASSADOR_REFERRAL_DEFAULT_WINDOW_DAYS;
  return Math.min(
    AMBASSADOR_REFERRAL_COOKIE_MAX_AGE_DAYS,
    Math.max(1, Math.floor(days)),
  );
}

export function shouldSkipAmbassadorSessionCreationForRateLimit(input: {
  allowed: boolean;
  infrastructureUnavailable?: boolean;
}): boolean {
  return input.infrastructureUnavailable === true || input.allowed === false;
}

function safeCents(value: number): number {
  return Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0));
}

export function calculateAmbassadorPaymentCostReserveCents(input: {
  amountCents: number;
  paymentCostReserveBps?: number;
  paymentCostReserveFixedCents?: number;
}): number {
  const amountCents = safeCents(input.amountCents);
  const reserveBps = safeCents(input.paymentCostReserveBps ?? AMBASSADOR_REWARD_RULE_V1.paymentCostReserveBps);
  const fixedCents = safeCents(
    input.paymentCostReserveFixedCents ?? AMBASSADOR_REWARD_RULE_V1.paymentCostReserveFixedCents,
  );
  return Math.ceil((amountCents * reserveBps) / 10000) + fixedCents;
}

export function calculateAmbassadorNetPlatformContributionCents(input: {
  amountCents: number;
  grossPlatformFeeCents: number;
  paymentCostReserveBps?: number;
  paymentCostReserveFixedCents?: number;
}): number {
  const grossPlatformFeeCents = safeCents(input.grossPlatformFeeCents);
  const reserveCents = calculateAmbassadorPaymentCostReserveCents(input);
  return Math.max(0, grossPlatformFeeCents - reserveCents);
}

export function calculateAmbassadorLearnerRewardCents(input: {
  amountCents: number;
  grossPlatformFeeCents: number;
  remainingLifetimeCapCents: number;
  rewardShareBps?: number;
  perBookingCapCents?: number;
  paymentCostReserveBps?: number;
  paymentCostReserveFixedCents?: number;
}): number {
  const netContributionCents = calculateAmbassadorNetPlatformContributionCents(input);
  if (netContributionCents <= 0) return 0;

  const rewardShareBps = safeCents(input.rewardShareBps ?? AMBASSADOR_REWARD_RULE_V1.learnerRewardShareBps);
  return Math.min(
    safeCents(input.perBookingCapCents ?? AMBASSADOR_REWARD_RULE_V1.learnerPerBookingCapCents),
    Math.floor((netContributionCents * rewardShareBps) / 10000),
    safeCents(input.remainingLifetimeCapCents),
  );
}

export function isNewAccountForReferral(input: {
  accountCreatedAt: string | null | undefined;
  firstTouchAt: string | null | undefined;
  expiresAt: string | null | undefined;
  now?: Date;
}): boolean {
  const accountCreatedMs = Date.parse(input.accountCreatedAt ?? "");
  const firstTouchMs = Date.parse(input.firstTouchAt ?? "");
  const expiresMs = Date.parse(input.expiresAt ?? "");
  const nowMs = (input.now ?? new Date()).getTime();

  if (![accountCreatedMs, firstTouchMs, expiresMs].every(Number.isFinite)) return false;
  if (expiresMs <= nowMs) return false;
  return accountCreatedMs >= firstTouchMs;
}

export async function claimAmbassadorReferralForNewUser(
  admin: SupabaseClient,
  userId: string,
  rawSessionId: string | null | undefined,
): Promise<string | null> {
  const sessionId = parseAmbassadorReferralSessionId(rawSessionId);
  if (!sessionId) return null;

  const [sessionResult, authUserResult] = await Promise.all([
    admin
      .from("referral_sessions")
      .select("first_touch_at, expires_at")
      .eq("id", sessionId)
      .maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ]);

  if (sessionResult.error || authUserResult.error) {
    console.error("[ambassador/referral] eligibility lookup failed", {
      userIdPresent: Boolean(userId),
      sessionCode: sessionResult.error?.code ?? null,
      authMessage: authUserResult.error?.message ?? null,
    });
    return null;
  }

  const authUser = authUserResult.data.user;
  if (
    !sessionResult.data ||
    !authUser ||
    !isNewAccountForReferral({
      accountCreatedAt: authUser.created_at,
      firstTouchAt: sessionResult.data.first_touch_at as string | null,
      expiresAt: sessionResult.data.expires_at as string | null,
    })
  ) {
    return null;
  }

  const result = await admin.rpc("claim_ambassador_referral", {
    p_session_id: sessionId,
    p_user_id: userId,
  });

  if (result.error) {
    console.error("[ambassador/referral] claim failed", {
      userIdPresent: Boolean(userId),
      code: result.error.code,
      message: result.error.message,
    });
    return null;
  }

  return typeof result.data === "string" ? result.data : null;
}
