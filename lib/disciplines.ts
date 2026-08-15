import {
  FEATURED_FILTER_DISCIPLINE_IDS,
  MAX_TEACHER_DISCIPLINES,
  getActiveDisciplines,
  getTaxonomyDisciplineById,
  isActiveDisciplineId,
  resolveDisciplineId,
  type PratiqoDiscipline,
} from "@/lib/taxonomy/disciplines";

export {
  FEATURED_FILTER_DISCIPLINE_IDS,
  MAX_TEACHER_DISCIPLINES,
  isActiveDisciplineId,
  resolveDisciplineId,
};

export function getFeaturedFilterDisciplines(): Discipline[] {
  return FEATURED_FILTER_DISCIPLINE_IDS.map((id) => getDisciplineById(id)).filter(
    (d): d is Discipline => Boolean(d?.enabled),
  );
}

export interface Discipline {
  id: string;
  label: string;
  labelEn?: string;
  labelEs?: string;
  emoji: string;
  enabled: boolean;
  phase: 1 | 2 | 3;
  requiresIdentity: boolean;
  category: "arts" | "academic" | "wellness" | "business" | "tech";
  avgHourlyRate: number;
}

const GROUP_TO_CATEGORY: Record<string, Discipline["category"]> = {
  musique: "arts",
  langues: "academic",
  francisation: "academic",
  tutorat: "academic",
  media: "arts",
  cuisine: "arts",
  sport: "wellness",
  danse: "arts",
  arts: "arts",
  informatique: "tech",
  pro: "business",
  jeux: "arts",
  artisanat: "arts",
  autre: "arts",
};

const GROUP_EMOJI: Record<string, string> = {
  musique: "🎵",
  langues: "🌍",
  francisation: "🍁",
  tutorat: "📚",
  media: "📷",
  cuisine: "🍳",
  sport: "💪",
  danse: "💃",
  arts: "🎨",
  informatique: "💻",
  pro: "💼",
  jeux: "♟️",
  artisanat: "🧵",
  autre: "✨",
};

function toDiscipline(d: PratiqoDiscipline): Discipline {
  const group = d.internalGroup ?? "autre";
  return {
    id: d.id,
    label: d.labelFr,
    labelEn: d.labelEn,
    labelEs: d.labelEs,
    emoji: GROUP_EMOJI[group] ?? "✨",
    enabled: d.isActive,
    phase: 1,
    requiresIdentity: false,
    category: GROUP_TO_CATEGORY[group] ?? "arts",
    avgHourlyRate: 45,
  };
}

export const DISCIPLINES: Discipline[] = getActiveDisciplines().map(toDiscipline);

export const getEnabledDisciplines = () => DISCIPLINES.filter((d) => d.enabled);

export const getAllDisciplines = () => DISCIPLINES;

export const getDisciplineById = (id: string) => {
  const resolved = resolveDisciplineId(id);
  if (!resolved) return undefined;
  const fromList = DISCIPLINES.find((d) => d.id === resolved);
  if (fromList) return fromList;
  const tax = getTaxonomyDisciplineById(resolved);
  return tax ? toDiscipline(tax) : undefined;
};

/** Legacy `teachers.category` (Pratiqo enum-like text) → discipline id */
const LEGACY_CATEGORY_TO_ID: Record<string, string> = {
  Musique: "musique",
  Langues: "langues",
  Danse: "danse",
  "Arts Martiaux": "arts_martiaux",
  Sports: "coach_sportif",
  Scolaire: "tuteurs",
};

/**
 * Marketplace label for filters/cards: enabled discipline label, or the stored
 * value if it still maps to an active discipline. Unknown values stay visible
 * as "Autre" only when they cannot be resolved.
 */
export function displayTeacherMarketplaceCategory(category: string): string {
  const resolved = resolveDisciplineId(category);
  if (resolved) {
    const d = getDisciplineById(resolved);
    if (d?.enabled) return d.label;
  }

  const byLabel = DISCIPLINES.find((d) => d.label === category);
  if (byLabel) return byLabel.enabled ? byLabel.label : "Autre";

  const legacyId = LEGACY_CATEGORY_TO_ID[category];
  if (legacyId) {
    const d = getDisciplineById(legacyId);
    if (d) return d.enabled ? d.label : "Autre";
  }

  const enabledLabels = new Set(getEnabledDisciplines().map((d) => d.label));
  if (enabledLabels.has(category)) return category;
  return "Autre";
}

const GROUP_TO_TEACHER_CATEGORY: Record<string, string> = {
  musique: "Musique",
  langues: "Langues",
  francisation: "Langues",
  tutorat: "Scolaire",
  danse: "Danse",
  sport: "Sports",
};

/** Discipline id → `teachers.category` (legacy text column). */
const DISCIPLINE_ID_TO_TEACHER_CATEGORY: Record<string, string> = {
  musique: "Musique",
  langues: "Langues",
  tuteurs: "Scolaire",
  danse: "Danse",
  yoga: "Sports",
  coach_sportif: "Sports",
  arts_martiaux: "Arts Martiaux",
};

/** Maps marketplace discipline label → `teachers.category` DB text (legacy). */
export function disciplineLabelToTeacherCategory(label: string): string {
  const resolved = resolveDisciplineId(label);
  const d = resolved ? getDisciplineById(resolved) : DISCIPLINES.find((x) => x.label === label);
  if (d) {
    const mapped =
      DISCIPLINE_ID_TO_TEACHER_CATEGORY[d.id] ??
      GROUP_TO_TEACHER_CATEGORY[getTaxonomyDisciplineById(d.id)?.internalGroup ?? ""];
    if (mapped) return mapped;
    return d.label;
  }
  const legacyId = LEGACY_CATEGORY_TO_ID[label];
  if (legacyId) {
    const mapped = DISCIPLINE_ID_TO_TEACHER_CATEGORY[legacyId];
    if (mapped) return mapped;
  }
  const legacyEnum = ["Scolaire", "Musique", "Langues", "Danse", "Sports", "Arts Martiaux"];
  if (legacyEnum.includes(label)) return label;
  return label.trim() || "Musique";
}
