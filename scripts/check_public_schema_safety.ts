import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message: string): never {
  console.error(`[public-schema-safety] ${message}`);
  process.exit(1);
}

function latestMigrationContaining(token: string): { file: string; content: string } {
  const migrationsDir = path.join(root, "supabase", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .reverse();

  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    if (content.includes(token)) {
      return { file, content };
    }
  }

  fail(`No migration containing ${token} was found.`);
}

const queries = read("lib/supabase/queries.ts");
const listSelectMatch = queries.match(/TEACHERS_LIST_SELECT\s*=\s*([\s\S]*?);/);
if (!listSelectMatch) {
  fail("Could not find TEACHERS_LIST_SELECT in lib/supabase/queries.ts.");
}

const teachersListSelect = listSelectMatch[1].toLowerCase();
const forbiddenPublicSelectFields = [
  "diploma_url",
  "stripe_account_id",
  "stripe_identity_session_id",
  "stripe_identity_failed_reason",
  "stripe_connect_requirements_due",
  "location.private",
  "deleted_at",
  "deactivated_at",
];

for (const field of forbiddenPublicSelectFields) {
  if (teachersListSelect.includes(field)) {
    fail(`TEACHERS_LIST_SELECT exposes forbidden field "${field}".`);
  }
}

if (!teachersListSelect.includes("diploma_pending")) {
  fail("TEACHERS_LIST_SELECT should expose diploma_pending instead of diploma_url.");
}

const latestTeachersPublic = latestMigrationContaining("teachers_public");
const viewSql = latestTeachersPublic.content.toLowerCase();

const forbiddenViewExposurePatterns = [
  /\bt\.diploma_url\s*(?:,|\bas\s+diploma_url\b)/,
  /\bdiploma_url\s*,/,
  /\bt\.stripe_account_id\b/,
  /\bt\.stripe_identity_session_id\b/,
  /\bt\.stripe_identity_failed_reason\b/,
  /\bt\.stripe_connect_requirements_due\b/,
  /\bt\.deleted_at\s*,/,
  /\bt\.deactivated_at\s*,/,
];

for (const pattern of forbiddenViewExposurePatterns) {
  if (pattern.test(viewSql)) {
    fail(`${latestTeachersPublic.file} exposes a forbidden private field in teachers_public.`);
  }
}

if (!viewSql.includes("location - 'private'")) {
  fail(`${latestTeachersPublic.file} must strip location.private from teachers_public.`);
}

if (!viewSql.includes("diploma_pending")) {
  fail(`${latestTeachersPublic.file} should expose diploma_pending as the public diploma status.`);
}

console.log(`[public-schema-safety] OK (${latestTeachersPublic.file})`);
