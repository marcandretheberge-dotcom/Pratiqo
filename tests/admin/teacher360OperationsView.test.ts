// Regression suite for the admin-only Teacher 360 operations view.
//
// The feature intentionally surfaces private operational teacher data, but
// only behind /admin server guards. These assertions pin the data boundary:
// admin APIs/pages may read the private address and exact coordinates, while
// public/search/student/SEO surfaces must keep using the stripped projection.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf8").replace(/\r\n/g, "\n");
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

const detailPage = read("app/(app)/admin/users/[id]/page.tsx");
const detailApi = read("app/api/admin/users/[id]/route.ts");
const teacher360 = read("lib/admin/teacher360.ts");

test("admin user detail page renders Teacher 360 only from the admin route", () => {
  const layout = read("app/(app)/admin/layout.tsx");
  assert.match(layout, /requireAdminPage\(/);
  assert.match(detailPage, /loadAdminTeacher360\(admin,\s*profile\.id\)/);
  assert.match(detailPage, /data-testid="admin-teacher-360"/);
  assert.match(detailPage, /Teacher 360/);
});

test("admin users detail API guards with requireAdminApi before loading Teacher 360", () => {
  const requireIdx = detailApi.indexOf("await requireAdminApi(req)");
  const loadIdx = detailApi.indexOf("await loadAdminTeacher360(admin, profileRow.id)");
  assert.ok(requireIdx >= 0, "GET must call requireAdminApi");
  assert.ok(loadIdx > requireIdx, "Teacher 360 must load only after admin auth");
  assert.match(detailApi, /teacher360,/);
});

test("Teacher 360 helper uses canonical visibility and readiness logic", () => {
  assert.match(teacher360, /diagnoseTeacherSearchVisibility/);
  assert.match(teacher360, /deriveTeacherReadinessContract/);
  assert.match(teacher360, /profileVisibilityReady:\s*visibility\.visibleInSearch/);
  assert.match(teacher360, /paymentReady:\s*readiness\.paymentReady/);
  assert.match(teacher360, /payoutReady:\s*readiness\.payoutReady/);
});

test("Stripe incomplete is displayed as payment readiness, not a search blocker", () => {
  assert.match(detailPage, /Payments \/ Stripe/);
  assert.match(detailPage, /Stripe incomplet/);
  assert.match(detailPage, /Visible en recherche/);
  const searchCard =
    detailPage.match(/<Admin360Card title="Visibilit[\s\S]*?<\/Admin360Card>/)?.[0] ?? "";
  assert.doesNotMatch(searchCard, /Stripe incomplet|Paiements activ/);
});

test("admin-only private address fields are labelled and sourced from location.private", () => {
  assert.match(teacher360, /function extractPrivateLocation/);
  assert.match(teacher360, /const privateBlock = asRecord\(location\.private\)/);
  assert.match(teacher360, /address_line1/);
  assert.match(teacher360, /address_line2/);
  assert.match(teacher360, /postal_code/);
  assert.match(teacher360, /lat:\s*cleanNumber\(privateBlock\.lat\)/);
  assert.match(teacher360, /lng:\s*cleanNumber\(privateBlock\.lng\)/);
  assert.match(detailPage, /data-testid="admin-teacher-360-private-address-label"/);
  assert.match(detailPage, /Adresse priv[eé]e[\s\S]*visible admin seulement/);
});

test("public location is shown separately from private address", () => {
  assert.match(teacher360, /function extractPublicLocation/);
  assert.match(detailPage, /Localisation publique/);
  assert.match(detailPage, /Rayon public/);
  assert.match(detailPage, /Signal carte public/);
});

test("schedule and marketplace activity are summaries, not booking modifications", () => {
  assert.match(teacher360, /availabilitySummary/);
  assert.match(teacher360, /computeAvailableDaysForTeacher/);
  assert.match(detailPage, /Schedule \/ availability/);
  assert.match(detailPage, /Marketplace activity/);
  assert.doesNotMatch(teacher360, /\.insert\(/);
  assert.doesNotMatch(teacher360, /\.update\(/);
  assert.doesNotMatch(teacher360, /\.delete\(/);
});

test("Teacher 360 does not import Stripe SDK, YoPratiqo, payment mutation, or booking mutation code", () => {
  for (const src of [teacher360, detailPage, detailApi]) {
    assert.doesNotMatch(src, /from\s+["']stripe["']/);
    assert.doesNotMatch(src, /@\/lib\/stripe/);
    assert.doesNotMatch(src, /@\/lib\/yo\//);
    assert.doesNotMatch(src, /@\/components\/yo\//);
  }
});

test("public teacher search/profile surfaces do not read location.private", () => {
  const publicFiles = [
    "app/LandingPageClient.tsx",
    "app/(app)/student/search/page.tsx",
    "app/teacher/profile/[id]/page.tsx",
    "lib/seo/teacherPublicProfileData.ts",
    "lib/supabase/queries.ts",
  ];

  for (const rel of publicFiles) {
    const src = stripComments(read(rel));
    assert.doesNotMatch(src, /location\.private/);
    assert.doesNotMatch(src, /privateBlock/);
    assert.doesNotMatch(src, /address_line1|address_line2|postal_code/);
  }
});

test("final public teacher projections strip private location data", () => {
  const migration086 = read("supabase/migrations/086_align_teacher_public_search_visibility.sql");
  assert.match(migration086, /\(t\.location - 'private'::text\) AS location/);
  assert.doesNotMatch(migration086, /t\.location\s+AS location/i);
});

test("recommended admin actions are non-destructive links or disabled placeholders", () => {
  assert.match(teacher360, /recommendedActions/);
  assert.match(detailPage, /data-testid="admin-teacher-360-recommended-actions"/);
  assert.doesNotMatch(teacher360, /auto-publish|autopublish|createPromo|promo code/i);
});

async function main() {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`ok - ${t.name}`);
    } catch (error) {
      failed += 1;
      console.error(`not ok - ${t.name}`);
      console.error(error);
    }
  }
  if (failed > 0) {
    console.error(`\n${failed} Teacher 360 test(s) failed`);
    process.exit(1);
  }
  console.log(`\n${tests.length} Teacher 360 assertions passed`);
}

void main();
