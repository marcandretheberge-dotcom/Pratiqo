import { QC_CITIES } from "@/lib/constants/cities";
import { DISCIPLINES } from "@/lib/seo/disciplines";
import { buildSubjectCityPath } from "@/lib/seo/localTeacherDiscoveryPages";
import { SUBJECT_LANDING_PAGES } from "@/lib/seo/subjectLandingPages";
import { resolveTeacherSubjectId } from "@/lib/taxonomy/teacherSubjectNormalization";

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
      (resolveTeacherSubjectId(d.dbDiscipline) != null && resolveTeacherSubjectId(d.dbDiscipline) === resolveTeacherSubjectId(discipline)),
  );
  if (disciplineConfig) {
    if (citySlug) return buildSubjectCityPath(disciplineConfig.slug, citySlug);
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

export function resolveTeacherLocalDiscoveryLinkLabel(input: {
  discipline?: string | null;
  city?: string | null;
  region?: string | null;
  locale?: "fr" | "en" | "es";
}): string {
  const discipline = input.discipline?.trim() ?? "";
  const locale = input.locale ?? "fr";
  const href = resolveTeacherDisciplineHubHref(input);
  const citySlug = matchTeacherCitySlug(input.city) ?? matchTeacherCitySlug(input.region);
  const cityName = input.city?.trim() || input.region?.trim() || "";

  if (citySlug && discipline && href.startsWith("/cours/") && href.split("/").length >= 4) {
    if (locale === "fr") return `Voir les professeurs de ${discipline.toLowerCase()} à ${cityName}`;
    if (locale === "es") return `Ver profesores de ${discipline.toLowerCase()} en ${cityName}`;
    return `See ${discipline.toLowerCase()} teachers in ${cityName}`;
  }

  if (locale === "fr") return `Voir les cours de ${discipline || "cette discipline"} sur Pratiqo`;
  if (locale === "es") return `Ver clases de ${discipline || "esta disciplina"} en Pratiqo`;
  return `Browse ${discipline || "this subject"} lessons on Pratiqo`;
}
