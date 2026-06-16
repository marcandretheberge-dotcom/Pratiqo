import { publicFirstNameWithInitial } from "@/lib/identity/displayName";
import { SITE_URL } from "@/lib/seo/site";
import { sanitizePublicTeacherBio } from "@/lib/teacherProfile/sanitizePublicBio";
import type { Teacher } from "@/types";

/** Version string recorded when a teacher grants SEO consent. */
export const TEACHER_PUBLIC_SEO_CONSENT_VERSION = "teacher-public-seo-v1" as const;

const MIN_PUBLIC_BIO_LENGTH = 40;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TeacherPublicSeoFields = {
  id: string;
  user_id?: string | null;
  name?: string | null;
  bio?: string | null;
  discipline?: string | null;
  city?: string | null;
  region?: string | null;
  country_code?: string | null;
  is_public?: boolean | null;
  deactivated_at?: string | null;
  deleted_at?: string | null;
  is_demo?: boolean | null;
  identity_status?: string | null;
  public_profile_enabled?: boolean | null;
  search_indexing_consent?: boolean | null;
  public_profile_slug?: string | null;
  teacher_onboarding_complete?: boolean | null;
  profile_is_active?: boolean | null;
  profile_deactivated_at?: string | null;
  profile_deleted_at?: string | null;
  profile_anonymized_at?: string | null;
  subject_count?: number | null;
};

function slugifySegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function publicTeacherFirstName(name: string | null | undefined): string {
  if (typeof name !== "string") return "";
  const normalized = name.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.split(" ")[0] ?? "";
}

export function buildTeacherPublicProfileSlugParts(input: {
  name: string;
  mainSubject: string;
  city: string;
}): { first: string; lastInitial: string; subject: string; city: string } {
  const parts = input.name.replace(/\s+/g, " ").trim().split(" ");
  const first = slugifySegment(parts[0] ?? "professeur");
  const secondToken = parts.length > 1 ? parts[1] : "";
  const lastInitial = secondToken ? slugifySegment(Array.from(secondToken)[0] ?? "") : "";
  const subject = slugifySegment(input.mainSubject) || "cours";
  const city = slugifySegment(input.city) || "quebec";
  return { first, lastInitial, subject, city };
}

export function buildTeacherPublicProfileSlug(input: {
  name: string;
  mainSubject: string;
  city: string;
}): string {
  const { first, lastInitial, subject, city } = buildTeacherPublicProfileSlugParts(input);
  const segments = [first, lastInitial, subject, city].filter(Boolean);
  return segments.join("-");
}

export function buildTeacherPublicProfilePath(slug: string): string {
  return `/professeurs/${encodeURIComponent(slug)}`;
}

export function buildTeacherPublicProfileCanonicalUrl(slug: string): string {
  return `${SITE_URL}${buildTeacherPublicProfilePath(slug)}`;
}

export function isTeacherMarketplaceVisibleRow(row: TeacherPublicSeoFields): boolean {
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

export function teacherHasPublicCity(row: Pick<TeacherPublicSeoFields, "city" | "region">): boolean {
  const city = typeof row.city === "string" ? row.city.trim() : "";
  const region = typeof row.region === "string" ? row.region.trim() : "";
  return city.length > 0 || region.length > 0;
}

export function teacherHasSufficientPublicContent(
  row: Pick<TeacherPublicSeoFields, "name" | "bio" | "discipline">,
): boolean {
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const bio = typeof row.bio === "string" ? row.bio.trim() : "";
  const discipline = typeof row.discipline === "string" ? row.discipline.trim() : "";
  return name.length >= 2 && bio.length >= MIN_PUBLIC_BIO_LENGTH && discipline.length > 0;
}

export function teacherHasAtLeastOneSubject(
  row: Pick<TeacherPublicSeoFields, "discipline" | "subject_count">,
): boolean {
  const discipline = typeof row.discipline === "string" ? row.discipline.trim() : "";
  if (discipline.length > 0) return true;
  return typeof row.subject_count === "number" && row.subject_count > 0;
}

export function isTeacherPublicProfilePageVisible(row: TeacherPublicSeoFields): boolean {
  if (!isTeacherMarketplaceVisibleRow(row)) return false;
  if (row.public_profile_enabled !== true) return false;
  if (row.teacher_onboarding_complete !== true) return false;
  if (!teacherHasSufficientPublicContent(row)) return false;
  if (!teacherHasAtLeastOneSubject(row)) return false;
  if (!teacherHasPublicCity(row)) return false;
  const slug = typeof row.public_profile_slug === "string" ? row.public_profile_slug.trim() : "";
  return slug.length > 0;
}

export function isTeacherPublicProfileIndexable(row: TeacherPublicSeoFields): boolean {
  if (!isTeacherPublicProfilePageVisible(row)) return false;
  if (row.search_indexing_consent !== true) return false;
  return true;
}

export function buildTeacherPublicProfileTitle(input: {
  subject: string;
  firstName: string;
  city: string;
}): string {
  const subject = input.subject.trim() || "cours";
  const firstName = input.firstName.trim() || "professeur";
  const city = input.city.trim() || "Québec";
  return `Cours de ${subject} avec ${firstName} à ${city} | Pratiqo`;
}

export function buildTeacherPublicProfileDescription(input: {
  subject: string;
  firstName: string;
  city: string;
}): string {
  const subject = input.subject.trim() || "cours";
  const firstName = input.firstName.trim() || "professeur";
  const city = input.city.trim() || "Québec";
  return `Réservez un cours de ${subject} avec ${firstName}, professeur sur Pratiqo à ${city}. Cours en ligne ou en personne selon disponibilité, horaires flexibles et paiement sécurisé.`;
}

export function buildTeacherPublicProfileH1(input: {
  subject: string;
  firstName: string;
  city: string;
}): string {
  const subject = input.subject.trim() || "cours";
  const firstName = input.firstName.trim() || "professeur";
  const city = input.city.trim() || "Québec";
  return `Cours de ${subject} avec ${firstName} à ${city}`;
}

export function buildTeacherPublicProfileJsonLd(input: {
  teacher: Teacher;
  canonicalUrl: string;
  subjects: string[];
}): Record<string, unknown> {
  const { teacher, canonicalUrl, subjects } = input;
  const locale = teacher.countryCode === "UY" ? "es" : "fr";
  const sanitizedBio = sanitizePublicTeacherBio(teacher.bio, locale).content;
  const locality =
    teacher.location?.neighborhood ?? teacher.city ?? teacher.region ?? "Québec";
  const displayName = publicFirstNameWithInitial(teacher.name);
  const subjectLabel = teacher.discipline?.trim() || subjects[0] || "cours";
  const jobTitle =
    locale === "fr"
      ? `Professeure de ${subjectLabel}`
      : `Profesor de ${subjectLabel}`;

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: displayName,
      jobTitle,
      ...(sanitizedBio ? { description: sanitizedBio.slice(0, 500) } : {}),
      ...(teacher.imageUrl ? { image: teacher.imageUrl } : {}),
      knowsAbout: subjects.filter(Boolean),
      address: {
        "@type": "PostalAddress",
        addressLocality: locality,
        addressRegion: teacher.region ?? "QC",
        addressCountry: teacher.countryCode ?? "CA",
      },
      url: canonicalUrl,
    },
    url: canonicalUrl,
  };
}

export function teacherPublicProfileRobots(indexable: boolean): {
  index: boolean;
  follow: boolean;
} {
  return indexable ? { index: true, follow: true } : { index: false, follow: false };
}

/** Returns true when a string looks like an exact street address (must never render publicly). */
export function containsExactAddressLeak(value: string): boolean {
  const normalized = value.toLowerCase();
  if (/\b\d{1,5}\s+[a-zàâäéèêëïîôùûüç-]+\s+(rue|avenue|av\.|boulevard|bd|chemin|ch\.|street|st\.|road|rd)\b/i.test(
    normalized,
  )) {
    return true;
  }
  if (/\b[a-z]{2}\d[a-z]\s?\d[a-z]\d\b/i.test(value)) {
    return true;
  }
  return false;
}
