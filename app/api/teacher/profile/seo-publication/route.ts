import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  evaluateTeacherSeoPublication,
  isTeacherSeoProfileContentReady,
  teacherHasRequestedSeoPublication,
} from "@/lib/seo/teacherSeoPublication";
import {
  allocateUniqueTeacherPublicProfileSlug,
  fetchTeacherSeoPublicationRowByUserId,
} from "@/lib/seo/teacherPublicProfileData";
import {
  TEACHER_PUBLIC_SEO_CONSENT_VERSION,
  teacherHasPublicLocationOrTeachingFormat,
} from "@/lib/seo/teacherPublicProfile";
import {
  isTeacherMarketSupported,
  marketNotSupportedPayload,
} from "@/lib/config/markets";
import { resolveEmailLocaleForTeacher } from "@/lib/email/locale";

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

  const row = await fetchTeacherSeoPublicationRowByUserId(user.id);
  if (!row) {
    return NextResponse.json({ error: "Teacher profile not found." }, { status: 404 });
  }

  const admin = getSupabaseAdmin();
  const locale = await resolveEmailLocaleForTeacher(admin, user.id);
  const evaluation = evaluateTeacherSeoPublication(row, locale);

  return NextResponse.json({
    evaluation,
    consent_version_current: TEACHER_PUBLIC_SEO_CONSENT_VERSION,
    public_profile_slug: row.public_profile_slug,
  });
}

export async function PATCH(req: Request) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: unknown };
  const action = body.action;
  if (action !== "request" && action !== "withdraw") {
    return NextResponse.json({ error: "action must be request or withdraw." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const row = await fetchTeacherSeoPublicationRowByUserId(user.id);
  if (!row) {
    return NextResponse.json({ error: "Teacher profile not found." }, { status: 404 });
  }

  const locale = await resolveEmailLocaleForTeacher(admin, user.id);

  if (action === "request") {
    if (!isTeacherMarketSupported(String(row.country_code ?? "").trim().toUpperCase())) {
      return NextResponse.json(marketNotSupportedPayload(row.country_code ?? ""), { status: 403 });
    }

    if (!isTeacherSeoProfileContentReady(row)) {
      const evaluation = evaluateTeacherSeoPublication(row, locale);
      return NextResponse.json(
        {
          error: "profile_incomplete",
          missingReasonKeys: evaluation.missingReasonKeys,
        },
        { status: 400 },
      );
    }

    if (!teacherHasPublicLocationOrTeachingFormat(row)) {
      return NextResponse.json(
        { error: "Indiquez votre ville, région ou format d'enseignement en ligne." },
        { status: 400 },
      );
    }

    const cityForSlug =
      (typeof row.city === "string" && row.city.trim()) ||
      (typeof row.region === "string" && row.region.trim()) ||
      "quebec";

    const slug =
      typeof row.public_profile_slug === "string" && row.public_profile_slug.trim()
        ? row.public_profile_slug.trim()
        : await allocateUniqueTeacherPublicProfileSlug({
            teacherId: row.id,
            name: row.name ?? "",
            mainSubject: row.discipline ?? "",
            city: cityForSlug,
          });

    const now = new Date().toISOString();
    const { error } = await admin
      .from("teachers")
      .update({
        search_indexing_consent: true,
        public_profile_enabled: true,
        search_indexing_consented_at: now,
        search_indexing_consent_version: TEACHER_PUBLIC_SEO_CONSENT_VERSION,
        public_profile_slug: slug,
      })
      .eq("id", row.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await admin
      .from("teachers")
      .update({
        search_indexing_consent: false,
        public_profile_enabled: false,
        public_profile_last_indexable_at: null,
      })
      .eq("id", row.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const refreshed = await fetchTeacherSeoPublicationRowByUserId(user.id);
  const evaluation = refreshed ? evaluateTeacherSeoPublication(refreshed, locale) : null;

  return NextResponse.json({
    ok: true,
    action,
    teacherRequestedPublication: refreshed ? teacherHasRequestedSeoPublication(refreshed) : false,
    evaluation,
  });
}
