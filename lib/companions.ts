export type CompanionType = "phoenix" | "forest" | "dragon" | "star";

export interface CompanionStage {
  emoji: string;
  name: string;
  nameEn: string;
  nameEs: string;
  minLessons: number;
  maxLessons: number;
}

export interface CompanionConfig {
  id: CompanionType;
  name: string;
  nameEn: string;
  nameEs: string;
  tagline: string;
  taglineEn: string;
  taglineEs: string;
  tag: string;
  stages: CompanionStage[];
}

const FINAL_STAGE_MAX = 9999;
const STAGE_RANGES = [
  { minLessons: 0, maxLessons: 5 },
  { minLessons: 6, maxLessons: 15 },
  { minLessons: 16, maxLessons: 30 },
  { minLessons: 31, maxLessons: 50 },
  { minLessons: 51, maxLessons: FINAL_STAGE_MAX },
] as const;

function stage(
  index: number,
  details: Pick<CompanionStage, "emoji" | "name" | "nameEn" | "nameEs">,
): CompanionStage {
  const range = STAGE_RANGES[index] ?? STAGE_RANGES[0];
  return { ...details, ...range };
}

export const COMPANIONS: Record<CompanionType, CompanionConfig> = {
  forest: {
    id: "forest",
    name: "La Forêt",
    nameEn: "The Forest",
    nameEs: "El Bosque",
    tagline: "Graine → Pousse → Jeune arbre → Grand sapin → Forêt vivante",
    taglineEn: "Seed → Sprout → Young tree → Great fir → Living forest",
    taglineEs: "Semilla → Brote → Árbol joven → Gran abeto → Bosque vivo",
    tag: "Nature",
    stages: [
      stage(0, { emoji: "🌱", name: "La Graine", nameEn: "The Seed", nameEs: "La Semilla" }),
      stage(1, { emoji: "🌿", name: "La Pousse", nameEn: "The Sprout", nameEs: "El Brote" }),
      stage(2, { emoji: "🌳", name: "Jeune arbre", nameEn: "Young Tree", nameEs: "Árbol joven" }),
      stage(3, { emoji: "🌲", name: "Grand sapin", nameEn: "Great Fir", nameEs: "Gran abeto" }),
      stage(4, { emoji: "✨🌲", name: "Forêt vivante", nameEn: "Living Forest", nameEs: "Bosque vivo" }),
    ],
  },
  phoenix: {
    id: "phoenix",
    name: "Le Phénix",
    nameEn: "The Phoenix",
    nameEs: "El Fénix",
    tagline: "Œuf → Poussin → Oiseau → Aigle → Phénix",
    taglineEn: "Egg → Chick → Bird → Eagle → Phoenix",
    taglineEs: "Huevo → Pollito → Pájaro → Águila → Fénix",
    tag: "Populaire",
    stages: [
      stage(0, { emoji: "🥚", name: "L'Œuf", nameEn: "The Egg", nameEs: "El Huevo" }),
      stage(1, { emoji: "🐣", name: "Poussin", nameEn: "Chick", nameEs: "Pollito" }),
      stage(2, { emoji: "🐦", name: "Oiseau", nameEn: "Bird", nameEs: "Pájaro" }),
      stage(3, { emoji: "🦅", name: "Aigle", nameEn: "Eagle", nameEs: "Águila" }),
      stage(4, { emoji: "🔥", name: "Phénix", nameEn: "Phoenix", nameEs: "Fénix" }),
    ],
  },
  dragon: {
    id: "dragon",
    name: "Le Dragon",
    nameEn: "The Dragon",
    nameEs: "El Dragón",
    tagline: "Œuf → Lézard → Jeune dragon → Dragon → Dragon légendaire",
    taglineEn: "Egg → Lizard → Young dragon → Dragon → Legendary dragon",
    taglineEs: "Huevo → Lagarto → Dragón joven → Dragón → Dragón legendario",
    tag: "Aventure",
    stages: [
      stage(0, { emoji: "🥚", name: "L'Œuf", nameEn: "The Egg", nameEs: "El Huevo" }),
      stage(1, { emoji: "🦎", name: "Lézard", nameEn: "Lizard", nameEs: "Lagarto" }),
      stage(2, { emoji: "🐉", name: "Jeune dragon", nameEn: "Young dragon", nameEs: "Dragón joven" }),
      stage(3, { emoji: "🐲", name: "Dragon", nameEn: "Dragon", nameEs: "Dragón" }),
      stage(4, { emoji: "✨🐉", name: "Dragon légendaire", nameEn: "Legendary dragon", nameEs: "Dragón legendario" }),
    ],
  },
  star: {
    id: "star",
    name: "L'Étoile",
    nameEn: "The Star",
    nameEs: "La Estrella",
    tagline: "Étincelle → Étoile → Brillante → Filante → Supernova",
    taglineEn: "Spark → Star → Bright → Shooting star → Supernova",
    taglineEs: "Chispa → Estrella → Brillante → Fugaz → Supernova",
    tag: "Mystère",
    stages: [
      stage(0, { emoji: "✨", name: "Étincelle", nameEn: "Spark", nameEs: "Chispa" }),
      stage(1, { emoji: "⭐", name: "Étoile", nameEn: "Star", nameEs: "Estrella" }),
      stage(2, { emoji: "🌟", name: "Brillante", nameEn: "Bright", nameEs: "Brillante" }),
      stage(3, { emoji: "☄️", name: "Filante", nameEn: "Shooting star", nameEs: "Fugaz" }),
      stage(4, { emoji: "🌌", name: "Supernova", nameEn: "Supernova", nameEs: "Supernova" }),
    ],
  },
};

export function safeCompanionType(value: string | null | undefined): CompanionType {
  return value === "phoenix" || value === "forest" || value === "dragon" || value === "star" ? value : "forest";
}

export function normalizeLessonCount(value: number): number {
  return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
}

export function getCompanionStageIndex(type: CompanionType, lessonCount: number): number {
  const safeLessons = normalizeLessonCount(lessonCount);
  const companion = COMPANIONS[type];
  const index = companion.stages.findIndex((s) => safeLessons >= s.minLessons && safeLessons <= s.maxLessons);
  return index >= 0 ? index : 0;
}

export function getCompanionStage(type: CompanionType, lessonCount: number): CompanionStage {
  return COMPANIONS[type].stages[getCompanionStageIndex(type, lessonCount)] ?? COMPANIONS[type].stages[0];
}

export function getNextStage(type: CompanionType, lessonCount: number): CompanionStage | null {
  const companion = COMPANIONS[type];
  const currentIndex = getCompanionStageIndex(type, lessonCount);
  return companion.stages[currentIndex + 1] ?? null;
}

export function getLessonsToNextStage(type: CompanionType, lessonCount: number): number {
  const nextStage = getNextStage(type, lessonCount);
  if (!nextStage) return 0;
  return Math.max(0, nextStage.minLessons - normalizeLessonCount(lessonCount));
}

export function getProgressPercent(type: CompanionType, lessonCount: number): number {
  const safeLessons = normalizeLessonCount(lessonCount);
  const currentStage = getCompanionStage(type, safeLessons);
  const nextStage = getNextStage(type, safeLessons);
  if (!nextStage) return 100;
  const span = Math.max(1, nextStage.minLessons - currentStage.minLessons);
  const progress = Math.max(0, safeLessons - currentStage.minLessons);
  return Math.max(0, Math.min(100, Math.round((progress / span) * 100)));
}
