import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { disciplineLabelToTeacherCategory, getAllDisciplines, getDisciplineById } from "@/lib/disciplines";
import { sendWelcomeTeacher, sendWelcomeStudent } from "@/lib/email";
import { resolveEmailLocaleForUser } from "@/lib/email/locale";
import { logError, logInfo, logWarn } from "@/lib/log";
import { validateJsonBody } from "@/lib/validation/api";
import { minimumLessonPriceErrorMessage } from "@/lib/pricing/messages";
import { validateTeacherLessonOffers } from "@/lib/pricing/lessonOffer";
import { onboardingCompletePostSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function POST(req: Request) {
  logInfo("[onboarding/complete] Request received");
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      logError("[onboarding/complete] Missing bearer token");
      return NextResponse.json({ error: "Missing Authorization bearer token." }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      logError("[onboarding/complete] Missing Supabase env vars");
      return NextResponse.json({ error: "Missing Supabase env." }, { status: 500 });
    }

    const supabaseUser = createClient(url, anonKey);
    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser(token);
    if (userErr || !user) {
      logError("[onboarding/complete] Auth failed", { message: userErr?.message });
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
    }
    logInfo("[onboarding/complete] Authenticated user", {
      userId: user.id,
      hasEmail: Boolean(user.email),
    });

    const validated = await validateJsonBody(onboardingCompletePostSchema, req);
    if (!validated.ok) return validated.response;
    const body = validated.data;
    logInfo("[onboarding/complete] Role and name", { role: body.role, name: body.name });

    // Teachers must acknowledge autonomous worker status before completing onboarding
    if (body.role === "teacher") {
      if (!body.tax_status_acknowledged || !body.no_exclusivity_acknowledged || !body.no_income_guarantee_acknowledged) {
        logWarn("[onboarding/complete] Missing legal acknowledgments");
        return NextResponse.json(
          { error: "Vous devez accepter les conditions de travailleur autonome pour continuer." },
          { status: 400 },
        );
      }
    }

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

    const profileUpsert: Record<string, unknown> = {
      id: user.id,
      name,
      email: user.email ?? (prof?.email as string) ?? "",
      role,
      photo_url: photoUrl,
      teacher_onboarding_complete: role === "teacher",
      dashboard: nextDash,
    };

    if (body.role === "teacher" && body.tax_status_acknowledged) {
      profileUpsert.tax_status_acknowledged = true;
      profileUpsert.tax_status_acknowledged_at = new Date().toISOString();
      profileUpsert.no_exclusivity_acknowledged = Boolean(body.no_exclusivity_acknowledged);
      profileUpsert.no_income_guarantee_acknowledged = Boolean(body.no_income_guarantee_acknowledged);
    }

    const { error: pErr } = await admin
      .from("profiles")
      .upsert(profileUpsert, { onConflict: "id" });
    if (pErr) {
      logError("[onboarding/complete] Profile upsert failed", { message: pErr.message });
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }
    logInfo("[onboarding/complete] Step 1 profile upserted", {
      role,
      teacher_onboarding_complete: role === "teacher",
    });

    if (role === "teacher") {
      const teachingMode = body.teaching_mode || "both";
      const hourlyRate = clamp(Number(body.hourly_rate || 50), 20, 500);
      const locale = await resolveEmailLocaleForUser(admin, user.id);
      const homeLessonEnabled = Boolean(body.home_lesson_enabled);
      const homeLessonPrice =
        body.home_lesson_price != null && Number.isFinite(Number(body.home_lesson_price))
          ? Number(body.home_lesson_price)
          : null;
      const offerCheck = validateTeacherLessonOffers({
        price_per_lesson: hourlyRate,
        home_lesson_enabled: homeLessonEnabled,
        home_lesson_price: homeLessonPrice,
        home_lesson_min_duration: 60,
        intro_session_enabled: false,
      });
      if (!offerCheck.ok) {
        return NextResponse.json(
          { error: minimumLessonPriceErrorMessage(locale), code: "minimum_lesson_price" },
          { status: 400 },
        );
      }
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

      const rawDisciplines = Array.isArray(body.disciplines) ? body.disciplines : [];
      const normalizedDisciplines = rawDisciplines
        .filter((x) => x && typeof x.discipline_id === "string" && x.discipline_id.trim())
        .slice(0, 3)
        .map((x) => ({
          discipline_id: String(x.discipline_id).trim(),
          specialite: String(x.specialite ?? "")
            .trim()
            .slice(0, 200),
        }));

      let category: string;
      let discipline: string;
      if (normalizedDisciplines.length > 0) {
        const first = normalizedDisciplines[0];
        const meta = getDisciplineById(first.discipline_id);
        const labelForCat = meta?.label ?? (body.categories?.[0] || "Musique").trim();
        category = disciplineLabelToTeacherCategory(labelForCat);
        discipline = first.specialite || "—";
      } else {
        const rawCat = (body.categories?.[0] || "Musique").trim();
        category = disciplineLabelToTeacherCategory(rawCat);
        discipline = (body.discipline || "—").trim();
      }

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
            home_lesson_price: homeLessonPrice,
          },
          { onConflict: "id" },
        );

      if (tErr) {
        logError("[onboarding/complete] Teacher upsert failed", { message: tErr.message });
        return NextResponse.json({ error: tErr.message }, { status: 500 });
      }
      logInfo("[onboarding/complete] Step 2 teacher row upserted", { teacherId });

      await admin.from("teacher_disciplines").delete().eq("teacher_id", teacherId);

      if (normalizedDisciplines.length > 0) {
        const rows = normalizedDisciplines.map((d, sort_order) => ({
          teacher_id: teacherId,
          discipline_id: d.discipline_id,
          specialite: d.specialite || null,
          sort_order,
        }));
        const { error: dErr } = await admin.from("teacher_disciplines").insert(rows);
        if (dErr) {
          logError("[onboarding/complete] Disciplines insert failed", { message: dErr.message });
          return NextResponse.json({ error: dErr.message }, { status: 500 });
        }
      } else {
        const rawCat = (body.categories?.[0] || "Musique").trim();
        const fallbackId = getAllDisciplines().find((d) => d.label === rawCat)?.id ?? "musique";
        const { error: dErr } = await admin.from("teacher_disciplines").insert({
          teacher_id: teacherId,
          discipline_id: fallbackId,
          specialite: discipline || null,
          sort_order: 0,
        });
        if (dErr) {
          logError("[onboarding/complete] Fallback discipline insert failed", { message: dErr.message });
          return NextResponse.json({ error: dErr.message }, { status: 500 });
        }
      }
      logInfo("[onboarding/complete] Step 3 disciplines saved");

      if (user.email) {
        logInfo("[onboarding/complete] Step 4 sending welcome teacher email", { hasEmail: true });
        void resolveEmailLocaleForUser(admin, user.id).then((locale) =>
          sendWelcomeTeacher(user.email!, name, locale),
        );
      } else {
        logWarn("[onboarding/complete] No email on user — skipping welcome email");
      }
    } else {
      if (user.email) {
        const { data: welcomeRow } = await admin
          .from("profiles")
          .select("welcome_student_email_sent_at")
          .eq("id", user.id)
          .maybeSingle();
        if (!welcomeRow?.welcome_student_email_sent_at) {
          try {
            const welcomeLocale = await resolveEmailLocaleForUser(admin, user.id);
            await sendWelcomeStudent(user.email, name, welcomeLocale);
            const { error: wErr } = await admin
              .from("profiles")
              .update({ welcome_student_email_sent_at: new Date().toISOString() })
              .eq("id", user.id)
              .is("welcome_student_email_sent_at", null);
            if (wErr) logError("[onboarding/complete] welcome_student_email_sent_at update failed", { message: wErr.message });
          } catch (emailErr) {
            logError("[onboarding/complete] sendWelcomeStudent failed", { err: emailErr });
          }
        }
      }
    }

    logInfo("[onboarding/complete] Done", { ok: true, role });
    return NextResponse.json({ ok: true, role });
  } catch (e) {
    logError("[onboarding/complete] unexpected error", { err: e });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Onboarding error" }, { status: 500 });
  }
}

