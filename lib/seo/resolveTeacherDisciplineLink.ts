import { QC_CITIES } from "@/lib/constants/cities";
import { DISCIPLINES } from "@/lib/seo/disciplines";
import { SUBJECT_LANDING_PAGES } from "@/lib/seo/subjectLandingPages";

function normalizeLabel(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Map a public city/region label to a QC city slug when possible (never invents). */
export function matchTeacherCitySlug(cityOrRegion?: string | null): string | null {
  if (!cityOrRegion?.trim()) return null;
  const norm = normalizeLabel(cityOrRegion);
  const bySlug = QC_CITIES.find((c) => c.slug === norm.replace(/\s+/g, "-"));
  if (bySlug) return bySlug.slug;
  const byName = QC_CITIES.find((c) => normalizeLabel(c.name) === norm);
  return byName?.slug ?? null;
}

/** Resolve a discipline label to a curated landing path (subject hub or discipline × city). */
export function resolveTeacherDisciplineHubHref(input: {
  discipline?: string | null;
  city?: string | null;
  region?: string | null;
}): string {
  const discipline = input.discipline?.trim() ?? "";
  if (!discipline) return "/trouver-un-prof";

  const norm = normalizeLabel(discipline);
  const citySlug = matchTeacherCitySlug(input.city) ?? matchTeacherCitySlug(input.region);

  const disciplineConfig = DISCIPLINES.find(
    (d) =>
      normalizeLabel(d.dbDiscipline) === norm ||
      normalizeLabel(d.name) === norm ||
      normalizeLabel(d.dbCategory) === norm,
  );
  if (disciplineConfig) {
    if (citySlug) return `/cours/${disciplineConfig.slug}/${citySlug}`;
    return `/trouver-un-prof?q=${encodeURIComponent(disciplineConfig.name)}`;
  }

  const subjectPage = SUBJECT_LANDING_PAGES.find(
    (p) =>
      normalizeLabel(p.content.fr.label) === norm ||
      normalizeLabel(p.searchQuery) === norm ||
      p.slug.replace(/-/g, " ").includes(norm),
  );
  if (subjectPage) return `/cours/${subjectPage.slug}`;

  return `/trouver-un-prof?q=${encodeURIComponent(discipline)}`;
}
