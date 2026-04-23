import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import fs from "node:fs";
import path from "node:path";

import { TEACHERS } from "../constants";
import { teacherToRow } from "../lib/teacherMapper";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";

function loadEnvFile(filename: string) {
  const full = path.join(process.cwd(), filename);
  if (!fs.existsSync(full)) return;
  const content = fs.readFileSync(full, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function seedTeachersAdmin() {
  const admin = getSupabaseAdmin();
  for (const teacher of TEACHERS) {
    const row = teacherToRow(teacher);
    const { error } = await admin.from("teachers").upsert(row, { onConflict: "id" });
    if (error) throw new Error(`teachers upsert failed for ${teacher.id}: ${error.message}`);
  }
}

async function seedStudentProgressAdmin() {
  const admin = getSupabaseAdmin();

  const { data: studentProfile, error: profErr } = await admin
    .from("profiles")
    .select("id, role")
    .eq("role", "student")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (profErr) throw new Error(`profiles select failed: ${profErr.message}`);
  if (!studentProfile?.id) {
    console.warn("[seed] No student profile found; skipping student_progress seed.");
    return;
  }

  const studentId = studentProfile.id as string;
  const { data: existing, error: selErr } = await admin
    .from("student_progress")
    .select("id")
    .eq("student_id", studentId)
    .limit(1);

  if (selErr) throw new Error(`student_progress select failed: ${selErr.message}`);
  if (existing && existing.length > 0) {
    console.log("[seed] student_progress already exists; skipping inserts.");
    return;
  }

  const demo = [
    {
      student_id: studentId,
      teacher_id: "1",
      subject: "Piano",
      score: 85,
      notes: "Excellent travail sur la sonate de Mozart. La fluidité s'améliore nettement.",
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

  const { error: insErr } = await admin.from("student_progress").insert(demo);
  if (insErr) throw new Error(`student_progress insert failed: ${insErr.message}`);
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in env.");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in env.");
  }

  console.log("[seed] Seeding teachers...");
  await seedTeachersAdmin();
  console.log("[seed] Seeding student progress...");
  await seedStudentProgressAdmin();
  console.log("[seed] Done.");
}

main().catch((e) => {
  console.error("[seed] Failed:", e);
  process.exitCode = 1;
});

