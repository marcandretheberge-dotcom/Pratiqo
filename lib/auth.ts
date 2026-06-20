import { getSupabaseClient } from "./supabase";
import { buildOAuthCallbackUrl, resolveOAuthRedirectOrigin } from "@/lib/auth/oauthCallback";
import { setPendingOnboardingIntentCookie } from "@/lib/auth/pendingOnboardingIntent";
import { setPendingTeacherOnboardingCookie } from "@/lib/auth/pendingTeacherIntent";
import type { PreAuthOnboardingIntent } from "@/lib/auth/preAuthOnboardingIntent";
import { hasTeacherOnboardingIntent } from "@/lib/auth/teacherOnboardingIntent";

export async function loginWithGoogle(
  redirectPath = "/dashboard",
  options?: {
    intent?: PreAuthOnboardingIntent;
    /** Public intent query value for OAuth redirect (e.g. `student` alias). */
    intentQuery?: string;
    role?: string;
    referralCode?: string;
    forceAccountSelection?: boolean;
  },
) {
  const supabase = getSupabaseClient();
  const origin = resolveOAuthRedirectOrigin();
  const callbackIntent = options?.intentQuery ?? options?.intent;
  const redirectTo = buildOAuthCallbackUrl(origin, {
    intent: callbackIntent,
    role: options?.role ?? (options?.intent === "teacher" ? "teacher" : undefined),
    next: redirectPath,
    ref: options?.referralCode,
  });

  if (options?.intent) {
    setPendingOnboardingIntentCookie(options.intent);
    if (options.intent === "teacher") {
      setPendingTeacherOnboardingCookie(redirectPath);
    }
  } else if (hasTeacherOnboardingIntent(options?.role ?? null, redirectPath)) {
    setPendingTeacherOnboardingCookie(redirectPath);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      ...(options?.forceAccountSelection ? { queryParams: { prompt: "select_account" } } : {}),
    },
  });
  if (error) {
    console.error("Login failed", error);
    throw error;
  }
  if (!data.url) {
    throw new Error("Google OAuth URL was not returned.");
  }
  window.location.assign(data.url);
}

export async function logout() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Logout failed", error);
    throw error;
  }
}
