import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const role = requestUrl.searchParams.get("role");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

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
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, teacher_onboarding_complete, companion_chosen")
        .eq("id", user.id)
        .maybeSingle();

      // Ensure new users get role='student' by default.
      if (!profile) {
        await supabase.from("profiles").upsert({
          id: user.id,
          role: "student",
          email: user.email,
          name: (user.user_metadata?.full_name as string) || null,
          companion_chosen: false,
        });
      }

      const resolvedRole =
        role === "teacher" || (profile as { role?: string | null } | null)?.role === "teacher" ? "teacher" : "student";

      if (resolvedRole === "teacher") {
        if (!(profile as { teacher_onboarding_complete?: boolean | null } | null)?.teacher_onboarding_complete) {
          return NextResponse.redirect(new URL("/onboarding", requestUrl.origin));
        }
        return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
      }

      // Default = student flow
      if (!(profile as { companion_chosen?: boolean | null } | null)?.companion_chosen) {
        return NextResponse.redirect(new URL("/student/choose-companion", requestUrl.origin));
      }
      return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}

