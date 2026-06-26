import { TEACHERS } from "../constants";
import { getSupabaseClient } from "./supabase";
import { teacherToRow } from "./teacherMapper";

/** Upsert demo teachers into `public.teachers` (requires RLS to allow your key, or use SQL seed in migration). */
export async function seedTeachers() {
  const supabase = getSupabaseClient();
  for (const teacher of TEACHERS) {
    const row = teacherToRow(teacher);
    const { error } = await supabase.from("teachers").upsert(row, { onConflict: "id" });
    if (error) {
      console.warn("seedTeachers: upsert failed for", teacher.id, error.message);
    }
  }
}

export async function seedStudentProgress(studentId: string) {
  const supabase = getSupabaseClient();

  const { data: existing, error: selErr } = await supabase
    .from("student_progress")
    .select("id")
    .eq("student_id", studentId)
    .limit(1);

  if (selErr) {
    console.error("seedStudentProgress: select failed", selErr);
    return;
  }
  if (existing && existing.length > 0) return;

  const demo = [
    {
      student_id: studentId,
      teacher_id: "2",
      subject: "Karaté",
      score: 45,
      notes: "Bon début pour la ceinture jaune. Concentre-toi sur la posture de base.",
      achievements: ["Endurance", "Kata initial"],
    },
  ];

  for (const p of demo) {
    const { error } = await supabase.from("student_progress").insert(p);
    if (error) {
      console.error("seedStudentProgress: insert failed", error);
    }
  }
}
