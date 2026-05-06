import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { awardCredit } from "@/lib/credits";
import { sendWelcomeStudent } from "@/lib/email";
import { normalizeLocale } from "@/lib/i18n/types";

async function trySendStudentWelcomeOnce(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  email: string,
  displayName: string,
) {
  try {
    await sendWelcomeStudent(email, displayName);
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
  const role = requestUrl.searchParams.get("role");
  const refCode = requestUrl.searchParams.get("ref");

  if (code) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.redirect(new URL("/login", requestUrl.origin));
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const c of cookiesToSet) {
            cookieStore.set(c.name, c.value, c.options);
          }
        },
      },
    });
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Detect new users before the upsert so we can send a welcome email
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
      // First upsert (no select) so profile exists immediately after OAuth.
      const { error: upsertErr } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email,
            name: (user.user_metadata?.full_name as string) || null,
            updated_at: new Date().toISOString(),
            // Ensure new users default to student flow.
            role: role === "teacher" ? "teacher" : "student",
            companion_chosen: false,
          },
          { onConflict: "id" },
        );

      if (upsertErr) {
        console.error("[auth/callback] profile upsert failed", upsertErr);
      }

      // Then select separately (avoids Supabase typechain edge cases).
      const { data: profile, error: readErr } = await supabase
        .from("profiles")
        .select("role, teacher_onboarding_complete, companion_chosen")
        .eq("id", user.id)
        .single();

      if (readErr || !profile) {
        console.error("[auth/callback] profile read failed", readErr);
        return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
      }

      // Handle referral attribution (only for new users — referred_by IS NULL)
      if (refCode) {
        try {
          const admin = getSupabaseAdmin();
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
              // +$1 to the referrer
              await awardCredit(
                referrer.id,
                "referral",
                `Parrainage réussi (${user.email ?? "nouvel utilisateur"})`,
                `referral:${user.id}`,
                1,
              );
              // +$1 to the new user (referee bonus)
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

      // Welcome email once per student (OAuth users often already have a profile row from triggers).
      if (profile?.role === "student" && user.email) {
        const { data: welcomeRow } = await admin
          .from("profiles")
          .select("welcome_student_email_sent_at")
          .eq("id", user.id)
          .maybeSingle();
        if (!welcomeRow?.welcome_student_email_sent_at) {
          const displayName = (user.user_metadata?.full_name as string) || user.email.split("@")[0] || "toi";
          void trySendStudentWelcomeOnce(admin, user.id, user.email, displayName);
        }
      }

      if (profile?.role === "teacher") {
        if (!profile?.teacher_onboarding_complete) {
          return NextResponse.redirect(new URL("/onboarding/teacher", requestUrl.origin));
        }
        return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
      }

      if (!profile?.companion_chosen) {
        return NextResponse.redirect(new URL("/student/choose-companion", requestUrl.origin));
      }
      return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}

