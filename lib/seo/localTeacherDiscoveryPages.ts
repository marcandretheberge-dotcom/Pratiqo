import { QC_CITIES, findCityBySlug, type QcCity } from "@/lib/constants/cities";
import { haversineDistance } from "@/lib/geo";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isIdentityVerificationFailed } from "@/lib/teachers/identityPublishGate";
import { DISCIPLINES, findDisciplineBySlug } from "@/lib/seo/disciplines";
import type { DisciplineConfig } from "@/lib/seo/types";
import {
  buildTeacherPublicProfilePath,
  isTeacherPublicProfileIndexable,
  type TeacherPublicSeoFields,
} from "@/lib/seo/teacherPublicProfile";
import { SITE_URL } from "@/lib/seo/site";
import { cacheSeoData, SEO_SITEMAP_REVALIDATE_SECONDS, TEACHER_PUBLIC_SEO_CACHE_TAG } from "@/lib/seo/cache";
import { hasDeclaredLocalSupply } from "@/lib/teachers/localSupply";
import { getDisciplineLabel, resolveDisciplineId } from "@/lib/taxonomy/disciplines";
import { mapTeacherTeachingZoneRow, type TeacherTeachingZonePublicRow } from "@/lib/teacherTeachingZones";
import type { TeacherTeachingZone } from "@/types";
import { formatPublicTeacherDisplayName } from "@/lib/identity/displayName";
import { getSubjectLandingPageBySlug } from "@/lib/seo/subjectLandingPages";
import { normalizeTeacherSubjectIds } from "@/lib/taxonomy/teacherSubjectNormalization";
import type { TeacherBookingAction } from "@/lib/teachers/bookingCapability";
export const LOCAL_CITY_HUB_PATH_PREFIX = "/tuteurs";
export const LEGACY_CITY_HUB_PATH_PREFIX = "/tuteurs-prive";

const PRIMARY_RADIUS_KM = 30;
const EXPANDED_RADIUS_KM = 150;
const MAX_TEACHER_CARDS = 9;

// Editorial pilot only; these paths still require real local supply to be indexed.
export function isPriorityLocalDiscoveryPage(path: string): boolean {
  return ["/tuteurs/saint-georges", "/cours/francais/saint-georges", "/cours/espagnol/saint-georges"].includes(path);
}

export type LocalDiscoveryPageType = "city_hub" | "subject_city";

export type LocalDiscoveryNoindexReason =
  | "invalid_city"
  | "invalid_discipline"
  | "no_eligible_teachers"
  | "no_local_teachers";

export type LocalDiscoveryDiscipline = {
  slug: string;
  name: string;
  faq: Array<{ question: string; answer: string }>;
};

export type LocalTeacherDiscoveryCard = {
  bookingAction?: TeacherBookingAction | null;
  id: string;
  displayName: string;
  discipline: string;
  category: string;
  teachingMode: string;
  pricePerLesson: number | null;
  imageUrl: string | null;
  profilePath: string;
  mapLat: number | null;
  mapLng: number | null;
  distanceKm: number | null;
  isOnlineFallback: boolean;
  isLocalSupply?: boolean;
  reviewCount: number;
  rating: number;
  identityVerified: boolean;
};

export type SubjectCityLink = {
  href: string;
  label: string;
  disciplineSlug: string;
};

export type LocalTeacherDiscoveryPageBundle = {
  pageType: LocalDiscoveryPageType;
  indexable: boolean;
  noindexReasons: LocalDiscoveryNoindexReason[];
  city: QcCity;
  // This bundle crosses the RSC boundary. Never include registry functions.
  discipline: LocalDiscoveryDiscipline | null;
  canonicalPath: string;
  canonicalUrl: string;
  title: string;
  description: string;
  h1: string;
  heroDescription: string;
  teachers: LocalTeacherDiscoveryCard[];
  localTeacherCount: number;
  isNearby: boolean;
  mapCenter: { lat: number; lng: number; zoom?: number };
  subjectCityLinks: SubjectCityLink[];
  relatedResourcesPath: string | null;
  broadSubjectPath: string | null;
  cityHubPath: string;
};

export type RawDiscoveryTeacher = TeacherPublicSeoFields & {
  bookingAction?: TeacherBookingAction | null;
  disciplineIds?: string[];
  teachingZones?: TeacherTeachingZone[];
  category: string | null;
  rating: number | null;
  reviews: number | null;
  price_per_lesson: number | null;
  image_url: string | null;
  teaching_mode: string | null;
  location: unknown;
  identity_verified: boolean | null;
};

type SeoRowRaw = {
  id: string;
  user_id: string | null;
  name: string | null;
  bio: string | null;
  discipline: string | null;
  category: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
  teaching_mode: string | null;
  is_public: boolean | null;
  marketplace_discovery_opt_out: boolean | null;
  deactivated_at: string | null;
  deleted_at: string | null;
  is_demo: boolean | null;
  identity_verified: boolean | null;
  stripe_identity_failed_reason: string | null;
  public_profile_enabled: boolean | null;
  search_indexing_consent: boolean | null;
  public_profile_slug: string | null;
  public_profile_last_indexable_at: string | null;
  rating: number | null;
  reviews: number | null;
  price_per_lesson: number | null;
  image_url: string | null;
  location: unknown;
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

const DISCOVERY_ROW_SELECT =
  "id, user_id, name, bio, discipline, category, city, region, country_code, teaching_mode, is_public, marketplace_discovery_opt_out, deactivated_at, deleted_at, is_demo, identity_verified, stripe_identity_failed_reason, public_profile_enabled, search_indexing_consent, public_profile_slug, public_profile_last_indexable_at, rating, reviews, price_per_lesson, image_url, location";

function normalizeLabel(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function buildCityHubPath(citySlug: string): string {
  return `${LOCAL_CITY_HUB_PATH_PREFIX}/${citySlug}`;
}

export function buildSubjectCityPath(disciplineSlug: string, citySlug: string): string {
  return `/cours/${disciplineSlug}/${citySlug}`;
}

function flattenDiscoveryRow(raw: SeoRowRaw, subjectCount = 0): RawDiscoveryTeacher {
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
    teaching_mode: raw.teaching_mode,
    is_public: raw.is_public,
    marketplace_discovery_opt_out: raw.marketplace_discovery_opt_out,
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
    public_profile_last_indexable_at: raw.public_profile_last_indexable_at,
    teacher_onboarding_complete: profile?.teacher_onboarding_complete ?? null,
    profile_is_active: profile?.is_active ?? null,
    profile_deactivated_at: profile?.deactivated_at ?? null,
    profile_deleted_at: profile?.deleted_at ?? null,
    profile_anonymized_at: profile?.anonymized_at ?? null,
    subject_count: subjectCount,
    category: raw.category,
    rating: raw.rating,
    reviews: raw.reviews,
    price_per_lesson: raw.price_per_lesson,
    image_url: raw.image_url,
    location: raw.location,
    identity_verified: raw.identity_verified,
  };
}

export const fetchIndexableDiscoveryTeachers = cacheSeoData(
  async (): Promise<RawDiscoveryTeacher[]> => {
      const { data, error } = await getSupabaseAdmin()
        .from("teachers")
        .select(DISCOVERY_ROW_SELECT)
        .not("public_profile_last_indexable_at", "is", null);

      if (error) throw new Error("local_discovery_teachers_unavailable");
      if (!data?.length) return [];

      // teachers.id is not the owner account ID. Never use an inferred profiles join.
      const ownerIds = [...new Set(data.map((row) => row.user_id).filter((id): id is string => Boolean(id)))];
      if (ownerIds.length === 0) return [];
      const { data: owners, error: ownerError } = await getSupabaseAdmin()
        .from("profiles")
        .select("id, teacher_onboarding_complete, is_active, deactivated_at, deleted_at, anonymized_at")
        .in("id", ownerIds);
      if (ownerError) throw new Error("local_discovery_owners_unavailable");
      const ownersById = new Map((owners ?? []).map((owner) => [owner.id, owner]));

      const { data: subjects, error: subjectError } = await getSupabaseAdmin()
        .from("teacher_disciplines")
        .select("teacher_id, discipline_id, specialite")
        .in("teacher_id", data.map((raw) => raw.id));
      if (subjectError) throw new Error("local_discovery_subjects_unavailable");
      const disciplinesByTeacher = new Map<string, string[]>();
      for (const subject of subjects ?? []) {
        if (typeof subject.teacher_id !== "string" || typeof subject.discipline_id !== "string") continue;
        const ids = disciplinesByTeacher.get(subject.teacher_id) ?? [];
        ids.push(...normalizeTeacherSubjectIds([subject]));
        disciplinesByTeacher.set(subject.teacher_id, [...new Set(ids)]);
      }
      const rows: RawDiscoveryTeacher[] = [];
      for (const raw of data) {
        const owner = raw.user_id ? ownersById.get(raw.user_id) : undefined;
        if (!owner) continue;
        const disciplineIds = disciplinesByTeacher.get(raw.id) ?? [];
        const row = { ...flattenDiscoveryRow({ ...raw, profiles: owner } as SeoRowRaw, disciplineIds.length), disciplineIds };
        if (!isTeacherPublicProfileIndexable(row)) continue;
        const slug = row.public_profile_slug?.trim();
        if (!slug) continue;
        rows.push(row);
      }
      if (rows.length === 0) return rows;
      const { data: zoneRows, error: zoneError } = await getSupabaseAdmin()
        .from("teacher_teaching_zones_public")
        .select("id, teacher_id, label_public, city, region, country_code, lat_public, lng_public, radius_km, zone_kind, is_primary, sort_order, availability_note_public, supports_at_teacher_place, supports_at_student_place, supports_public_place")
        .in("teacher_id", rows.map((row) => row.id));
      if (zoneError) {
        // During migration 128 rollout, legacy city remains authoritative.
        // Other service failures must still reach the page error boundary.
        if (zoneError.code !== "42P01" && zoneError.code !== "PGRST205") {
          throw new Error("local_discovery_zones_unavailable");
        }
        console.warn("[seo:local-discovery] optional zones view missing; using legacy cities");
      }
      const zonesByTeacher = new Map<string, TeacherTeachingZone[]>();
      for (const raw of (zoneRows ?? []) as TeacherTeachingZonePublicRow[]) {
        const zone = mapTeacherTeachingZoneRow(raw);
        const zones = zonesByTeacher.get(zone.teacherId) ?? [];
        zones.push(zone);
        zonesByTeacher.set(zone.teacherId, zones);
      }
      for (const row of rows) row.teachingZones = zonesByTeacher.get(row.id) ?? [];
      return rows;
  },
  ["local-discovery-indexable-teachers-v4-publication-tag"],
  { revalidate: SEO_SITEMAP_REVALIDATE_SECONDS, tags: [TEACHER_PUBLIC_SEO_CACHE_TAG] },
);

export function teacherIsOnlineCapable(teachingMode: string | null | undefined): boolean {
  const mode = normalizeLabel(teachingMode ?? "");
  return mode === "online" || mode === "both" || mode === "all";
}

export function readTeacherApproximateMapCoords(location: unknown): { lat: number; lng: number } | null {
  const loc = typeof location === "object" && location !== null ? (location as Record<string, unknown>) : {};
  const publicLoc =
    typeof loc.public === "object" && loc.public !== null ? (loc.public as Record<string, unknown>) : null;
  const latCandidate =
    (publicLoc && typeof publicLoc.lat === "number" ? publicLoc.lat : undefined) ??
    (typeof loc.lat === "number" ? loc.lat : undefined) ??
    (publicLoc && typeof publicLoc.latitude === "number" ? publicLoc.latitude : undefined);
  const lngCandidate =
    (publicLoc && typeof publicLoc.lng === "number" ? publicLoc.lng : undefined) ??
    (typeof loc.lng === "number" ? loc.lng : undefined) ??
    (publicLoc && typeof publicLoc.longitude === "number" ? publicLoc.longitude : undefined);

  if (typeof latCandidate !== "number" || typeof lngCandidate !== "number") return null;
  if (!Number.isFinite(latCandidate) || !Number.isFinite(lngCandidate)) return null;
  if (latCandidate === 0 && lngCandidate === 0) return null;
  return { lat: latCandidate, lng: lngCandidate };
}

export function teacherCityLabelMatchesCity(teacher: Pick<RawDiscoveryTeacher, "city" | "region">, city: QcCity): boolean {
  const teacherCity = normalizeLabel(teacher.city);
  const teacherRegion = normalizeLabel(teacher.region);
  const targetCity = normalizeLabel(city.name);
  const targetRegion = normalizeLabel(city.region);
  return teacherCity === targetCity || teacherRegion === targetRegion || teacherCity === targetRegion;
}

export function teacherMatchesDiscipline(
  teacher: Pick<RawDiscoveryTeacher, "discipline" | "category" | "disciplineIds">,
  discipline: DisciplineConfig,
): boolean {
  const disciplineNorm = normalizeLabel(teacher.discipline);
  const categoryNorm = normalizeLabel(teacher.category);
  if (discipline.dbDiscipline) {
    const targetId = resolveDisciplineId(discipline.dbDiscipline);
    return disciplineNorm === normalizeLabel(discipline.dbDiscipline) ||
      (targetId !== null && (resolveDisciplineId(teacher.discipline) === targetId ||
        teacher.disciplineIds?.includes(targetId) === true));
  }
  const categoryId = resolveDisciplineId(discipline.dbCategory);
  return categoryNorm === normalizeLabel(discipline.dbCategory) ||
    (categoryId !== null && resolveDisciplineId(teacher.category) === categoryId);
}

type RankedTeacher = {
  row: RawDiscoveryTeacher;
  distanceKm: number | null;
  isOnlineFallback: boolean;
};

export function rankTeachersForCity(
  teachers: RawDiscoveryTeacher[],
  city: QcCity,
  options?: { discipline?: DisciplineConfig | null; allowOnlineFallback?: boolean; includeOnlineWithLocal?: boolean },
): { ranked: RankedTeacher[]; isNearby: boolean } {
  const discipline = options?.discipline ?? null;
  const allowOnlineFallback = options?.allowOnlineFallback !== false;

  const filtered = discipline
    ? teachers.filter((t) => teacherMatchesDiscipline(t, discipline))
    : teachers;

  const withDistance: RankedTeacher[] = filtered.map((row) => {
    const coords = readTeacherApproximateMapCoords(row.location);
    const labelMatch = teacherCityLabelMatchesCity(row, city);
    let distanceKm: number | null = null;
    if (coords) {
      distanceKm = haversineDistance(city.lat, city.lng, coords.lat, coords.lng);
    } else if (labelMatch) {
      distanceKm = 0;
    }
    const isOnlineFallback = allowOnlineFallback && teacherIsOnlineCapable(row.teaching_mode) &&
      !teacherHasLocalDiscoverySupply(row, city);
    return { row, distanceKm, isOnlineFallback };
  });

  // Declared teaching zones take precedence over proximity-only alternatives.
  const localSupply = withDistance.filter(({ row }) => teacherHasLocalDiscoverySupply(row, city));
  if (localSupply.length > 0) {
    const alternatives = options?.includeOnlineWithLocal
      ? withDistance.filter((entry) => entry.isOnlineFallback)
      : [];
    return { ranked: [...localSupply, ...alternatives].slice(0, MAX_TEACHER_CARDS), isNearby: false };
  }

  const localPrimary = withDistance
    .filter((x) => !x.isOnlineFallback && x.distanceKm !== null && x.distanceKm <= PRIMARY_RADIUS_KM)
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

  if (localPrimary.length >= 1) {
    const expanded = withDistance
      .filter((x) => !x.isOnlineFallback && x.distanceKm !== null && x.distanceKm <= EXPANDED_RADIUS_KM)
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    const isNearby = expanded.length > 0 && (expanded[0]?.distanceKm ?? 0) > PRIMARY_RADIUS_KM;
    return { ranked: expanded.slice(0, MAX_TEACHER_CARDS), isNearby: isNearby || localSupply.length === 0 };
  }

  const online = withDistance.filter((x) => x.isOnlineFallback);
  if (online.length >= 1) {
    return { ranked: online.slice(0, MAX_TEACHER_CARDS), isNearby: true };
  }

  const closest = withDistance
    .filter((x) => x.distanceKm !== null)
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  if (closest.length >= 1) {
    return { ranked: closest.slice(0, MAX_TEACHER_CARDS), isNearby: true };
  }

  return { ranked: [], isNearby: false };
}

export function toDiscoveryCard(entry: RankedTeacher): LocalTeacherDiscoveryCard {
  const slug = entry.row.public_profile_slug?.trim() ?? "";
  const coords = readTeacherApproximateMapCoords(entry.row.location);
  const price = entry.row.price_per_lesson;
  const primaryDiscipline = entry.row.discipline?.trim();
  const discipline = primaryDiscipline && !/^[—–-]+$/.test(primaryDiscipline)
    ? primaryDiscipline
    : (entry.row.disciplineIds ?? []).map((id) => getDisciplineLabel(id, "fr")).find(Boolean) ?? "";
  return {
    id: entry.row.id,
    bookingAction: entry.row.bookingAction,
    displayName: formatPublicTeacherDisplayName(entry.row.name ?? ""),
    discipline,
    category: typeof entry.row.category === "string" ? entry.row.category.trim() : "",
    teachingMode: typeof entry.row.teaching_mode === "string" ? entry.row.teaching_mode : "",
    pricePerLesson: typeof price === "number" && Number.isFinite(price) && price > 0 ? price : null,
    imageUrl: typeof entry.row.image_url === "string" ? entry.row.image_url : null,
    profilePath: buildTeacherPublicProfilePath(slug),
    mapLat: coords?.lat ?? null,
    mapLng: coords?.lng ?? null,
    distanceKm: entry.distanceKm,
    isOnlineFallback: entry.isOnlineFallback,
    reviewCount: typeof entry.row.reviews === "number" ? entry.row.reviews : 0,
    rating: typeof entry.row.rating === "number" ? entry.row.rating : 0,
    identityVerified: entry.row.identity_verified === true,
  };
}

export function buildSubjectCityTitle(discipline: DisciplineConfig, cityName: string): string {
  return `${buildSubjectCityH1(discipline, cityName)} | Pratiqo`;
}

function formatSubjectProfessorsPhrase(disciplineName: string): string {
  const lower = disciplineName.toLowerCase().trim();
  if (/^[aeiouyhéèêëàâîïôùû]/.test(lower)) return `d'${lower}`;
  return `de ${lower}`;
}

export function buildSubjectCityH1(discipline: DisciplineConfig, cityName: string): string {
  return `Professeurs ${formatSubjectProfessorsPhrase(discipline.name)} à ${cityName}`;
}

export function buildSubjectCityDescription(discipline: DisciplineConfig, cityName: string): string {
  return (
    `Trouvez un professeur ${formatSubjectProfessorsPhrase(discipline.name)} à ${cityName} ou en ligne avec Pratiqo. ` +
    `Comparez les profils, les formats de cours et contactez un professeur local.`
  );
}

export function buildCityHubTitle(cityName: string, region: string): string {
  return `Tuteurs et professeurs privés à ${cityName}, ${region} | Pratiqo`;
}

export function buildCityHubH1(cityName: string): string {
  return `Tuteurs et professeurs privés à ${cityName}`;
}

export function buildCityHubDescription(cityName: string): string {
  return (
    `Découvrez des professeurs et tuteurs à ${cityName} sur Pratiqo. ` +
    `Comparez les profils par matière, consultez les formats de cours et contactez un professeur local ou en ligne.`
  );
}

function buildSubjectCityLinks(
  city: QcCity,
  teachers: RawDiscoveryTeacher[],
): SubjectCityLink[] {
  const links: SubjectCityLink[] = [];
  for (const discipline of DISCIPLINES) {
    const { ranked } = rankTeachersForCity(teachers, city, { discipline });
    if (!hasLocalDiscoverySupply(ranked, city)) continue;
    links.push({
      disciplineSlug: discipline.slug,
      href: buildSubjectCityPath(discipline.slug, city.slug),
      label: `Professeurs ${formatSubjectProfessorsPhrase(discipline.name)} à ${city.name}`,
    });
  }
  return links;
}

export function teacherHasLocalDiscoverySupply(row: RawDiscoveryTeacher, city: QcCity): boolean {
  return hasDeclaredLocalSupply(row, city);
}

export function hasLocalDiscoverySupply(entries: RankedTeacher[], city: QcCity): boolean {
  return entries.some(({ row }) => teacherHasLocalDiscoverySupply(row, city));
}

function assembleBundle(input: {
  pageType: LocalDiscoveryPageType;
  city: QcCity;
  discipline: DisciplineConfig | null;
  ranked: RankedTeacher[];
  isNearby: boolean;
  allTeachers: RawDiscoveryTeacher[];
}): LocalTeacherDiscoveryPageBundle {
  const { pageType, city, discipline, ranked, isNearby, allTeachers } = input;
  const teachers = ranked.map((entry) => ({
    ...toDiscoveryCard(entry),
    isLocalSupply: teacherHasLocalDiscoverySupply(entry.row, city),
  }));
  const localTeacherCount = allTeachers.filter((row) =>
    (!discipline || teacherMatchesDiscipline(row, discipline)) && teacherHasLocalDiscoverySupply(row, city),
  ).length;
  const noindexReasons: LocalDiscoveryNoindexReason[] = [];
  if (teachers.length === 0) noindexReasons.push("no_eligible_teachers");
  if (localTeacherCount === 0) noindexReasons.push("no_local_teachers");

  const canonicalPath =
    pageType === "city_hub"
      ? buildCityHubPath(city.slug)
      : buildSubjectCityPath(discipline!.slug, city.slug);

  const title =
    pageType === "city_hub"
      ? buildCityHubTitle(city.name, city.region)
      : buildSubjectCityTitle(discipline!, city.name);

  const h1 =
    pageType === "city_hub" ? buildCityHubH1(city.name) : buildSubjectCityH1(discipline!, city.name);

  const description =
    pageType === "city_hub"
      ? buildCityHubDescription(city.name)
      : buildSubjectCityDescription(discipline!, city.name);

  const heroDescription = localTeacherCount > 0
    ? `Consultez les profils proposant des cours à ${city.name}. Comparez leurs matières, approches et tarifs; les créneaux sont à vérifier sur chaque profil.`
    : `Aucun profil public ne propose actuellement cette offre locale à ${city.name}. Les autres options sont présentées séparément, sans garantie de créneau.`;

  return {
    pageType,
    indexable: noindexReasons.length === 0,
    noindexReasons,
    city,
    // Generic discipline FAQs can make unsupported local price/specialty claims.
    discipline: discipline ? { slug: discipline.slug, name: discipline.name, faq: [] } : null,
    canonicalPath,
    canonicalUrl: `${SITE_URL}${canonicalPath}`,
    title,
    description,
    h1,
    heroDescription,
    teachers,
    localTeacherCount,
    isNearby,
    mapCenter: { lat: city.lat, lng: city.lng, zoom: city.defaultZoom ?? 12 },
    subjectCityLinks: pageType === "city_hub" ? buildSubjectCityLinks(city, allTeachers) : [],
    relatedResourcesPath: discipline ? "/ressources" : null,
    broadSubjectPath: discipline ? (getSubjectLandingPageBySlug(discipline.slug)
      ? `/cours/${discipline.slug}` : `/trouver-un-prof?q=${encodeURIComponent(discipline.name)}`) : null,
    cityHubPath: buildCityHubPath(city.slug),
  };
}

export async function resolveCityHubDiscoveryPage(
  citySlug: string,
  loadTeachers = loadDiscoveryTeachers,
): Promise<LocalTeacherDiscoveryPageBundle | null> {
  const city = findCityBySlug(citySlug);
  if (!city) return null;

  const allTeachers = (await loadTeachers()).filter(isTeacherPublicProfileIndexable);
  const { ranked, isNearby } = rankTeachersForCity(allTeachers, city, {
    includeOnlineWithLocal: isPriorityLocalDiscoveryPage(`/tuteurs/${city.slug}`),
  });
  return assembleBundle({
    pageType: "city_hub",
    city,
    discipline: null,
    ranked,
    isNearby,
    allTeachers,
  });
}

export async function resolveSubjectCityDiscoveryPage(
  disciplineSlug: string,
  citySlug: string,
  loadTeachers = loadDiscoveryTeachers,
): Promise<LocalTeacherDiscoveryPageBundle | null> {
  const city = findCityBySlug(citySlug);
  const discipline = findDisciplineBySlug(disciplineSlug);
  if (!city || !discipline) return null;

  const allTeachers = (await loadTeachers()).filter(isTeacherPublicProfileIndexable);
  const { ranked, isNearby } = rankTeachersForCity(allTeachers, city, {
    discipline,
    includeOnlineWithLocal: isPriorityLocalDiscoveryPage(`/cours/${discipline.slug}/${city.slug}`),
  });
  return assembleBundle({
    pageType: "subject_city",
    city,
    discipline,
    ranked,
    isNearby,
    allTeachers,
  });
}

async function loadDiscoveryTeachers() {
  try {
    return await fetchIndexableDiscoveryTeachers();
  } catch (error) {
    console.error("[seo:local-discovery] failed to load public supply");
    throw error;
  }
}

export type LocalDiscoverySitemapEntry = {
  path: string;
  lastModified?: Date;
};

function latestTeacherLastModified(entries: RankedTeacher[]): Date | undefined {
  const latestTimestamp = entries.reduce<number | null>((latest, entry) => {
    const sourceDate = entry.row.public_profile_last_indexable_at;
    if (!sourceDate) return latest;
    const timestamp = Date.parse(sourceDate);
    if (!Number.isFinite(timestamp)) return latest;
    return latest === null || timestamp > latest ? timestamp : latest;
  }, null);
  return latestTimestamp === null ? undefined : new Date(latestTimestamp);
}

export async function fetchLocalDiscoverySitemapEntries(): Promise<LocalDiscoverySitemapEntry[]> {
  const teachers = await fetchIndexableDiscoveryTeachers();
  return buildLocalDiscoverySitemapEntries(teachers);
}

export function buildLocalDiscoverySitemapEntries(teachers: RawDiscoveryTeacher[]): LocalDiscoverySitemapEntry[] {
  teachers = teachers.filter(isTeacherPublicProfileIndexable);
  const entries: LocalDiscoverySitemapEntry[] = [];

  for (const city of QC_CITIES) {
    const hubRank = rankTeachersForCity(teachers, city);
    if (hasLocalDiscoverySupply(hubRank.ranked, city)) {
      const lastModified = latestTeacherLastModified(hubRank.ranked);
      entries.push({ path: buildCityHubPath(city.slug), ...(lastModified ? { lastModified } : {}) });
    }
    for (const discipline of DISCIPLINES) {
      const subjectRank = rankTeachersForCity(teachers, city, { discipline });
      if (hasLocalDiscoverySupply(subjectRank.ranked, city)) {
        const lastModified = latestTeacherLastModified(subjectRank.ranked);
        entries.push({
          path: buildSubjectCityPath(discipline.slug, city.slug),
          ...(lastModified ? { lastModified } : {}),
        });
      }
    }
  }

  return entries;
}

export function buildLocalDiscoveryBreadcrumbItems(bundle: LocalTeacherDiscoveryPageBundle): Array<{
  name: string;
  href: string;
}> {
  if (bundle.pageType === "city_hub") {
    return [
      { name: "Accueil", href: "/" },
      { name: "Tuteurs", href: "/trouver-un-prof" },
      { name: bundle.city.name, href: bundle.canonicalPath },
    ];
  }
  return [
    { name: "Accueil", href: "/" },
    { name: bundle.discipline!.name, href: bundle.broadSubjectPath! },
    { name: bundle.city.name, href: bundle.canonicalPath },
  ];
}

export function buildLocalDiscoveryCollectionJsonLd(bundle: LocalTeacherDiscoveryPageBundle): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: bundle.h1,
    description: bundle.description,
    url: bundle.canonicalUrl,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: bundle.teachers.length,
      itemListElement: bundle.teachers.map((teacher, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Person",
          name: teacher.displayName,
          description: teacher.isLocalSupply
            ? `Professeurs proposant des cours à ${bundle.city.name}`
            : teacher.isOnlineFallback ? "D'autres options en ligne" : "Dans une autre ville",
          jobTitle: teacher.discipline ? `Professeur de ${teacher.discipline}` : "Professeur",
          url: `${SITE_URL}${teacher.profilePath}`,
        },
      })),
    },
  };
}

/** Teachers safe for map markers — approximate coords only, never exact address. */
export function discoveryCardsToMapTeachers(cards: LocalTeacherDiscoveryCard[]): Array<{
  id: string;
  name: string;
  discipline: string;
  category: string;
  rating: number;
  reviews: number;
  pricePerLesson: number;
  imageUrl: string | null;
  teachingMode: string;
  location: { lat: number; lng: number };
  profilePath: string;
}> {
  return cards
    .filter((c) => c.mapLat !== null && c.mapLng !== null)
    .map((c) => ({
      id: c.id,
      name: c.displayName,
      discipline: c.discipline,
      category: c.category,
      rating: c.rating,
      reviews: c.reviewCount,
      pricePerLesson: c.pricePerLesson ?? 0,
      imageUrl: c.imageUrl,
      teachingMode: c.teachingMode,
      location: { lat: c.mapLat!, lng: c.mapLng! },
      profilePath: c.profilePath,
    }));
}
