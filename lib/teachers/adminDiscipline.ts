import {
  disciplineLabelToTeacherCategory,
  getDisciplineById,
} from "@/lib/disciplines";
import { isActiveDisciplineId, resolveDisciplineId } from "@/lib/taxonomy/disciplines";
import { isPlaceholderDisciplineLabel } from "@/lib/teacherMapper";

/** Canonical marketplace discipline ids admins may set as the teacher primary. */
export const ADMIN_TEACHER_DISCIPLINE_OPTIONS = [
  { id: "musique", labelFr: "Musique" },
  { id: "langues", labelFr: "Langues" },
  { id: "francisation", labelFr: "Francisation" },
  { id: "tuteurs", labelFr: "Tutorat / Académique" },
  { id: "danse", labelFr: "Danse" },
  { id: "zumba", labelFr: "Zumba" },
  { id: "coach_sportif", labelFr: "Coach sportif" },
  { id: "yoga", labelFr: "Yoga" },
  { id: "pilates", labelFr: "Pilates" },
  { id: "natation", labelFr: "Natation" },
  { id: "aquaforme", labelFr: "Aquaforme" },
  { id: "entrainement_prive", labelFr: "Entraînement privé" },
  { id: "conditionnement_physique", labelFr: "Conditionnement physique" },
  { id: "musculation", labelFr: "Musculation" },
  { id: "course_a_pied", labelFr: "Course à pied" },
  { id: "arts_martiaux", labelFr: "Arts martiaux" },
  { id: "photographie", labelFr: "Photographie" },
  { id: "cuisine", labelFr: "Cuisine" },
] as const;

export type AdminTeacherDisciplineId = (typeof ADMIN_TEACHER_DISCIPLINE_OPTIONS)[number]["id"];

const ALLOWED = new Set<string>(ADMIN_TEACHER_DISCIPLINE_OPTIONS.map((o) => o.id));

export function isAdminTeacherDisciplineId(value: unknown): value is AdminTeacherDisciplineId {
  return typeof value === "string" && ALLOWED.has(value);
}

/** Draft insert used lowercase `music`; treat as unset when discipline is still a placeholder. */
export function isUnsetDraftMusicCategory(
  category: string | null | undefined,
  discipline: string | null | undefined,
): boolean {
  const cat = String(category ?? "")
    .trim()
    .toLowerCase();
  return cat === "music" && isPlaceholderDisciplineLabel(discipline);
}

export function resolveAdminDisciplineUpdate(disciplineIdRaw: string): {
  disciplineId: string;
  disciplineLabel: string;
  category: string;
} | null {
  const disciplineId = resolveDisciplineId(disciplineIdRaw) ?? disciplineIdRaw.trim();
  if (!isAdminTeacherDisciplineId(disciplineId) || !isActiveDisciplineId(disciplineId)) {
    return null;
  }
  const meta = getDisciplineById(disciplineId);
  const disciplineLabel = meta?.label ?? disciplineId;
  const category = disciplineLabelToTeacherCategory(disciplineLabel);
  return { disciplineId, disciplineLabel, category };
}
