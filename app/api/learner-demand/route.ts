import { NextResponse } from "next/server";

import { loadLearnerDemandSupply } from "@/lib/learnerDemandSupply";
import { resolveDisciplineId } from "@/lib/taxonomy/disciplines";
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
  intent: "search" | "waitlist";
  availabilityPreference: "any" | "weekday_day" | "weekday_evening" | "weekend";
  requestedFormat: "in_person" | "online";
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
  const intent = input.intent ?? "waitlist";
  if (intent !== "search" && intent !== "waitlist") return null;
  const requestedFormat = input.requestedFormat ?? "in_person";
  if (requestedFormat !== "in_person" && requestedFormat !== "online") return null;
  if (intent === "waitlist" && (input.alertConsent !== true || input.adultContactConfirmed !== true)) return null;
  const availabilityPreference = input.availabilityPreference ?? "any";
  if (!["any", "weekday_day", "weekday_evening", "weekend"].includes(String(availabilityPreference))) return null;
  const subject = cleanString(input.subject, 120);
  const city = cleanString(input.city, 120);
  const emailRaw = cleanString(input.email, 320);
  if (!subject || !city || typeof input.acceptsOnline !== "boolean") return null;

  const email = intent === "waitlist" ? normalizeLearnerEmail(emailRaw ?? "") : "";
  if (intent === "waitlist" && !EMAIL_RE.test(email)) return null;

  const localeRaw = cleanString(input.locale, 10)?.toLowerCase();
  const locale: "fr" | "en" | "es" = localeRaw === "en" || localeRaw === "es" ? localeRaw : "fr";
  const source = "teacher_finder";

  return {
    intent,
    availabilityPreference: availabilityPreference as ParsedDemand["availabilityPreference"],
    requestedFormat,
    subject,
    city,
    acceptsOnline: input.acceptsOnline,
    email,
    locale,
    source,
  };
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
    const teachers = await loadLearnerDemandSupply(admin, mapped, input.availabilityPreference);
    const match = matchLearnerDemand(teachers, input);
    const resolvedCity = findLearnerDemandCity(input.city);
    const publicResult = {
      ok: true,
      outcome: match.outcome,
      matchCount: match.matchCount,
      searchUrl: match.searchUrl,
      recruitShareUrl: buildTeacherRecruitShareUrl(input.subject, resolvedCity?.name ?? input.city),
      city: resolvedCity?.name ?? input.city,
      region: resolvedCity?.province ?? null,
    };
    // Searching is read-only and never requires an email or alert consent.
    if (input.intent === "search") return NextResponse.json({ ...publicResult, saved: false });
    const matchType = match.outcome === "local_match" ? "local" : match.outcome === "online_match" ? "online" : "none";
    const keepLocalWaitlist = input.requestedFormat === "in_person" && match.outcome === "online_match";
    const status = match.outcome === "waitlist" || keepLocalWaitlist ? "open" : "matched";
    const now = new Date().toISOString();

    const row = {
      email: input.email,
      email_normalized: input.email,
      subject: input.subject,
      subject_normalized: resolveDisciplineId(input.subject) ?? foldLearnerDemandText(input.subject),
      discipline_id: resolveDisciplineId(input.subject),
      availability_preference: input.availabilityPreference,
      alert_consent_at: now,
      adult_contact_confirmed: true,
      marketing_consent: false,
      city: resolvedCity?.name ?? input.city,
      city_normalized: foldLearnerDemandText(resolvedCity?.name ?? input.city),
      municipality_key: resolvedCity ? `${resolvedCity.country}:${resolvedCity.province ?? ""}:${foldLearnerDemandText(resolvedCity.name)}` : null,
      region: resolvedCity?.province ?? null,
      country_code: resolvedCity?.country ?? "CA",
      accepts_online: input.acceptsOnline,
      requested_format: input.requestedFormat,
      local_waitlist: keepLocalWaitlist,
      locale: input.locale,
      source: input.source,
      // Course-alert consent is not analytics/marketing consent. Do not retain URL attribution.
      status,
      match_type: matchType,
      matched_teacher_count: match.matchCount,
      last_match_at: now,
      updated_at: now,
    };

    const { data: saved, error: leadError } = await admin.from("learner_demand_leads").upsert(row, {
      onConflict: "email_normalized,subject_normalized,city_normalized,accepts_online,requested_format",
    }).select("status").single();

    if (leadError) {
      console.error("[learner-demand] lead upsert failed", { code: leadError.code });
      return NextResponse.json({ ok: false, error: "save_failed" }, { status: 503 });
    }
    if (saved?.status === "closed") {
      return NextResponse.json({ ok: false, error: "request_closed" }, { status: 409 });
    }

    return NextResponse.json({ ...publicResult, saved: true });
  } catch (error) {
    console.error("[learner-demand] unexpected failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
  }
}
