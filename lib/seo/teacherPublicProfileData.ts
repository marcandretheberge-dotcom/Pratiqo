import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isIdentityVerificationFailed } from "@/lib/teachers/identityPublishGate";
import {
  buildTeacherPublicProfileSlug,
  isTeacherPublicProfileIndexable,
  type TeacherPublicSeoFields,
} from "@/lib/seo/teacherPublicProfile";

const SEO_ROW_SELECT =
  "id, user_id, name, bio, discipline, city, region, country_code, is_public, deactivated_at, deleted_at, is_demo, identity_verified, stripe_identity_failed_reason, public_profile_enabled, search_indexing_consent, public_profile_slug, profiles!inner(teacher_onboarding_complete, is_active, deactivated_at, deleted_at, anonymized_at)";

type SeoRowRaw = {
  id: string;
  user_id: string | null;
  name: string | null;
  bio: string | null;
  discipline: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
  is_public: boolean | null;
  deactivated_at: string | null;
  deleted_at: string | null;
  is_demo: boolean | null;
  identity_verified: boolean | null;
  stripe_identity_failed_reason: string | null;
  public_profile_enabled: boolean | null;
  search_indexing_consent: boolean | null;
  public_profile_slug: string | null;
  profiles:
    | {
        teacher_onboarding_complete: boolean | null;
        is_active: boolean | null;
        deactivated_at: string | null;
        deleted_at: string | null;
        anonymized_at: string | null;
      }
    | {
        teacher_onboarding_complete: boolean | null;
        is_active: boolean | null;
        deactivated_at: string | null;
        deleted_at: string | null;
        anonymized_at: string | null;
      }[];
};

function flattenSeoRow(raw: SeoRowRaw, subjectCount = 0): TeacherPublicSeoFields {
  const profile = Array.isArray(raw.profiles) ? raw.profiles[0] : raw.profiles;
  return {
    id: raw.id,
    user_id: raw.user_id,
    name: raw.name,
    bio: raw.bio,
    discipline: raw.discipline,
    city: raw.city,
    region: raw.region,
    country_code: raw.country_code,
    is_public: raw.is_public,
    deactivated_at: raw.deactivated_at,
    deleted_at: raw.deleted_at,
    is_demo: raw.is_demo,
    identity_verification_failed: isIdentityVerificationFailed({
      identity_verified: raw.identity_verified,
      stripe_identity_failed_reason: raw.stripe_identity_failed_reason,
    }),
    public_profile_enabled: raw.public_profile_enabled,
    search_indexing_consent: raw.search_indexing_consent,
    public_profile_slug: raw.public_profile_slug,
    teacher_onboarding_complete: profile?.teacher_onboarding_complete ?? null,
    profile_is_active: profile?.is_active ?? null,
    profile_deactivated_at: profile?.deactivated_at ?? null,
    profile_deleted_at: profile?.deleted_at ?? null,
    profile_anonymized_at: profile?.anonymized_at ?? null,
    subject_count: subjectCount,
  };
}

async function countTeacherSubjects(teacherId: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("teacher_disciplines")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", teacherId);
  if (error) return 0;
  return count ?? 0;
}

export async function fetchTeacherPublicSeoRowBySlug(
  slug: string,
): Promise<TeacherPublicSeoFields | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const { data, error } = await getSupabaseAdmin()
    .from("teachers")
    .select(SEO_ROW_SELECT)
    .eq("public_profile_slug", trimmed)
    .maybeSingle();

  if (error || !data) return null;
  const subjectCount = await countTeacherSubjects((data as SeoRowRaw).id);
  return flattenSeoRow(data as SeoRowRaw, subjectCount);
}

export async function fetchTeacherPublicSeoRowById(
  teacherId: string,
): Promise<TeacherPublicSeoFields | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("teachers")
    .select(SEO_ROW_SELECT)
    .eq("id", teacherId)
    .maybeSingle();

  if (error || !data) return null;
  const subjectCount = await countTeacherSubjects((data as SeoRowRaw).id);
  return flattenSeoRow(data as SeoRowRaw, subjectCount);
}

export async function fetchIndexableTeacherSitemapRows(): Promise<
  Array<{ slug: string; lastModified: Date }>
> {
  const { data, error } = await getSupabaseAdmin()
    .from("teachers")
    .select(
      "id, user_id, name, bio, discipline, city, region, country_code, is_public, deactivated_at, deleted_at, is_demo, identity_verified, stripe_identity_failed_reason, public_profile_enabled, search_indexing_consent, public_profile_slug, public_profile_last_indexable_at, updated_at, profiles!inner(teacher_onboarding_complete, is_active, deactivated_at, deleted_at, anonymized_at)",
    )
    .eq("public_profile_enabled", true)
    .eq("search_indexing_consent", true)
    .not("public_profile_slug", "is", null);

  if (error || !data) return [];

  const rows: Array<{ slug: string; lastModified: Date }> = [];
  for (const raw of data as unknown as SeoRowRaw[]) {
    const subjectCount = await countTeacherSubjects(raw.id);
    const row = flattenSeoRow(raw, subjectCount);
    if (!isTeacherPublicProfileIndexable(row)) continue;
    const slug = row.public_profile_slug?.trim();
    if (!slug) continue;
    const last =
      (raw as { public_profile_last_indexable_at?: string | null; updated_at?: string | null })
        .public_profile_last_indexable_at ??
      (raw as { updated_at?: string | null }).updated_at;
    rows.push({
      slug,
      lastModified: last ? new Date(last) : new Date(),
    });
  }
  return rows;
}

export async function allocateUniqueTeacherPublicProfileSlug(input: {
  teacherId: string;
  name: string;
  mainSubject: string;
  city: string;
}): Promise<string> {
  const base = buildTeacherPublicProfileSlug(input);
  const admin = getSupabaseAdmin();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data: existing } = await admin
      .from("teachers")
      .select("id")
      .eq("public_profile_slug", candidate)
      .maybeSingle();
    if (!existing || (existing as { id: string }).id === input.teacherId) {
      return candidate;
    }
  }

  return `${base}-${input.teacherId.slice(0, 8)}`;
}
