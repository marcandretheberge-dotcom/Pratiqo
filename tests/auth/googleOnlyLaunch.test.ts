import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolvePreAuthIntent } from "@/lib/auth/preAuthOnboardingIntent";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function readJson(rel: string): Record<string, string> {
  return JSON.parse(read(rel)) as Record<string, string>;
}

test("/login is Google-only and does not render email/password or Magic Link UI", () => {
  const page = read("app/login/page.tsx");
  assert.doesNotMatch(page, /type="email"/);
  assert.doesNotMatch(page, /type="password"/);
  assert.doesNotMatch(page, /signInWithEmailPassword/);
  assert.doesNotMatch(page, /signUpWithEmailPassword/);
  assert.doesNotMatch(page, /sendPasswordResetEmail/);
  assert.doesNotMatch(page, /ensureAuthenticatedProfile/);
  assert.doesNotMatch(page, /login-email-password-form/);
  assert.doesNotMatch(page, /loginForgotPassword/);
  assert.doesNotMatch(page, /loginCheckEmailConfirm/);
  assert.doesNotMatch(page, /loginSignupEmailConfirmationBlocked/);
  assert.doesNotMatch(page, /sendMagicLink/);
  assert.doesNotMatch(page, /signInWithOtp/);
  assert.doesNotMatch(page, /data-testid="login-magic-link-button"/);
  assert.match(page, /loginWithGoogle/);
  assert.match(page, /data-testid="login-google-button"/);
  assert.match(page, /data-testid="login-legal-accept"/);
  assert.match(page, /data-testid="login-change-google-button"/);
  assert.match(page, /loginAccountTitle/);
  assert.match(page, /min-h-\[100dvh\]/, "login page uses dynamic viewport height for mobile/PWA");
});

test("lib/auth.ts exposes Google OAuth redirect flow only, no email/password or Magic Link", () => {
  const src = read("lib/auth.ts");
  assert.match(src, /export async function loginWithGoogle/);
  assert.match(src, /signInWithOAuth/);
  assert.match(src, /skipBrowserRedirect:\s*true/);
  assert.match(src, /window\.location\.assign\(data\.url\)/);
  assert.doesNotMatch(src, /signInWithPassword/);
  assert.doesNotMatch(src, /signUpWithPassword/);
  assert.doesNotMatch(src, /signInWithEmailPassword/);
  assert.doesNotMatch(src, /signUpWithEmailPassword/);
  assert.doesNotMatch(src, /sendPasswordResetEmail/);
  assert.doesNotMatch(src, /export async function sendMagicLink/);
  assert.doesNotMatch(src, /signInWithOtp/);
});

test("login page uses localized Google and account-switch copy, not hardcoded strings", () => {
  const page = read("app/login/page.tsx");
  assert.match(page, /t\("loginContinueWithGoogle"\)/);
  assert.match(page, /t\("loginWorking"\)/);
  assert.match(page, /forceAccountSelection:\s*options\?\.forceAccountSelection === true/);
  assert.match(page, /loginWrongGoogleAccountPrompt/);
  assert.match(page, /loginChangeGoogleAccount/);
  assert.match(page, /data-testid="login-change-google-button"/);
  assert.doesNotMatch(page, /"Se connecter avec Google"/);
  assert.doesNotMatch(page, /"Connexion…"/);
});

test("loginContinueWithGoogle copy matches the exact requested FR/EN/ES wording", () => {
  const fr = readJson("lib/i18n/locales/fr.json");
  const en = readJson("lib/i18n/locales/en.json");
  const es = readJson("lib/i18n/locales/es.json");
  assert.equal(fr.loginContinueWithGoogle, "Continuer avec Google");
  assert.equal(en.loginContinueWithGoogle, "Continue with Google");
  assert.equal(es.loginContinueWithGoogle, "Continuar con Google");
});

test("loginAccountTitle matches the Google-only page title in FR/EN/ES", () => {
  const fr = readJson("lib/i18n/locales/fr.json");
  const en = readJson("lib/i18n/locales/en.json");
  const es = readJson("lib/i18n/locales/es.json");
  assert.equal(fr.loginAccountTitle, "Connexion ou création de compte");
  assert.equal(en.loginAccountTitle, "Log in or create an account");
  assert.equal(es.loginAccountTitle, "Iniciar sesión o crear una cuenta");
});

test("loginWorking copy exists in FR, EN, and ES", () => {
  for (const localePath of ["lib/i18n/locales/fr.json", "lib/i18n/locales/en.json", "lib/i18n/locales/es.json"]) {
    const dictionary = readJson(localePath);
    assert.equal(typeof dictionary.loginWorking, "string");
    assert.ok(dictionary.loginWorking.trim());
  }
});

test("legal acceptance checkbox still gates Google auth actions", () => {
  const page = read("app/login/page.tsx");
  assert.match(page, /loginAcceptTermsLabel/);
  assert.match(page, /disabled=\{!legalAccepted \|\| busy\}/);
});

test("teacher and student/learner intent still resolve for login", () => {
  assert.equal(resolvePreAuthIntent("teacher", null, null), "teacher");
  assert.equal(resolvePreAuthIntent("student", null, null), "learner");
  assert.equal(resolvePreAuthIntent(null, "teacher", null), "teacher");
});

test("login page still reads intent/role/next query params and renders intent banners", () => {
  const page = read("app/login/page.tsx");
  assert.match(page, /resolvePreAuthIntent\(intentParam, roleParam, nextParam\)/);
  assert.match(page, /loginIntentTeacherTitle/);
  assert.match(page, /loginIntentLearnerTitle/);
});

test("login page still shows a localized error banner for auth_error redirects, never a raw message", () => {
  const page = read("app/login/page.tsx");
  assert.match(page, /searchParams\.get\("auth_error"\)/);
  assert.match(page, /\{authError \? \(/);
  assert.match(page, /t\("loginAuthErrorSession"\)/);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[auth:googleOnlyLaunch] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
