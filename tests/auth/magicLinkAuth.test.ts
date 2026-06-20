import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveAuthCallbackParams } from "@/lib/auth/pendingOnboardingIntent";
import { buildOAuthCallbackUrl } from "@/lib/auth/oauthCallback";

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

function noopCookies() {
  return { get: () => undefined };
}

// ── Request: sendMagicLink uses the same safe redirect builder as Google/signup ──

test("sendMagicLink calls Supabase signInWithOtp with the auth callback redirect URL", () => {
  const src = read("lib/auth.ts");
  assert.match(src, /export async function sendMagicLink/);
  assert.match(src, /signInWithOtp\(\{/);
  assert.match(src, /buildOAuthCallbackUrl\(origin, \{/);
  assert.match(src, /resolveOAuthRedirectOrigin\(\)/);
  // shouldCreateUser is explicit, not left to an implicit Supabase default.
  assert.match(src, /shouldCreateUser:\s*true/);
});

test("sendMagicLink preserves pending onboarding intent the same way as Google/signup", () => {
  const src = read("lib/auth.ts");
  const fnBody = src.slice(src.indexOf("export async function sendMagicLink"), src.indexOf("export async function sendPasswordResetEmail"));
  assert.match(fnBody, /setPendingIntentCookiesForAuth\(redirectPath, options\?\.intent\)/);
});

test("buildOAuthCallbackUrl (shared by magic link, Google, and signup) never hardcodes a single environment", () => {
  const prod = buildOAuthCallbackUrl("https://www.pratiqo.ca", { next: "/dashboard" });
  const preview = buildOAuthCallbackUrl("https://pratiqo-git-some-branch.vercel.app", { next: "/dashboard" });
  const local = buildOAuthCallbackUrl("http://localhost:3000", { next: "/dashboard" });
  assert.equal(prod, "https://www.pratiqo.ca/auth/callback?next=%2Fdashboard");
  assert.equal(preview, "https://pratiqo-git-some-branch.vercel.app/auth/callback?next=%2Fdashboard");
  assert.equal(local, "http://localhost:3000/auth/callback?next=%2Fdashboard");
});

// ── Callback: supports both the code (PKCE) and token_hash+type (OTP) shapes ──

test("auth callback supports the code (PKCE) exchange flow", () => {
  const src = read("app/auth/callback/route.ts");
  assert.match(src, /exchangeCodeForSession\(code\)/);
});

test("auth callback supports the token_hash + type magic-link verification flow", () => {
  const src = read("app/auth/callback/route.ts");
  assert.match(src, /token_hash/);
  assert.match(src, /verifyOtp\(\{\s*token_hash:\s*tokenHash as string,\s*type:\s*otpType as SupportedEmailOtpType\s*\}\)/);
  assert.match(src, /SUPPORTED_EMAIL_OTP_TYPES\s*=\s*\[\s*"signup",\s*"invite",\s*"magiclink",\s*"recovery",\s*"email_change",\s*"email"/);
});

test("auth callback requires either code or a recognized token_hash+type pair, not an arbitrary type value", () => {
  const src = read("app/auth/callback/route.ts");
  assert.match(src, /if \(!code && !\(tokenHash && otpType\)\)/);
  assert.match(src, /function isSupportedEmailOtpType\(value: string \| null\): value is SupportedEmailOtpType/);
});

test("auth callback does not silently succeed when either exchange method fails", () => {
  const src = read("app/auth/callback/route.ts");
  assert.match(src, /if \(exchangeError\)[\s\S]*return applyCookies/);
  assert.match(src, /buildLoginUrlWithAuthError/);
  // The raw Supabase error message is logged server-side only, never placed in the redirect URL.
  const errorBlock = src.slice(src.indexOf("if (exchangeError) {"), src.indexOf("const {\n    data: { user },"));
  assert.match(errorBlock, /console\.error/);
  assert.doesNotMatch(errorBlock, /authError:\s*exchangeError\.message/);
});

test("expired/invalid magic link redirects back to /login (does not trap the user on the callback route)", () => {
  const src = read("app/auth/callback/route.ts");
  const errorBlock = src.slice(src.indexOf("if (exchangeError) {"), src.indexOf("const {\n    data: { user },"));
  assert.match(errorBlock, /NextResponse\.redirect\(loginUrl\)/);
  assert.match(errorBlock, /authError:\s*"session"/);
});

// ── Safe-redirect plumbing applies identically regardless of which flow hit the callback ──

test("resolveAuthCallbackParams sanitizes next the same way for a token_hash magic-link callback as for a code callback", () => {
  const codeParams = resolveAuthCallbackParams(
    new URL("https://www.pratiqo.ca/auth/callback?code=abc&next=%2Fdashboard"),
    noopCookies(),
  );
  const magicLinkParams = resolveAuthCallbackParams(
    new URL("https://www.pratiqo.ca/auth/callback?token_hash=abc123&type=magiclink&next=%2Fdashboard"),
    noopCookies(),
  );
  assert.equal(codeParams.next, "/dashboard");
  assert.equal(magicLinkParams.next, "/dashboard");
});

test("an unsafe external next is rejected for a magic-link callback and falls back to a safe default", () => {
  const params = resolveAuthCallbackParams(
    new URL(
      "https://www.pratiqo.ca/auth/callback?token_hash=abc123&type=magiclink&next=" +
        encodeURIComponent("https://evil.example.com/phish"),
    ),
    noopCookies(),
  );
  assert.ok(params.next.startsWith("/"));
  assert.doesNotMatch(params.next, /evil\.example\.com/);
});

test("a protocol-relative next is rejected for a magic-link callback", () => {
  const params = resolveAuthCallbackParams(
    new URL("https://www.pratiqo.ca/auth/callback?token_hash=abc123&type=magiclink&next=" + encodeURIComponent("//evil.example.com")),
    noopCookies(),
  );
  assert.doesNotMatch(params.next, /evil\.example\.com/);
});

// ── UI: magic link is offered alongside Google and email/password, gated the same way ──

test("login page exposes a magic-link option gated by legal acceptance like Google and email/password", () => {
  const page = read("app/login/page.tsx");
  assert.match(page, /sendMagicLink/);
  assert.match(page, /handleMagicLink/);
  assert.match(page, /data-testid="login-magic-link-button"/);
  assert.match(
    page,
    /data-testid="login-magic-link-button"[\s\S]{0,80}disabled=\{!legalAccepted \|\| busy\}|disabled=\{!legalAccepted \|\| busy\}[\s\S]{0,200}data-testid="login-magic-link-button"/,
  );
});

test("magic link request surfaces a friendly message and never leaks a raw Supabase error to the UI", () => {
  const page = read("app/login/page.tsx");
  const fnBody = page.slice(page.indexOf("const handleMagicLink"), page.indexOf("const handleMagicLink") + 800);
  assert.match(fnBody, /loginMagicLinkSent/);
  assert.match(fnBody, /loginGenericAuthError/);
  assert.doesNotMatch(fnBody, /setFormError\(e\.message\)/);
  assert.doesNotMatch(fnBody, /setFormError\(e\)/);
});

test("magic-link auth-error copy is generic (not Google-specific) since Google and magic-link share the same callback error path", () => {
  const fr = readJson("lib/i18n/locales/fr.json");
  const en = readJson("lib/i18n/locales/en.json");
  const es = readJson("lib/i18n/locales/es.json");
  for (const dict of [fr, en, es]) {
    assert.doesNotMatch(dict.loginAuthErrorSession, /Google/i);
  }
});

test("magic-link copy exists in FR, EN, and ES dictionaries", () => {
  const keys = ["loginMagicLinkCta", "loginMagicLinkSent", "loginEmailRequiredForMagicLink"];
  for (const localePath of ["lib/i18n/locales/fr.json", "lib/i18n/locales/en.json", "lib/i18n/locales/es.json"]) {
    const dictionary = readJson(localePath);
    for (const key of keys) {
      assert.equal(typeof dictionary[key], "string", `${localePath} missing ${key}`);
      assert.ok(dictionary[key].trim(), `${localePath} has empty ${key}`);
    }
  }
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[auth:magicLinkAuth] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
