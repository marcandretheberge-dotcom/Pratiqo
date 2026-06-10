/**
 * Safe YoPratiqo progress snapshot payloads for the Dominican Republic
 * Spanish learning path (Modules 2–5).
 *
 * Used by YoMarkModuleCompletedButton at the end of each module page.
 * Payloads contain ONLY allow-listed fields — no quiz answers, attempt
 * logs, or private metadata. The server re-validates every field via
 * parseProgressSnapshotPayload before persisting.
 */

import type {
  LearningDifficultyTag,
  LearningSkillTag,
} from "@/lib/yopratiqo/teacherBridge";
import type { ScoreBand } from "@/lib/yopratiqo/progressSnapshotPersistence";
import type { YoLocale } from "@/lib/yo/types";

/** Shared course identifier for every RD module snapshot row. */
export const DOMINICAN_RD_COURSE_ID = "yopratiqo:es:republique-dominicaine";

export type DominicanRdModuleId =
  | "module-2"
  | "module-3"
  | "module-4"
  | "module-5";

export type DominicanModuleProgressPayload = {
  course_id: string;
  module_id: string;
  module_title: string;
  discipline: string;
  level_label?: string;
  progress_state?: "completed";
  skill_tags?: LearningSkillTag[];
  difficulty_tags?: LearningDifficultyTag[];
  score_band?: ScoreBand;
  companion_stage?: string;
};

type ModuleMeta = {
  titles: Record<YoLocale, string>;
  level: string;
  skillTags: LearningSkillTag[];
  difficultyTags: LearningDifficultyTag[];
  scoreBand: ScoreBand;
  companionStage?: string;
};

const MODULE_META: Record<DominicanRdModuleId, ModuleMeta> = {
  "module-2": {
    titles: {
      fr: "Module 2 — Hôtel et aéroport",
      en: "Module 2 — Hotel & airport",
      es: "Módulo 2 — Hotel y aeropuerto",
    },
    level: "A1",
    skillTags: ["greetings", "vocabulary", "listening", "conversation"],
    difficultyTags: [
      "needs_listening_repetition",
      "needs_vocabulary_review",
    ],
    scoreBand: "developing",
    companionStage: "travel-ready",
  },
  "module-3": {
    titles: {
      fr: "Module 3 — Nourriture et culture",
      en: "Module 3 — Food & culture",
      es: "Módulo 3 — Comida y cultura",
    },
    level: "A1",
    skillTags: ["vocabulary", "culture", "conversation"],
    difficultyTags: [
      "needs_cultural_context",
      "needs_vocabulary_review",
    ],
    scoreBand: "developing",
    companionStage: "culture-curious",
  },
  "module-4": {
    titles: {
      fr: "Module 4 — Se déplacer et explorer",
      en: "Module 4 — Moving around & exploring",
      es: "Módulo 4 — Moverse y explorar",
    },
    level: "A1+",
    skillTags: ["vocabulary", "grammar", "culture", "conversation"],
    difficultyTags: [
      "needs_speaking_practice",
      "needs_vocabulary_review",
    ],
    scoreBand: "developing",
    companionStage: "explorer",
  },
  "module-5": {
    titles: {
      fr: "Module 5 — Capstone A2",
      en: "Module 5 — A2 capstone",
      es: "Módulo 5 — Capstone A2",
    },
    level: "A2",
    skillTags: ["vocabulary", "listening", "conversation", "culture"],
    difficultyTags: [
      "needs_listening_repetition",
      "needs_pronunciation_support",
    ],
    scoreBand: "developing",
    companionStage: "teacher-ready",
  },
};

function safeLocale(locale: YoLocale): YoLocale {
  return (["fr", "en", "es"] as const).includes(locale) ? locale : "fr";
}

/**
 * Build the safe POST body for /api/yo/progress for a given RD module.
 * Deterministic and locale-aware for module_title only.
 */
export function dominicanRdModuleProgressPayload(
  moduleId: DominicanRdModuleId,
  locale: YoLocale,
): DominicanModuleProgressPayload {
  const l = safeLocale(locale);
  const meta = MODULE_META[moduleId];
  return {
    course_id: DOMINICAN_RD_COURSE_ID,
    module_id: moduleId,
    module_title: meta.titles[l],
    discipline: "Languages",
    level_label: meta.level,
    progress_state: "completed",
    skill_tags: meta.skillTags,
    difficulty_tags: meta.difficultyTags,
    score_band: meta.scoreBand,
    ...(meta.companionStage ? { companion_stage: meta.companionStage } : {}),
  };
}
