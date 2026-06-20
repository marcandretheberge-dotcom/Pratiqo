import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  oauthNextPathForPreAuthIntent,
  resolvePreAuthIntent,
} from "@/lib/auth/preAuthOnboardingIntent";
import { resolvePostAuthRedirect } from "@/lib/auth/postAuthRedirect";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

test("AuthProvider unblocks the UI when the session exists before profile hydration", () => {
  const src = read("components/AuthProvider.tsx");
  assert.match(src, /setUser\(u\)/);
  assert.match(src, /setLoading\(false\)/);
  assert.match(src, /void syncProfile\(u\)/);
  assert.doesNotMatch(src, /await syncProfile\(u\)[\s\S]*setLoading\(false\)/);
  assert.doesNotMatch(src, /\{!loading && children\}/);
});

test("login handoff falls back to oauthNext instead of landing when redirect resolves to root", () => {
  const src = read("app/login/page.tsx");
  assert.match(src, /redirectPath === "\/" \|\| redirectPath === ""/);
  assert.match(src, /let destination/);
  assert.match(src, /oauthNext : redirectPath/);
  assert.match(src, /window\.location\.assign\(destination\)/);
  assert.match(src, /AuthHandoffScreen/);
});

test("auth callback keeps intent login handoff when profile read fails after upsert", () => {
  const src = read("app/auth/callback/route.ts");
  assert.match(src, /if \(intent\)[\s\S]*login-handoff-profile-read-fallback/);
  assert.match(src, /buildLoginHrefAfterOAuth\(intent, next\)/);
});

test("landing gate shows handoff while profile hydrates with pending onboarding intent", () => {
  const src = read("components/marketing/LandingAuthGate.tsx");
  assert.match(src, /profileHydrated/);
  assert.match(src, /pendingIntentWhileHydrating/);
  assert.match(src, /handoffActive \|\| pendingIntentWhileHydrating/);
});

test("AuthenticatedShell waits for profile hydration before role-choice fallback", () => {
  const src = read("components/AuthenticatedShell.tsx");
  assert.match(src, /wait-profile-hydration/);
  assert.match(src, /if \(!profileHydrated\)/);
});

test("new learner first Google callback does not resolve to landing", () => {
  const destination = resolvePostAuthRedirect(
    "student",
    { companion_chosen: false, dashboard: { onboarding_role_confirmed: true } },
    oauthNextPathForPreAuthIntent("learner"),
    { preAuthIntentConsumed: "learner" },
  );
  assert.notEqual(destination, "/");
  assert.equal(destination, "/student/choose-companion");
});

test("new teacher first Google callback does not resolve to landing", () => {
  const destination = resolvePostAuthRedirect(
    "teacher",
    { teacher_onboarding_complete: false, dashboard: { onboarding_role_confirmed: true } },
    oauthNextPathForPreAuthIntent("teacher"),
    { preAuthIntentConsumed: "teacher" },
  );
  assert.notEqual(destination, "/");
  assert.equal(destination, "/onboarding/teacher");
});

test("intent=student survives first-login intent parsing for learner handoff", () => {
  assert.equal(resolvePreAuthIntent("student", null, null), "learner");
  assert.equal(
    resolvePostAuthRedirect(
      "student",
      { companion_chosen: false, dashboard: { onboarding_role_confirmed: true } },
      oauthNextPathForPreAuthIntent("learner"),
      { preAuthIntentConsumed: "learner" },
    ),
    "/student/choose-companion",
  );
});

test("existing Google user callback keeps dashboard destination", () => {
  const destination = resolvePostAuthRedirect(
    "student",
    { companion_chosen: true, dashboard: { onboarding_role_confirmed: true } },
    "/dashboard",
  );
  assert.equal(destination, "/dashboard");
  assert.notEqual(destination, "/");
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[auth:firstGoogleLoginHandoff] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
