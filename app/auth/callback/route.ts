import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { awardCredit } from "@/lib/credits";
import { sendWelcomeStudent } from "@/lib/email";
import { normalizeLocale } from "@/lib/i18n/types";
import {
  parseAdminLoginEmails,
  resolvePostAuthRedirect,
  resolveProfileRoleOnAuth,
} from "@/lib/auth/admin";
import { buildLoginUrlWithAuthError } from "@/lib/auth/oauthCallback";
import {
  pendingTeacherIntentClearCookieHeaders,
  resolveAuthCallbackParams,
} from "@/lib/auth/pendingTeacherIntent";
import { hasTeacherOnboardingIntent, resolveSignUpRoleParam } from "@/lib/auth/teacherOnboardingIntent";

type AuthCookie = { name: string; value: string; options: Record<string, unknown> };

function applyCookies(response: NextResponse, cookiesToApply: AuthCookie[]): NextResponse {
  for (const { name, value, options } of cookiesToApply) {
    response.cookies.set(name, value, options);
  }
  return response;
}

async function trySendStudentWelcomeOnce(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  email: string,
  displayName: string,
  locale: ReturnType<typeof normalizeLocale>,
) {
  try {
    await sendWelcomeStudent(email, displayName, locale);
    const { error } = await admin
      .from("profiles")
      .update({ welcome_student_email_sent_at: new Date().toISOString() })
      .eq("id", userId)
      .is("welcome_student_email_sent_at", null);
    if (error) {
      console.error("[auth/callback] welcome_student_email_sent_at update failed", error);
    }
  } catch (e) {
    console.error("[auth/callback] sendWelcomeStudent failed", e);
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const cookieStore = await cookies();
  const callbackState = resolveAuthCallbackParams(requestUrl, cookieStore);
  const { role, next, ref: refCode } = callbackState;
  const teacherIntent = hasTeacherOnboardingIntent(role, next);

  if (!code) {
    const loginUrl = buildLoginUrlWithAuthError(requestUrl.origin, {
      authError: "missing_code",
      role: teacherIntent ? "teacher" : null,
      next: teacherIntent ? next : null,
    });
    return NextResponse.redirect(loginUrl);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    const loginUrl = buildLoginUrlWithAuthError(requestUrl.origin, {
      authError: "config",
      role: teacherIntent ? "teacher" : null,
      next: teacherIntent ? next : null,
    });
    return NextResponse.redirect(loginUrl);
  }

  const authCookies: AuthCookie[] = [];
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const c of cookiesToSet) {
          authCookies.push(c);
        }
      },
    },
  });

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("[auth/callback] exchangeCodeForSession failed:", exchangeError.message);
    const loginUrl = buildLoginUrlWithAuthError(requestUrl.origin, {
      authError: "session",
      role: teacherIntent ? "teacher" : null,
      next: teacherIntent ? next : null,
    });
    return applyCookies(NextResponse.redirect(loginUrl), authCookies);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("[auth/callback] exchange succeeded but no user session");
    const loginUrl = buildLoginUrlWithAuthError(requestUrl.origin, {
      authError: "session",
      role: teacherIntent ? "teacher" : null,
      next: teacherIntent ? next : null,
    });
    return applyCookies(NextResponse.redirect(loginUrl), authCookies);
  }

  const admin = getSupabaseAdmin();
  const preferredLocale = normalizeLocale(
    cookieStore.get("pratiqo-locale")?.value ?? (user.user_metadata?.locale as string | undefined),
  );
  try {
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        locale: preferredLocale,
      },
    });
  } catch (err) {
    console.warn("[auth/callback] locale metadata update failed", err);
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("role, teacher_onboarding_complete, companion_chosen, welcome_student_email_sent_at")
    .eq("id", user.id)
    .maybeSingle();

  const adminLoginEmails = parseAdminLoginEmails(process.env.ADMIN_LOGIN_EMAILS);
  const resolvedRole = resolveProfileRoleOnAuth({
    existingRole: (existingProfile as { role?: string } | null)?.role,
    signUpRoleParam: resolveSignUpRoleParam(role, next),
    email: user.email,
    adminLoginEmails,
  });

  const profileUpsert: Record<string, unknown> = {
    id: user.id,
    email: user.email,
    name: (user.user_metadata?.full_name as string) || (existingProfile as { name?: string } | null)?.name || null,
    updated_at: new Date().toISOString(),
    role: resolvedRole,
  };

  if (!existingProfile) {
    profileUpsert.companion_chosen = false;
  }

  const { error: upsertErr } = await admin.from("profiles").upsert(profileUpsert, { onConflict: "id" });

  if (upsertErr) {
    console.error("[auth/callback] profile upsert failed", upsertErr);
  }

  const { data: profile, error: readErr } = await admin
    .from("profiles")
    .select("role, teacher_onboarding_complete, companion_chosen")
    .eq("id", user.id)
    .single();

  if (readErr || !profile) {
    console.error("[auth/callback] profile read failed", readErr);
    const fallbackRedirect =
      resolvedRole === "admin" ? "/admin" : resolvedRole === "teacher" ? "/onboarding/teacher" : "/dashboard";
    const response = NextResponse.redirect(new URL(fallbackRedirect, requestUrl.origin));
    return applyCookies(response, [...authCookies, ...pendingTeacherIntentClearCookieHeaders()]);
  }

  if (refCode) {
    try {
      const { data: referrer } = await admin
        .from("profiles")
        .select("id")
        .eq("referral_code", refCode)
        .neq("id", user.id)
        .maybeSingle();

      if (referrer?.id) {
        const { data: updated } = await admin
          .from("profiles")
          .update({ referred_by: referrer.id })
          .eq("id", user.id)
          .is("referred_by", null)
          .select("id");

        if (updated?.length) {
          await awardCredit(
            referrer.id,
            "referral",
            `Parrainage réussi (${user.email ?? "nouvel utilisateur"})`,
            `referral:${user.id}`,
            1,
          );
          await awardCredit(
            user.id,
            "referee_bonus",
            "Bonus de bienvenue — parrainé par un ami",
            `referee:${referrer.id}`,
            1,
          );
        }
      }
    } catch (e) {
      console.error("[auth/callback] referral attribution failed", e);
    }
  }

  const profileRole = (profile as { role?: string }).role;
  if (profileRole === "student" && user.email) {
    const welcomeSentAt = (existingProfile as { welcome_student_email_sent_at?: string | null } | null)
      ?.welcome_student_email_sent_at;
    if (!welcomeSentAt) {
      const displayName = (user.user_metadata?.full_name as string) || user.email.split("@")[0] || "toi";
      void trySendStudentWelcomeOnce(admin, user.id, user.email, displayName, preferredLocale);
    }
  }

  const redirectPath = resolvePostAuthRedirect(
    profileRole === "admin" ? "admin" : profileRole === "teacher" ? "teacher" : "student",
    profile as { teacher_onboarding_complete?: boolean | null; companion_chosen?: boolean | null },
    next,
  );

  const response = NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
  return applyCookies(response, [...authCookies, ...pendingTeacherIntentClearCookieHeaders()]);
}
