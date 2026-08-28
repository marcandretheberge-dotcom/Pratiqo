import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateTeacherDiscovery } from "@/lib/teachers/teacherDiscovery";
import { isTeacherMarketplaceVisibleRow } from "@/lib/teachers/marketplaceVisibility";
import { diagnoseTeacherSearchVisibility } from "@/lib/teachers/searchVisibilityDiagnostics";
import { evaluateTeacherProfilePublishEligibility } from "@/lib/teachers/profilePublishEligibility";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const teacherId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000002";

test("draft teacher with discipline stays discoverable when not opted out", () => {
  assert.equal(
    isTeacherMarketplaceVisibleRow({
      id: teacherId,
      user_id: userId,
      is_public: false,
      marketplace_discovery_opt_out: false,
      discipline: "piano",
    }),
    true,
  );
});

test("opted-out teacher is hidden across discovery helpers", () => {
  const row = {
    id: teacherId,
    user_id: userId,
    is_public: true,
    marketplace_discovery_opt_out: true,
    discipline: "piano",
    profile_is_active: true,
    disciplineCount: 1,
  };

  assert.equal(isTeacherMarketplaceVisibleRow(row), false);
  assert.equal(
    evaluateTeacherDiscovery({
      profile: { role: "teacher", is_active: true },
      teacher: row,
      disciplineCount: 1,
    }).discoverable,
    false,
  );
  assert.equal(
    diagnoseTeacherSearchVisibility({
      profile: {
        id: userId,
        role: "teacher",
        is_active: true,
        deactivated_at: null,
        deleted_at: null,
        anonymized_at: null,
      },
      teacher: {
        id: teacherId,
        user_id: userId,
        name: "Marie",
        discipline: "Piano",
        bio: "Bio longue suffisante pour les tests de visibilité.",
        availability: ["Lun"],
        price_per_lesson: 45,
        teaching_mode: "online",
        city: "Montreal",
        region: "QC",
        country_code: "CA",
        is_public: true,
        marketplace_discovery_opt_out: true,
        is_demo: false,
        identity_verified: true,
      },
      disciplineCount: 1,
    }).visibleInSearch,
    false,
  );
  assert.equal(
    evaluateTeacherProfilePublishEligibility({
      id: teacherId,
      user_id: userId,
      name: "Marie",
      bio: "Bio longue suffisante pour les tests de visibilité.",
      disciplineCount: 1,
      price_per_lesson: 45,
      availability: ["Lun"],
      city: "Montreal",
      region: "QC",
      country_code: "CA",
      is_public: false,
      marketplace_discovery_opt_out: true,
      profile_is_active: true,
    }).status,
    "marketplace_opted_out",
  );
});

test("admin hide and deactivation routes set marketplace opt-out", () => {
  const seoRoute = read("app/api/admin/users/[id]/teacher-seo-publish/route.ts");
  const deactivation = read("lib/admin/profileDeactivation.ts");
  assert.match(seoRoute, /hide_marketplace[\s\S]*marketplace_discovery_opt_out:\s*true/);
  assert.match(deactivation, /marketplace_discovery_opt_out:\s*true/);
  assert.match(deactivation, /marketplace_discovery_opt_out:\s*false/);
});

for (const { name, fn } of tests) {
  fn();
  console.log(`ok - ${name}`);
}

console.log(`[teacherSearch:teacherMarketplaceOptOut] ${tests.length} tests passed`);
