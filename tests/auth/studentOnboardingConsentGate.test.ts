import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  hasStudentOnboardingConsent,
  isStudentOnboardingConsentActorType,
  STUDENT_ONBOARDING_CONSENT_VERSION,
} from "@/lib/auth/studentOnboardingConsent";
import { resolvePostAuthRedirect } from "@/lib/auth/postAuthRedirect";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

test("student onboarding consent helper is versioned and strict", () => {
  assert.equal(STUDENT_ONBOARDING_CONSENT_VERSION, "student_onboarding_consent_v1_2026_06");
  assert.equal(isStudentOnboardingConsentActorType("self_14_plus"), true);
  assert.equal(isStudentOnboardingConsentActorType("parent_guardian"), true);
  assert.equal(isStudentOnboardingConsentActorType("under_14"), false);
  assert.equal(
    hasStudentOnboardingConsent({
      student_onboarding_consent_completed_at: "2026-06-20T00:00:00.000Z",
      student_onboarding_consent_version: STUDENT_ONBOARDING_CONSENT_VERSION,
    }),
    true,
  );
  assert.equal(
    hasStudentOnboardingConsent({
      student_onboarding_consent_completed_at: "2026-06-20T00:00:00.000Z",
      student_onboarding_consent_version: "old",
    }),
    false,
  );
});

test("post-auth redirect gates students with companion but missing consent", () => {
  assert.equal(
    resolvePostAuthRedirect("student", {
      companion_chosen: true,
      dashboard: { onboarding_role_confirmed: true },
    }),
    "/student/consent",
  );
  assert.equal(
    resolvePostAuthRedirect("student", {
      companion_chosen: true,
      dashboard: { onboarding_role_confirmed: true },
      student_onboarding_consent_completed_at: "2026-06-20T00:00:00.000Z",
      student_onboarding_consent_version: STUDENT_ONBOARDING_CONSENT_VERSION,
    }),
    "/dashboard",
  );
});

test("authenticated shell routes chosen students to consent before dashboard", () => {
  const shell = read("components/AuthenticatedShell.tsx");
  assert.match(shell, /hasStudentOnboardingConsent/);
  assert.match(shell, /pathname !== "\/student\/consent"/);
  assert.match(shell, /router\.replace\("\/student\/consent"\)/);
  assert.match(shell, /studentConsentComplete && pathname === "\/student\/consent"/);
  assert.match(shell, /role === "teacher"/);
});

test("choose companion page opens consent gate instead of saving companion directly", () => {
  const page = read("app/(app)/student/choose-companion/page.tsx");
  assert.match(page, /StudentOnboardingConsentGate/);
  assert.match(page, /companionType=\{selected\}/);
  assert.match(page, /setShowConsentGate\(true\)/);
  assert.match(page, /hasStudentOnboardingConsent/);
  assert.doesNotMatch(page, /fetch\("\/api\/companion"/);
});

test("consent component blocks under-14 self-declaration and requires all checks", () => {
  const component = read("components/student/StudentOnboardingConsentGate.tsx");
  assert.match(component, /getClientAccessToken/);
  assert.match(component, /credentials: "include"/);
  assert.match(component, /fetch\("\/api\/student\/onboarding-consent"/);
  assert.match(component, /isProductionApexHost/);
  assert.match(component, /resolveOAuthRedirectOrigin/);
  assert.doesNotMatch(component, /fetch\(`\$\{resolveOAuthRedirectOrigin\(\)\}\/api\/student\/onboarding-consent`/);
  assert.doesNotMatch(component, /fetch\(`\$\{apiOrigin\}\/api\/student\/onboarding-consent`/);
  assert.match(component, /"under_14"/);
  assert.match(component, /blockedUnder14/);
  assert.match(component, /studentConsentUnder14Blocked/);
  assert.match(component, /actorType === "self_14_plus" \|\| actorType === "parent_guardian"/);
  assert.match(component, /acceptedTerms/);
  assert.match(component, /acceptedPrivacy/);
  assert.match(component, /acceptedLearningData/);
  assert.match(component, /acknowledgedMinorLessons/);
  assert.match(component, /\/legal\/cgu/);
  assert.match(component, /\/legal\/confidentialite/);
});

test("consent API stores append-only versioned consent and stamps profile", () => {
  const route = read("app/api/student/onboarding-consent/route.ts");
  assert.match(route, /STUDENT_ONBOARDING_CONSENT_VERSION/);
  assert.match(route, /\.from\("student_onboarding_consents"\)\.insert/);
  assert.match(route, /ensureAuthProfileForUser/);
  assert.match(route, /getSupabaseForRequest/);
  assert.match(route, /\.update\(profilePatch\)/);
  assert.match(route, /actor_type: body\.actorType/);
  assert.match(route, /accepted_terms: true/);
  assert.match(route, /accepted_privacy: true/);
  assert.match(route, /accepted_learning_data: true/);
  assert.match(route, /acknowledged_minor_lessons: true/);
  assert.match(route, /student_onboarding_consent_completed_at/);
  assert.match(route, /student_onboarding_consent_version/);
  assert.match(route, /companion_chosen = true|profileUpsert\.companion_chosen = true/);
  assert.match(route, /alreadyHasCurrentConsent/);
  assert.match(route, /if \(!alreadyHasCurrentConsent\)/);
  assert.doesNotMatch(route, /date_of_birth|birthdate|child_age|parent_name|ip_address/i);
  assert.doesNotMatch(route, /teacher.*share|progress.*teacher/i);
});

test("consent API returns generic errors but logs the failing storage stage", () => {
  const route = read("app/api/student/onboarding-consent/route.ts");
  assert.match(route, /function logConsentStorageFailure/);
  assert.match(route, /stage/);
  assert.match(route, /profile_read/);
  assert.match(route, /profile_ensure/);
  assert.match(route, /consent_insert/);
  assert.match(route, /profile_update/);
  assert.match(route, /profile_upsert/);
  assert.match(route, /student_consent_save_failed/);
  assert.match(route, /student_consent_schema_not_ready/);
  assert.doesNotMatch(route, /return NextResponse\.json\(\{ error: readErr\.message \}/);
  assert.doesNotMatch(route, /return NextResponse\.json\(\{ error: insertErr\.message \}/);
  assert.doesNotMatch(route, /return NextResponse\.json\(\{ error: profileErr\?\.message/);
});

test("failed consent insert cannot mark companion or onboarding complete", () => {
  const route = read("app/api/student/onboarding-consent/route.ts");
  const insertErrorIndex = route.indexOf("if (insertErr)");
  const profilePatchIndex = route.indexOf("const profilePatch");
  const companionChosenIndex = route.indexOf("profilePatch.companion_chosen = true");
  assert.ok(insertErrorIndex > -1, "insert error handling is present");
  assert.ok(profilePatchIndex > insertErrorIndex, "profile update happens after consent insert handling");
  assert.ok(companionChosenIndex > profilePatchIndex, "companion completion happens only in profile update payload");
});

test("consent API is student-only and rejects teacher/admin profiles", () => {
  const route = read("app/api/student/onboarding-consent/route.ts");
  assert.match(route, /existingProfile\.role === "teacher"/);
  assert.match(route, /existingProfile\.role === "admin"/);
  assert.match(route, /student_only/);
  assert.doesNotMatch(route, /ensureTeacherProfileRow/);
});

test("consent API repairs missing Google student profiles before saving", () => {
  const route = read("app/api/student/onboarding-consent/route.ts");
  assert.match(route, /if \(!existingProfile\)/);
  assert.match(route, /intent: "learner"/);
  assert.match(route, /profile_ensure/);
});

test("client access token helper refreshes stale OAuth sessions", () => {
  const helper = read("lib/auth/clientAccessToken.ts");
  assert.match(helper, /getSession/);
  assert.match(helper, /refreshSession/);
});

test("consent API accepts cookie sessions when bearer token is absent", () => {
  const helper = read("lib/auth/supabaseRouteClient.ts");
  assert.match(helper, /createServerClient/);
  assert.match(helper, /Authorization: `Bearer \$\{token\}`/);
});

test("consent component logs API stage and status on server failure", () => {
  const component = read("components/student/StudentOnboardingConsentGate.tsx");
  assert.match(component, /\[student\/consent-gate\] save failed/);
  assert.match(component, /status: res\.status/);
  assert.match(component, /stage: payload\?\.stage/);
});

test("consent API authenticates before rate limiting and fails open when limiter infra is down", () => {
  const route = read("app/api/student/onboarding-consent/route.ts");
  const authIndex = route.indexOf('error: "unauthorized"');
  const rateLimitIndex = route.indexOf('rateLimitByIp(request, "student-onboarding-consent"');
  assert.ok(authIndex > -1, "unauthorized response is present");
  assert.ok(rateLimitIndex > authIndex, "rate limit runs after auth");
  assert.match(route, /identifier: user\.id/);
  assert.match(route, /rl\.infrastructureUnavailable/);
});

test("unauthorized consent request still returns 401", () => {
  const route = read("app/api/student/onboarding-consent/route.ts");
  assert.match(route, /if \(authError \|\| !user\)/);
  assert.match(route, /error: "unauthorized"/);
});

test("schema-not-ready returns 503 when migration missing", () => {
  const route = read("app/api/student/onboarding-consent/route.ts");
  assert.match(route, /consentSchemaNotReady/);
  assert.match(route, /student_consent_schema_not_ready/);
});

test("consent API rejects saves when required acceptance flags are false", () => {
  const component = read("components/student/StudentOnboardingConsentGate.tsx");
  const route = read("app/api/student/onboarding-consent/route.ts");
  assert.match(component, /acceptedLearningData/);
  assert.match(component, /acknowledgedMinorLessons/);
  assert.match(route, /body\.acceptedLearningData !== true/);
  assert.match(route, /body\.acknowledgedMinorLessons !== true/);
});

test("student onboarding consent migration creates owner-only RLS table", () => {
  const migration = read("supabase/migrations/084_student_onboarding_consents.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.student_onboarding_consents/);
  assert.match(migration, /actor_type text NOT NULL CHECK \(actor_type IN \('self_14_plus', 'parent_guardian'\)\)/);
  assert.match(migration, /ALTER TABLE public\.student_onboarding_consents ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /student_onboarding_consents_select_own/);
  assert.match(migration, /student_onboarding_consents_insert_own/);
  assert.match(migration, /auth\.uid\(\) = user_id/);
  assert.match(migration, /REVOKE ALL ON public\.student_onboarding_consents FROM anon/);
});

test("FR EN ES consent copy is complete", () => {
  const required = [
    "studentConsentTitle",
    "studentConsentIntro",
    "studentConsentQuestion",
    "studentConsentOptionSelf14Plus",
    "studentConsentOptionParentGuardian",
    "studentConsentOptionUnder14",
    "studentConsentUnder14Blocked",
    "studentConsentTermsPrivacy",
    "studentConsentLearningData",
    "studentConsentMinorLessons",
    "studentConsentConfirm",
  ];
  for (const locale of ["fr", "en", "es"]) {
    const dictionary = JSON.parse(read(`lib/i18n/locales/${locale}.json`)) as Record<string, string>;
    for (const key of required) {
      assert.ok(dictionary[key]?.trim(), `${locale} missing ${key}`);
    }
  }
});

test("Google-only auth is available and magic link remains disabled", () => {
  const login = read("app/login/page.tsx");
  const auth = read("lib/auth.ts");
  assert.match(login, /loginWithGoogle/);
  assert.match(auth, /signInWithOAuth/);
  assert.doesNotMatch(login, /signInWithEmailPassword|signUpWithEmailPassword|type="email"|type="password"/);
  assert.doesNotMatch(auth, /signInWithPassword|signUpWithPassword/);
  assert.doesNotMatch(login + auth, /signInWithOtp|magic link/i);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[auth:studentOnboardingConsentGate] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
