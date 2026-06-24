/**
 * Regression suite for admin-controlled profile deactivation / visibility.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isTeacherMarketplaceVisibleRow } from "@/lib/teachers/marketplaceVisibility";
import {
  isTeacherPublicProfileIndexable,
  isTeacherPublicProfilePageVisible,
} from "@/lib/seo/teacherPublicProfile";
import {
  auditReasonForAction,
  isProfileReactivationAllowed,
  type ProfileDeactivationSnapshot,
} from "@/lib/admin/profileDeactivation";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const ROOT = process.cwd();
function readRepoFile(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const deactivatedTeacherMarketplaceRow = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  is_public: false,
  is_demo: false,
  deactivated_at: "2026-06-18T00:00:00.000Z",
  deleted_at: null,
  identity_status: "verified",
  profile_is_active: false,
  profile_deactivated_at: "2026-06-18T00:00:00.000Z",
  profile_deleted_at: null,
  profile_anonymized_at: null,
};

const activeTeacherSeoRow = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  name: "Marie Dupont",
  bio: "Enseignante passionnée avec plus de dix ans d'expérience en français.",
  discipline: "Français",
  city: "Montréal",
  region: "QC",
  is_public: true,
  deactivated_at: null,
  deleted_at: null,
  is_demo: false,
  identity_status: "verified",
  public_profile_enabled: true,
  search_indexing_consent: true,
  public_profile_slug: "marie-dupont",
  public_profile_last_indexable_at: "2026-06-01T12:00:00.000Z",
  teacher_onboarding_complete: true,
  profile_is_active: true,
  profile_deactivated_at: null,
  profile_deleted_at: null,
  profile_anonymized_at: null,
};

test("deactivated teacher is hidden from marketplace visibility helper", () => {
  assert.equal(isTeacherMarketplaceVisibleRow(deactivatedTeacherMarketplaceRow), false);
});

test("deactivated teacher SEO page is not visible or indexable", () => {
  const seoRow = {
    ...activeTeacherSeoRow,
    is_public: false,
    deactivated_at: "2026-06-18T00:00:00.000Z",
    profile_is_active: false,
    profile_deactivated_at: "2026-06-18T00:00:00.000Z",
    public_profile_enabled: false,
    search_indexing_consent: false,
  };
  assert.equal(isTeacherPublicProfilePageVisible(seoRow), false);
  assert.equal(isTeacherPublicProfileIndexable(seoRow), false);
});

test("isProfileReactivationAllowed blocks deleted or anonymized profiles", () => {
  const base: ProfileDeactivationSnapshot = {
    userId: "u1",
    role: "teacher",
    isActive: false,
    profileDeactivatedAt: "2026-01-01T00:00:00.000Z",
    profileDeletedAt: null,
    profileAnonymizedAt: null,
    deletionRequestedAt: null,
    teacher: null,
  };
  assert.equal(isProfileReactivationAllowed(base), true);
  assert.equal(
    isProfileReactivationAllowed({ ...base, profileDeletedAt: "2026-01-02T00:00:00.000Z" }),
    false,
  );
  assert.equal(
    isProfileReactivationAllowed({ ...base, profileAnonymizedAt: "2026-01-02T00:00:00.000Z" }),
    false,
  );
});

test("auditReasonForAction encodes action and optional reason", () => {
  assert.equal(auditReasonForAction("deactivate", null), "profile-deactivate");
  assert.equal(
    auditReasonForAction("mark_deletion_requested", "user email request"),
    "profile-mark-deletion-requested: user email request",
  );
});

test("admin deactivation API requires requireAdminApi", () => {
  const route = readRepoFile("app/api/admin/users/[id]/deactivation/route.ts");
  assert.match(route, /requireAdminApi\(req\)/);
  assert.match(route, /insertAdminRoleChangeAudit/);
  assert.match(route, /source:\s*"admin\/users\/deactivation"/);
});

test("admin deactivation API blocks self-mutation and admin targets", () => {
  const route = readRepoFile("app/api/admin/users/[id]/deactivation/route.ts");
  assert.match(route, /targetId === actor\.id/);
  assert.match(route, /snapshot\.role === "admin"/);
});

test("admin deactivation API never deletes bookings or Stripe data", () => {
  const route = readRepoFile("app/api/admin/users/[id]/deactivation/route.ts");
  const helper = readRepoFile("lib/admin/profileDeactivation.ts");
  assert.doesNotMatch(route, /from\("bookings"\)\.delete/);
  assert.doesNotMatch(route, /auth\.admin\.deleteUser/);
  assert.doesNotMatch(helper, /from\("bookings"\)\.delete/);
  assert.doesNotMatch(helper, /stripe/i);
});

test("admin deactivation clears teacher SEO fields on deactivate", () => {
  const helper = readRepoFile("lib/admin/profileDeactivation.ts");
  assert.match(helper, /public_profile_enabled:\s*false/);
  assert.match(helper, /search_indexing_consent:\s*false/);
  assert.match(helper, /deactivatePublicPresence/);
});

test("ProfileDeactivationCard is client-only and never imports service-role admin", () => {
  const card = readRepoFile("components/admin/ProfileDeactivationCard.tsx");
  assert.match(card, /"use client"/);
  assert.match(card, /window\.confirm/);
  assert.match(card, /Cette action retire le profil des surfaces publiques/);
  assert.match(card, /ne supprime pas automatiquement le compte Stripe/);
  assert.doesNotMatch(card, /getSupabaseAdmin/);
  assert.doesNotMatch(card, /SUPABASE_SERVICE_ROLE/);
});

test("admin user detail page mounts ProfileDeactivationCard for non-admin users", () => {
  const page = readRepoFile("app/(app)/admin/users/[id]/page.tsx");
  assert.match(page, /ProfileDeactivationCard/);
  assert.match(page, /loadProfileDeactivationSnapshot/);
  assert.match(page, /profile\.role !== "admin"/);
});

test("accountDeletion deactivatePublicPresence preserves profile rows without hard delete", () => {
  const src = readRepoFile("lib/accountDeletion.ts");
  assert.match(src, /is_active:\s*false/);
  assert.match(src, /deactivated_at:\s*now/);
  assert.doesNotMatch(src, /\.delete\(/);
});

(async () => {
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ok  ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`  FAIL ${name}`);
      console.error((error as Error).message);
    }
  }
  console.log(`\n${tests.length - failed} / ${tests.length} passed`);
  if (failed > 0) process.exitCode = 1;
})();
