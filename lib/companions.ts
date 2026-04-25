export type CompanionType = "phoenix" | "forest" | "dragon" | "star";

export interface CompanionStage {
  emoji: string;
  name: string;
  nameEn: string;
  nameEs: string;
  minLessons: number;
  maxLessons: number;
}

export const COMPANIONS: Record<
  CompanionType,
  {
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
> = {
  phoenix: {
    id: "phoenix",
    name: "L'Oiseau de Feu",
    nameEn: "The Firebird",
    nameEs: "El Ave de Fuego",
    tagline: "Œuf → Poussin → Oiseau → Aigle → Phénix",
    taglineEn: "Egg → Chick → Bird → Eagle → Phoenix",
    taglineEs: "Huevo → Pollito → Pájaro → Águila → Fénix",
    tag: "Populaire",
    stages: [
      { emoji: "🥚", name: "L'Œuf", nameEn: "The Egg", nameEs: "El Huevo", minLessons: 0, maxLessons: 5 },
      { emoji: "🐣", name: "Le Poussin", nameEn: "The Chick", nameEs: "El Pollito", minLessons: 6, maxLessons: 15 },
      { emoji: "🐦", name: "L'Oiseau", nameEn: "The Bird", nameEs: "El Pájaro", minLessons: 16, maxLessons: 30 },
      { emoji: "🦅", name: "L'Aigle", nameEn: "The Eagle", nameEs: "El Águila", minLessons: 31, maxLessons: 50 },
      { emoji: "🔥", name: "Le Phénix", nameEn: "The Phoenix", nameEs: "El Fénix", minLessons: 51, maxLessons: 9999 },
    ],
  },
  forest: {
    id: "forest",
    name: "La Forêt",
    nameEn: "The Forest",
    nameEs: "El Bosque",
    tagline: "Graine → Pousse → Arbre → Grand arbre → Forêt",
    taglineEn: "Seed → Sprout → Tree → Big tree → Forest",
    taglineEs: "Semilla → Brote → Árbol → Gran árbol → Bosque",
    tag: "Nature",
    stages: [
      { emoji: "🌱", name: "La Graine", nameEn: "The Seed", nameEs: "La Semilla", minLessons: 0, maxLessons: 5 },
      { emoji: "🌿", name: "La Pousse", nameEn: "The Sprout", nameEs: "El Brote", minLessons: 6, maxLessons: 15 },
      { emoji: "🌳", name: "L'Arbre", nameEn: "The Tree", nameEs: "El Árbol", minLessons: 16, maxLessons: 30 },
      { emoji: "🌲", name: "Le Grand Arbre", nameEn: "The Big Tree", nameEs: "El Gran Árbol", minLessons: 31, maxLessons: 50 },
      { emoji: "🌳🌲🌴", name: "La Forêt", nameEn: "The Forest", nameEs: "El Bosque", minLessons: 51, maxLessons: 9999 },
    ],
  },
  dragon: {
    id: "dragon",
    name: "Le Dragon",
    nameEn: "The Dragon",
    nameEs: "El Dragón",
    tagline: "Œuf → Lézard → Jeune Dragon → Dragon → Légendaire",
    taglineEn: "Egg → Lizard → Young Dragon → Dragon → Legendary",
    taglineEs: "Huevo → Lagarto → Dragón Joven → Dragón → Legendario",
    tag: "Aventure",
    stages: [
      { emoji: "🥚", name: "L'Œuf", nameEn: "The Egg", nameEs: "El Huevo", minLessons: 0, maxLessons: 5 },
      { emoji: "🦎", name: "Le Lézard", nameEn: "The Lizard", nameEs: "El Lagarto", minLessons: 6, maxLessons: 15 },
      { emoji: "🐊", name: "Jeune Dragon", nameEn: "Young Dragon", nameEs: "Dragón Joven", minLessons: 16, maxLessons: 30 },
      { emoji: "🐉", name: "Le Dragon", nameEn: "The Dragon", nameEs: "El Dragón", minLessons: 31, maxLessons: 50 },
      { emoji: "🔥🐉", name: "Légendaire", nameEn: "Legendary", nameEs: "Legendario", minLessons: 51, maxLessons: 9999 },
    ],
  },
  star: {
    id: "star",
    name: "L'Étoile",
    nameEn: "The Star",
    nameEs: "La Estrella",
    tagline: "Étincelle → Étoile → Brillante → Filante → Supernova",
    taglineEn: "Spark → Star → Bright → Shooting → Supernova",
    taglineEs: "Chispa → Estrella → Brillante → Fugaz → Supernova",
    tag: "Mystère",
    stages: [
      { emoji: "✨", name: "L'Étincelle", nameEn: "The Spark", nameEs: "La Chispa", minLessons: 0, maxLessons: 5 },
      { emoji: "⭐", name: "L'Étoile", nameEn: "The Star", nameEs: "La Estrella", minLessons: 6, maxLessons: 15 },
      { emoji: "🌟", name: "Brillante", nameEn: "Bright Star", nameEs: "Estrella Brillante", minLessons: 16, maxLessons: 30 },
      { emoji: "💫", name: "Filante", nameEn: "Shooting Star", nameEs: "Estrella Fugaz", minLessons: 31, maxLessons: 50 },
      { emoji: "🌠", name: "Supernova", nameEn: "Supernova", nameEs: "Supernova", minLessons: 51, maxLessons: 9999 },
    ],
  },
};

export function getCompanionStage(type: CompanionType, lessonCount: number): CompanionStage {
  const companion = COMPANIONS[type];
  return (
    companion.stages.find((s) => lessonCount >= s.minLessons && lessonCount <= s.maxLessons) ?? companion.stages[0]
  );
}

export function getNextStage(type: CompanionType, lessonCount: number): CompanionStage | null {
  const companion = COMPANIONS[type];
  const currentIndex = companion.stages.findIndex((s) => lessonCount >= s.minLessons && lessonCount <= s.maxLessons);
  return companion.stages[currentIndex + 1] ?? null;
}

export function getLessonsToNextStage(type: CompanionType, lessonCount: number): number {
  const nextStage = getNextStage(type, lessonCount);
  if (!nextStage) return 0;
  return nextStage.minLessons - lessonCount;
}

export function getProgressPercent(type: CompanionType, lessonCount: number): number {
  const stage = getCompanionStage(type, lessonCount);
  if (stage.maxLessons === 9999) return 100;
  const stageRange = stage.maxLessons - stage.minLessons;
  const stageProgress = lessonCount - stage.minLessons;
  if (stageRange <= 0) return 0;
  return Math.round((stageProgress / stageRange) * 100);
}

