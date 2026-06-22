/**
 * Teacher diploma storage privacy regression suite.
 *
 * Ensures diploma files stay in a private bucket and are never exposed via
 * permanent public URLs on marketplace or student surfaces.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  TEACHER_DIPLOMA_BUCKET,
  isTeacherDiplomaPublicObjectUrl,
  isTeacherDiplomaStoragePath,
} from "../../lib/teachers/diplomaStorage";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const migration018 = read("supabase/migrations/018_identity_status_diploma_url.sql");
const diplomaUploadSrc = read("app/api/teacher/diploma/route.ts");
const adminReviewSrc = read("app/api/admin/review/route.ts");
const migration070 = read("supabase/migrations/070_teachers_public_read_isolation.sql");

test("migration 018 documents teacher-diplomas as a private bucket", () => {
  assert.match(migration018, /teacher-diplomas/);
  assert.match(migration018, /PRIVATE/i);
  assert.match(migration018, /'teacher-diplomas'[\s\S]*false/);
});

test("diploma upload route never calls getPublicUrl on teacher-diplomas", () => {
  assert.doesNotMatch(diplomaUploadSrc, /getPublicUrl/);
  assert.match(diplomaUploadSrc, /TEACHER_DIPLOMA_BUCKET|teacher-diplomas/);
  assert.match(diplomaUploadSrc, /\.upload\(/);
});

test("admin review uses signed URLs only for diploma access", () => {
  assert.match(adminReviewSrc, /createSignedUrl\(path, SIGNED_URL_TTL\)/);
  assert.doesNotMatch(adminReviewSrc, /getPublicUrl/);
});

test("teachers_public view excludes diploma_url from public reads", () => {
  const viewBlock =
    migration070.match(/CREATE VIEW public\.teachers_public[\s\S]*?;\n\n/)?.[0] ?? "";
  assert.notEqual(viewBlock, "");
  assert.doesNotMatch(viewBlock, /\bdiploma_url\b/);
});

test("isTeacherDiplomaPublicObjectUrl detects permanent public diploma URLs", () => {
  assert.equal(
    isTeacherDiplomaPublicObjectUrl(
      "https://xyz.supabase.co/storage/v1/object/public/teacher-diplomas/user/file.pdf",
    ),
    true,
  );
  assert.equal(isTeacherDiplomaPublicObjectUrl("user-id/teacher-id-123.pdf"), false);
});

test("isTeacherDiplomaStoragePath accepts private object keys only", () => {
  assert.equal(isTeacherDiplomaStoragePath("abc123/teacher-456.pdf"), true);
  assert.equal(
    isTeacherDiplomaStoragePath(
      "https://xyz.supabase.co/storage/v1/object/public/teacher-diplomas/x.pdf",
    ),
    false,
  );
});

test("TEACHER_DIPLOMA_BUCKET constant matches migration bucket id", () => {
  assert.equal(TEACHER_DIPLOMA_BUCKET, "teacher-diplomas");
});

test("legal confidentiality copy does not claim diplomas are public", () => {
  const confidentialite = read("app/(app)/legal/confidentialite/page.tsx");
  assert.doesNotMatch(confidentialite, /dipl[oô]me.*public/i);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[security:teacherDiplomaStoragePrivacy] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
