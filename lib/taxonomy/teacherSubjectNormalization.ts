import { resolveDisciplineId } from "./disciplines";

// Unknown or generic free-text specialties must not expand a parent category.
export const NON_SPECIFIC_SPECIALTIES = ["autre", "other", "otro", "—", "-"] as const;

// Exact legacy values observed in teacher_disciplines, not parent-category expansion.
// Basse / Ukulele have no exact catalog discipline and remain unmapped.
export const HISTORICAL_SPECIALTY_IDS: Readonly<Record<string, string>> = {
  francais: "francais", espagnol: "espagnol", guitare: "guitare", piano: "piano",
  "chant populaire": "chant",
};

export function resolveTeacherSubjectId(value?: string | null): string | null {
  if (!value) return null;
  const folded = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return resolveDisciplineId(value) ?? HISTORICAL_SPECIALTY_IDS[folded] ?? null;
}

export function normalizeTeacherSubjectIds(rows: Array<{ discipline_id: string; specialite?: string | null }>): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const discipline = resolveDisciplineId(row.discipline_id);
    if (discipline) ids.add(discipline);
    const text = row.specialite?.trim();
    if (!text || NON_SPECIFIC_SPECIALTIES.some(value => value === text.toLowerCase())) continue;
    const specialty = resolveTeacherSubjectId(text);
    if (specialty) ids.add(specialty);
  }
  return [...ids];
}
