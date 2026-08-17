import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { cacheSeoData, SEO_SITEMAP_REVALIDATE_SECONDS, SEO_TEACHER_PROFILE_REVALIDATE_SECONDS } from "@/lib/seo/cache";
import { isIdentityVerificationFailed } from "@/lib/teachers/identityPublishGate";
import {
  buildTeacherPublicProfileSlug,
  isTeacherPublicProfileIndexable,
  type TeacherPublicSeoFields,
} from "@/lib/seo/teacherPublicProfile";
import type { TeacherSeoPublicationRow } from "@/lib/seo/teacherSeoPublication";
import { countTeacherSubjects, fetchTeacherSubjectCountsByIds } from "@/lib/seo/teacherSubjectCounts";

const SEO_ROW_SELECT =
  "id, user_id, name, bio, discipline, city, region, country_code, teaching_mode, is_public, deactivated_at, deleted_at, is_demo, identity_verified, stripe_identity_failed_reason, public_profile_enabled, search_indexing_consent, public_profile_slug, public_profile_last_indexable_at";

const SEO_PUBLICATION_ROW_SELECT =
  "id, user_id, name, bio, discipline, city, region, country_code, teaching_mode, is_public, deactivated_at, deleted_at, is_demo, identity_verified, stripe_identity_failed_reason, public_profile_enabled, search_indexing_consent, public_profile_slug, public_profile_last_indexable_at, image_url, price_per_lesson, intro_session_enabled, stripe_account_id, stripe_connect_onboarding_complete, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_requirements_due, stripe_connect_disabled_reason";

const PROFILE_SEO_SELECT =
  "id, teacher_onboarding_complete, is_active, deactivated_at, deleted_at, anonymized_at";

type SeoRowRaw = {
  id: string;
  user_id: string | null;
  name: string | null;
  bio: string | null;
  discipline: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
  teaching_mode: string | null;
  is_public: boolean | null;
  deactivated_at: string | null;
  deleted_at: string | null;
  is_demo: boolean | null;
  identity_verified: boolean | null;
  stripe_identity_failed_reason: string | null;
  public_profile_enabled: boolean | null;
  search_indexing_consent: boolean | null;
  public_profile_slug: string | null;
  public_profile_last_indexable_at?: string | null;
  image_url?: string | null;
  price_per_lesson?: number | null;
  intro_session_enabled?: boolean | null;
  stripe_account_id?: string | null;
  stripe_connect_onboarding_complete?: boolean | null;
  stripe_connect_charges_enabled?: boolean | null;
  stripe_connect_payouts_enabled?: boolean | null;
  stripe_connect_requirements_due?: unknown;
  stripe_connect_disabled_reason?: string | null;
};

type ProfileSeoRaw = {
  id: string;
  teacher_onboarding_complete: boolean | null;
  is_active: boolean | null;
  deactivated_at: string | null;
  deleted_at: string | null;
  anonymized_at: string | null;
};

function flattenSeoRow(
  raw: SeoRowRaw,
  profile: ProfileSeoRaw | null,
  subjectCount = 0,
): TeacherPublicSeoFields {
  return {
    id: raw.id,
    user_id: raw.user_id,
    name: raw.name,
    bio: raw.bio,
    discipline: raw.discipline,
    city: raw.city,
    region: raw.region,
    country_code: raw.country_code,
    teaching_mode: raw.teaching_mode,
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
    public_profile_last_indexable_at: raw.public_profile_last_indexable_at ?? null,
    teacher_onboarding_complete: profile?.teacher_onboarding_complete ?? null,
    profile_is_active: profile?.is_active ?? null,
    profile_deactivated_at: profile?.deactivated_at ?? null,
    profile_deleted_at: profile?.deleted_at ?? null,
    profile_anonymized_at: profile?.anonymized_at ?? null,
    subject_count: subjectCount,
  };
}

function flattenSeoPublicationRow(
  raw: SeoRowRaw,
  profile: ProfileSeoRaw | null,
  subjectCount = 0,
): TeacherSeoPublicationRow {
  return {
    ...flattenSeoRow(raw, profile, subjectCount),
    image_url: raw.image_url ?? null,
    price_per_lesson: raw.price_per_lesson ?? null,
    intro_session_enabled: raw.intro_session_enabled ?? null,
    stripe_account_id: raw.stripe_account_id ?? null,
    stripe_connect_onboarding_complete: raw.stripe_connect_onboarding_complete ?? null,
    stripe_connect_charges_enabled: raw.stripe_connect_charges_enabled ?? null,
    stripe_connect_payouts_enabled: raw.stripe_connect_payouts_enabled ?? null,
    stripe_connect_requirements_due: raw.stripe_connect_requirements_due ?? null,
    stripe_connect_disabled_reason: raw.stripe_connect_disabled_reason ?? null,
  };
}

async function fetchProfileSeoRowsByIds(userIds: string[]): Promise<Map<string, ProfileSeoRaw>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data, error } = await getSupabaseAdmin()
    .from("profiles")
    .select(PROFILE_SEO_SELECT)
    .in("id", unique);

  if (error || !data) return new Map();
  const out = new Map<string, ProfileSeoRaw>();
  for (const row of data as ProfileSeoRaw[]) {
    out.set(row.id, row);
  }
  return out;
}

async function fetchProfileSeoRowByUserId(userId: string | null): Promise<ProfileSeoRaw | null> {
  if (!userId) return null;
  const rows = await fetchProfileSeoRowsByIds([userId]);
  return rows.get(userId) ?? null;
}

async function fetchSeoPublicationRow(
  filter: { column: "id" | "user_id"; value: string },
): Promise<TeacherSeoPublicationRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("teachers")
    .select(SEO_PUBLICATION_ROW_SELECT)
    .eq(filter.column, filter.value)
    .maybeSingle();

  if (error || !data) return null;
  const raw = data as SeoRowRaw;
  const [profile, subjectCount] = await Promise.all([
    fetchProfileSeoRowByUserId(raw.user_id),
    countTeacherSubjects(raw.id),
  ]);
  return flattenSeoPublicationRow(raw, profile, subjectCount);
}

export async function fetchTeacherSeoPublicationRowById(
  teacherId: string,
): Promise<TeacherSeoPublicationRow | null> {
  return fetchSeoPublicationRow({ column: "id", value: teacherId });
}

export async function fetchTeacherSeoPublicationRowByUserId(
  userId: string,
): Promise<TeacherSeoPublicationRow | null> {
  return fetchSeoPublicationRow({ column: "user_id", value: userId });
}

async function fetchTeacherPublicSeoRowBySlugUncached(
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
  const raw = data as SeoRowRaw;
  const [profile, subjectCount] = await Promise.all([
    fetchProfileSeoRowByUserId(raw.user_id),
    countTeacherSubjects(raw.id),
  ]);
  return flattenSeoRow(raw, profile, subjectCount);
}

export const fetchTeacherPublicSeoRowBySlug = cacheSeoData(
  fetchTeacherPublicSeoRowBySlugUncached,
  ["teacher-public-seo-row-by-slug-v1"],
  { revalidate: SEO_TEACHER_PROFILE_REVALIDATE_SECONDS },
);

export async function fetchTeacherPublicSeoRowById(
  teacherId: string,
): Promise<TeacherPublicSeoFields | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("teachers")
    .select(SEO_ROW_SELECT)
    .eq("id", teacherId)
    .maybeSingle();

  if (error || !data) return null;
  const raw = data as SeoRowRaw;
  const [profile, subjectCount] = await Promise.all([
    fetchProfileSeoRowByUserId(raw.user_id),
    countTeacherSubjects(raw.id),
  ]);
  return flattenSeoRow(raw, profile, subjectCount);
}

async function fetchIndexableTeacherSitemapRowsUncached(): Promise<
  Array<{ slug: string; lastModified: Date }>
> {
  const { data, error } = await getSupabaseAdmin()
    .from("teachers")
    .select(
      "id, user_id, name, bio, discipline, city, region, country_code, teaching_mode, is_public, deactivated_at, deleted_at, is_demo, identity_verified, stripe_identity_failed_reason, public_profile_enabled, search_indexing_consent, public_profile_slug, public_profile_last_indexable_at, updated_at",
    )
    .eq("public_profile_enabled", true)
    .eq("search_indexing_consent", true)
    .not("public_profile_slug", "is", null)
    .not("public_profile_last_indexable_at", "is", null);

  if (error || !data) return [];

  const profileRows = await fetchProfileSeoRowsByIds(
    (data as unknown as SeoRowRaw[]).map((raw) => raw.user_id ?? ""),
  );
  const subjectCounts = await fetchTeacherSubjectCountsByIds(
    (data as unknown as SeoRowRaw[]).map((raw) => raw.id),
  );
  const rows: Array<{ slug: string; lastModified: Date }> = [];
  for (const raw of data as unknown as SeoRowRaw[]) {
    const subjectCount = subjectCounts.get(raw.id) ?? 0;
    const row = flattenSeoRow(raw, raw.user_id ? profileRows.get(raw.user_id) ?? null : null, subjectCount);
    if (!isTeacherPublicProfileIndexable(row)) continue;
    const slug = row.public_profile_slug?.trim();
    if (!slug) continue;
    const last =
      (raw as { public_profile_last_indexable_at?: string | null; updated_at?: string | null })
        .public_profile_last_indexable_at ??
      (raw as { updated_at?: string | null }).updated_at;
    if (!last) continue;
    const lastModified = new Date(last);
    if (!Number.isFinite(lastModified.getTime())) continue;
    rows.push({
      slug,
      lastModified,
    });
  }
  return rows;
}

export const fetchIndexableTeacherSitemapRows = cacheSeoData(
  fetchIndexableTeacherSitemapRowsUncached,
  ["teacher-public-sitemap-rows-v1"],
  { revalidate: SEO_SITEMAP_REVALIDATE_SECONDS },
);

/** Indexable /professeurs/[slug] paths for marketplace teacher cards (never owner-preview URLs). */
async function fetchIndexableTeacherPublicPathsByIdsUncached(
  teacherIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(teacherIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data, error } = await getSupabaseAdmin()
    .from("teachers")
    .select(SEO_ROW_SELECT)
    .in("id", unique);

  if (error || !data) return new Map();

  const profileRows = await fetchProfileSeoRowsByIds(
    (data as SeoRowRaw[]).map((raw) => raw.user_id ?? ""),
  );
  const subjectCounts = await fetchTeacherSubjectCountsByIds(
    (data as SeoRowRaw[]).map((raw) => raw.id),
  );
  const out = new Map<string, string>();
  for (const raw of data as SeoRowRaw[]) {
    const subjectCount = subjectCounts.get(raw.id) ?? 0;
    const row = flattenSeoRow(raw, raw.user_id ? profileRows.get(raw.user_id) ?? null : null, subjectCount);
    if (!isTeacherPublicProfileIndexable(row)) continue;
    const slug = row.public_profile_slug?.trim();
    if (!slug) continue;
    out.set(raw.id, `/professeurs/${encodeURIComponent(slug)}`);
  }
  return out;
}

export const fetchIndexableTeacherPublicPathsByIds = cacheSeoData(
  fetchIndexableTeacherPublicPathsByIdsUncached,
  ["teacher-public-paths-by-ids-v1"],
  { revalidate: SEO_TEACHER_PROFILE_REVALIDATE_SECONDS },
);

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
