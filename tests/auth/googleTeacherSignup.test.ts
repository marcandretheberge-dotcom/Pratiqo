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

test("loginWithGoogle can force Google account selection without changing the default OAuth flow", () => {
  const src = read("lib/auth.ts");
  assert.match(src, /forceAccountSelection\?:\s*boolean/);
  assert.match(src, /options\?\.forceAccountSelection\s*\?\s*\{\s*queryParams:\s*\{\s*prompt:\s*"select_account"\s*\}\s*\}/);
  assert.match(src, /options:\s*\{\s*redirectTo,/);
  assert.match(src, /skipBrowserRedirect:\s*true/);
  assert.match(src, /window\.location\.assign\(data\.url\)/);
});

test("login page renders Google login plus explicit account switching", () => {
  const page = read("app/login/page.tsx");
  assert.match(page, /loginWrongGoogleAccountPrompt/);
  assert.match(page, /loginChangeGoogleAccount/);
  assert.match(page, /onClick=\{\(\) => void handleGoogleLogin\(\{ forceAccountSelection: true \}\)\}/);
  assert.match(page, /onClick=\{\(\) => void handleGoogleLogin\(\)\}/);
  assert.match(page, /forceAccountSelection:\s*options\?\.forceAccountSelection === true/);
  assert.match(page, /intent:\s*loginIntent/);
  assert.match(page, /intentQuery:\s*intentParam === "student" \? "student" : loginIntent/);
  assert.match(page, /referralCode:\s*refCode/);
  assert.match(page, /disabled=\{!legalAccepted \|\| busy\}/);
});

test("single-login and connected-state copy is localized in FR, EN, and ES", () => {
  const fr = read("lib/i18n/locales/fr.json");
  const en = read("lib/i18n/locales/en.json");
  const es = read("lib/i18n/locales/es.json");
  assert.match(fr, /"loginAccountTitle":\s*"Connexion ou création de compte"/);
  assert.match(fr, /"loginAlreadyConnectedTitle":\s*"Tu es déjà connecté\."/);
  assert.match(en, /"loginAccountTitle":\s*"Log in or create an account"/);
  assert.match(en, /"loginAlreadyConnectedTitle":\s*"You are already logged in\."/);
  assert.match(es, /"loginAccountTitle":\s*"Iniciar sesión o crear una cuenta"/);
  assert.match(es, /"loginAlreadyConnectedTitle":\s*"Ya has iniciado sesión\."/);
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
  assert.match(src, /useState\("\/login"\)/);
});

test("landing auth gate resumes pending onboarding intent for authenticated users", () => {
  const src = read("components/marketing/LandingAuthGate.tsx");
  assert.match(src, /readPendingOnboardingIntentClient/);
  assert.match(src, /resolvePostLoginDestination/);
  assert.match(src, /buildLoginHrefAfterOAuth/);
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
