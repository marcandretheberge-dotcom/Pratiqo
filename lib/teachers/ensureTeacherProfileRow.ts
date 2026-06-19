import type { SupabaseClient } from "@supabase/supabase-js";

const TEACHER_IMAGE_FALLBACK = "https://picsum.photos/seed/teacher/400/400";

/** Draft row defaults — hidden from search until teacher completes setup. */
export const DRAFT_TEACHER_ROW_INSERT = {
  discipline: "—",
  category: "music",
  rating: 0,
  reviews: 0,
  /** NULL is allowed by teachers_price_per_lesson_minimum_chk; 0 is not. */
  price_per_lesson: null as number | null,
  bio: "",
  availability: [] as string[],
  location: {} as Record<string, never>,
  is_verified: false,
  is_public: false,
  teaching_mode: "both",
  languages: [] as string[],
  levels: [] as string[],
} as const;

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

  const { data: created, error: createErr } = await admin
    .from("teachers")
    .insert({
      id: userId,
      user_id: userId,
      name: teacherName,
      image_url: imageUrl,
      country_code:
        typeof profileHints?.country_code === "string" ? profileHints.country_code : null,
      ...DRAFT_TEACHER_ROW_INSERT,
    })
    .select("id")
    .single();

  if (createErr || !created?.id) {
    return { result: null, error: createErr?.message ?? "Unable to create teacher profile." };
  }

  return { result: { teacherId: created.id, created: true }, error: null };
}
