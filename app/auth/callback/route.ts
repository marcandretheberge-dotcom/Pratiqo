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
        .select("role, teacher_onboarding_complete")
        .eq("id", user.id)
        .maybeSingle();

      const profileRole = (profile as { role?: string | null } | null)?.role ?? null;
      const complete = Boolean((profile as { teacher_onboarding_complete?: boolean } | null)?.teacher_onboarding_complete);

      if (role === "teacher" || profileRole === "teacher") {
        if (profileRole !== "teacher") {
          await supabase.from("profiles").upsert({
            id: user.id,
            role: "teacher",
            email: user.email,
            name: (user.user_metadata?.full_name as string) || null,
          });
        }

        if (!complete) {
          return NextResponse.redirect(new URL("/onboarding", requestUrl.origin));
        }
        return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}

