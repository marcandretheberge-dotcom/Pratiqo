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

export const DISCIPLINES: Discipline[] = [
  {
    id: "musique",
    label: "Musique",
    labelEn: "Music",
    labelEs: "Música",
    emoji: "🎵",
    enabled: true,
    phase: 1,
    requiresIdentity: false,
    category: "arts",
    avgHourlyRate: 45,
  },
  {
    id: "langues",
    label: "Langues",
    labelEn: "Languages",
    labelEs: "Idiomas",
    emoji: "🌍",
    enabled: true,
    phase: 1,
    requiresIdentity: false,
    category: "academic",
    avgHourlyRate: 40,
  },
  {
    id: "tuteurs",
    label: "Tuteurs académiques",
    labelEn: "Academic Tutors",
    labelEs: "Tutores académicos",
    emoji: "📚",
    enabled: true,
    phase: 1,
    requiresIdentity: false,
    category: "academic",
    avgHourlyRate: 55,
  },

  { id: "danse", label: "Danse", emoji: "💃", enabled: false, phase: 2, requiresIdentity: false, category: "arts", avgHourlyRate: 35 },
  { id: "yoga", label: "Yoga / Fitness", emoji: "🧘", enabled: false, phase: 2, requiresIdentity: false, category: "wellness", avgHourlyRate: 40 },
  { id: "arts_visuels", label: "Arts visuels", emoji: "🎨", enabled: false, phase: 2, requiresIdentity: false, category: "arts", avgHourlyRate: 35 },
  { id: "business", label: "Business / Coaching", emoji: "💼", enabled: false, phase: 2, requiresIdentity: false, category: "business", avgHourlyRate: 90 },

  { id: "arts_martiaux", label: "Arts martiaux", emoji: "🥋", enabled: false, phase: 3, requiresIdentity: true, category: "wellness", avgHourlyRate: 40 },
  { id: "cuisine", label: "Cuisine", emoji: "🍳", enabled: false, phase: 3, requiresIdentity: false, category: "arts", avgHourlyRate: 50 },
  { id: "tech", label: "Tech / Coding", emoji: "💻", enabled: false, phase: 3, requiresIdentity: false, category: "tech", avgHourlyRate: 70 },
  { id: "theatre", label: "Théâtre / Impro", emoji: "🎭", enabled: false, phase: 3, requiresIdentity: false, category: "arts", avgHourlyRate: 35 },
];

export const getEnabledDisciplines = () => DISCIPLINES.filter((d) => d.enabled);

export const getAllDisciplines = () => DISCIPLINES;

export const getDisciplineById = (id: string) => DISCIPLINES.find((d) => d.id === id);

/** Legacy `teachers.category` (Pratiqo enum) → discipline id */
const LEGACY_CATEGORY_TO_ID: Record<string, string> = {
  Musique: "musique",
  Langues: "langues",
  Danse: "danse",
  "Arts Martiaux": "arts_martiaux",
  Sports: "yoga",
  Scolaire: "tuteurs",
};

/**
 * Marketplace label for filters/cards: enabled discipline label, or "Autre" if locked / unknown.
 */
export function displayTeacherMarketplaceCategory(category: string): string {
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

/** Discipline id → `teachers.category` enum (Supabase legacy). */
const DISCIPLINE_ID_TO_TEACHER_CATEGORY: Record<string, string> = {
  musique: "Musique",
  langues: "Langues",
  tuteurs: "Scolaire",
  danse: "Danse",
  yoga: "Sports",
  arts_martiaux: "Arts Martiaux",
  arts_visuels: "Musique",
  business: "Musique",
  cuisine: "Musique",
  tech: "Musique",
  theatre: "Musique",
};

/** Maps marketplace discipline label → `teachers.category` DB enum (legacy). */
export function disciplineLabelToTeacherCategory(label: string): string {
  const d = DISCIPLINES.find((x) => x.label === label);
  if (d) {
    const mapped = DISCIPLINE_ID_TO_TEACHER_CATEGORY[d.id];
    if (mapped) return mapped;
  }
  const legacyId = LEGACY_CATEGORY_TO_ID[label];
  if (legacyId) {
    const mapped = DISCIPLINE_ID_TO_TEACHER_CATEGORY[legacyId];
    if (mapped) return mapped;
  }
  const legacyEnum = ["Scolaire", "Musique", "Langues", "Danse", "Sports", "Arts Martiaux"];
  if (legacyEnum.includes(label)) return label;
  return "Musique";
}
