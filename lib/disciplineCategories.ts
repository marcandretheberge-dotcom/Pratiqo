import type { Discipline } from "@/types";

/**
 * Canonical list of top-level discipline categories used by filters and
 * registration forms. This is not demo data — it mirrors the union in
 * `types.ts` (`Discipline`) and must stay in sync with it.
 */
export const CATEGORIES: Discipline[] = [
  "Musique",
  "Arts Martiaux",
  "Langues",
  "Danse",
  "Sports",
  "Scolaire",
];
