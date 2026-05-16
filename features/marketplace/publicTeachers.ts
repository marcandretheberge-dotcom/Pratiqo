import type { SupabaseClient } from "@supabase/supabase-js";
import type { Teacher } from "@/types";
import { fetchTeacherDisciplinesMap, mergeTeachersWithDisciplines } from "@/lib/teacherDisciplines";
import { teacherRowToTeacher, type TeacherRow } from "@/lib/teacherMapper";
import { TEACHERS_LIST_SELECT, TEACHERS_PUBLIC_TABLE } from "@/lib/supabase/queries";

export async function fetchPublicMarketplaceTeachers(
  supabase: SupabaseClient,
  logContext: string,
): Promise<Teacher[]> {
  const { data, error } = await supabase
    .from(TEACHERS_PUBLIC_TABLE)
    .select(TEACHERS_LIST_SELECT)
    .order("verification_level", { ascending: false })
    .order("rating", { ascending: false });

  if (error || !data?.length) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[${logContext}] teachers_public unavailable or empty; skipping demo teachers (IDs must be UUIDs).`,
        error,
      );
    }
    return [];
  }

  const mapped = data.map((row) => teacherRowToTeacher(row as TeacherRow));

  try {
    const disciplineMap = await fetchTeacherDisciplinesMap(supabase, mapped.map((teacher) => teacher.id));
    return mergeTeachersWithDisciplines(mapped, disciplineMap);
  } catch {
    return mapped;
  }
}
