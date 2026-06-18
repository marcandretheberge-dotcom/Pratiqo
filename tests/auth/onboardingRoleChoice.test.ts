import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildOnboardingRoleChoicePath,
  isOnboardingRoleChoicePath,
  needsOnboardingRoleChoice,
  ONBOARDING_ROLE_CHOICE_PATH,
  resolveProfileDashboardFromAuth,
} from "@/lib/auth/onboardingRoleChoice";
import {
  buildConnexionHref,
  buildConnexionHrefForProtectedReturn,
  buildLoginHrefAfterOAuth,
  buildLoginHrefWithPreAuthIntent,
  CONNEXION_PATH,
  inferPreAuthIntentFromNextPath,
  oauthNextPathForPreAuthIntent,
  parsePublicPreAuthIntent,
  primaryRoleForPreAuthIntent,
  resolveLoginOAuthNextPath,
  resolveOAuthProfilePatch,
  resolvePreAuthIntent,
} from "@/lib/auth/preAuthOnboardingIntent";
import { resolvePostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";
import { resolveProfileRoleOnAuth } from "@/lib/auth/admin";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

test("generic Se connecter routes logged-out users to pre-auth connexion", () => {
  const header = read("components/marketing/LandingHeader.tsx");
  assert.match(header, /\/connexion/);
  const shell = read("components/AuthenticatedShell.tsx");
  assert.match(shell, /buildConnexionHrefForProtectedReturn/);
});

test("Apprenant pre-auth choice builds login with intent=learner", () => {
  assert.equal(buildLoginHrefWithPreAuthIntent("learner"), "/login?intent=learner");
});

test("Professeur pre-auth choice builds login with intent=teacher", () => {
  assert.equal(buildLoginHrefWithPreAuthIntent("teacher"), "/login?intent=teacher");
});

test("parsePublicPreAuthIntent rejects admin and arbitrary roles", () => {
  assert.equal(parsePublicPreAuthIntent("admin"), null);
  assert.equal(parsePublicPreAuthIntent("owner"), null);
  assert.equal(parsePublicPreAuthIntent("learner"), "learner");
  assert.equal(parsePublicPreAuthIntent("teacher"), "teacher");
});

test("resolveLoginOAuthNextPath routes learner intent to companion path", () => {
  assert.equal(resolveLoginOAuthNextPath(null, null, "learner"), "/student/choose-companion");
});

test("resolveLoginOAuthNextPath routes teacher intent to teacher onboarding", () => {
  assert.equal(resolveLoginOAuthNextPath(null, null, "teacher"), "/onboarding/teacher");
});

test("resolveOAuthProfilePatch persists student role + onboarding_role_confirmed for learner intent", () => {
  const patch = resolveOAuthProfilePatch({ intent: "learner", existingRole: null, existingDashboard: {} });
  assert.equal(patch?.role, "student");
  assert.equal(patch?.dashboard.onboarding_role_confirmed, true);
});

test("resolveOAuthProfilePatch persists teacher role + onboarding_role_confirmed for teacher intent", () => {
  const patch = resolveOAuthProfilePatch({ intent: "teacher", existingRole: null, existingDashboard: {} });
  assert.equal(patch?.role, "teacher");
  assert.equal(patch?.dashboard.onboarding_role_confirmed, true);
});

test("valid pre-auth intent does not route to choose-role after OAuth", () => {
  assert.equal(oauthNextPathForPreAuthIntent("learner"), "/student/choose-companion");
  assert.equal(oauthNextPathForPreAuthIntent("teacher"), "/onboarding/teacher");
  assert.equal(resolveLoginOAuthNextPath(null, null, "learner"), "/student/choose-companion");
  assert.doesNotMatch(resolveLoginOAuthNextPath(null, null, "teacher"), /choose-role/);
});

test("resolvePostAuthRedirect skips choose-role when pre-auth intent was consumed", () => {
  assert.equal(
    resolvePostAuthRedirect(
      "student",
      { companion_chosen: false, dashboard: {} },
      "/student/choose-companion",
      { preAuthIntentConsumed: "learner" },
    ),
    "/student/choose-companion",
  );
  assert.equal(
    resolvePostAuthRedirect(
      "teacher",
      { teacher_onboarding_complete: false, dashboard: {} },
      "/onboarding/teacher",
      { preAuthIntentConsumed: "teacher" },
    ),
    "/onboarding/teacher",
  );
  assert.doesNotMatch(
    resolvePostAuthRedirect(
      "student",
      { companion_chosen: false, dashboard: {} },
      "/student/choose-companion",
      { preAuthIntentConsumed: "learner" },
    ),
    /choose-role/,
  );
});

test("resolvePostAuthRedirect sends confirmed students without companion to chooser", () => {
  assert.equal(
    resolvePostAuthRedirect("student", {
      companion_chosen: false,
      dashboard: { onboarding_role_confirmed: true },
    }),
    "/student/choose-companion",
  );
});

test("resolvePostAuthRedirect sends unconfirmed students to role-choice fallback", () => {
  assert.equal(
    resolvePostAuthRedirect("student", { companion_chosen: false, dashboard: {} }),
    ONBOARDING_ROLE_CHOICE_PATH,
  );
});

test("resolvePostAuthRedirect still sends incomplete teachers to teacher onboarding", () => {
  assert.equal(
    resolvePostAuthRedirect("teacher", { teacher_onboarding_complete: false }),
    "/onboarding/teacher",
  );
});

test("existing admin is not downgraded by pre-auth intent patch", () => {
  assert.equal(primaryRoleForPreAuthIntent("learner", "admin"), "admin");
  assert.equal(
    resolveOAuthProfilePatch({ intent: "learner", existingRole: "admin", existingDashboard: {} })?.role,
    "admin",
  );
  assert.equal(
    resolveProfileRoleOnAuth({
      existingRole: "admin",
      signUpRoleParam: "teacher",
      email: "admin@example.com",
      adminLoginEmails: [],
    }),
    "admin",
  );
});

test("existing teacher is not downgraded when learner path is chosen", () => {
  assert.equal(primaryRoleForPreAuthIntent("learner", "teacher"), "teacher");
});

test("unsafe next URLs are sanitized", () => {
  assert.equal(sanitizeRelativeRedirectPath("https://evil.example.com"), null);
  assert.equal(resolveLoginOAuthNextPath(null, "https://evil.example.com", "learner"), "/student/choose-companion");
});

test("connexion page exists outside AuthenticatedShell", () => {
  const src = read("app/connexion/page.tsx");
  assert.match(src, /onboardingRoleChoiceHeading/);
  assert.match(src, /continueWithIntent\("learner"\)/);
  assert.match(src, /continueWithIntent\("teacher"\)/);
  assert.match(src, /buildLoginHrefWithPreAuthIntent/);
});

test("connexion skips role chooser when intent is already in the URL", () => {
  const src = read("app/connexion/page.tsx");
  assert.match(src, /if \(!highlightIntent\) return/);
  assert.match(src, /router\.replace\(buildLoginHrefFromConnexion/);
  assert.match(src, /if \(highlightIntent\)[\s\S]*?Redirection/);
});

test("login page does not render the full Apprenant/Professeur chooser", () => {
  const src = read("app/login/page.tsx");
  assert.doesNotMatch(src, /onboardingRoleChoiceHeading/);
  assert.doesNotMatch(src, /continueWithIntent\(/);
  assert.doesNotMatch(src, /chooseRole\(/);
});

test("login page shows intent-specific confirmation copy instead of role cards", () => {
  const src = read("app/login/page.tsx");
  assert.match(src, /loginIntentLearnerTitle/);
  assert.match(src, /loginIntentTeacherTitle/);
  assert.match(src, /loginIntentContinueHint/);
  assert.match(src, /preAuthIntent === "learner"/);
  assert.match(src, /preAuthIntent === "teacher"/);
});

test("inferPreAuthIntentFromNextPath recovers teacher and learner destinations", () => {
  assert.equal(inferPreAuthIntentFromNextPath("/onboarding/teacher"), "teacher");
  assert.equal(inferPreAuthIntentFromNextPath("/onboarding/teacher?vertical=musique"), "teacher");
  assert.equal(inferPreAuthIntentFromNextPath("/student/choose-companion"), "learner");
  assert.equal(inferPreAuthIntentFromNextPath("/dashboard"), null);
  assert.equal(inferPreAuthIntentFromNextPath("https://evil.example.com"), null);
});

test("resolvePreAuthIntent combines query intent and safe next-path inference", () => {
  assert.equal(resolvePreAuthIntent(null, null, "/onboarding/teacher"), "teacher");
  assert.equal(resolvePreAuthIntent("learner", null, "/onboarding/teacher"), "learner");
});

test("buildConnexionHrefForProtectedReturn preserves teacher intent for onboarding return", () => {
  assert.equal(
    buildConnexionHrefForProtectedReturn("/onboarding/teacher"),
    "/connexion?next=%2Fonboarding%2Fteacher&intent=teacher",
  );
});

test("buildLoginHrefAfterOAuth stages post-OAuth session handoff on public login", () => {
  assert.equal(
    buildLoginHrefAfterOAuth("teacher", "/onboarding/teacher"),
    "/login?intent=teacher&next=%2Fonboarding%2Fteacher",
  );
});

test("middleware redirects unauthenticated protected routes to connexion with inferred intent", () => {
  const src = read("middleware.ts");
  assert.match(src, /buildConnexionHrefForProtectedReturn/);
  assert.match(src, /CONNEXION_PATH/);
  assert.doesNotMatch(src, /loginUrl\.searchParams\.set\("next"/);
});

test("auth callback stages intent signups through login before protected onboarding", () => {
  const src = read("app/auth/callback/route.ts");
  assert.match(src, /buildLoginHrefAfterOAuth/);
  assert.match(src, /resolveOAuthProfilePatch/);
});

test("login page redirects to connexion when no pre-auth intent", () => {
  const src = read("app/login/page.tsx");
  assert.match(src, /CONNEXION_PATH/);
  assert.match(src, /resolvePreAuthIntent/);
  assert.match(src, /setPendingOnboardingIntentCookie/);
  assert.match(src, /window\.location\.assign/);
});

test("auth callback applies pre-auth intent patch and clears pending cookies", () => {
  const src = read("app/auth/callback/route.ts");
  assert.match(src, /resolveOAuthProfilePatch/);
  assert.match(src, /pendingOnboardingIntentClearCookieHeaders/);
  assert.match(src, /resolveAuthCallbackParams/);
  assert.match(src, /buildLoginHrefAfterOAuth/);
});

test("login page skips duplicate choose-role when pre-auth intent is present", () => {
  const src = read("app/login/page.tsx");
  assert.match(src, /preAuthIntentConsumed:\s*preAuthIntent/);
});

test("AuthenticatedShell keeps unconfirmed students on role-choice instead of companion", () => {
  const src = read("components/AuthenticatedShell.tsx");
  assert.match(src, /needsOnboardingRoleChoice/);
  assert.match(src, /isOnboardingRoleChoicePath/);
  assert.match(
    src,
    /needsRoleChoice[\s\S]*?if \(!isOnboardingRoleChoicePath\(pathname\)\)[\s\S]*?return;/,
  );
  assert.match(
    src,
    /if \(profile\?\.companion_chosen === false && pathname !== "\/student\/choose-companion"\)/,
  );
});

test("choose-role fallback persists choice with hard navigation", () => {
  const src = read("app/(app)/onboarding/choose-role/page.tsx");
  assert.match(src, /\/api\/onboarding\/select-role/);
  assert.match(src, /window\.location\.assign/);
});

test("choose-role page does not auto-call select-role on mount", () => {
  const src = read("app/(app)/onboarding/choose-role/page.tsx");
  const useEffectBlocks = src.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);/g) ?? [];
  for (const block of useEffectBlocks) {
    assert.doesNotMatch(block, /\/api\/onboarding\/select-role/);
  }
});

test("buildConnexionHref supports teacher emphasis", () => {
  assert.equal(buildConnexionHref(), CONNEXION_PATH);
  assert.equal(buildConnexionHref("teacher"), "/connexion?intent=teacher");
});

test("resolveProfileDashboardFromAuth reads spread onboarding_role_confirmed", () => {
  assert.deepEqual(resolveProfileDashboardFromAuth({ onboarding_role_confirmed: true }), {
    onboarding_role_confirmed: true,
  });
});

test("isOnboardingRoleChoicePath matches choose-role route", () => {
  assert.equal(isOnboardingRoleChoicePath("/onboarding/choose-role"), true);
  assert.equal(isOnboardingRoleChoicePath("/student/choose-companion"), false);
});

test("needsOnboardingRoleChoice is false after explicit role confirmation", () => {
  assert.equal(
    needsOnboardingRoleChoice({
      role: "student",
      companion_chosen: false,
      dashboard: { onboarding_role_confirmed: true },
    }),
    false,
  );
});

test("teacher-intent fallback choose-role path still exists", () => {
  assert.equal(buildOnboardingRoleChoicePath(true), "/onboarding/choose-role?intent=teacher");
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[auth:onboardingRoleChoice] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
