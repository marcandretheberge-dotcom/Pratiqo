import type { Locale } from "@/lib/i18n/types";
import {
  getLessonsRemainingToNextStage,
  getStageProgressPercent,
  safeCompletedLessonCount,
} from "@/lib/companion/progress";

export type CompanionFamily = "forest" | "music" | "language";

export type CompanionEvolutionStage = {
  index: number;
  name: string;
  nameEn: string;
  nameEs: string;
  unlockAt: number;
  imageSrc: string;
  isCurrent: boolean;
  isUnlocked: boolean;
  isComplete: boolean;
};

export type CompanionFamilyConfig = {
  id: CompanionFamily;
  name: string;
  nameEn: string;
  nameEs: string;
  accent: string;
  stages: Omit<CompanionEvolutionStage, "index" | "imageSrc" | "isCurrent" | "isUnlocked" | "isComplete">[];
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

const STAGE_UNLOCKS = [0, 6, 12, 24, 40] as const;

export const COMPANION_FAMILIES: Record<CompanionFamily, CompanionFamilyConfig> = {
  forest: {
    id: "forest",
    name: "La Forêt",
    nameEn: "Forest",
    nameEs: "Bosque",
    accent: "#1D9E75",
    stages: [
      { name: "La Graine", nameEn: "The Seed", nameEs: "La Semilla", unlockAt: STAGE_UNLOCKS[0] },
      { name: "La Pousse", nameEn: "The Sprout", nameEs: "El Brote", unlockAt: STAGE_UNLOCKS[1] },
      { name: "Le Jeune Arbre", nameEn: "The Young Tree", nameEs: "El Arbol Joven", unlockAt: STAGE_UNLOCKS[2] },
      { name: "Le Grand Sapin", nameEn: "The Great Fir", nameEs: "El Gran Abeto", unlockAt: STAGE_UNLOCKS[3] },
      { name: "La Forêt Vivante", nameEn: "The Living Forest", nameEs: "El Bosque Vivo", unlockAt: STAGE_UNLOCKS[4] },
    ],
  },
  music: {
    id: "music",
    name: "Musique",
    nameEn: "Music",
    nameEs: "Musica",
    accent: "#B7791F",
    stages: [
      { name: "La Note", nameEn: "The Note", nameEs: "La Nota", unlockAt: STAGE_UNLOCKS[0] },
      { name: "La Mélodie", nameEn: "The Melody", nameEs: "La Melodia", unlockAt: STAGE_UNLOCKS[1] },
      { name: "Le Petit Virtuose", nameEn: "The Little Virtuoso", nameEs: "El Pequeno Virtuoso", unlockAt: STAGE_UNLOCKS[2] },
      { name: "Le Maestro", nameEn: "The Maestro", nameEs: "El Maestro", unlockAt: STAGE_UNLOCKS[3] },
      { name: "La Symphonie Vivante", nameEn: "The Living Symphony", nameEs: "La Sinfonia Viva", unlockAt: STAGE_UNLOCKS[4] },
    ],
  },
  language: {
    id: "language",
    name: "Langues",
    nameEn: "Languages",
    nameEs: "Idiomas",
    accent: "#2563EB",
    stages: [
      { name: "Le Mot", nameEn: "The Word", nameEs: "La Palabra", unlockAt: STAGE_UNLOCKS[0] },
      { name: "La Phrase", nameEn: "The Sentence", nameEs: "La Frase", unlockAt: STAGE_UNLOCKS[1] },
      { name: "Le Voyageur", nameEn: "The Traveler", nameEs: "El Viajero", unlockAt: STAGE_UNLOCKS[2] },
      { name: "Le Polyglotte", nameEn: "The Polyglot", nameEs: "El Poliglota", unlockAt: STAGE_UNLOCKS[3] },
      {
        name: "L'Explorateur du Monde",
        nameEn: "The World Explorer",
        nameEs: "El Explorador del Mundo",
        unlockAt: STAGE_UNLOCKS[4],
      },
    ],
  },
};

export function resolveCompanionFamily(value: string | null | undefined): CompanionFamily {
  if (value === "forest" || value === "music" || value === "language") return value;
  if (value === "phoenix") return "music";
  if (value === "dragon" || value === "star") return "language";
  return "forest";
}

export function getLocalizedFamilyName(family: CompanionFamily | CompanionFamilyConfig, locale: Locale): string {
  const config = typeof family === "string" ? COMPANION_FAMILIES[family] : family;
  if (locale === "en") return config.nameEn;
  if (locale === "es") return config.nameEs;
  return config.name;
}

export function getLocalizedStageName(stage: CompanionEvolutionStage, locale: Locale): string {
  if (locale === "en") return stage.nameEn;
  if (locale === "es") return stage.nameEs;
  return stage.name;
}

function getStageIndex(family: CompanionFamilyConfig, lessonsCompleted: number): number {
  let currentIndex = 0;
  family.stages.forEach((stage, index) => {
    if (lessonsCompleted >= stage.unlockAt) currentIndex = index;
  });
  return currentIndex;
}

export function getCompanionArtworkSrc(family: CompanionFamily, stageIndex: number): string {
  return `/images/companions/${family}/stage-${stageIndex + 1}.webp`;
}

export function getCompanionEvolutionSummary(
  companionFamily: CompanionFamily | string | null | undefined,
  lessonsCompleted: number,
): CompanionEvolutionSummary {
  const familyId = resolveCompanionFamily(companionFamily);
  const family = COMPANION_FAMILIES[familyId];
  const safeLessons = safeCompletedLessonCount(lessonsCompleted);
  const currentIndex = getStageIndex(family, safeLessons);

  const stages = family.stages.map((stage, index) => ({
    ...stage,
    index,
    imageSrc: getCompanionArtworkSrc(family.id, index),
    isCurrent: index === currentIndex,
    isUnlocked: safeLessons >= stage.unlockAt,
    isComplete: index < currentIndex,
  }));

  const currentStage = stages[currentIndex] ?? stages[0];
  const nextStage = stages[currentIndex + 1] ?? null;

  return {
    family,
    currentStage,
    nextStage,
    lessonsCompleted: safeLessons,
    lessonsRemaining: getLessonsRemainingToNextStage(currentStage, nextStage, safeLessons),
    progressPercent: getStageProgressPercent(currentStage, nextStage, safeLessons),
    stages,
  };
}
