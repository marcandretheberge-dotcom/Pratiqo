import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isTeacherMarketplaceVisibleRow,
  isTeacherPublicProfileIndexable,
  TEACHER_PUBLIC_SEO_CONSENT_VERSION,
  teacherHasAtLeastOneSubject,
  teacherHasPublicCity,
  teacherHasSufficientPublicContent,
} from "@/lib/seo/teacherPublicProfile";
import {
  allocateUniqueTeacherPublicProfileSlug,
  fetchTeacherPublicSeoRowById,
} from "@/lib/seo/teacherPublicProfileData";
import {
  isTeacherMarketSupported,
  marketNotSupportedPayload,
} from "@/lib/config/markets";

export const runtime = "nodejs";

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { user: null, error: "Missing Authorization bearer token." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { user: null, error: "Missing Supabase env." };

  const supabaseUser = createClient(url, anonKey);
  const {
    data: { user },
    error,
  } = await supabaseUser.auth.getUser(token);
  if (error || !user) return { user: null, error: "Invalid or expired session." };
  return { user, error: null };
}

export async function GET(req: Request) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: teacher } = await admin
    .from("teachers")
    .select(
      "id, public_profile_enabled, search_indexing_consent, search_indexing_consented_at, search_indexing_consent_version, public_profile_slug",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!teacher?.id) {
    return NextResponse.json({ error: "Teacher profile not found." }, { status: 404 });
  }

  return NextResponse.json({
    public_profile_enabled: teacher.public_profile_enabled === true,
    search_indexing_consent: teacher.search_indexing_consent === true,
    search_indexing_consented_at: teacher.search_indexing_consented_at,
    search_indexing_consent_version: teacher.search_indexing_consent_version,
    public_profile_slug: teacher.public_profile_slug,
    consent_version_current: TEACHER_PUBLIC_SEO_CONSENT_VERSION,
  });
}

export async function PATCH(req: Request) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    search_indexing_consent?: unknown;
  };

  if (typeof body.search_indexing_consent !== "boolean") {
    return NextResponse.json(
      { error: "search_indexing_consent boolean is required." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data: teacher, error: teacherErr } = await admin
    .from("teachers")
    .select("id, name, discipline, city, country_code")
    .eq("user_id", user.id)
    .maybeSingle();

  if (teacherErr || !teacher?.id) {
    return NextResponse.json({ error: "Teacher profile not found." }, { status: 404 });
  }

  const teacherCountryCode = (teacher as { country_code?: string | null }).country_code ?? "";
  if (body.search_indexing_consent && !isTeacherMarketSupported(teacherCountryCode)) {
    return NextResponse.json(marketNotSupportedPayload(teacherCountryCode), { status: 403 });
  }

  const row = await fetchTeacherPublicSeoRowById((teacher as { id: string }).id);
  if (!row) {
    return NextResponse.json({ error: "Teacher profile not found." }, { status: 404 });
  }

  if (body.search_indexing_consent) {
    if (!isTeacherMarketplaceVisibleRow(row)) {
      return NextResponse.json(
        { error: "Votre profil doit être actif et visible pour activer l'indexation." },
        { status: 400 },
      );
    }
    if (!teacherHasSufficientPublicContent(row)) {
      return NextResponse.json(
        { error: "Complétez votre bio et vos matières avant d'activer l'indexation." },
        { status: 400 },
      );
    }
    if (!teacherHasAtLeastOneSubject(row)) {
      return NextResponse.json(
        { error: "Ajoutez au moins une matière avant d'activer l'indexation." },
        { status: 400 },
      );
    }
    if (!teacherHasPublicCity(row)) {
      return NextResponse.json(
        { error: "Indiquez votre ville ou région avant d'activer l'indexation." },
        { status: 400 },
      );
    }
    if (row.teacher_onboarding_complete !== true) {
      return NextResponse.json(
        { error: "Terminez l'onboarding avant d'activer l'indexation." },
        { status: 400 },
      );
    }
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    search_indexing_consent: body.search_indexing_consent,
    public_profile_enabled: body.search_indexing_consent,
  };

  if (body.search_indexing_consent) {
    const name = (teacher as { name?: string | null }).name ?? row.name ?? "";
    const discipline = (teacher as { discipline?: string | null }).discipline ?? row.discipline ?? "";
    const city = (teacher as { city?: string | null }).city ?? row.city ?? "";
    const slug =
      typeof row.public_profile_slug === "string" && row.public_profile_slug.trim()
        ? row.public_profile_slug.trim()
        : await allocateUniqueTeacherPublicProfileSlug({
            teacherId: (teacher as { id: string }).id,
            name,
            mainSubject: discipline,
            city,
          });

    updates.search_indexing_consented_at = now;
    updates.search_indexing_consent_version = TEACHER_PUBLIC_SEO_CONSENT_VERSION;
    updates.public_profile_slug = slug;
    updates.public_profile_last_indexable_at = now;
  } else {
    updates.public_profile_last_indexable_at = null;
  }

  const { error } = await admin.from("teachers").update(updates).eq("id", (teacher as { id: string }).id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const refreshed = await fetchTeacherPublicSeoRowById((teacher as { id: string }).id);

  return NextResponse.json({
    ok: true,
    public_profile_enabled: body.search_indexing_consent,
    search_indexing_consent: body.search_indexing_consent,
    public_profile_slug: updates.public_profile_slug ?? row.public_profile_slug,
    indexable: refreshed ? isTeacherPublicProfileIndexable(refreshed) : false,
  });
}
