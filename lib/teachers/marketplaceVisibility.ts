/**
 * Marketplace visibility for teacher discovery (landing search, student search,
 * Explore, /api/teachers/plans metadata). Intentionally separate from SEO
 * indexability in lib/seo/teacherPublicProfile.ts — teachers do NOT need
 * search_indexing_consent or public_profile_enabled to appear here.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TeacherMarketplaceVisibilityRow = {
  id: string;
  user_id?: string | null;
  is_public?: boolean | null;
  is_demo?: boolean | null;
  deactivated_at?: string | null;
  deleted_at?: string | null;
  identity_status?: string | null;
  profile_is_active?: boolean | null;
  profile_deactivated_at?: string | null;
  profile_deleted_at?: string | null;
  profile_anonymized_at?: string | null;
};

/** Mirrors list_public_teachers() / teachers_public marketplace gates (not SEO). */
export function isTeacherMarketplaceVisibleRow(row: TeacherMarketplaceVisibilityRow): boolean {
  if (!UUID_RE.test(row.id)) return false;
  if (!row.user_id || !UUID_RE.test(row.user_id)) return false;
  if (row.is_demo === true) return false;
  if (row.is_public === false) return false;
  if (row.deactivated_at || row.deleted_at) return false;
  if ((row.identity_status ?? "none") === "failed") return false;
  if (row.profile_is_active === false) return false;
  if (row.profile_deactivated_at || row.profile_deleted_at || row.profile_anonymized_at) return false;
  return true;
}
