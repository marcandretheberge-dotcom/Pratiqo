import { getSupabaseClient } from "./supabase";
import { buildOAuthCallbackUrl, resolveOAuthRedirectOrigin } from "@/lib/auth/oauthCallback";
import { setPendingOnboardingIntentCookie } from "@/lib/auth/pendingOnboardingIntent";
import { setPendingTeacherOnboardingCookie } from "@/lib/auth/pendingTeacherIntent";
import type { PreAuthOnboardingIntent } from "@/lib/auth/preAuthOnboardingIntent";
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
  const redirectTo = buildOAuthCallbackUrl(origin, {
    intent: callbackIntent,
    role: options?.role ?? (options?.intent === "teacher" ? "teacher" : undefined),
    next: redirectPath,
    ref: options?.referralCode,
  });

  setPendingIntentCookiesForAuth(redirectPath, options?.intent, options?.role);

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

export async function ensureAuthenticatedProfile(options?: {
  intent?: PreAuthOnboardingIntent | null;
  displayName?: string | null;
}) {
  const supabase = getSupabaseClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw sessionError ?? new Error("missing_session");
  }

  const response = await fetch("/api/auth/profile/ensure", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      intent: options?.intent ?? null,
      displayName: options?.displayName ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error("profile_ensure_failed");
  }

  return response.json();
}

export async function signInWithEmailPassword(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithEmailPassword(
  email: string,
  password: string,
  options?: {
    intent?: PreAuthOnboardingIntent | null;
    redirectPath?: string;
    referralCode?: string;
    displayName?: string | null;
  },
) {
  const supabase = getSupabaseClient();
  const redirectPath = options?.redirectPath ?? "/dashboard";
  const origin = resolveOAuthRedirectOrigin();
  const emailRedirectTo = buildOAuthCallbackUrl(origin, {
    intent: options?.intent ?? undefined,
    role: options?.intent === "teacher" ? "teacher" : undefined,
    next: redirectPath,
    ref: options?.referralCode,
  });

  setPendingIntentCookiesForAuth(redirectPath, options?.intent);

  const displayName = options?.displayName?.trim() || email.split("@")[0] || null;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        display_name: displayName,
        name: displayName,
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function sendPasswordResetEmail(email: string) {
  const supabase = getSupabaseClient();
  const origin = resolveOAuthRedirectOrigin();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/login`,
  });
  if (error) throw error;
  return data;
}

export async function logout() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Logout failed", error);
    throw error;
  }
}
