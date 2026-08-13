import type { SupabaseClient } from "@supabase/supabase-js";

export const AMBASSADOR_REF_COOKIE = "pratiqo_amb_ref";

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

export function isNewAccountForReferral(input: {
  profileCreatedAt: string | null | undefined;
  firstTouchAt: string | null | undefined;
  expiresAt: string | null | undefined;
  now?: Date;
}): boolean {
  const profileCreatedMs = Date.parse(input.profileCreatedAt ?? "");
  const firstTouchMs = Date.parse(input.firstTouchAt ?? "");
  const expiresMs = Date.parse(input.expiresAt ?? "");
  const nowMs = (input.now ?? new Date()).getTime();

  if (![profileCreatedMs, firstTouchMs, expiresMs].every(Number.isFinite)) return false;
  if (expiresMs <= nowMs) return false;
  return profileCreatedMs >= firstTouchMs;
}

export async function claimAmbassadorReferralForNewUser(
  admin: SupabaseClient,
  userId: string,
  rawSessionId: string | null | undefined,
): Promise<string | null> {
  const sessionId = parseAmbassadorReferralSessionId(rawSessionId);
  if (!sessionId) return null;

  const [sessionResult, profileResult] = await Promise.all([
    admin
      .from("referral_sessions")
      .select("first_touch_at, expires_at")
      .eq("id", sessionId)
      .maybeSingle(),
    admin.from("profiles").select("created_at").eq("id", userId).maybeSingle(),
  ]);

  if (sessionResult.error || profileResult.error) {
    console.error("[ambassador/referral] eligibility lookup failed", {
      userIdPresent: Boolean(userId),
      sessionCode: sessionResult.error?.code ?? null,
      profileCode: profileResult.error?.code ?? null,
    });
    return null;
  }

  if (
    !sessionResult.data ||
    !profileResult.data ||
    !isNewAccountForReferral({
      profileCreatedAt: profileResult.data.created_at as string | null,
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
