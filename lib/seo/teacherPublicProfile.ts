import { publicFirstNameWithInitial } from "@/lib/identity/displayName";
import type { Locale } from "@/lib/i18n/types";
import { SITE_URL } from "@/lib/seo/site";
import {
  formatTeacherSeoDescription,
  formatTeacherSeoH1,
  formatTeacherSeoJobTitle,
  formatTeacherSeoTitle,
  localizeTeacherSeoSubject,
} from "@/lib/seo/teacherPublicProfileLabels";
import { sanitizePublicTeacherBio } from "@/lib/teacherProfile/sanitizePublicBio";
import {
  isTeacherMarketplaceVisibleRow,
  type TeacherMarketplaceVisibilityRow,
} from "@/lib/teachers/marketplaceVisibility";
import type { Teacher } from "@/types";

/** Version string recorded when a teacher grants SEO consent. */
export const TEACHER_PUBLIC_SEO_CONSENT_VERSION = "teacher-public-seo-v1" as const;

const MIN_PUBLIC_BIO_LENGTH = 40;

export type TeacherPublicSeoFields = TeacherMarketplaceVisibilityRow & {
  name?: string | null;
  bio?: string | null;
  discipline?: string | null;
  city?: string | null;
  region?: string | null;
  country_code?: string | null;
  public_profile_enabled?: boolean | null;
  search_indexing_consent?: boolean | null;
  public_profile_slug?: string | null;
  /** Set only by admin SEO publish (service-role); pins indexability + sitemap. */
  public_profile_last_indexable_at?: string | null;
  teacher_onboarding_complete?: boolean | null;
  subject_count?: number | null;
  teaching_mode?: string | null;
};

export { isTeacherMarketplaceVisibleRow };

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

export function teacherHasPublicCity(row: Pick<TeacherPublicSeoFields, "city" | "region">): boolean {
  const city = typeof row.city === "string" ? row.city.trim() : "";
  const region = typeof row.region === "string" ? row.region.trim() : "";
  return city.length > 0 || region.length > 0;
}

function normalizeTeachingMode(mode: string | null | undefined): string {
  return typeof mode === "string" ? mode.trim().toLowerCase() : "";
}

/** Teaching modes accepted for public teacher SEO readiness, metadata, and blockers. */
export function isTeacherSeoAcceptedTeachingMode(mode: string | null | undefined): boolean {
  const normalized = normalizeTeachingMode(mode);
  return (
    normalized === "online" ||
    normalized === "both" ||
    normalized === "in_person" ||
    normalized === "in-person" ||
    normalized === "all"
  );
}

/** City/region present, or an explicit online teaching format when no public city is set. */
export function teacherHasPublicLocationOrTeachingFormat(
  row: Pick<TeacherPublicSeoFields, "city" | "region" | "teaching_mode">,
): boolean {
  if (teacherHasPublicCity(row)) return true;
  const mode = normalizeTeachingMode(row.teaching_mode);
  return mode === "online" || mode === "both" || mode === "all";
}

/** Public SEO location label — never invents a city; online-only teachers get a locale label. */
export function resolveTeacherSeoCityLabel(
  locale: Locale,
  input: {
    city?: string | null;
    region?: string | null;
    neighborhood?: string | null;
    teachingMode?: string | null;
  },
): string | null {
  const locality =
    (typeof input.neighborhood === "string" && input.neighborhood.trim()) ||
    (typeof input.city === "string" && input.city.trim()) ||
    (typeof input.region === "string" && input.region.trim()) ||
    "";
  if (locality) return locality;

  const mode = normalizeTeachingMode(input.teachingMode);
  if (mode === "online" || mode === "both" || mode === "all") {
    if (locale === "fr") return "en ligne";
    if (locale === "es") return "en línea";
    return "online";
  }
  return null;
}

export function isTeacherSeoLocationOnlineLabel(label: string | null, locale: Locale): boolean {
  if (!label) return false;
  const onlineLabels = new Set(["en ligne", "en línea", "online"]);
  return onlineLabels.has(label);
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
  if (!teacherHasPublicLocationOrTeachingFormat(row)) return false;
  const slug = typeof row.public_profile_slug === "string" ? row.public_profile_slug.trim() : "";
  return slug.length > 0;
}

/** Admin SEO publication marker — only service-role routes may set this column (migration 082). */
export function isTeacherAdminSeoPublished(
  row: Pick<TeacherPublicSeoFields, "public_profile_last_indexable_at">,
): boolean {
  const at = row.public_profile_last_indexable_at;
  return typeof at === "string" && at.trim().length > 0;
}

export function isTeacherPublicProfileIndexable(row: TeacherPublicSeoFields): boolean {
  if (!isTeacherPublicProfilePageVisible(row)) return false;
  if (row.search_indexing_consent !== true) return false;
  if (!isTeacherAdminSeoPublished(row)) return false;
  return true;
}

export function buildTeacherPublicProfileTitle(input: {
  locale: Locale;
  subject: string;
  firstName: string;
  cityLabel: string | null;
}): string | null {
  const subject = input.subject.trim();
  const firstName = input.firstName.trim();
  const cityLabel = input.cityLabel?.trim() ?? "";
  if (!subject || !firstName || !cityLabel) return null;

  return formatTeacherSeoTitle({
    locale: input.locale,
    discipline: subject,
    firstName,
    cityLabel,
    online: isTeacherSeoLocationOnlineLabel(cityLabel, input.locale),
  });
}

export function buildTeacherPublicProfileDescription(input: {
  locale: Locale;
  subject: string;
  firstName: string;
  cityLabel: string | null;
}): string | null {
  const subject = input.subject.trim();
  const firstName = input.firstName.trim();
  const cityLabel = input.cityLabel?.trim() ?? "";
  if (!subject || !firstName || !cityLabel) return null;

  return formatTeacherSeoDescription({
    locale: input.locale,
    discipline: subject,
    firstName,
    cityLabel,
    online: isTeacherSeoLocationOnlineLabel(cityLabel, input.locale),
  });
}

export function buildTeacherPublicProfileH1(input: {
  locale: Locale;
  subject: string;
  firstName: string;
  cityLabel: string | null;
}): string | null {
  const subject = input.subject.trim();
  const firstName = input.firstName.trim();
  const cityLabel = input.cityLabel?.trim() ?? "";
  if (!subject || !firstName || !cityLabel) return null;

  return formatTeacherSeoH1({
    locale: input.locale,
    discipline: subject,
    firstName,
    cityLabel,
    online: isTeacherSeoLocationOnlineLabel(cityLabel, input.locale),
  });
}

export function buildTeacherPublicProfileBreadcrumbItems(input: {
  locale: Locale;
  subject: string;
  firstName: string;
  slug: string;
}): Array<{ name: string; href: string }> {
  const hubLabel =
    input.locale === "fr"
      ? "Trouver un professeur"
      : input.locale === "es"
        ? "Encontrar un profesor"
        : "Find a teacher";
  const subject = input.subject.trim() || "Cours";
  const breadcrumbSubject = localizeTeacherSeoSubject(subject, input.locale);
  return [
    { name: input.locale === "fr" ? "Accueil" : input.locale === "es" ? "Inicio" : "Home", href: "/" },
    { name: hubLabel, href: "/trouver-un-prof" },
    { name: breadcrumbSubject, href: `/trouver-un-prof?q=${encodeURIComponent(subject)}` },
    { name: input.firstName.trim() || "Professeur", href: buildTeacherPublicProfilePath(input.slug) },
  ];
}

export function buildTeacherPublicProfileJsonLd(input: {
  teacher: Teacher;
  canonicalUrl: string;
  subjects: string[];
  locale: Locale;
  slug: string;
}): Record<string, unknown> {
  const { teacher, canonicalUrl, subjects, locale, slug } = input;
  const sanitizedBio = sanitizePublicTeacherBio(teacher.bio, locale).content;
  const cityLabel = resolveTeacherSeoCityLabel(locale, {
    city: teacher.city,
    region: teacher.region,
    neighborhood: teacher.location?.neighborhood,
    teachingMode: teacher.teachingMode,
  });
  const displayName = publicFirstNameWithInitial(teacher.name);
  const rawSubject = teacher.discipline?.trim() || subjects[0] || "";
  const firstName = publicTeacherFirstName(teacher.name);
  const jobTitle = formatTeacherSeoJobTitle(locale, rawSubject);

  const breadcrumb = buildTeacherPublicProfileBreadcrumbItems({
    locale,
    subject: rawSubject,
    firstName,
    slug,
  });

  const person: Record<string, unknown> = {
    "@type": "Person",
    name: displayName,
    jobTitle,
    ...(sanitizedBio ? { description: sanitizedBio.slice(0, 500) } : {}),
    ...(teacher.imageUrl ? { image: teacher.imageUrl } : {}),
    ...(subjects.filter(Boolean).length > 0 ? { knowsAbout: subjects.filter(Boolean) } : {}),
    url: canonicalUrl,
  };

  if (cityLabel && !isTeacherSeoLocationOnlineLabel(cityLabel, locale)) {
    person.address = {
      "@type": "PostalAddress",
      addressLocality: cityLabel,
      ...(teacher.region ? { addressRegion: teacher.region } : {}),
      addressCountry: teacher.countryCode ?? "CA",
    };
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        mainEntity: person,
        url: canonicalUrl,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumb.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: `${SITE_URL}${item.href}`,
        })),
      },
    ],
  };
}

/** Keys that must never appear in public teacher JSON-LD. */
export const TEACHER_JSON_LD_FORBIDDEN_KEYS = [
  "email",
  "telephone",
  "streetAddress",
  "identity_status",
  "diploma_url",
  "stripe",
  "payout",
  "aggregateRating",
  "reviewRating",
  "Review",
  "AggregateRating",
] as const;

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
