import { getSupabaseClient } from "./supabase";
import { buildOAuthCallbackUrl, resolveOAuthRedirectOrigin } from "@/lib/auth/oauthCallback";
import { markOAuthReturnPending, clearOAuthReturnPending, notifyOAuthReturnChanged } from "@/lib/auth/oauthReturnHandoff";
import { setPendingOnboardingIntentCookie, clearPendingOnboardingIntentCookie } from "@/lib/auth/pendingOnboardingIntent";
import { setPendingTeacherOnboardingCookie, clearPendingTeacherOnboardingCookie } from "@/lib/auth/pendingTeacherIntent";
import type { PreAuthOnboardingIntent } from "@/lib/auth/preAuthOnboardingIntent";
import { CONNEXION_PATH } from "@/lib/auth/preAuthOnboardingIntent";
import { hasTeacherOnboardingIntent } from "@/lib/auth/teacherOnboardingIntent";
import { postPratiqoNativeMessage } from "@/lib/mobile/nativeBridge";

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

type OAuthLoginOptions = {
  intent?: PreAuthOnboardingIntent;
  /** Public intent query value for OAuth redirect (e.g. `student` alias). */
  intentQuery?: string;
  role?: string;
  referralCode?: string;
  forceAccountSelection?: boolean;
};

async function loginWithOAuthProvider(
  provider: "google" | "apple",
  redirectPath = "/dashboard",
  options?: OAuthLoginOptions,
) {
  setPendingIntentCookiesForAuth(redirectPath, options?.intent, options?.role);
  markOAuthReturnPending(options?.intent ?? null);

  if (
    postPratiqoNativeMessage({
      type: "auth.oauth",
      provider,
      intent: options?.intent ?? null,
      forceAccountSelection: options?.forceAccountSelection === true,
    })
  ) {
    return;
  }

  const supabase = getSupabaseClient();
  const origin = resolveOAuthRedirectOrigin();
  const callbackIntent = options?.intentQuery ?? options?.intent;
  const redirectTo = buildOAuthCallbackUrl(origin, {
    intent: callbackIntent,
    role: options?.role ?? (options?.intent === "teacher" ? "teacher" : undefined),
    next: redirectPath,
    ref: options?.referralCode,
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      ...(provider === "google" && options?.forceAccountSelection
        ? { queryParams: { prompt: "select_account" } }
        : {}),
    },
  });
  if (error) {
    console.error(`${provider} login failed`, error);
    throw error;
  }
  if (!data.url) {
    throw new Error(`${provider} OAuth URL was not returned.`);
  }
  window.location.assign(data.url);
}

export async function loginWithGoogle(
  redirectPath = "/dashboard",
  options?: OAuthLoginOptions,
) {
  return loginWithOAuthProvider("google", redirectPath, options);
}

export async function loginWithApple(
  redirectPath = "/dashboard",
  options?: OAuthLoginOptions,
) {
  return loginWithOAuthProvider("apple", redirectPath, options);
}

export async function logout(options?: { redirectTo?: string }) {
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

  postPratiqoNativeMessage({ type: "auth.logout" });

  if (typeof window !== "undefined") {
    window.location.assign(options?.redirectTo ?? CONNEXION_PATH);
  }
}
