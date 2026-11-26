import { productForPath, productReturnPath } from "@/lib/auth/productReturn";
import { clearProductAttempt, rememberProductAttempt } from "@/lib/auth/productOAuthAttempt";
import { getSupabaseClient } from "./supabase";
import { buildOAuthCallbackUrl, resolveOAuthRedirectOrigin } from "@/lib/auth/oauthCallback";
import { markOAuthReturnPending, clearOAuthReturnPending, notifyOAuthReturnChanged } from "@/lib/auth/oauthReturnHandoff";
import { setPendingOnboardingIntentCookie, clearPendingOnboardingIntentCookie } from "@/lib/auth/pendingOnboardingIntent";
import { setPendingTeacherOnboardingCookie, clearPendingTeacherOnboardingCookie } from "@/lib/auth/pendingTeacherIntent";
import type { PreAuthOnboardingIntent } from "@/lib/auth/preAuthOnboardingIntent";
import { CONNEXION_PATH } from "@/lib/auth/preAuthOnboardingIntent";
import { hasTeacherOnboardingIntent } from "@/lib/auth/teacherOnboardingIntent";

function setPendingIntentCookiesForAuth(
  redirectPath: string,
  intent?: PreAuthOnboardingIntent | null,
  role?: string | null,
) {
  if (intent) {
    setPendingOnboardingIntentCookie(intent);
    if (intent === "teacher") {
      setPendingTeacherOnboardingCookie(redirectPath);
    }
  } else if (hasTeacherOnboardingIntent(role ?? null, redirectPath)) {
    setPendingTeacherOnboardingCookie(redirectPath);
  }
}

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
  const target = productReturnPath(redirectPath);
  let redirectTo = buildOAuthCallbackUrl(origin, {
    intent: callbackIntent,
    role: options?.role ?? (options?.intent === "teacher" ? "teacher" : undefined),
    next: redirectPath,
    ref: options?.referralCode,
  });

  if (target) {
    clearOAuthReturnPending();
    const attempt = rememberProductAttempt(target, options?.referralCode);
    if (attempt) {
      const params = new URLSearchParams({ product: productForPath(target), attempt });
      redirectTo = origin + "/auth/callback?" + params;
    } else {
      redirectTo = buildOAuthCallbackUrl(origin, { next: target, ref: options?.referralCode });
    }
  } else {
    clearProductAttempt();
    setPendingIntentCookiesForAuth(redirectPath, options?.intent, options?.role);
    markOAuthReturnPending(options?.intent ?? null);
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

export async function logout(options?: { redirectTo?: string }) {
  clearProductAttempt();
  clearPendingOnboardingIntentCookie();
  clearPendingTeacherOnboardingCookie();
  clearOAuthReturnPending();
  notifyOAuthReturnChanged();

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Logout failed", error);
    throw error;
  }

  if (typeof window !== "undefined") {
    window.location.assign(options?.redirectTo ?? CONNEXION_PATH);
  }
}
