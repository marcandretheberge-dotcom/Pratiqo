import type { SupabaseClient } from "@supabase/supabase-js";

export const AMBASSADOR_REF_COOKIE = "pratiqo_amb_ref";
export const AMBASSADOR_REFERRAL_DEFAULT_WINDOW_DAYS = 30;
export const AMBASSADOR_REFERRAL_COOKIE_MAX_AGE_DAYS = 180;
export const AMBASSADOR_REFERRAL_RATE_LIMIT = {
  limit: 20,
  windowSeconds: 60,
} as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_RE = /^[a-z0-9][a-z0-9-]{2,63}$/;

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
  return path;
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
