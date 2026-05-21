import type { Locale } from "@/lib/i18n/types";
import {
  COMPANIONS,
  getCompanionStageIndex,
  getLessonsToNextStage,
  getProgressPercent,
  normalizeLessonCount,
  safeCompanionType,
  type CompanionConfig,
  type CompanionStage,
  type CompanionType,
} from "@/lib/companions";

export type CompanionFamily = CompanionType;

export type CompanionEvolutionStage = CompanionStage & {
  index: number;
  unlockAt: number;
  isCurrent: boolean;
  isUnlocked: boolean;
  isComplete: boolean;
};

export type CompanionFamilyConfig = CompanionConfig & {
  accent: string;
};

export type CompanionEvolutionSummary = {
  family: CompanionFamilyConfig;
  currentStage: CompanionEvolutionStage;
  nextStage: CompanionEvolutionStage | null;
  lessonsCompleted: number;
  lessonsRemaining: number;
  progressPercent: number;
  stages: CompanionEvolutionStage[];
};

const COMPANION_ACCENT = "#1D9E75";

export const COMPANION_FAMILIES: Record<CompanionFamily, CompanionFamilyConfig> = {
  forest: { ...COMPANIONS.forest, accent: COMPANION_ACCENT },
  phoenix: { ...COMPANIONS.phoenix, accent: COMPANION_ACCENT },
  dragon: { ...COMPANIONS.dragon, accent: COMPANION_ACCENT },
  star: { ...COMPANIONS.star, accent: COMPANION_ACCENT },
};

export function resolveCompanionFamily(value: string | null | undefined): CompanionFamily {
  return safeCompanionType(value);
}

export function getLocalizedFamilyName(family: CompanionFamily | CompanionFamilyConfig, locale: Locale): string {
  const config = typeof family === "string" ? COMPANION_FAMILIES[family] : family;
  if (locale === "en") return config.nameEn;
  if (locale === "es") return config.nameEs;
  return config.name;
}

export function getLocalizedStageName(stage: CompanionEvolutionStage | CompanionStage, locale: Locale): string {
  if (locale === "en") return stage.nameEn;
  if (locale === "es") return stage.nameEs;
  return stage.name;
}

export function getCompanionEvolutionSummary(
  companionFamily: CompanionFamily | string | null | undefined,
  lessonsCompleted: number,
): CompanionEvolutionSummary {
  const familyId = resolveCompanionFamily(companionFamily);
  const family = COMPANION_FAMILIES[familyId];
  const safeLessons = normalizeLessonCount(lessonsCompleted);
  const currentIndex = getCompanionStageIndex(familyId, safeLessons);

  const stages = family.stages.map((stage, index) => ({
    ...stage,
    index,
    unlockAt: stage.minLessons,
    isCurrent: index === currentIndex,
    isUnlocked: safeLessons >= stage.minLessons,
    isComplete: index < currentIndex,
  }));

  const currentStage = stages[currentIndex] ?? stages[0];
  const nextStage = stages[currentIndex + 1] ?? null;

  return {
    family,
    currentStage,
    nextStage,
    lessonsCompleted: safeLessons,
    lessonsRemaining: getLessonsToNextStage(familyId, safeLessons),
    progressPercent: getProgressPercent(familyId, safeLessons),
    stages,
  };
}
