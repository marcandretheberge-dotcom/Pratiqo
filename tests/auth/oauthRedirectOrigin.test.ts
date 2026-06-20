import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildOAuthCallbackUrl,
  resolveOAuthRedirectOriginFromHost,
} from "@/lib/auth/oauthCallback";
import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";
import { resolveLoginOAuthNextPath } from "@/lib/auth/preAuthOnboardingIntent";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const PRODUCTION_SITE = "https://www.pratiqo.ca";
const PREVIEW_ORIGIN = "https://pratiqo-git-fix-auth.vercel.app";
const LOCAL_ORIGIN = "http://localhost:3000";

// ── Origin resolution ───────────────────────────────────────────────────────

test("preview origin builds preview callback URL", () => {
  const origin = resolveOAuthRedirectOriginFromHost(
    "pratiqo-git-fix-auth.vercel.app",
    PREVIEW_ORIGIN,
    PRODUCTION_SITE,
  );
  assert.equal(origin, PREVIEW_ORIGIN);
  const url = buildOAuthCallbackUrl(origin, {
    intent: "teacher",
    next: "/onboarding/teacher",
  });
  assert.equal(
    url,
    `${PREVIEW_ORIGIN}/auth/callback?intent=teacher&next=%2Fonboarding%2Fteacher`,
  );
});

test("production origin builds production callback URL", () => {
  const origin = resolveOAuthRedirectOriginFromHost(
    "www.pratiqo.ca",
    PRODUCTION_SITE,
    PRODUCTION_SITE,
  );
  assert.equal(origin, PRODUCTION_SITE);
  const url = buildOAuthCallbackUrl(origin, {
    intent: "teacher",
    next: "/onboarding/teacher",
  });
  assert.equal(
    url,
    `${PRODUCTION_SITE}/auth/callback?intent=teacher&next=%2Fonboarding%2Fteacher`,
  );
});

test("localhost origin builds localhost callback URL", () => {
  const origin = resolveOAuthRedirectOriginFromHost("localhost", LOCAL_ORIGIN, PRODUCTION_SITE);
  assert.equal(origin, LOCAL_ORIGIN);
  const url = buildOAuthCallbackUrl(origin, { next: "/dashboard" });
  assert.equal(url, `${LOCAL_ORIGIN}/auth/callback?next=%2Fdashboard`);
});

test("preview never canonicalizes to production when NEXT_PUBLIC_SITE_URL is set", () => {
  const origin = resolveOAuthRedirectOriginFromHost(
    "pratiqo-abc123-team.vercel.app",
    "https://pratiqo-abc123-team.vercel.app",
    PRODUCTION_SITE,
  );
  assert.notEqual(origin, PRODUCTION_SITE);
  assert.ok(origin.includes(".vercel.app"));
});

test("apex production host normalizes to configured www site URL", () => {
  const origin = resolveOAuthRedirectOriginFromHost(
    "pratiqo.ca",
    "https://pratiqo.ca",
    PRODUCTION_SITE,
  );
  assert.equal(origin, PRODUCTION_SITE);
});

test("custom staging host stays on initiating origin", () => {
  const staging = "https://staging.pratiqo.ca";
  const origin = resolveOAuthRedirectOriginFromHost("staging.pratiqo.ca", staging, PRODUCTION_SITE);
  assert.equal(origin, staging);
});

// ── Intent / next preservation in OAuth redirect construction ───────────────

test("intent=teacher&next=/onboarding/teacher survives Google login redirect construction", () => {
  const url = buildOAuthCallbackUrl(PRODUCTION_SITE, {
    intent: "teacher",
    next: "/onboarding/teacher",
  });
  assert.equal(
    url,
    `${PRODUCTION_SITE}/auth/callback?intent=teacher&next=%2Fonboarding%2Fteacher`,
  );
  assert.equal(
    resolveLoginOAuthNextPath("teacher", "/onboarding/teacher", "teacher"),
    "/onboarding/teacher",
  );
});

test("intent=student alias survives Google login redirect construction", () => {
  const url = buildOAuthCallbackUrl(PREVIEW_ORIGIN, {
    intent: "student",
    next: "/student/choose-companion",
  });
  assert.match(url, /intent=student/);
  assert.match(url, /next=%2Fstudent%2Fchoose-companion/);
});

test("loginWithGoogle forwards intentQuery for public student alias", () => {
  const src = read("lib/auth.ts");
  assert.match(src, /intentQuery/);
  assert.match(src, /callbackIntent = options\?\.intentQuery \?\? options\?\.intent/);
  const page = read("app/login/page.tsx");
  assert.match(page, /intentQuery:\s*intentParam === "student" \? "student" : loginIntent/);
});

// ── Callback must not canonicalize preview to production ────────────────────

test("auth callback never uses SITE_URL or NEXT_PUBLIC_SITE_URL for redirects", () => {
  const src = read("app/auth/callback/route.ts");
  assert.doesNotMatch(src, /NEXT_PUBLIC_SITE_URL/);
  assert.doesNotMatch(src, /SITE_URL/);
  assert.match(src, /requestUrl\.origin/);
});

test("unsafe next is still rejected in OAuth redirect construction", () => {
  assert.equal(sanitizeRelativeRedirectPath("https://evil.com"), null);
  assert.equal(
    resolveLoginOAuthNextPath(null, "https://evil.com", "teacher"),
    "/onboarding/teacher",
  );
  assert.equal(
    resolveLoginOAuthNextPath(null, "https://evil.com", "learner"),
    "/student/choose-companion",
  );
});

test("resolveOAuthRedirectOrigin uses window.location on the client", () => {
  const src = read("lib/auth/oauthCallback.ts");
  assert.match(src, /resolveOAuthRedirectOriginFromHost/);
  assert.match(src, /window\.location\.hostname/);
  assert.match(src, /isVercelPreviewHost/);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[auth:oauthRedirectOrigin] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
