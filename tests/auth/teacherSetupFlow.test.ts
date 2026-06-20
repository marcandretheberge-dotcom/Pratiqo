import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  shouldBypassTeacherRoleChoice,
  TEACHER_SETUP_PATH,
  teacherSetupSectionHref,
} from "@/lib/auth/teacherLoginRouting";
import {
  buildTeacherSetupChecklist,
  firstIncompleteTeacherSetupSection,
  teacherSetupProgressPercent,
} from "@/lib/teachers/teacherSetupProgress";
import { primaryRoleForPreAuthIntent } from "@/lib/auth/preAuthOnboardingIntent";
import { isTeacherProfileComplete } from "@/lib/teacherOnboarding";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

test("shouldBypassTeacherRoleChoice skips chooser for teacher role or pending teacher intent", () => {
  assert.equal(shouldBypassTeacherRoleChoice({ profileRole: "teacher" }), true);
  assert.equal(shouldBypassTeacherRoleChoice({ pendingIntent: "teacher" }), true);
  assert.equal(shouldBypassTeacherRoleChoice({ profileRole: "student" }), false);
  assert.equal(shouldBypassTeacherRoleChoice({ pendingIntent: "learner" }), false);
});

test("teacher setup path opens verification in setup mode", () => {
  assert.equal(TEACHER_SETUP_PATH, "/teacher/verification?setup=1");
  assert.equal(teacherSetupSectionHref("profile"), "/teacher/verification?setup=1&section=profile");
});

test("connexion bypasses role chooser for confirmed or pending teachers", () => {
  const page = read("app/connexion/page.tsx");
  assert.match(page, /shouldBypassTeacherRoleChoice/);
  assert.match(page, /hasPendingTeacherIntentClient/);
});

test("AuthenticatedShell sends pending teacher intent to dashboard not role choice", () => {
  const shell = read("components/AuthenticatedShell.tsx");
  assert.match(shell, /teacher-pending-intent-dashboard/);
  assert.match(shell, /hasPendingTeacherIntentClient/);
});

test("choose-role redirects teachers and pending teacher intent to dashboard", () => {
  const page = read("app/(app)/onboarding/choose-role/page.tsx");
  assert.match(page, /pendingTeacherIntent/);
  assert.match(page, /router\.replace\("\/dashboard"\)/);
});

test("auth callback teacher profile read failure routes to onboarding when intent is teacher", () => {
  const route = read("app/auth/callback/route.ts");
  assert.match(route, /stage:\s*"profile-read-fallback"/);
  assert.match(route, /resolveOAuthCallbackRedirect/);
  assert.match(route, /profile:\s*null/);
});

test("dashboard banner and checklist CTAs use editable setup path", () => {
  const dashboard = read("components/Dashboard.tsx");
  assert.match(dashboard, /TEACHER_SETUP_PATH/);
  assert.match(dashboard, /TeacherProfileSetupChecklist/);
  assert.match(dashboard, /TeacherSearchVisibilityBanner ctaHref=\{TEACHER_SETUP_PATH\}/);
});

test("verification page expands first incomplete section in setup mode", () => {
  const page = read("app/(app)/teacher/verification/page.tsx");
  assert.match(page, /setupMode/);
  assert.match(page, /firstIncompleteTeacherSetupSection/);
  assert.match(page, /teacher-setup-mode-banner/);
});

test("verification management page does not expose public profile link for private or inactive teachers", () => {
  const page = read("app/(app)/teacher/verification/page.tsx");
  assert.match(page, /is_public, deactivated_at, deleted_at/);
  assert.match(page, /canOpenPublicProfile/);
  assert.match(page, /teacherRow\.is_public === true/);
  assert.match(page, /!teacherRow\.deactivated_at && !teacherRow\.deleted_at/);
  assert.match(page, /canOpenPublicProfile \? \(/);
});

test("incomplete teachers on my-profile preview redirect to setup path", () => {
  const preview = read("components/teacher/TeacherPublicProfilePreview.tsx");
  assert.match(preview, /TEACHER_SETUP_PATH/);
  assert.match(preview, /router\.replace\(TEACHER_SETUP_PATH\)/);
});

test("my-profile preview repairs missing private teacher row and never uses public visibility lookup", () => {
  const preview = read("components/teacher/TeacherPublicProfilePreview.tsx");
  assert.match(preview, /fetchEnsureTeacherProfile/);
  assert.match(preview, /\.from\("teachers"\)/);
  assert.match(preview, /\.eq\("user_id", user\.id\)/);
  assert.doesNotMatch(preview, /teachers_public/);
  assert.doesNotMatch(preview, /TEACHERS_PUBLIC_TABLE/);
});

test("my-profile public-view CTA only appears after the private row is public", () => {
  const preview = read("components/teacher/TeacherPublicProfilePreview.tsx");
  assert.match(preview, /const isPublic\s*=/);
  assert.match(preview, /publicHref && isPublic/);
  assert.match(preview, /previewProfileHiddenWarning/);
});

test("teacher setup checklist tracks core marketplace fields", () => {
  const incomplete = buildTeacherSetupChecklist({ name: "Marie", bio: "Short" });
  assert.equal(firstIncompleteTeacherSetupSection(incomplete), "profile");
  assert.ok(teacherSetupProgressPercent(incomplete) < 100);

  const complete = buildTeacherSetupChecklist({
    name: "Marie",
    bio: "Experienced piano teacher with 10 years of practice.",
    disciplineCount: 1,
    pricePerLesson: 50,
    availabilityCount: 2,
    city: "Montreal",
    region: "QC",
  });
  assert.equal(teacherSetupProgressPercent(complete), 100);
  assert.equal(firstIncompleteTeacherSetupSection(complete), null);
});

test("incomplete teacher stays ineligible for marketplace completeness", () => {
  assert.equal(
    isTeacherProfileComplete({
      name: "Marie",
      category: "music",
      discipline: "piano",
      city: "",
      region: "QC",
      country_code: "CA",
      timezone: "America/Toronto",
      teaching_mode: "both",
      price_per_lesson: 50,
      availability: [{ day: "monday", slots: ["09h00"] }],
    }),
    false,
  );
});

test("existing admin is not downgraded on learner intent", () => {
  assert.equal(primaryRoleForPreAuthIntent("learner", "admin"), "admin");
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[auth:teacherSetupFlow] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
