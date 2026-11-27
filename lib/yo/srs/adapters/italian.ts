/**
 * Italian SRS adapter — the first language config (spec §2.3, §2.7 step 1).
 *
 * A thin wrapper over the existing Italian catalog: the compact catalog
 * (`lib/yo/italian/course/courseData.ts`) is the sole authority for which
 * activity ids exist, exactly as `courseProgress.ts`'s catalog index
 * already enforces. Item ids stay the catalog's own activity ids (the
 * localStorage engine's keys), so server state and local state describe
 * the same items one-to-one — that identity is what makes the one-time
 * import (spec §2.4) a pure move, not a translation.
 */

import type {
  SrsItemIdentity,
  YoLanguageConfig,
} from "@/lib/yo/config/languageConfig";
import type { CourseCatalog } from "@/lib/yo/italian/course/courseTypes";
import { REVIEW_INTERVAL_DAYS } from "@/lib/yo/srs/intervals";

export const ITALIAN_LANGUAGE = "it";
export const ITALIAN_SRS_COURSE_ID = "italian-course-a1";

const text = (fr: string, en: string, es: string) => ({ fr, en, es });

function asCatalog(catalog: unknown): CourseCatalog | null {
  if (catalog === null || typeof catalog !== "object") return null;
  const candidate = catalog as CourseCatalog;
  return Array.isArray(candidate.units) ? candidate : null;
}

function itemsForUnits(units: CourseCatalog["units"]): SrsItemIdentity[] {
  const items: SrsItemIdentity[] = [];
  const seen = new Set<string>();
  for (const unit of units) {
    for (const lesson of unit.lessons) {
      for (const activityId of lesson.activityIds) {
        if (seen.has(activityId)) continue;
        seen.add(activityId);
        items.push({
          id: activityId,
          language: ITALIAN_LANGUAGE,
          courseId: ITALIAN_SRS_COURSE_ID,
          unitId: unit.id,
          lessonId: lesson.id,
          activityId,
          kind: "practice",
          skillTags: [],
          difficultyTags: [],
        });
      }
    }
  }
  return items;
}

/** Only the active learning plan; retained editions are not additional tasks. */
export function italianCatalogAdapter(catalog: unknown): SrsItemIdentity[] {
  const parsed = asCatalog(catalog);
  return parsed ? itemsForUnits(parsed.units) : [];
}

/** Activity ids in the active learning plan. */
export function italianCatalogItemIds(catalog: unknown): Set<string> {
  return new Set(italianCatalogAdapter(catalog).map((item) => item.id));
}

/** Every exact identity accepted for review, including retained authored editions.
 * This validation set does not add unseen themes to the active learning plan.
 */
export function italianReviewableItemIds(catalog: unknown): Set<string> {
  const parsed = asCatalog(catalog);
  if (!parsed) return new Set();
  const units = [...parsed.units, ...(Array.isArray(parsed.retainedUnits) ? parsed.retainedUnits : [])];
  return new Set(itemsForUnits(units).map((item) => item.id));
}

export const italianLanguageConfig: YoLanguageConfig = {
  language: ITALIAN_LANGUAGE,
  displayName: text("Italien", "Italian", "Italiano"),
  asrLocale: "it-IT",
  // The Italian course that exists today is a full A1 curriculum.
  cefrCeiling: "A1",
  catalogAdapter: italianCatalogAdapter,
  errorLabels: {
    vocabulary: text("Vocabulaire", "Vocabulary", "Vocabulario"),
    grammar: text("Grammaire", "Grammar", "Gramática"),
    listening: text("Écoute", "Listening", "Comprensión auditiva"),
    "word-order": text("Ordre des mots", "Word order", "Orden de las palabras"),
    pronunciation: text("Prononciation", "Pronunciation", "Pronunciación"),
    spelling: text("Orthographe", "Spelling", "Ortografía"),
  },
  // Engine B is not built yet; the kill switches stay off (spec §1.2).
  speechEnabled: false,
  conversationEnabled: false,
  conversationScenarios: [],
  reviewIntervalsDays: REVIEW_INTERVAL_DAYS,
};
