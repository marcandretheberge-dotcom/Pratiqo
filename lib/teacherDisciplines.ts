import type { SupabaseClient } from "@supabase/supabase-js";
import type { Teacher } from "../types";
import { disciplineLabelToTeacherCategory, displayTeacherMarketplaceCategory, getDisciplineById } from "./disciplines";
import { applyAdditionalDisciplines, isPlaceholderDisciplineLabel, type TeacherDisciplineRow } from "./teacherMapper";

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
  for (const row of teacher.disciplineDisplay ?? []) {
    const d = getDisciplineById(row.disciplineId);
    if (d?.label === selectedLabel && d.enabled) return true;
    if (row.label === selectedLabel) return true;
  }
  for (const ad of teacher.additionalDisciplines ?? []) {
    const d = getDisciplineById(ad.disciplineId);
    if (d?.label === selectedLabel && d.enabled) return true;
  }
  return false;
}

function foldAscii(value: unknown): string {
  // Avoid Unicode property escapes (\p{M}) for broader browser compatibility.
  // Strip common combining diacritics after NFD normalization.
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function teacherMatchesExploreSearch(teacher: Teacher, searchQuery: string): boolean {
  const q = foldAscii(searchQuery);
  if (!q) return true;
  if (foldAscii(teacher.name).includes(q)) return true;
  if (!isPlaceholderDisciplineLabel(teacher.discipline) && foldAscii(teacher.discipline).includes(q)) return true;
  if (foldAscii(displayTeacherMarketplaceCategory(teacher.category)).includes(q)) return true;
  if (foldAscii(String(teacher.city ?? "")).includes(q)) return true;
  if (foldAscii(String(teacher.region ?? "")).includes(q)) return true;
  if (foldAscii(String(teacher.location?.neighborhood ?? "")).includes(q)) return true;
  for (const row of teacher.disciplineDisplay ?? []) {
    if (foldAscii(row.label).includes(q)) return true;
    if (row.specialite && foldAscii(row.specialite).includes(q)) return true;
    const d = getDisciplineById(row.disciplineId);
    if (d?.label && foldAscii(d.label).includes(q)) return true;
    if (d?.labelEn && foldAscii(d.labelEn).includes(q)) return true;
    if (d?.labelEs && foldAscii(d.labelEs).includes(q)) return true;
    if (foldAscii(row.disciplineId).includes(q)) return true;
  }
  for (const ad of teacher.additionalDisciplines ?? []) {
    const d = getDisciplineById(ad.disciplineId);
    if (d?.label && foldAscii(d.label).includes(q)) return true;
    if (foldAscii(ad.specialite).includes(q)) return true;
    if (foldAscii(ad.disciplineId).includes(q)) return true;
  }
  return false;
}

/** Sync legacy `teachers.discipline` / `teachers.category` from first teacher_disciplines row. */
export async function syncTeacherPrimaryFromDisciplines(
  supabase: SupabaseClient,
  teacherId: string,
): Promise<void> {
  const { data: rows } = await supabase
    .from("teacher_disciplines")
    .select("discipline_id, specialite, sort_order")
    .eq("teacher_id", teacherId)
    .order("sort_order", { ascending: true });
  if (!rows?.length) return;
  const first = rows[0] as { discipline_id: string; specialite: string | null };
  const meta = getDisciplineById(first.discipline_id);
  const spec = String(first.specialite || "").trim();
  const discipline =
    spec && spec !== "—" && spec !== "-" && spec !== "–" ? spec : meta?.label ?? "Autre";
  const category = disciplineLabelToTeacherCategory(meta?.label ?? discipline);
  await supabase.from("teachers").update({ discipline, category }).eq("id", teacherId);
}
