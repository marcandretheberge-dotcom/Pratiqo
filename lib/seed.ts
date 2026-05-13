import { getSupabaseClient } from "./supabase";
import { teacherToRow } from "./teacherMapper";

/**
 * Demo data is gated behind an explicit env flag so production builds never
 * write fake teachers or student progress rows. Set
 * `NEXT_PUBLIC_ENABLE_DEMO_SEED=true` in `.env.local` (and only there) to
 * enable the dev seed flow.
 *
 * `NEXT_PUBLIC_*` is required because `seedStudentProgress` runs from the
 * client `AuthProvider`. Reading the flag at module scope keeps it
 * tree-shakeable: when the flag is unset, the demo data import below is
 * skipped at runtime and never reaches the production wire.
 */
const DEMO_SEED_ENABLED =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_ENABLE_DEMO_SEED === "true";

let warned = false;
function warnOnce(name: string): void {
  if (warned) return;
  warned = true;
  console.info(
    `[seed] ${name} skipped — set NEXT_PUBLIC_ENABLE_DEMO_SEED=true to enable demo seeding (dev/staging only).`,
  );
}

/** Upsert demo teachers into `public.teachers`. No-op unless the demo seed flag is on. */
export async function seedTeachers(): Promise<void> {
  if (!DEMO_SEED_ENABLED) {
    warnOnce("seedTeachers");
    return;
  }

  const { DEMO_TEACHERS } = await import("./dev/demoTeachers");
  const supabase = getSupabaseClient();
  for (const teacher of DEMO_TEACHERS) {
    const row = teacherToRow(teacher);
    const { error } = await supabase.from("teachers").upsert(row, { onConflict: "id" });
    if (error) {
      console.warn("seedTeachers: upsert failed for", teacher.id, error.message);
    }
  }
}

/**
 * Seed a couple of `student_progress` rows for a freshly signed-up user.
 * No-op unless the demo seed flag is on — this used to run on every sign-in
 * and silently inserted demo data against fake teacher ids in production.
 */
export async function seedStudentProgress(studentId: string): Promise<void> {
  if (!DEMO_SEED_ENABLED) return;

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
      teacher_id: "1",
      subject: "Piano",
      score: 85,
      notes:
        "Excellent travail sur la sonate de Mozart. La fluidité s'améliore nettement.",
      achievements: ["Lecture fluide", "Rythme maîtrisé"],
    },
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
