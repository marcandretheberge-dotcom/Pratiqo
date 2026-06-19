import type { SupabaseClient } from "@supabase/supabase-js";

const TEACHER_IMAGE_FALLBACK = "https://picsum.photos/seed/teacher/400/400";

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
      discipline: "—",
      category: "music",
      rating: 0,
      reviews: 0,
      price_per_lesson: 0,
      bio: "",
      image_url: imageUrl,
      availability: [],
      location: {},
      is_verified: false,
      is_public: false,
      teaching_mode: "both",
      languages: [],
      levels: [],
      country_code:
        typeof profileHints?.country_code === "string" ? profileHints.country_code : null,
    })
    .select("id")
    .single();

  if (createErr || !created?.id) {
    return { result: null, error: createErr?.message ?? "Unable to create teacher profile." };
  }

  return { result: { teacherId: created.id, created: true }, error: null };
}
