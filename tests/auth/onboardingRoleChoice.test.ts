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

test("generic Se connecter routes logged-out users to role-choice connexion", () => {
  const header = read("components/marketing/LandingHeader.tsx");
  assert.match(header, /useState\(CONNEXION_PATH\)/);
  assert.match(header, /resolveLoginHrefWithPendingTeacherIntent\(CONNEXION_PATH\)/);
  const shell = read("components/AuthenticatedShell.tsx");
  assert.match(shell, /buildLoginHrefForProtectedReturn/);
});

test("Apprenant pre-auth choice builds login with intent=student", () => {
  assert.equal(buildLoginHrefWithPreAuthIntent("learner"), "/login?intent=student");
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

test("resolveLoginOAuthNextPath routes teacher intent to teacher onboarding wizard", () => {
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

test("resolvePostAuthRedirect sends incomplete teachers to onboarding wizard", () => {
  assert.equal(
    resolvePostAuthRedirect("teacher", { teacher_onboarding_complete: false }),
    "/onboarding/teacher",
  );
  assert.equal(
    resolvePostAuthRedirect("teacher", { teacher_onboarding_complete: null }),
    "/onboarding/teacher",
  );
  assert.equal(
    resolvePostAuthRedirect("teacher", { teacher_onboarding_complete: true }),
    "/dashboard",
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
  assert.match(src, /href=\{buildLoginHrefFromConnexion\("learner"/);
  assert.match(src, /href=\{buildLoginHrefFromConnexion\("teacher"/);
  assert.match(src, /buildLoginHrefWithPreAuthIntent/);
});

test("connexion skips role chooser when intent is already in the URL", () => {
  const src = read("app/connexion/page.tsx");
  assert.match(src, /if \(!highlightIntent \|\| user\) return/);
  assert.match(src, /router\.replace\(buildLoginHrefFromConnexion/);
  assert.match(src, /if \(highlightIntent && !user\)[\s\S]*?Redirection/);
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

test("buildLoginHrefForProtectedReturn preserves teacher intent for onboarding return", () => {
  assert.equal(
    buildConnexionHrefForProtectedReturn("/onboarding/teacher"),
    "/login?next=%2Fonboarding%2Fteacher&intent=teacher",
  );
});

test("buildLoginHrefAfterOAuth stages post-OAuth session handoff on public login", () => {
  assert.equal(
    buildLoginHrefAfterOAuth("teacher", "/onboarding/teacher"),
    "/login?intent=teacher&next=%2Fonboarding%2Fteacher",
  );
});

test("proxy redirects unauthenticated protected routes to login with inferred intent", () => {
  const src = read("proxy.ts");
  assert.match(src, /buildLoginHrefForProtectedReturn/);
  assert.doesNotMatch(src, /buildConnexionHrefForProtectedReturn/);
});

test("auth callback redirects intent signups directly to onboarding destinations", () => {
  const src = read("app/auth/callback/route.ts");
  assert.match(src, /resolveOAuthCallbackRedirect/);
  assert.match(src, /resolveOAuthProfilePatch/);
  assert.match(src, /stage:\s*intent \? "direct-intent" : "direct"/);
  assert.doesNotMatch(src, /buildLoginHrefAfterOAuth/);
});

test("auth callback clears pending cookies after final redirect is chosen", () => {
  const src = read("app/auth/callback/route.ts");
  assert.match(
    src,
    /NextResponse\.redirect\(new URL\(redirectPath, canonicalOrigin\)\)[\s\S]*pendingOnboardingIntentClearCookieHeaders/,
  );
});

test("login page redirects missing intent to connexion instead of defaulting learner", () => {
  const src = read("app/login/page.tsx");
  assert.match(src, /CONNEXION_PATH/);
  assert.match(src, /resolvePreAuthIntent/);
  assert.match(src, /loginWithGoogle/);
  assert.doesNotMatch(src, /signInWithEmailPassword/);
  assert.doesNotMatch(src, /signUpWithEmailPassword/);
  assert.doesNotMatch(src, /preAuthIntent \?\? "learner"/);
  assert.doesNotMatch(src, /loginIntent.*learner/);
  assert.match(src, /router\.replace\(qs \? `\$\{CONNEXION_PATH\}/);
  assert.match(src, /setPendingOnboardingIntentCookie/);
  assert.match(src, /!preAuthIntent \?/);
});

test("auth callback applies pre-auth intent patch and clears pending cookies on direct redirects", () => {
  const src = read("app/auth/callback/route.ts");
  assert.match(src, /resolveOAuthProfilePatch/);
  assert.match(src, /pendingOnboardingIntentClearCookieHeaders/);
  assert.match(src, /resolveAuthCallbackParams/);
  assert.match(src, /resolveOAuthCallbackRedirect/);
});

test("login page delegates post-auth sessions to explicit connected-state actions", () => {
  const src = read("app/login/page.tsx");
  assert.match(src, /resolvePostLoginDestination/);
  assert.match(src, /loginAlreadyConnectedTitle/);
  assert.match(src, /loginContinueDashboard/);
  assert.match(src, /loginSignOut/);
  assert.doesNotMatch(src, /AuthHandoffScreen/);
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
    /profileHydrated && profile\?\.companion_chosen === false && pathname !== "\/student\/choose-companion"/,
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

test("AuthProvider does not insert default student profile rows", () => {
  const src = read("components/AuthProvider.tsx");
  assert.doesNotMatch(src, /\.from\("profiles"\)\.insert/);
  assert.match(src, /loadProfileRow/);
});

test("landing auth gate keeps public homepage accessible when authenticated", () => {
  const src = read("components/marketing/LandingAuthGate.tsx");
  assert.doesNotMatch(src, /resolvePostAuthRedirect/);
  assert.doesNotMatch(src, /if \(!authLoading && user\) return null/);
  assert.match(src, /recoveryActive/);
  assert.match(src, /return <>\{children\}<\/>/);
});

test("landing auth gate shows handoff screen during active pending onboarding intent", () => {
  const gate = read("components/marketing/LandingAuthGate.tsx");
  const screen = read("components/marketing/AuthHandoffScreen.tsx");
  const handoff = read("lib/auth/onboardingHandoff.ts");
  assert.match(gate, /useSyncExternalStore/);
  assert.match(gate, /hasActiveOnboardingHandoffClient/);
  assert.match(gate, /if \(recoveryActive && user\)/);
  assert.match(gate, /hasOAuthReturnPending/);
  assert.match(screen, /authHandoffTitle/);
  assert.match(screen, /authHandoffSubtitle/);
  assert.match(handoff, /readPendingOnboardingIntentClient/);
  assert.match(handoff, /hasPendingTeacherIntentClient/);
});

test("logout clears auth handoff markers and redirects to connexion", () => {
  const src = read("lib/auth.ts");
  assert.match(src, /clearPendingOnboardingIntentCookie/);
  assert.match(src, /clearPendingTeacherOnboardingCookie/);
  assert.match(src, /clearOAuthReturnPending/);
  assert.match(src, /window\.location\.assign\(options\?\.redirectTo \?\? CONNEXION_PATH\)/);
});

test("landing auth gate clears stale handoff markers for signed-out visitors", () => {
  const gate = read("components/marketing/LandingAuthGate.tsx");
  assert.match(gate, /if \(!user\) \{[\s\S]*clearStaleAuthHandoffState/);
  assert.doesNotMatch(gate, /hasPendingTeacherIntentClient\(\)[\s\S]*sessionPresent: false/);
});

test("connexion home link is a plain root link without next param", () => {
  const src = read("app/connexion/page.tsx");
  assert.match(src, /<Link href="\/" className="font-semibold text-teal-700 hover:underline">/);
  assert.match(src, /loginReturnHome/);
  assert.doesNotMatch(src, /loginReturnHome[\s\S]*searchParams\.get\("next"\)/);
  assert.match(src, /href=\{buildLoginHrefFromConnexion\("learner"/);
  assert.match(src, /href=\{buildLoginHrefFromConnexion\("teacher"/);
  assert.match(src, /buildLoginHrefFromConnexion/);
});

test("profile page sign-out uses centralized logout helper", () => {
  const src = read("app/(app)/profile/page.tsx");
  assert.match(src, /import \{ logout \} from "@\/lib\/auth"/);
  assert.match(src, /onClick=\{\(\) => void logout\(\)\}/);
  assert.doesNotMatch(src, /supabase\.auth\.signOut\(\)/);
});

test("login and connexion sign-out do not double-navigate after logout", () => {
  const login = read("app/login/page.tsx");
  const connexion = read("app/connexion/page.tsx");
  assert.match(login, /await logout\(\)/);
  assert.match(connexion, /await logout\(\)/);
  assert.doesNotMatch(login, /await logout\(\)[\s\S]{0,120}router\.replace\("\/"\)/);
  assert.doesNotMatch(connexion, /await logout\(\)[\s\S]{0,120}router\.replace\("\/"\)/);
});

test("landing auth gate escapes stale handoff with timeout or profile sync retry", () => {
  const gate = read("components/marketing/LandingAuthGate.tsx");
  assert.match(gate, /HANDOFF_RECOVERY_TIMEOUT_MS/);
  assert.match(gate, /handoffTimedOut/);
  assert.match(gate, /profileSyncError/);
  assert.match(gate, /AuthProfileSyncRetry/);
  assert.match(gate, /if \(recoveryActive && user\)/);
});

test("connexion and login surface profile sync retry instead of infinite loading", () => {
  const connexion = read("app/connexion/page.tsx");
  const login = read("app/login/page.tsx");
  assert.match(connexion, /profileSyncError/);
  assert.match(connexion, /AuthProfileSyncRetry/);
  assert.match(connexion, /retryProfileSync/);
  assert.match(login, /profileSyncError/);
  assert.match(login, /AuthProfileSyncRetry/);
  assert.match(login, /retryProfileSync/);
});

test("AppShell treats /student routes as student chrome during role hydration", () => {
  const src = read("components/AppShell.tsx");
  assert.match(src, /isStudentShellRoute/);
  assert.match(src, /const isStudent = role === "student" \|\| \(!isTeacher && isStudentShellRoute\(pathname\)\)/);
  assert.doesNotMatch(
    src,
    /const isStudent = role === "student";/,
  );
});

test("dashboard avoids student companion when teacher intent is pending", () => {
  const page = read("app/(app)/dashboard/page.tsx");
  assert.match(page, /hasActivePendingTeacherIntentClient/);
  assert.match(page, /resolvePendingTeacherOnboardingPath/);
  assert.match(page, /pendingTeacherIntent[\s\S]*router\.replace\(resolvePendingTeacherOnboardingPath\(\)\)/);
  assert.doesNotMatch(page, /if \(role === "student"\) return;[\s\S]{0,80}router\.replace\("\/student\/choose-companion"\)/);
});

test("pending teacher intent resolves to teacher onboarding path helper", () => {
  const src = read("lib/auth/preAuthOnboardingIntent.ts");
  assert.match(src, /hasActivePendingTeacherIntentClient/);
  assert.match(src, /resolvePendingTeacherOnboardingPath/);
  assert.match(src, /readPendingTeacherNextClient\(\) \?\? "\/onboarding\/teacher"/);
});

test("login page no longer hides existing sessions behind auth handoff", () => {
  const src = read("app/login/page.tsx");
  assert.match(src, /loginAlreadyConnectedTitle/);
  assert.match(src, /resolvePostLoginDestination/);
  assert.doesNotMatch(src, /AuthHandoffScreen/);
});

test("landing auth gate resumes pending onboarding intent for authenticated users", () => {
  const src = read("components/marketing/LandingAuthGate.tsx");
  assert.match(src, /readPendingOnboardingIntentClient/);
  assert.match(src, /readOAuthReturnIntent/);
  assert.match(src, /resolvePostLoginDestination/);
});

test("connexion shows a connected-state panel for authenticated users", () => {
  const src = read("app/connexion/page.tsx");
  assert.match(src, /resolvePostLoginDestination/);
  assert.match(src, /loginAlreadyConnectedTitle/);
  assert.match(src, /loginContinueDashboard/);
  assert.match(src, /loginSignOut/);
  assert.doesNotMatch(src, /needsOnboardingRoleChoice/);
});

test("teacher-intent fallback choose-role path still exists", () => {
  assert.equal(buildOnboardingRoleChoicePath(true), "/onboarding/choose-role?intent=teacher");
});

test("first teacher OAuth handoff resolves to dashboard not landing", () => {
  assert.equal(
    resolvePostAuthRedirect(
      "teacher",
      { teacher_onboarding_complete: false, dashboard: { onboarding_role_confirmed: true } },
      "/onboarding/teacher",
      { preAuthIntentConsumed: "teacher" },
    ),
    "/onboarding/teacher",
  );
  assert.notEqual(
    resolvePostAuthRedirect(
      "teacher",
      { teacher_onboarding_complete: false, dashboard: { onboarding_role_confirmed: true } },
      "/onboarding/teacher",
      { preAuthIntentConsumed: "teacher" },
    ),
    "/",
  );
});

test("first learner OAuth handoff resolves to companion not landing", () => {
  assert.equal(
    resolvePostAuthRedirect(
      "student",
      { companion_chosen: false, dashboard: { onboarding_role_confirmed: true } },
      "/student/choose-companion",
      { preAuthIntentConsumed: "learner" },
    ),
    "/student/choose-companion",
  );
  assert.notEqual(
    resolvePostAuthRedirect(
      "student",
      { companion_chosen: false, dashboard: { onboarding_role_confirmed: true } },
      "/student/choose-companion",
      { preAuthIntentConsumed: "learner" },
    ),
    "/",
  );
});

test("login connected-state clears pending onboarding cookies before continuing", () => {
  const src = read("app/login/page.tsx");
  assert.match(src, /clearPendingOnboardingIntentCookie/);
  assert.match(src, /clearPendingTeacherOnboardingCookie/);
  assert.match(src, /router\.replace\(destination\)/);
});

test("AuthenticatedShell never sends unresolved roles to legacy /onboarding", () => {
  const src = read("components/AuthenticatedShell.tsx");
  assert.doesNotMatch(src, /router\.replace\("\/onboarding"\)/);
  assert.match(src, /ONBOARDING_ROLE_CHOICE_PATH/);
  assert.match(src, /wait-unresolved-role/);
});

test("AuthenticatedShell renders companion page while student role syncs", () => {
  const src = read("components/AuthenticatedShell.tsx");
  assert.match(src, /wait-unresolved-role/);
  assert.match(src, /profileHydrated/);
  assert.doesNotMatch(
    src,
    /if \(!isResolvedRole\(role\)\)[\s\S]{0,400}return \(\s*<div[\s\S]{0,200}Chargement/,
  );
});

test("AuthProvider retries profile sync in background after OAuth", () => {
  const src = read("components/AuthProvider.tsx");
  assert.match(src, /refreshProfileInBackground/);
  assert.match(src, /profileSyncError/);
  assert.match(src, /retryProfileSync/);
});

test("choose-companion shows retry state instead of infinite loading", () => {
  const src = read("app/(app)/student/choose-companion/page.tsx");
  assert.match(src, /profileSyncError/);
  assert.match(src, /companionProfileSyncRetry/);
  assert.doesNotMatch(src, /if \(loading \|\| !user\) return null/);
});

test("AuthenticatedShell sends teachers on student paths to dashboard", () => {
  const src = read("components/AuthenticatedShell.tsx");
  assert.match(src, /teacher-student-path/);
  assert.match(src, /redirect: "\/dashboard"/);
});

test("learner pending intent clears stale teacher cookies", () => {
  const src = read("lib/auth/pendingOnboardingIntent.ts");
  assert.match(src, /if \(intent === "learner"\)[\s\S]*clearPendingTeacherOnboardingCookie/);
});

test("connexion role choice uses Link navigation instead of router.replace", () => {
  const src = read("app/connexion/page.tsx");
  assert.match(src, /href=\{buildLoginHrefFromConnexion\("learner"/);
  assert.match(src, /href=\{buildLoginHrefFromConnexion\("teacher"/);
  assert.doesNotMatch(src, /continueWithIntent/);
  assert.doesNotMatch(src, /onClick=\{\(\) => continueWithIntent/);
});

test("connexion keeps router.replace only for automatic redirects", () => {
  const src = read("app/connexion/page.tsx");
  assert.match(src, /if \(!highlightIntent \|\| user\) return;[\s\S]*router\.replace\(buildLoginHrefFromConnexion/);
  assert.match(src, /router\.replace\(authenticatedDestination\)/);
});

test("login page keeps change-path link to connexion instead of replace", () => {
  const src = read("app/login/page.tsx");
  assert.match(src, /href=\{CONNEXION_PATH\}/);
});

test("AuthenticatedShell defers AppShell during unresolved role hydration", () => {
  const src = read("components/AuthenticatedShell.tsx");
  assert.match(src, /shouldDeferShellForRoleHydration/);
  assert.match(src, /if \(shouldDeferShellForRoleHydration\(pathname, profileHydrated, role\)\)/);
});

test("student mobile bottom nav has at most five items", () => {
  const src = read("components/AppShell.tsx");
  const block = src.match(/STUDENT_MOBILE_BOTTOM_NAV[\s\S]*?\];/)?.[0] ?? "";
  const hrefCount = (block.match(/href:\s*["']/g) ?? []).length;
  assert.ok(hrefCount <= 5, `student mobile bottom nav must have at most 5 items (got ${hrefCount})`);
  assert.ok(hrefCount >= 4, `student mobile bottom nav should keep primary tabs (got ${hrefCount})`);
});

test("teacher mobile bottom nav has at most five items", () => {
  const src = read("components/AppShell.tsx");
  const block = src.match(/TEACHER_MOBILE_BOTTOM_NAV[\s\S]*?\];/)?.[0] ?? "";
  const hrefCount = (block.match(/href:\s*["']/g) ?? []).length;
  assert.ok(hrefCount <= 5, `teacher mobile bottom nav must have at most 5 items (got ${hrefCount})`);
  assert.ok(hrefCount >= 4, `teacher mobile bottom nav should keep primary tabs (got ${hrefCount})`);
});

test("mobile app shell reserves safe-area space for bottom nav", () => {
  const src = read("components/AppShell.tsx");
  assert.match(src, /pb-\[calc\(6rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(src, /paddingBottom:\s*"env\(safe-area-inset-bottom\)"/);
});

test("connexion role cards stay tappable on mobile", () => {
  const src = read("app/connexion/page.tsx");
  assert.match(src, /min-h-\[132px\]/);
  assert.match(src, /href=\{buildLoginHrefFromConnexion\("learner"/);
  assert.match(src, /href=\{buildLoginHrefFromConnexion\("teacher"/);
});

test("student companion chooser reserves bottom-nav space and uses full-width mobile actions", () => {
  const src = read("app/(app)/student/choose-companion/page.tsx");
  assert.match(src, /calc\(6rem \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(src, /min-h-\[136px\]/);
  assert.match(src, /min-h-12 w-full rounded-2xl/);
});

test("student dashboard reserves bottom-nav space and keeps mobile actions tappable", () => {
  const src = read("components/StudentDashboard.tsx");
  assert.match(src, /pb-\[calc\(6rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(src, /inline-flex min-h-\[48px\] w-full/);
  assert.match(src, /min-h-\[44px\] flex-1/);
});

test("student search results and map card clear the mobile bottom nav", () => {
  const search = read("app/(app)/student/search/page.tsx");
  const map = read("components/SearchMapView.tsx");
  assert.match(search, /pb-\[calc\(6rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(search, /min-h-\[164px\]/);
  assert.match(map, /bottom-\[calc\(6rem\+env\(safe-area-inset-bottom\)\)\]/);
});

test("student messages keep the composer above safe-area and preserve route rendering", () => {
  const src = read("app/(app)/messages/page.tsx");
  assert.match(src, /export default function MessagesPage/);
  assert.match(src, /pb-\[calc\(6rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(src, /pb-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\]/);
  assert.match(src, /min-h-\[64px\]/);
});

test("student booking entry modal remains visual-only and mobile tappable", () => {
  const page = read("app/(app)/booking/page.tsx");
  const modal = read("components/BookingModal.tsx");
  assert.match(page, /<BookingModal teacher=\{bookingTeacher\}/);
  assert.match(modal, /export function BookingModal/);
  assert.match(modal, /rounded-t-\[1\.75rem\]/);
  assert.match(modal, /min-h-\[58px\]/);
  assert.match(modal, /min-h-\[48px\]/);
});

test("student profile keeps logout behavior and mobile-safe account cards", () => {
  const src = read("app/(app)/profile/page.tsx");
  assert.match(src, /onClick=\{\(\) => void logout\(\)\}/);
  assert.match(src, /profileSignOut/);
  assert.match(src, /pb-\[calc\(6rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(src, /min-h-\[56px\]/);
});

test("Google-only auth remains unchanged after student mobile polish", () => {
  const login = read("app/login/page.tsx");
  const auth = read("lib/auth.ts");
  assert.match(auth, /export async function loginWithGoogle/);
  assert.match(login, /data-testid="login-google-button"/);
  assert.doesNotMatch(login, /type="email"/);
  assert.doesNotMatch(login, /type="password"/);
  assert.doesNotMatch(auth, /signInWithPassword/);
  assert.doesNotMatch(auth, /signInWithOtp/);
});

test("app route group exposes shared error boundary with retry and navigation", () => {
  const src = read("app/(app)/error.tsx");
  assert.match(src, /"use client"/);
  assert.match(src, /anErrorOccurred/);
  assert.match(src, /companionProfileSyncRetry/);
  assert.match(src, /loginContinueDashboard/);
  assert.match(src, /loginReturnHome/);
  assert.match(src, /onClick=\{\(\) => retry\(\)\}/);
  assert.doesNotMatch(src, /error\.stack/);
  assert.doesNotMatch(src, /error\.message/);
});

test("existing teacher with learner intent routes to dashboard not companion", () => {
  assert.equal(primaryRoleForPreAuthIntent("learner", "teacher"), "teacher");
  assert.equal(
    resolvePostAuthRedirect(
      "teacher",
      { teacher_onboarding_complete: false, dashboard: { onboarding_role_confirmed: true } },
      "/student/choose-companion",
      { preAuthIntentConsumed: "learner" },
    ),
    "/dashboard",
  );
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
