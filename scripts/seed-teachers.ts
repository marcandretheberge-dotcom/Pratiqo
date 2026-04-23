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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  // Ensure env vars are available when running outside Next.js.
  loadEnvFile(".env.local");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in env.");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in env. Seeding requires service role (bypasses RLS).");
  }

  console.log("[seed-teachers] Seeding TEACHERS into Supabase...");
  const admin = getSupabaseAdmin();
  for (const teacher of TEACHERS) {
    const row = teacherToRow(teacher);
    const { error } = await admin.from("teachers").upsert(row, { onConflict: "id" });
    if (error) {
      throw new Error(`Upsert failed for teacher ${teacher.id}: ${error.message}`);
    }
  }
  console.log("[seed-teachers] Done. Verifying Québec City teachers (ids 6, 7, 8)...");

  const { data, error } = await admin
    .from("teachers")
    .select("id, name, location")
    .in("id", ["6", "7", "8"])
    .order("id");

  if (error) throw error;
  console.log("[seed-teachers] Verification rows:", data);
}

main().catch((e) => {
  console.error("[seed-teachers] Failed:", e);
  process.exitCode = 1;
});

