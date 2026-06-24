import {
  getResourceArticleBySlug,
  type ResourceArticleMeta,
} from "@/lib/seo/resourceArticles";
import { SUBJECT_LANDING_PAGES } from "@/lib/seo/subjectLandingPages";

export type ResourceGuideGroupId = "choose_teacher" | "learn_confidently" | "popular_disciplines";

/** Curated hub groups for /ressources (order preserved). */
export const RESOURCE_GUIDE_GROUPS: readonly {
  id: ResourceGuideGroupId;
  slugOrder: readonly string[];
}[] = [
  {
    id: "choose_teacher",
    slugOrder: [
      "comment-choisir-professeur-prive-quebec",
      "professeur-prive-local-vs-plateforme-internationale",
    ],
  },
  {
    id: "learn_confidently",
    slugOrder: ["choisir-coach-entraineur-prive", "choisir-cours-arts-martiaux"],
  },
  {
    id: "popular_disciplines",
    slugOrder: ["cours-cuisine-prive", "choisir-cours-danse", "choisir-cours-photographie"],
  },
];

/** Lifestyle discipline landing slug → matching evergreen guide. */
export const DISCIPLINE_RESOURCE_GUIDE_SLUG: Record<string, string> = {
  cuisine: "cours-cuisine-prive",
  "coach-entraineur": "choisir-coach-entraineur-prive",
  danse: "choisir-cours-danse",
  "arts-martiaux": "choisir-cours-arts-martiaux",
  photographie: "choisir-cours-photographie",
};

export function getResourceArticleForDisciplineSlug(
  disciplineSlug: string,
): ResourceArticleMeta | undefined {
  const resourceSlug = DISCIPLINE_RESOURCE_GUIDE_SLUG[disciplineSlug];
  if (!resourceSlug) return undefined;
  return getResourceArticleBySlug(resourceSlug);
}

function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getResourceArticleForDisciplineLabel(
  discipline?: string | null,
): ResourceArticleMeta | undefined {
  if (!discipline?.trim()) return undefined;
  const norm = normalizeLabel(discipline);
  const subject = SUBJECT_LANDING_PAGES.find(
    (p) =>
      normalizeLabel(p.content.fr.label) === norm ||
      normalizeLabel(p.searchQuery) === norm ||
      p.slug.replace(/-/g, " ") === norm,
  );
  if (!subject) return undefined;
  return getResourceArticleForDisciplineSlug(subject.slug);
}
