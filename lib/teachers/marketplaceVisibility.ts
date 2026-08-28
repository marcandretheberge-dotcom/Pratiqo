/**
 * Marketplace visibility for teacher discovery (landing search, student search,
 * Explore, /api/teachers/plans metadata). Intentionally separate from SEO
 * indexability in lib/seo/teacherPublicProfile.ts — teachers do NOT need
 * search_indexing_consent, public_profile_enabled, `teachers.is_public`, full
 * biography, rates, availability, or payment setup to appear here.
 */

import { evaluateTeacherDiscovery } from "@/lib/teachers/teacherDiscovery";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TeacherMarketplaceVisibilityRow = {
  id: string;
  user_id?: string | null;
  is_public?: boolean | null;
  marketplace_discovery_opt_out?: boolean | null;
  is_demo?: boolean | null;
  discipline?: string | null;
  category?: string | null;
  discipline_count?: number | null;
  disciplineCount?: number | null;
  deactivated_at?: string | null;
  deleted_at?: string | null;
  identity_verification_failed?: boolean;
  profile_is_active?: boolean | null;
  profile_deactivated_at?: string | null;
  profile_deleted_at?: string | null;
  profile_anonymized_at?: string | null;
};

/** Mirrors list_public_teachers() / teachers_public marketplace gates (not SEO). */
export function isTeacherMarketplaceVisibleRow(row: TeacherMarketplaceVisibilityRow): boolean {
  if (!UUID_RE.test(row.id)) return false;
  return evaluateTeacherDiscovery({
    profile: {
      role: "teacher",
      is_active: row.profile_is_active,
      deactivated_at: row.profile_deactivated_at,
      deleted_at: row.profile_deleted_at,
      anonymized_at: row.profile_anonymized_at,
    },
    teacher: {
      id: row.id,
      user_id: row.user_id,
      discipline: row.discipline,
      category: row.category,
      is_public: row.is_public,
      marketplace_discovery_opt_out: row.marketplace_discovery_opt_out,
      is_demo: row.is_demo,
      deactivated_at: row.deactivated_at,
      deleted_at: row.deleted_at,
      identity_verification_failed: row.identity_verification_failed,
    },
    disciplineCount: row.disciplineCount ?? row.discipline_count ?? 0,
  }).discoverable;
}
