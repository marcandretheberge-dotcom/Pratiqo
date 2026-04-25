import type { SupabaseClient } from "@supabase/supabase-js";
import type { Teacher } from "../types";
import { displayTeacherMarketplaceCategory, getDisciplineById } from "./disciplines";
import { applyAdditionalDisciplines, type TeacherDisciplineRow } from "./teacherMapper";

type DisciplineDbRow = {
  teacher_id: string;
  discipline_id: string;
  specialite: string | null;
  sort_order?: number;
  created_at?: string;
};

/** Load `teacher_disciplines` for many teachers; returns map teacher_id → rows ordered by created_at. */
export async function fetchTeacherDisciplinesMap(
  supabase: SupabaseClient,
  teacherIds: string[],
): Promise<Map<string, TeacherDisciplineRow[]>> {
  const map = new Map<string, TeacherDisciplineRow[]>();
  if (!teacherIds.length) return map;

  const { data, error } = await supabase
    .from("teacher_disciplines")
    .select("teacher_id, discipline_id, specialite, sort_order, created_at")
    .in("teacher_id", teacherIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return map;

  for (const raw of data as DisciplineDbRow[]) {
    const tid = raw.teacher_id;
    if (!tid) continue;
    if (!map.has(tid)) map.set(tid, []);
    map.get(tid)!.push({
      teacher_id: tid,
      discipline_id: raw.discipline_id,
      specialite: raw.specialite,
    });
  }
  return map;
}

export function mergeTeachersWithDisciplines(teachers: Teacher[], discMap: Map<string, TeacherDisciplineRow[]>): Teacher[] {
  return teachers.map((t) => applyAdditionalDisciplines(t, discMap.get(t.id) ?? []));
}

/** Category pills use marketplace labels (e.g. "Musique"). */
export function teacherMatchesExploreCategory(teacher: Teacher, selectedLabel: string): boolean {
  if (selectedLabel === "All") return true;
  const primary = displayTeacherMarketplaceCategory(teacher.category);
  if (primary === selectedLabel) return true;
  for (const ad of teacher.additionalDisciplines ?? []) {
    const d = getDisciplineById(ad.disciplineId);
    if (d?.label === selectedLabel && d.enabled) return true;
  }
  return false;
}

export function teacherMatchesExploreSearch(teacher: Teacher, searchQuery: string): boolean {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return true;
  if (teacher.name.toLowerCase().includes(q)) return true;
  if (teacher.discipline.toLowerCase().includes(q)) return true;
  for (const ad of teacher.additionalDisciplines ?? []) {
    const d = getDisciplineById(ad.disciplineId);
    if (d?.label.toLowerCase().includes(q)) return true;
    if (ad.specialite.toLowerCase().includes(q)) return true;
  }
  return false;
}
