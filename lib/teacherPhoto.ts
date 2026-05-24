import type { Teacher } from "@/types";

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

/** Read a photo URL from mixed snake/camel listing records (Supabase rows, Teacher objects). */
export function readTeacherPhotoFromRecord(record: Record<string, unknown> | null | undefined): string {
  if (!record) return "";

  for (const key of [
    "imageUrl",
    "profile_photo_url",
    "profilePhotoUrl",
    "photo_url",
    "photoUrl",
    "image_url",
    "avatarUrl",
  ]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

/** Normalize a Teacher or partial listing record to the canonical image URL used by listing UI. */
export function normalizeTeacherImageUrl(teacher: Teacher | Record<string, unknown>): string {
  const record = teacher as Record<string, unknown>;

  const profilePhoto =
    (typeof record.profile_photo_url === "string" && record.profile_photo_url.trim()) ||
    (typeof record.profilePhotoUrl === "string" && record.profilePhotoUrl.trim()) ||
    (typeof record.photo_url === "string" && record.photo_url.trim()) ||
    (typeof record.photoUrl === "string" && record.photoUrl.trim()) ||
    "";

  const legacyImage =
    (typeof record.imageUrl === "string" && record.imageUrl.trim()) ||
    (typeof record.image_url === "string" && record.image_url.trim()) ||
    (typeof record.avatarUrl === "string" && record.avatarUrl.trim()) ||
    "";

  return resolveTeacherPublicPhoto(profilePhoto || null, legacyImage || null);
}

/** True when the URL points at the public Supabase avatars bucket, safe to expose publicly. */
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