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

// ── /login is Google-only: no email/password or Magic Link surfaces ────────

test("/login renders no email/password form or Magic Link UI", () => {
  const page = read("app/login/page.tsx");
  assert.doesNotMatch(page, /type="email"/);
  assert.doesNotMatch(page, /type="password"/);
  assert.doesNotMatch(page, /sendMagicLink/);
  assert.doesNotMatch(page, /signInWithEmailPassword/);
  assert.doesNotMatch(page, /signUpWithEmailPassword/);
  assert.doesNotMatch(page, /sendPasswordResetEmail/);
  assert.doesNotMatch(page, /loginForgotPassword/);
  assert.doesNotMatch(page, /loginRememberMe/);
  assert.doesNotMatch(page, /data-testid="login-magic-link-button"/);
  assert.doesNotMatch(page, /data-testid="login-email-password-form"/);
});

test("lib/auth.ts exposes only Google OAuth — no email/password or Magic Link helpers", () => {
  const src = read("lib/auth.ts");
  assert.match(src, /export async function loginWithGoogle/);
  assert.match(src, /signInWithOAuth/);
  assert.match(src, /skipBrowserRedirect:\s*true/);
  assert.match(src, /window\.location\.assign\(data\.url\)/);
  assert.doesNotMatch(src, /export async function sendMagicLink/);
  assert.doesNotMatch(src, /export async function signInWithEmailPassword/);
  assert.doesNotMatch(src, /export async function signUpWithEmailPassword/);
  assert.doesNotMatch(src, /export async function sendPasswordResetEmail/);
  assert.doesNotMatch(src, /signInWithOtp/);
  assert.doesNotMatch(src, /signInWithPassword/);
});

// ── Exact requested launch copy ──────────────────────────────────────────────

test("login page uses the canonical localized Google button copy, not a hardcoded string", () => {
  const page = read("app/login/page.tsx");
  assert.match(page, /t\("loginContinueWithGoogle"\)/);
  assert.match(page, /t\("loginWorking"\)/);
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

test("loginWorking copy exists in FR, EN, and ES", () => {
  for (const localePath of ["lib/i18n/locales/fr.json", "lib/i18n/locales/en.json", "lib/i18n/locales/es.json"]) {
    const dictionary = readJson(localePath);
    assert.equal(typeof dictionary.loginWorking, "string");
    assert.ok(dictionary.loginWorking.trim());
  }
});

// ── Legal acceptance still gates Google login (preserved, not removed) ─────

test("legal acceptance checkbox still gates the Google login button", () => {
  const page = read("app/login/page.tsx");
  assert.match(page, /loginAcceptTermsLabel/);
  assert.match(page, /disabled=\{!legalAccepted \|\| busy\}/);
});

// ── Teacher/student intent still resolves through the same shared helper ───

test("teacher and student/learner intent still resolve for the Google-only login page", () => {
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

// ── Failed-auth redirect still shows a generic safe error ──────────────────

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
