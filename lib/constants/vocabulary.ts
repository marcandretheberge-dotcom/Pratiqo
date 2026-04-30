/**
 * Semantic Vocabulary Engine
 *
 * Maps teacher category → locale-aware terms for titles, CTAs, and JSON-LD.
 * Supports FR (Québec), EN (Canada/USA), ES (Mexico / LatAm).
 * Country-specific overrides: UY (Uruguay) — "Maestro" for music, "Profesor
 * Particular" for other categories. Title always includes "en [Ciudad]".
 *
 * Usage:
 *   getTeacherTerm("Musique", "es")          → "Maestro"
 *   getTeacherTerm("Langues", "es", "UY")   → "Profesor Particular"
 *   getFindCta("Langues", "fr")           → "Trouver un professeur de langues"
 *   getSchemaEntityType("Musique")           → "MusicSchool"
 */

import type { Locale } from "../i18n/types";

// ── Category groups ───────────────────────────────────────────────────────────

export type CategoryGroup =
  | "music_arts"
  | "languages"
  | "academics"
  | "sports_wellness"
  | "other";

/** Maps a DB `teachers.category` value → vocabulary group. */
const CATEGORY_TO_GROUP: Record<string, CategoryGroup> = {
  Musique: "music_arts",
  Danse: "music_arts",
  Langues: "languages",
  Scolaire: "academics",
  "Arts Martiaux": "sports_wellness",
  Sports: "sports_wellness",
};

export function categoryToGroup(category: string): CategoryGroup {
  return CATEGORY_TO_GROUP[category] ?? "other";
}

// ── Teacher / instructor term ─────────────────────────────────────────────────

/**
 * The word used for the practitioner role.
 * Music/Arts  → Professeur / Maestro / Teacher
 * Languages   → Professeur / Profesor / Teacher
 * Academics   → Tuteur / Tutor / Tutor
 * Sports      → Entraîneur / Entrenador / Coach
 */
const TEACHER_TERM: Record<CategoryGroup, Record<Locale, string>> = {
  music_arts:     { fr: "Professeur",  en: "Teacher",    es: "Maestro"     },
  languages:      { fr: "Professeur",  en: "Teacher",    es: "Profesor"    },
  academics:      { fr: "Tuteur",      en: "Tutor",      es: "Tutor"       },
  sports_wellness:{ fr: "Entraîneur",  en: "Coach",      es: "Entrenador"  },
  other:          { fr: "Expert",      en: "Expert",     es: "Experto"     },
};

/**
 * Uruguay overrides (ISO 3166-1 "UY"):
 *  - Music/Arts  → "Maestro" (title of respect in UY music culture)
 *  - All others  → "Profesor Particular" (standard private-lesson title)
 */
const UY_TEACHER_TERM: Partial<Record<CategoryGroup, string>> = {
  music_arts:     "Maestro",
  languages:      "Profesor Particular",
  academics:      "Profesor Particular",
  sports_wellness:"Instructor",
  other:          "Profesor Particular",
};

export function getTeacherTerm(
  category: string,
  locale: Locale = "fr",
  countryCode?: string,
): string {
  if (countryCode === "UY") {
    const group = categoryToGroup(category);
    return UY_TEACHER_TERM[group] ?? "Profesor Particular";
  }
  return TEACHER_TERM[categoryToGroup(category)][locale];
}

// ── "Find a …" CTA ────────────────────────────────────────────────────────────

const FIND_CTA: Record<CategoryGroup, Record<Locale, string>> = {
  music_arts:     { fr: "Trouver un professeur",   en: "Find a Teacher",      es: "Encontrar un maestro"    },
  languages:      { fr: "Trouver un professeur",   en: "Find a Teacher",      es: "Encontrar un profesor"   },
  academics:      { fr: "Trouver un tuteur",       en: "Find a Tutor",        es: "Encontrar un tutor"      },
  sports_wellness:{ fr: "Trouver un entraîneur",   en: "Find a Coach",        es: "Encontrar un entrenador" },
  other:          { fr: "Trouver un expert",       en: "Find an Expert",      es: "Encontrar un experto"    },
};

export function getFindCta(category: string, locale: Locale = "fr"): string {
  return FIND_CTA[categoryToGroup(category)][locale];
}

// ── "Learn …" phrasing ────────────────────────────────────────────────────────

const LEARN_PHRASE: Record<CategoryGroup, Record<Locale, string>> = {
  music_arts:     { fr: "Apprendre la musique",        en: "Learn Music",           es: "Aprender música"         },
  languages:      { fr: "Apprendre une langue",        en: "Learn a Language",      es: "Aprender un idioma"      },
  academics:      { fr: "Progresser en cours",         en: "Improve Academically",  es: "Mejorar en la escuela"   },
  sports_wellness:{ fr: "Maîtriser un sport ou art",   en: "Master a Sport or Art", es: "Dominar un deporte"      },
  other:          { fr: "Apprendre avec un expert",    en: "Learn with an Expert",  es: "Aprender con un experto" },
};

export function getLearnPhrase(category: string, locale: Locale = "fr"): string {
  return LEARN_PHRASE[categoryToGroup(category)][locale];
}

// ── SEO title template ────────────────────────────────────────────────────────

/**
 * Builds the SEO page title for a teacher profile.
 *
 * Default (FR):  "Sophie – Professeure de Piano | Pratiqo"
 * ES / MX:       "Sophie – Maestro de Piano en Ciudad de México | Pratiqo"
 * UY override:   "Sophie – Profesor de Piano en Montevideo | Pratiqo"
 *                (always includes city; uses country-specific term)
 */
export function buildTeacherSeoTitle(
  teacherName: string,
  discipline: string,
  category: string,
  locale: Locale = "fr",
  city?: string,
  countryCode?: string,
): string {
  const term = getTeacherTerm(category, locale, countryCode);

  // Uruguay: always include city, use "Profesor de [Materia] en [Ciudad]" format
  if (countryCode === "UY") {
    const location = city ? ` en ${city}` : "";
    return `${teacherName} – ${term} de ${discipline}${location} | Pratiqo`;
  }

  if (locale === "es") {
    const location = city ? ` en ${city}` : "";
    return `${teacherName} – ${term} de ${discipline}${location} | Pratiqo`;
  }
  if (locale === "en") {
    const location = city ? ` in ${city}` : "";
    return `${teacherName} – ${term} of ${discipline}${location} | Pratiqo`;
  }
  // fr-CA default
  return `${teacherName} – ${term} de ${discipline} | Pratiqo`;
}

/**
 * Builds the SEO meta description for a teacher profile.
 */
export function buildTeacherSeoDescription(
  teacherName: string,
  discipline: string,
  category: string,
  bio: string,
  locale: Locale = "fr",
  countryCode?: string,
): string {
  if (bio?.length > 30) {
    return `${bio.slice(0, 155).trimEnd()}${bio.length > 155 ? "…" : ""}`;
  }

  const term = getTeacherTerm(category, locale, countryCode).toLowerCase();

  if (countryCode === "UY") {
    return `Aprende ${discipline} con ${teacherName}, ${term} verificado en Pratiqo Uruguay. Reservá tu primera clase.`;
  }
  if (locale === "es") {
    return `Aprende ${discipline} con ${teacherName}, ${term} verificado en Pratiqo. Reserva tu primera clase ahora.`;
  }
  if (locale === "en") {
    return `Learn ${discipline} with ${teacherName}, a verified ${term} on Pratiqo. Book your first lesson today.`;
  }
  return `Apprenez le ${discipline} avec ${teacherName}, ${term} vérifié sur Pratiqo. Réservez votre premier cours dès maintenant.`;
}

// ── Schema.org entity type (for JSON-LD) ─────────────────────────────────────

/**
 * Returns the most specific Schema.org `@type` that describes the learning
 * entity behind this category, for use in `worksFor` or page-level JSON-LD.
 *
 * MusicSchool   → https://schema.org/MusicSchool  (sub-type of LocalBusiness)
 * LanguageCourse is not a standard Schema.org type — use "School" instead.
 * EducationalOrganization covers academics.
 */
export const SCHEMA_ENTITY_TYPE: Record<CategoryGroup, string> = {
  music_arts:     "MusicSchool",
  languages:      "School",
  academics:      "EducationalOrganization",
  sports_wellness:"SportsActivityLocation",
  other:          "EducationalOrganization",
};

export function getSchemaEntityType(category: string): string {
  return SCHEMA_ENTITY_TYPE[categoryToGroup(category)];
}

// ── jobTitle for Schema.org Person ───────────────────────────────────────────

export function buildJobTitle(
  discipline: string,
  category: string,
  locale: Locale = "fr",
  countryCode?: string,
): string {
  const term = getTeacherTerm(category, locale, countryCode);
  if (locale === "en") return `${term} of ${discipline}`;
  return `${term} de ${discipline}`;
}
