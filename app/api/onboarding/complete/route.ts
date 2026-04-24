import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendWelcomeTeacher, sendWelcomeStudent } from "@/lib/email";

export const runtime = "nodejs";

type Body = {
  role?: "teacher" | "student";
  // step 1
  name?: string;
  photo_url?: string | null;
  bio?: string;
  teaching_since?: number | null;
  // step 2
  categories?: string[];
  discipline?: string;
  teaching_mode?: "person" | "online" | "both";
  hourly_rate?: number;
  levels?: string[];
  // step 3
  availability?: string[];
  city?: string;
  home_lesson_enabled?: boolean;
  home_lesson_radius_km?: number;
  home_lesson_price?: number | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token." }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Missing Supabase env." }, { status: 500 });
    }

    const supabaseUser = createClient(url, anonKey);
    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

    const admin = getSupabaseAdmin();

    // Always ensure profile exists; AuthProvider usually does this already.
    const { data: prof } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();

    const role = body.role === "teacher" ? "teacher" : (prof?.role as string) || "student";
    const name = (body.name || prof?.name || (user.user_metadata?.full_name as string) || "Utilisateur").trim();
    const photoUrl = body.photo_url ?? (prof?.photo_url as string | null) ?? (user.user_metadata?.avatar_url as string | null) ?? null;

    // Merge dashboard flags
    const dash = (typeof prof?.dashboard === "object" && prof?.dashboard !== null ? (prof?.dashboard as Record<string, unknown>) : {}) as Record<
      string,
      unknown
    >;
    const nextDash: Record<string, unknown> = { ...dash };
    // Legacy (kept for backwards compatibility with earlier builds)
    if (role === "teacher") nextDash.teacher_onboarding_complete = true;

    const { error: pErr } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          name,
          email: user.email ?? (prof?.email as string) ?? "",
          role,
          photo_url: photoUrl,
          teacher_onboarding_complete: role === "teacher",
          dashboard: nextDash,
        },
        { onConflict: "id" },
      );
    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }

    if (role === "teacher") {
      const category = (body.categories?.[0] || "Musique").trim();
      const discipline = (body.discipline || "—").trim();
      const teachingMode = body.teaching_mode || "both";
      const hourlyRate = clamp(Number(body.hourly_rate || 50), 10, 500);
      const teacherBio = (body.bio || "").slice(0, 300);
      const levels = Array.isArray(body.levels) ? body.levels.slice(0, 10) : [];
      const availability = Array.isArray(body.availability) ? body.availability.slice(0, 128) : [];
      const city = (body.city || "").trim();

      const location: Record<string, unknown> = {};
      if (city) location.city = city;

      const { data: existingTeacher } = await admin
        .from("teachers")
        .select("id, stripe_account_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const teacherId = (existingTeacher as { id?: string } | null)?.id ?? user.id;

      const { error: tErr } = await admin
        .from("teachers")
        .upsert(
          {
            id: teacherId,
            user_id: user.id,
            name,
            discipline,
            category,
            rating: 0,
            reviews: 0,
            price_per_lesson: hourlyRate,
            monthly_subscription: null,
            bio: teacherBio,
            image_url: photoUrl || "https://picsum.photos/seed/teacher/400/400",
            availability,
            location,
            is_verified: false,
            teaching_mode: teachingMode,
            languages: [],
            levels,
            home_lesson_enabled: Boolean(body.home_lesson_enabled),
            home_lesson_radius_km: body.home_lesson_radius_km ? clamp(Number(body.home_lesson_radius_km), 5, 50) : 25,
            home_lesson_price: body.home_lesson_price != null ? Number(body.home_lesson_price) : null,
          },
          { onConflict: "id" },
        );

      if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

      if (user.email) {
        console.log("[email] Attempting to send welcome email to:", user.email);
        const emailResult = await sendWelcomeTeacher(user.email, name);
        console.log("[email] Result:", emailResult);
      }
    } else {
      if (user.email) {
        console.log("[email] Attempting to send welcome email to:", user.email);
        const emailResult = await sendWelcomeStudent(user.email, name);
        console.log("[email] Result:", emailResult);
      }
    }

    return NextResponse.json({ ok: true, role });
  } catch (e) {
    console.error("[onboarding/complete]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Onboarding error" }, { status: 500 });
  }
}

