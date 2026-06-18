import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildOAuthCallbackUrl } from "@/lib/auth/oauthCallback";
import {
  hasPendingTeacherIntentFromCookies,
  readPendingTeacherNextFromCookies,
} from "@/lib/auth/pendingTeacherIntent";
import { resolveAuthCallbackParams } from "@/lib/auth/pendingOnboardingIntent";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

test("buildOAuthCallbackUrl points Google OAuth to /auth/callback with teacher intent", () => {
  const url = buildOAuthCallbackUrl("https://www.pratiqo.ca", {
    intent: "teacher",
    next: "/onboarding/teacher",
  });
  assert.equal(
    url,
    "https://www.pratiqo.ca/auth/callback?intent=teacher&next=%2Fonboarding%2Fteacher",
  );
});

test("resolveAuthCallbackParams falls back to pending teacher cookies when query params are stripped", () => {
  const params = resolveAuthCallbackParams(new URL("https://www.pratiqo.ca/auth/callback?code=abc"), {
    get(name: string) {
      if (name === "pratiqo_pte") return { value: "1" };
      if (name === "pratiqo_pte_next") return { value: encodeURIComponent("/onboarding/teacher") };
      return undefined;
    },
  });
  assert.equal(params.intent, "teacher");
  assert.equal(params.next, "/onboarding/teacher");
});

test("resolveAuthCallbackParams keeps explicit callback teacher params over cookies", () => {
  const params = resolveAuthCallbackParams(
    new URL("https://www.pratiqo.ca/auth/callback?intent=teacher&next=%2Fonboarding%2Fteacher%3Fvertical%3Dmusique"),
    {
      get(name: string) {
        if (name === "pratiqo_pte") return { value: "1" };
        if (name === "pratiqo_pte_next") return { value: encodeURIComponent("/onboarding/teacher") };
        return undefined;
      },
    },
  );
  assert.equal(params.next, "/onboarding/teacher?vertical=musique");
});

test("pending teacher cookies are read server-side without admin role", () => {
  const reader = {
    get(name: string) {
      if (name === "pratiqo_pte") return { value: "1" };
      if (name === "pratiqo_pte_next") return { value: "%2Fonboarding%2Fteacher" };
      return undefined;
    },
  };
  assert.equal(hasPendingTeacherIntentFromCookies(reader), true);
  assert.equal(readPendingTeacherNextFromCookies(reader), "/onboarding/teacher");
});

test("loginWithGoogle builds callback URL and sets pending onboarding cookie", () => {
  const src = read("lib/auth.ts");
  assert.match(src, /buildOAuthCallbackUrl/);
  assert.match(src, /setPendingOnboardingIntentCookie/);
  assert.match(src, /setPendingTeacherOnboardingCookie/);
  assert.match(src, /redirectTo/);
});

test("auth callback applies session cookies to redirect response", () => {
  const src = read("app/auth/callback/route.ts");
  assert.match(src, /exchangeCodeForSession\(code\)/);
  assert.match(src, /authCookies/);
  assert.match(src, /response\.cookies\.set/);
  assert.match(src, /resolveAuthCallbackParams/);
  assert.match(src, /pendingOnboardingIntentClearCookieHeaders/);
});

test("auth callback does not silently succeed when session exchange fails", () => {
  const src = read("app/auth/callback/route.ts");
  assert.match(src, /if \(exchangeError\)[\s\S]*return applyCookies/);
  assert.match(src, /buildLoginUrlWithAuthError/);
});

test("landing header preserves pending teacher intent for generic Se connecter", () => {
  const src = read("components/marketing/LandingHeader.tsx");
  assert.match(src, /resolveLoginHrefWithPendingTeacherIntent/);
  assert.match(src, /\/connexion/);
});

test("landing auth gate resumes teacher login when pending intent exists", () => {
  const src = read("components/marketing/LandingAuthGate.tsx");
  assert.match(src, /hasPendingTeacherIntentClient/);
  assert.match(src, /resolveLoginHrefWithPendingTeacherIntent/);
  assert.match(src, /clearPendingTeacherOnboardingCookie/);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[auth:googleTeacherSignup] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
