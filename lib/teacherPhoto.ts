/**
 * Public teacher avatar resolution for marketplace listings.
 *
 * Priority (intentional):
 *   1. profiles.photo_url / profile_photo_url (uploaded avatar or OAuth)
 *   2. teachers.image_url (legacy listing column)
 *   3. empty string → UI falls back to initials
 */
export function resolveTeacherPublicPhoto(
  profilePhotoUrl: string | null | undefined,
  teacherImageUrl: string | null | undefined,
): string {
  const profile = typeof profilePhotoUrl === "string" ? profilePhotoUrl.trim() : "";
  if (profile) return profile;
  const teacher = typeof teacherImageUrl === "string" ? teacherImageUrl.trim() : "";
  return teacher;
}

/** True when the URL points at the public Supabase avatars bucket (safe to expose). */
export function isPublicAvatarPhotoUrl(url: string | null | undefined): boolean {
  const raw = typeof url === "string" ? url.trim() : "";
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return parsed.pathname.includes("/storage/v1/object/public/avatars/");
  } catch {
    return false;
  }
}
