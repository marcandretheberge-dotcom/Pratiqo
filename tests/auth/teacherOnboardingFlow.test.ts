import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  oauthNextPathForPreAuthIntent,
  resolveLoginOAuthNextPath,
} from "@/lib/auth/preAuthOnboardingIntent";
import { resolvePostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { primaryRoleForPreAuthIntent } from "@/lib/auth/preAuthOnboardingIntent";
import { DRAFT_TEACHER_ROW_INSERT } from "@/lib/teachers/ensureTeacherProfileRow";
import { isTeacherProfileComplete } from "@/lib/teacherOnboarding";
import { isTeacherMarketplaceVisibleRow } from "@/lib/teachers/marketplaceVisibility";
import { MIN_LESSON_PRICE_DOLLARS } from "@/lib/pricing/constants";
import {
  buildTeacherOnboardingUpdate,
  resolveWizardHomeLessonEnabled,
} from "@/lib/teachers/onboardingCompletePayload";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

// ── Routing ────────────────────────────────────────────────────────────────

test("teacher OAuth routes to /onboarding/teacher not /dashboard", () => {
  assert.equal(oauthNextPathForPreAuthIntent("teacher"), "/onboarding/teacher");
  assert.equal(resolveLoginOAuthNextPath(null, null, "teacher"), "/onboarding/teacher");
  assert.notEqual(oauthNextPathForPreAuthIntent("teacher"), "/dashboard");
});

test("learner OAuth still routes to /student/choose-companion unchanged", () => {
  assert.equal(oauthNextPathForPreAuthIntent("learner"), "/student/choose-companion");
  assert.equal(resolveLoginOAuthNextPath(null, null, "learner"), "/student/choose-companion");
});

test("confirmed incomplete teacher routes to /onboarding/teacher", () => {
  assert.equal(
    resolvePostAuthRedirect("teacher", { teacher_onboarding_complete: false }),
    "/onboarding/teacher",
  );
  assert.equal(
    resolvePostAuthRedirect("teacher", { teacher_onboarding_complete: null }),
    "/onboarding/teacher",
  );
  assert.equal(
    resolvePostAuthRedirect("teacher", {}),
    "/onboarding/teacher",
  );
});

test("complete teacher routes to /dashboard", () => {
  assert.equal(
    resolvePostAuthRedirect("teacher", { teacher_onboarding_complete: true }),
    "/dashboard",
  );
});

test("new teacher first OAuth handoff via preAuthIntentConsumed routes to /onboarding/teacher", () => {
  assert.equal(
    resolvePostAuthRedirect(
      "teacher",
      { teacher_onboarding_complete: false },
      "/onboarding/teacher",
      { preAuthIntentConsumed: "teacher" },
    ),
    "/onboarding/teacher",
  );
  assert.equal(
    resolvePostAuthRedirect(
      "teacher",
      { teacher_onboarding_complete: false },
      null,
      { preAuthIntentConsumed: "teacher" },
    ),
    "/onboarding/teacher",
  );
});

test("complete teacher with preAuthIntentConsumed routes to /dashboard", () => {
  assert.equal(
    resolvePostAuthRedirect(
      "teacher",
      { teacher_onboarding_complete: true },
      null,
      { preAuthIntentConsumed: "teacher" },
    ),
    "/dashboard",
  );
});

test("/onboarding/choose-role is not shown for confirmed teachers", () => {
  // needsOnboardingRoleChoice returns false for role=teacher
  // Verified by the onboardingRoleChoice tests; confirmed here via code inspection.
  const roleChoice = read("lib/auth/onboardingRoleChoice.ts");
  assert.match(roleChoice, /if \(profile\.role === "teacher"\) return false/);
});

test("teacher with learner intent (existing teacher) routes to dashboard not companion", () => {
  assert.equal(
    resolvePostAuthRedirect(
      "teacher",
      { teacher_onboarding_complete: false },
      "/student/choose-companion",
      { preAuthIntentConsumed: "learner" },
    ),
    "/dashboard",
  );
});

// ── Server-side upsert ─────────────────────────────────────────────────────

test("complete API uses admin client for teacher row upsert (bypasses RLS)", () => {
  const route = read("app/api/teacher/onboarding/complete/route.ts");
  assert.match(route, /getSupabaseAdmin/);
  assert.match(route, /ensureTeacherProfileRow/);
  assert.match(route, /from\("teachers"\)[\s\S]*?\.update\(/);
  // No client-scoped supabase insert — admin only
  assert.doesNotMatch(route, /supabaseUser\.from\("teachers"\)/);
});

test("complete API accepts full wizard profile payload via onboarding update builder", () => {
  const route = read("app/api/teacher/onboarding/complete/route.ts");
  assert.match(route, /buildTeacherOnboardingUpdate\(body\)/);
  const payload = read("lib/teachers/onboardingCompletePayload.ts");
  assert.match(payload, /input\.discipline/);
  assert.match(payload, /input\.city/);
  assert.match(payload, /input\.price_per_lesson/);
  assert.match(payload, /input\.availability/);
  assert.match(payload, /input\.teaching_mode/);
});

test("complete API enforces price minimum on server side", () => {
  const route = read("app/api/teacher/onboarding/complete/route.ts");
  assert.match(route, /MIN_LESSON_PRICE_DOLLARS/);
  assert.match(route, /price < MIN_LESSON_PRICE_DOLLARS/);
});

test("complete API marks profile onboarding-complete server-side", () => {
  const route = read("app/api/teacher/onboarding/complete/route.ts");
  assert.match(route, /teacher_onboarding_complete: true/);
  assert.match(route, /from\("profiles"\)[\s\S]*?\.update\(/);
});

test("minimal onboarding sends only display name and existing consent acknowledgements to complete API", () => {
  const page = read("app/(app)/onboarding/teacher/page.tsx");
  // No client-side teachers insert/update
  assert.doesNotMatch(page, /supabase\.from\("teachers"\)\.insert/);
  assert.doesNotMatch(page, /supabase\.from\("teachers"\)\.update/);
  // Posts only the minimal draft setup payload to complete API
  assert.match(page, /\/api\/teacher\/onboarding\/complete/);
  assert.match(page, /name,/);
  assert.match(page, /tax_status_acknowledged:\s*independentStatusAccepted\s*&&\s*taxResponsibilityAccepted/);
  assert.match(page, /no_exclusivity_acknowledged:\s*noExclusivityAccepted/);
  assert.match(page, /no_income_guarantee_acknowledged:\s*noIncomeGuaranteeAccepted/);
  assert.doesNotMatch(page, /price_per_lesson:/);
  assert.doesNotMatch(page, /city:\s*publicCity/);
  assert.doesNotMatch(page, /availability:\s/);
});

test("minimal onboarding restores all required teacher acknowledgement checkboxes", () => {
  const page = read("app/(app)/onboarding/teacher/page.tsx");
  assert.match(page, /data-testid="teacher-minimal-consent-section"/);
  for (const id of [
    "independent-status",
    "tax-responsibility",
    "profile-accuracy",
    "private-profile",
    "no-exclusivity",
    "no-income-guarantee",
  ]) {
    assert.match(page, new RegExp(`teacher-minimal-consent-\\$\\{item\\.id\\}`));
    assert.match(page, new RegExp(`id: "${id}"`));
  }
  for (const key of [
    "teacherOnboardingLegalSelfEmployed",
    "teacherMinimalSetupTaxResponsibility",
    "teacherMinimalSetupProfileAccuracy",
    "teacherMinimalSetupPrivateUntilComplete",
    "teacherOnboardingLegalNoExclusivity",
    "teacherOnboardingLegalNoIncomeGuarantee",
  ]) {
    assert.match(page, new RegExp(key));
  }
});

test("minimal onboarding keeps consent rows tappable on mobile", () => {
  const page = read("app/(app)/onboarding/teacher/page.tsx");
  assert.match(page, /min-h-11 gap-3 rounded-xl/);
  assert.match(page, /rounded-\[1\.75rem\]/);
});

test("minimal onboarding submit stays disabled until display name and every acknowledgement are checked", () => {
  const page = read("app/(app)/onboarding/teacher/page.tsx");
  assert.match(page, /const\s+allConsentsAccepted\s*=\s*useMemo/);
  for (const stateName of [
    "independentStatusAccepted",
    "taxResponsibilityAccepted",
    "profileAccuracyAccepted",
    "privateProfileAccepted",
    "noExclusivityAccepted",
    "noIncomeGuaranteeAccepted",
  ]) {
    assert.match(page, new RegExp(stateName));
  }
  assert.match(page, /displayName\.trim\(\)\.length\s*>=\s*2\s*&&\s*allConsentsAccepted/);
  assert.match(page, /disabled=\{!canSubmit\}/);
});

test("wizard no longer calls separate /api/teacher/pricing endpoint", () => {
  const page = read("app/(app)/onboarding/teacher/page.tsx");
  assert.doesNotMatch(page, /\/api\/teacher\/pricing/);
});

// ── Search visibility ──────────────────────────────────────────────────────

test("draft teacher row has is_public false (hidden from search)", () => {
  assert.equal(DRAFT_TEACHER_ROW_INSERT.is_public, false);
  assert.equal(DRAFT_TEACHER_ROW_INSERT.price_per_lesson, MIN_LESSON_PRICE_DOLLARS);
});

test("incomplete teacher is not marketplace-visible", () => {
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
      availability: ["Lun Matin"],
    }),
    false,
  );
  assert.equal(
    isTeacherMarketplaceVisibleRow({
      id: "00000000-0000-4000-8000-000000000001",
      user_id: "00000000-0000-4000-8000-000000000002",
      is_public: false,
      deactivated_at: null,
      deleted_at: null,
    }),
    false,
  );
});

test("complete teacher with valid price remains marketplace-eligible", () => {
  assert.equal(
    isTeacherProfileComplete({
      name: "Marie",
      category: "music",
      discipline: "piano",
      city: "Montreal",
      region: "QC",
      country_code: "CA",
      timezone: "America/Toronto",
      teaching_mode: "both",
      price_per_lesson: 50,
      availability: ["Lun Matin"],
    }),
    true,
  );
});

test("price minimum constraint is 20 CAD", () => {
  assert.equal(MIN_LESSON_PRICE_DOLLARS, 20);
});

// ── Admin / role protection ────────────────────────────────────────────────

test("admin is not downgraded by teacher intent", () => {
  assert.equal(primaryRoleForPreAuthIntent("teacher", "admin"), "admin");
  assert.equal(primaryRoleForPreAuthIntent("learner", "admin"), "admin");
});

test("complete API maps ensure failures to generic client error code", () => {
  const route = read("app/api/teacher/onboarding/complete/route.ts");
  assert.match(route, /teacher_profile_ensure_failed/);
  assert.doesNotMatch(route, /error: ensured\.error/);
});

test("wizard maps ensure/update failure codes to friendly localized message", () => {
  const page = read("app/(app)/onboarding/teacher/page.tsx");
  assert.match(page, /teacher_profile_ensure_failed/);
  assert.match(page, /teacher_onboarding_update_failed/);
  assert.match(page, /verificationNoTeacherRowSetup/);
});

test("minimal onboarding redirects into profile management setup after draft creation", () => {
  const page = read("app/(app)/onboarding/teacher/page.tsx");
  assert.match(page, /SETUP_DESTINATION\s*=\s*"\/teacher\/verification\?setup=1"/);
  assert.match(page, /router\.replace\(SETUP_DESTINATION\)/);
});

test("minimal onboarding page does not collect full public/search fields", () => {
  const page = read("app/(app)/onboarding/teacher/page.tsx");
  assert.match(page, /teacher-minimal-display-name/);
  assert.match(page, /teacher-minimal-consent/);
  assert.doesNotMatch(page, /teacherOnboardingDiscipline/);
  assert.doesNotMatch(page, /teacherOnboardingPrice/);
  assert.doesNotMatch(page, /teacherOnboardingAvailability/);
  assert.doesNotMatch(page, /teacherSearchIndexingConsent/);
});

test("onboarding complete payload builder handles encoded hybrid teaching mode", () => {
  assert.equal(resolveWizardHomeLessonEnabled({ teaching_mode: "all" }), true);
  assert.equal(resolveWizardHomeLessonEnabled({ teaching_mode: "home" }), true);
  assert.equal(resolveWizardHomeLessonEnabled({ teaching_mode: "online" }), false);
  assert.equal(resolveWizardHomeLessonEnabled({ home_lesson_enabled: true, teaching_mode: "online" }), true);

  const update = buildTeacherOnboardingUpdate({
    name: "Marie",
    discipline: "Piano",
    category: "Musique",
    city: "Montreal",
    region: "QC",
    country_code: "CA",
    timezone: "America/Toronto",
    currency: "CAD",
    teaching_mode: "all",
    price_per_lesson: 50,
    availability: ["Lun Matin"],
    default_lesson_duration_minutes: 60,
    home_lesson_enabled: true,
    home_lesson_price: 50,
    home_lesson_radius_km: 25,
    levels: ["beginner"],
    location: { public: { city: "Montreal" } },
  });
  assert.equal(update.home_lesson_enabled, true);
  assert.equal(update.home_lesson_price, 50);
  assert.equal(update.price_per_lesson, 50);
  assert.equal(update.teaching_mode, "all");
});

test("draft ensure insert satisfies teachers price NOT NULL and minimum check", () => {
  assert.ok(DRAFT_TEACHER_ROW_INSERT.price_per_lesson >= MIN_LESSON_PRICE_DOLLARS);
  const schema = read("supabase/migrations/000_pratiqo_schema.sql");
  assert.match(schema, /price_per_lesson numeric NOT NULL/);
});

test("complete API blocks admin profiles from completing teacher onboarding", () => {
  const route = read("app/api/teacher/onboarding/complete/route.ts");
  assert.match(route, /profileRole\s*===\s*"admin"[\s\S]*?403/);
});

test("teacher onboarding complete route repairs a missing profile for an authenticated teacher session", () => {
  const route = read("app/api/teacher/onboarding/complete/route.ts");
  assert.match(route, /if \(!profileMeta\)/);
  assert.match(route, /teacher_onboarding_profile_repair_failed/);
  assert.match(route, /\.from\("profiles"\)[\s\S]*?\.upsert\(/);
  assert.match(route, /role:\s*"teacher"/);
  assert.match(route, /teacher_onboarding_complete:\s*false/);
  assert.match(route, /companion_chosen:\s*false/);
});

test("teacher onboarding complete route returns 403 for existing non-teacher profiles", () => {
  const route = read("app/api/teacher/onboarding/complete/route.ts");
  assert.match(route, /teacher_onboarding_requires_teacher_role/);
  assert.match(route, /profileRole\s*!==\s*"teacher"[\s\S]*?status:\s*403/);
});

test("teacher onboarding complete route never returns an ambiguous 404", () => {
  const route = read("app/api/teacher/onboarding/complete/route.ts");
  assert.doesNotMatch(route, /status:\s*404/);
});

test("wizard maps profile repair failure code to friendly localized message", () => {
  const page = read("app/(app)/onboarding/teacher/page.tsx");
  assert.match(page, /teacher_onboarding_profile_repair_failed/);
  assert.match(page, /verificationNoTeacherRowSetup/);
});

// ── Stage-specific completion failure (teacher row already exists by then) ─

test("profile completion failure is a distinct stage code, not mislabeled as ensure failure", () => {
  const route = read("app/api/teacher/onboarding/complete/route.ts");
  assert.match(route, /teacher_profile_completion_failed/);
  // The completion-stage error path must not return the ensure or update codes.
  const completionBlock = route.slice(route.indexOf("Mark profile as onboarding-complete"));
  assert.doesNotMatch(completionBlock, /teacher_profile_ensure_failed/);
  assert.doesNotMatch(completionBlock, /teacher_onboarding_update_failed/);
});

test("complete API does not leak raw profile completion DB error message to the client", () => {
  const route = read("app/api/teacher/onboarding/complete/route.ts");
  const completionBlock = route.slice(route.indexOf("Mark profile as onboarding-complete"));
  assert.doesNotMatch(completionBlock, /error:\s*updateErr\.message/);
});

test("complete API wraps the handler so unexpected throws return a structured code, not a crash", () => {
  const route = read("app/api/teacher/onboarding/complete/route.ts");
  assert.match(route, /export async function POST/);
  assert.match(route, /try\s*\{[\s\S]*?await handlePost/);
  assert.match(route, /teacher_onboarding_unexpected_error/);
});

test("wizard maps profile-completion failure code to friendly localized message", () => {
  const page = read("app/(app)/onboarding/teacher/page.tsx");
  assert.match(page, /teacher_profile_completion_failed/);
  assert.match(page, /verificationNoTeacherRowSetup/);
});

test("ensureTeacherProfileRow returns the existing row id on retry instead of re-inserting", () => {
  const src = read("lib/teachers/ensureTeacherProfileRow.ts");
  assert.match(src, /if \(existing\?\.id\)/);
  assert.match(src, /created: false/);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[auth:teacherOnboardingFlow] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
