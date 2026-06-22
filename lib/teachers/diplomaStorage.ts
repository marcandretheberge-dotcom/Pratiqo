/** Private Supabase Storage bucket for teacher diploma uploads (never public-read). */
export const TEACHER_DIPLOMA_BUCKET = "teacher-diplomas";

/**
 * Returns true when the value looks like a permanent public Supabase object URL
 * for the diploma bucket (must never be stored or exposed to clients).
 */
export function isTeacherDiplomaPublicObjectUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes(`/storage/v1/object/public/${TEACHER_DIPLOMA_BUCKET}/`) ||
    normalized.includes(`/storage/v1/object/sign/${TEACHER_DIPLOMA_BUCKET}/`)
  );
}

/** Storage paths are relative object keys inside the private bucket (safe to persist). */
export function isTeacherDiplomaStoragePath(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  if (isTeacherDiplomaPublicObjectUrl(value)) return false;
  if (/^https?:\/\//i.test(value)) return false;
  return true;
}
