import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_LAUNCHED_TEACHER_COUNTRY_CODE,
  normalizeCountryCode,
} from "@/lib/config/markets";
import { MIN_LESSON_PRICE_DOLLARS } from "@/lib/pricing/constants";

const TEACHER_IMAGE_FALLBACK = "https://picsum.photos/seed/teacher/400/400";

/** Draft row defaults — hidden from search until teacher completes setup. */
export const DRAFT_TEACHER_ROW_INSERT = {
  discipline: "—",
  /**
   * Never default to music/musique — that mislabeled language teachers as Musique
   * once drafts became discoverable. Empty until the teacher (or admin) sets a real discipline.
   */
  category: "",
  rating: 0,
  reviews: 0,
  /**
   * Column is NOT NULL in base schema; CHECK requires NULL or >= 20 CAD.
   * Placeholder minimum keeps draft rows valid until wizard/API sets real pricing.
   */
  price_per_lesson: MIN_LESSON_PRICE_DOLLARS,
  bio: "",
  availability: [] as string[],
  location: {} as Record<string, never>,
  is_verified: false,
  is_public: false,
  teaching_mode: "both",
  languages: [] as string[],
  levels: [] as string[],
  /** Launched market default so pricing save is not blocked by blank country. */
  country_code: DEFAULT_LAUNCHED_TEACHER_COUNTRY_CODE,
} as const;

function resolveDraftCountryCode(hint: string | null | undefined): string {
  const normalized = typeof hint === "string" ? normalizeCountryCode(hint) : "";
  return normalized || DEFAULT_LAUNCHED_TEACHER_COUNTRY_CODE;
}

function logEnsureTeacherRowFailure(
  stage: string,
  userId: string,
  err: { code?: string; message?: string; details?: string; hint?: string } | null,
  extra?: Record<string, unknown>,
) {
  console.error("[ensureTeacherProfileRow]", {
    stage,
    userIdPresent: Boolean(userId),
    code: err?.code ?? null,
    message: err?.message ?? null,
    details: err?.details ?? null,
    hint: err?.hint ?? null,
    draftPricePerLesson: DRAFT_TEACHER_ROW_INSERT.price_per_lesson,
    payloadKeys: extra?.payloadKeys ?? null,
  });
}

export type EnsureTeacherProfileRowResult = {
  teacherId: string;
  created: boolean;
};

type ProfileHints = {
  name?: string | null;
  photo_url?: string | null;
  country_code?: string | null;
};

/**
 * Idempotently ensure a minimal teachers row exists for a teacher auth user.
 * Uses service-role admin client only — never expose to the browser.
 */
export async function ensureTeacherProfileRow(
  admin: SupabaseClient,
  userId: string,
  hints?: ProfileHints,
): Promise<{ result: EnsureTeacherProfileRowResult | null; error: string | null }> {
  const { data: existing, error: existingErr } = await admin
    .from("teachers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingErr) {
    logEnsureTeacherRowFailure("select-existing", userId, existingErr);
    return { result: null, error: existingErr.message };
  }
  if (existing?.id) {
    return { result: { teacherId: existing.id, created: false }, error: null };
  }

  let profileHints = hints;
  if (!profileHints) {
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("name, photo_url, country_code, role")
      .eq("id", userId)
      .maybeSingle();
    if (profileErr) {
      logEnsureTeacherRowFailure("load-profile-hints", userId, profileErr);
      return { result: null, error: profileErr.message };
    }
    if (profile?.role === "admin") {
      return { result: null, error: "Admin profiles do not receive teacher rows." };
    }
    profileHints = profile ?? undefined;
  }

  const teacherName =
    typeof profileHints?.name === "string" && profileHints.name.trim()
      ? profileHints.name.trim()
      : "Professeur";
  const imageUrl =
    typeof profileHints?.photo_url === "string" && profileHints.photo_url.trim()
      ? profileHints.photo_url.trim()
      : TEACHER_IMAGE_FALLBACK;

  const draftCountry = resolveDraftCountryCode(
    typeof profileHints?.country_code === "string" ? profileHints.country_code : null,
  );

  const { data: created, error: createErr } = await admin
    .from("teachers")
    .insert({
      id: userId,
      user_id: userId,
      name: teacherName,
      image_url: imageUrl,
      ...DRAFT_TEACHER_ROW_INSERT,
      // Explicit profile country wins when set; blank falls back to launched market.
      country_code: draftCountry,
    })
    .select("id")
    .single();

  if (createErr || !created?.id) {
    logEnsureTeacherRowFailure("insert", userId, createErr, {
      payloadKeys: ["id", "user_id", "name", "image_url", ...Object.keys(DRAFT_TEACHER_ROW_INSERT)],
    });
    return { result: null, error: createErr?.message ?? "Unable to create teacher profile." };
  }

  return { result: { teacherId: created.id, created: true }, error: null };
}
