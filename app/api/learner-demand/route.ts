import { NextResponse } from "next/server";

import { fetchTeacherDisciplinesMap, mergeTeachersWithDisciplines } from "@/lib/teacherDisciplines";
import { isLaunchEligibleTeacherRow, teacherRowToTeacher, type TeacherRow } from "@/lib/teacherMapper";
import { TEACHERS_LIST_SELECT, TEACHERS_PUBLIC_TABLE } from "@/lib/supabase/queries";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimitByIp, rateLimitGuardResponse } from "@/lib/rateLimit";
import {
  buildTeacherRecruitShareUrl,
  findLearnerDemandCity,
  foldLearnerDemandText,
  matchLearnerDemand,
  normalizeLearnerEmail,
} from "@/lib/learnerDemand";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 4_096;
const RATE_LIMIT = { limit: 10, windowSeconds: 60 } as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ParsedDemand = {
  subject: string;
  city: string;
  acceptsOnline: boolean;
  email: string;
  locale: "fr" | "en" | "es";
  source: string;
};

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned || cleaned.length > max) return null;
  return cleaned;
}

function parsePayload(raw: unknown): ParsedDemand | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  const subject = cleanString(input.subject, 120);
  const city = cleanString(input.city, 120);
  const emailRaw = cleanString(input.email, 320);
  if (!subject || !city || !emailRaw || typeof input.acceptsOnline !== "boolean") return null;

  const email = normalizeLearnerEmail(emailRaw);
  if (!EMAIL_RE.test(email)) return null;

  const localeRaw = cleanString(input.locale, 10)?.toLowerCase();
  const locale: "fr" | "en" | "es" = localeRaw === "en" || localeRaw === "es" ? localeRaw : "fr";
  const sourceRaw = cleanString(input.source, 100) ?? "teacher_finder";
  const source = sourceRaw.replace(/[^a-zA-Z0-9_.:-]/g, "_");

  return { subject, city, acceptsOnline: input.acceptsOnline, email, locale, source };
}

async function readJson(request: Request): Promise<ParsedDemand | null> {
  const rawLength = request.headers.get("content-length");
  if (rawLength) {
    const length = Number.parseInt(rawLength, 10);
    if (Number.isFinite(length) && length > MAX_BODY_BYTES) return null;
  }
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) return null;

  let text: string;
  try {
    text = await request.text();
  } catch {
    return null;
  }
  if (!text.trim() || byteLength(text) > MAX_BODY_BYTES) return null;
  try {
    return parsePayload(JSON.parse(text) as unknown);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const rl = await rateLimitByIp(request, "learner-demand", RATE_LIMIT);
  const limited = rateLimitGuardResponse(rl);
  if (limited) return limited;

  const input = await readJson(request);
  if (!input) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from(TEACHERS_PUBLIC_TABLE)
      .select(TEACHERS_LIST_SELECT)
      .order("verification_level", { ascending: false })
      .order("rating", { ascending: false });

    if (error) {
      console.error("[learner-demand] teacher lookup failed", { code: error.code });
      return NextResponse.json({ ok: false, error: "match_unavailable" }, { status: 503 });
    }

    const mapped = (data ?? [])
      .filter((row) => isLaunchEligibleTeacherRow(row as TeacherRow))
      .map((row) => teacherRowToTeacher(row as TeacherRow));
    const disciplineMap = await fetchTeacherDisciplinesMap(
      admin,
      mapped.map((teacher) => teacher.id),
    );
    const teachers = mergeTeachersWithDisciplines(mapped, disciplineMap);
    const match = matchLearnerDemand(teachers, input);
    const resolvedCity = findLearnerDemandCity(input.city);
    const matchType = match.outcome === "local_match" ? "local" : match.outcome === "online_match" ? "online" : "none";
    const status = match.outcome === "waitlist" ? "open" : "matched";
    const now = new Date().toISOString();

    const row = {
      email: input.email,
      email_normalized: input.email,
      subject: input.subject,
      subject_normalized: foldLearnerDemandText(input.subject),
      city: resolvedCity?.name ?? input.city,
      city_normalized: foldLearnerDemandText(resolvedCity?.name ?? input.city),
      region: resolvedCity?.province ?? null,
      country_code: resolvedCity?.country ?? "CA",
      accepts_online: input.acceptsOnline,
      locale: input.locale,
      source: input.source,
      status,
      match_type: matchType,
      matched_teacher_count: match.matchCount,
      last_match_at: now,
      updated_at: now,
    };

    const { error: leadError } = await admin.from("learner_demand_leads").upsert(row, {
      onConflict: "email_normalized,subject_normalized,city_normalized,accepts_online",
    });

    if (leadError) {
      console.error("[learner-demand] lead upsert failed", { code: leadError.code });
      return NextResponse.json({ ok: false, error: "save_failed" }, { status: 503 });
    }

    return NextResponse.json({
      ok: true,
      outcome: match.outcome,
      matchCount: match.matchCount,
      searchUrl: match.searchUrl,
      recruitShareUrl: buildTeacherRecruitShareUrl(input.subject, resolvedCity?.name ?? input.city),
      city: resolvedCity?.name ?? input.city,
      region: resolvedCity?.province ?? null,
    });
  } catch (error) {
    console.error("[learner-demand] unexpected failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
  }
}
