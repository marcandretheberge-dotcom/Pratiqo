/**
 * YoLanguageConfig — the one per-language config every shared engine reads
 * (spec §1.2). One shared core per engine + a per-language config; no
 * engine is ever copied per language, and no engine hard-codes a language.
 *
 * Step-1 note (Phase 0, server-side learning state): adapters currently
 * expose item IDENTITY (`SrsItemIdentity`) — the fields the SRS engine
 * consumes. The authored content fields of the full `ItemRef` (prompt,
 * correctForm, feedback) are attached by the Engine B/C content adapters
 * in later steps; the SRS engine never reads them.
 */

import type { LocaleText } from "@/lib/yo/italian/italianModuleTypes";
import type { REVIEW_INTERVAL_DAYS } from "@/lib/yo/srs/intervals";

export type { LocaleText };

/** One shared error taxonomy (spec §1.4). */
export type ErrorType =
  | "vocabulary"
  | "grammar"
  | "listening"
  | "word-order"
  | "pronunciation"
  | "spelling";

/** The universal item identity every engine speaks (spec §1.3). */
export interface ItemRef {
  /** Globally unique, stable across deploys: `<language>:<course>:<unit>:<lesson>:<activity>` */
  id: string;
  language: string;
  courseId: string;
  unitId: string;
  lessonId: string;
  activityId: string;
  kind: string;
  prompt: LocaleText;
  correctForm: LocaleText;
  feedback: LocaleText;
  skillTags: string[];
  difficultyTags: string[];
}

/** The identity slice of an ItemRef that the SRS engine consumes. */
export type SrsItemIdentity = Pick<
  ItemRef,
  | "id"
  | "language"
  | "courseId"
  | "unitId"
  | "lessonId"
  | "activityId"
  | "kind"
  | "skillTags"
  | "difficultyTags"
>;

export interface YoLanguageConfig {
  /** Stable language key, e.g. 'it', 'es-do', 'de', 'pt-br', 'zh', 'ja', 'fr-qc', 'en' */
  language: string;
  displayName: LocaleText;
  /** BCP-47 locale for ASR and TTS, e.g. 'it-IT', 'es-DO', 'fr-CA' */
  asrLocale: string;
  /** Honest ceiling of the content that exists today. */
  cefrCeiling: "A1" | "A2" | "B1" | "B2";
  /** Maps this language's hand-authored course catalog to universal item identities. */
  catalogAdapter: (catalog: unknown) => SrsItemIdentity[];
  /** Error-taxonomy labels in FR/EN/ES for the recap screen (Engine C). */
  errorLabels: Record<ErrorType, LocaleText>;
  /** Per-language kill switches (Engine B). Off until the speech engine ships. */
  speechEnabled: boolean;
  conversationEnabled: boolean;
  /** Scenario ids this language may rehearse with the conversation partner. */
  conversationScenarios: string[];
  /** Shared default [1,3,7,14]; override only with measured evidence. */
  reviewIntervalsDays: typeof REVIEW_INTERVAL_DAYS;
}
