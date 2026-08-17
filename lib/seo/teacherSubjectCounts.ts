import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function fetchTeacherSubjectCountsByIds(teacherIds: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(teacherIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data, error } = await getSupabaseAdmin()
    .from("teacher_disciplines")
    .select("teacher_id")
    .in("teacher_id", unique);

  const counts = new Map<string, number>();
  for (const id of unique) counts.set(id, 0);
  if (error || !data) return counts;

  for (const row of data as Array<{ teacher_id: string | null }>) {
    if (!row.teacher_id) continue;
    counts.set(row.teacher_id, (counts.get(row.teacher_id) ?? 0) + 1);
  }
  return counts;
}

export async function countTeacherSubjects(teacherId: string): Promise<number> {
  const counts = await fetchTeacherSubjectCountsByIds([teacherId]);
  return counts.get(teacherId) ?? 0;
}
