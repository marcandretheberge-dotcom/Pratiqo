import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  evaluateTeacherProfilePublishEligibility,
} from "@/lib/teachers/profilePublishEligibility";
import { isTeacherMarketplaceVisibleRow } from "@/lib/teachers/marketplaceVisibility";
import { isTeacherPublicProfileIndexable } from "@/lib/seo/teacherPublicProfile";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
const root = process.cwd();

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const TEACHER_ID = "afe6eab4-f40d-4d84-add9-8e061184ef6f";
const USER_ID = "0bbed16d-e677-47b3-9c87-03fca0109704";

function eligibleDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: TEACHER_ID,
    user_id: USER_ID,
    name: "Marie Dubois",
    bio: "Professeure passionnée avec plus de dix ans d'expérience.",
    disciplineCount: 1,
    price_per_lesson: 45,
    availability: ["Lun Matin"],
    city: "Montréal",
    region: "QC",
    country_code: "CA",
    is_public: false,
    is_demo: false,
    deactivated_at: null,
    deleted_at: null,
    identity_verification_failed: false,
    profile_is_active: true,
    profile_deactivated_at: null,
    profile_deleted_at: null,
    profile_anonymized_at: null,
    ...overrides,
  };
}

test("private draft teacher is not marketplace-visible", () => {
  const row = eligibleDraft({ is_public: false });
  assert.equal(isTeacherMarketplaceVisibleRow(row), false);
});

test("incomplete teacher cannot publish", () => {
  const evaluation = evaluateTeacherProfilePublishEligibility(
    eligibleDraft({ bio: "short", availability: [] }),
  );
  assert.equal(evaluation.status, "incomplete");
  assert.equal(evaluation.canPublish, false);
  assert.ok(evaluation.missingSectionIds.length > 0);
});

test("eligible complete teacher can publish when private", () => {
  const evaluation = evaluateTeacherProfilePublishEligibility(eligibleDraft());
  assert.equal(evaluation.status, "ready_to_publish");
  assert.equal(evaluation.canPublish, true);
  assert.equal(evaluation.canUnpublish, false);
});

test("published eligible teacher is marketplace-visible", () => {
  const row = eligibleDraft({ is_public: true });
  assert.equal(evaluateTeacherProfilePublishEligibility(row).status, "public");
  assert.equal(isTeacherMarketplaceVisibleRow(row), true);
});

test("admin-deactivated teacher cannot publish", () => {
  const evaluation = evaluateTeacherProfilePublishEligibility(
    eligibleDraft({ deactivated_at: "2026-01-01T00:00:00.000Z" }),
  );
  assert.equal(evaluation.status, "admin_hidden");
  assert.equal(evaluation.canPublish, false);
});

test("identity verification failure blocks publish without exposing raw identity_status", () => {
  const evaluation = evaluateTeacherProfilePublishEligibility(
    eligibleDraft({ identity_verification_failed: true }),
  );
  assert.equal(evaluation.canPublish, false);
  assert.ok(evaluation.blockers.includes("identity_failed"));
  assert.equal(isTeacherMarketplaceVisibleRow(eligibleDraft({ identity_verification_failed: true, is_public: true })), false);
});

test("published teacher can unpublish", () => {
  const evaluation = evaluateTeacherProfilePublishEligibility(eligibleDraft({ is_public: true }));
  assert.equal(evaluation.canUnpublish, true);
});

test("private teacher SEO profile is not indexable", () => {
  const row = {
    ...eligibleDraft({ is_public: false }),
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "marie-dubois",
    teacher_onboarding_complete: true,
    subject_count: 1,
  };
  assert.equal(isTeacherPublicProfileIndexable(row), false);
});

test("visibility API requires auth and teacher role checks", () => {
  const route = read("app/api/teacher/profile/visibility/route.ts");
  assert.match(route, /getAuthenticatedUser/);
  assert.match(route, /Teacher role required/);
  assert.match(route, /action === "publish"/);
  assert.match(route, /action === "unpublish"/);
  assert.match(route, /evaluateTeacherProfilePublishEligibility/);
  assert.match(route, /\.eq\("user_id", user\.id\)/);
  assert.doesNotMatch(route, /identity_status/);
  assert.match(route, /isIdentityVerificationFailed/);
});

test("publish updates only is_public and never touches Stripe or commission fields", () => {
  const route = read("app/api/teacher/profile/visibility/route.ts");
  assert.match(route, /update\(\{ is_public: true/);
  assert.match(route, /update\(\{ is_public: false/);
  assert.doesNotMatch(route, /stripe_connect/);
  assert.doesNotMatch(route, /commission/);
  assert.doesNotMatch(route, /plan/);
  assert.doesNotMatch(route, /deactivated_at: body\.is_public \? null : new Date/);
});

test("dashboard visibility card does not pass raw identity_status", () => {
  const dashboard = read("components/Dashboard.tsx");
  assert.match(dashboard, /identity_verification_failed/);
  assert.doesNotMatch(dashboard, /identity_status/);
});

test("dashboard uses compact profile status; full visibility card stays on Gestion du profil", () => {
  const dashboard = read("components/Dashboard.tsx");
  const verification = read("app/(app)/teacher/verification/page.tsx");
  const card = read("components/teacher/TeacherProfileVisibilityCard.tsx");
  assert.doesNotMatch(dashboard, /TeacherProfileVisibilityCard/);
  assert.doesNotMatch(dashboard, /TeacherSeoReadinessCard/);
  assert.doesNotMatch(dashboard, /TeacherProfileCompletenessCard/);
  assert.match(dashboard, /TeacherProfileStatusCard/);
  assert.match(dashboard, /TeacherDashboardActionCenter/);
  assert.match(verification, /TeacherProfileVisibilityCard/);
  assert.match(verification, /TeacherSeoReadinessCard/);
  assert.match(card, /data-testid="teacher-profile-visibility-card"/);
});

test("publish/unpublish and onboarding copy exist in FR EN ES", () => {
  for (const loc of ["fr", "en", "es"] as const) {
    const json = JSON.parse(read(`lib/i18n/locales/${loc}.json`)) as Record<string, string>;
    assert.ok(json.teacherProfilePublishButton);
    assert.ok(json.teacherProfileUnpublishButton);
    assert.ok(json.teacherOnboardingSavedNotPublishedBody);
    assert.ok(json.teacherProfileVisibilityStatusPublic);
  }
});

test("onboarding completion copy does not imply automatic public launch", () => {
  const fr = read("lib/i18n/locales/fr.json");
  const en = read("lib/i18n/locales/en.json");
  const es = read("lib/i18n/locales/es.json");
  assert.match(fr, /publiez votre profil/i);
  assert.match(en, /publish your profile/i);
  assert.match(es, /publica tu perfil/i);
  assert.doesNotMatch(fr + en + es, /automatically visible|visible immédiatement|visible automáticamente/i);
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log(`[teachers:profilePublishVisibility] ${passed} tests passed`);
}
