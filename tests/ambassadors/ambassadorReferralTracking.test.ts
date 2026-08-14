import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  AMBASSADOR_REFERRAL_DEFAULT_WINDOW_DAYS,
  AMBASSADOR_REFERRAL_RATE_LIMIT,
  clampAmbassadorReferralWindowDays,
  isNewAccountForReferral,
  normalizeAmbassadorCode,
  parseAmbassadorReferralSessionId,
  safeAmbassadorDestination,
  shouldSkipAmbassadorSessionCreationForRateLimit,
} from "../../lib/ambassadors/referrals";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");
}

function changedFiles(): string[] {
  const output = execFileSync("git", ["diff", "--name-only", "origin/main...HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
  })
    .trim();
  return output ? output.split(/\r?\n/) : [];
}

const routeSrc = read("app/r/[code]/route.ts");
const claimRouteSrc = read("app/api/ambassadors/referral/claim/route.ts");
const profileEnsureSrc = read("app/api/auth/profile/ensure/route.ts");
const clientClaimSrc = read("components/ambassadors/AmbassadorReferralClaim.tsx");
const authCallbackSrc = read("app/auth/callback/route.ts");
const creditsRouteSrc = read("app/api/credits/route.ts");
const creditsLibSrc = read("lib/credits.ts");
const migration089 = read("supabase/migrations/089_ambassador_referral_tracking.sql");
const migration093 = read("supabase/migrations/093_ambassador_net_contribution_economics.sql");

test("public ambassador codes are normalized but not used as relational keys", () => {
  assert.equal(normalizeAmbassadorCode("Julie-Piano"), "julie-piano");
  assert.equal(normalizeAmbassadorCode("ab"), null);
  assert.equal(normalizeAmbassadorCode("julie_piano"), null);
  assert.match(migration089, /id uuid PRIMARY KEY DEFAULT gen_random_uuid\(\)/);
  assert.match(migration089, /ambassador_link_id uuid NOT NULL REFERENCES public\.ambassador_links\(id\)/);
  assert.doesNotMatch(migration089, /REFERENCES public\.ambassador_links\(code\)/);
});

test("referral destination and cookie values stay constrained", () => {
  assert.equal(safeAmbassadorDestination("/trouver-un-prof?q=espagnol"), "/trouver-un-prof?q=espagnol");
  assert.equal(safeAmbassadorDestination("https://evil.example"), "/");
  assert.equal(safeAmbassadorDestination("//evil.example"), "/");
  assert.equal(safeAmbassadorDestination("/\\evil.example"), "/");
  assert.equal(safeAmbassadorDestination("/\\/evil.example"), "/");
  assert.equal(safeAmbassadorDestination("/%5Cevil.example"), "/");
  assert.equal(
    parseAmbassadorReferralSessionId("11111111-1111-4111-8111-111111111111"),
    "11111111-1111-4111-8111-111111111111",
  );
  assert.equal(parseAmbassadorReferralSessionId("marie-piano"), null);
});

test("attribution window is centralized and bounded", () => {
  assert.equal(AMBASSADOR_REFERRAL_DEFAULT_WINDOW_DAYS, 30);
  assert.equal(clampAmbassadorReferralWindowDays(null), 30);
  assert.equal(clampAmbassadorReferralWindowDays(0), 1);
  assert.equal(clampAmbassadorReferralWindowDays(999), 180);
});

test("new-user-only eligibility uses Supabase Auth account creation time", () => {
  const now = new Date("2026-08-13T12:00:00.000Z");
  assert.equal(
    isNewAccountForReferral({
      accountCreatedAt: "2026-08-13T10:00:00.000Z",
      firstTouchAt: "2026-08-13T09:00:00.000Z",
      expiresAt: "2026-09-13T09:00:00.000Z",
      now,
    }),
    true,
  );
  assert.equal(
    isNewAccountForReferral({
      accountCreatedAt: "2026-08-12T10:00:00.000Z",
      firstTouchAt: "2026-08-13T09:00:00.000Z",
      expiresAt: "2026-09-13T09:00:00.000Z",
      now,
    }),
    false,
  );
  assert.equal(
    isNewAccountForReferral({
      accountCreatedAt: "2026-08-13T10:00:00.000Z",
      firstTouchAt: "2026-08-13T09:00:00.000Z",
      expiresAt: "2026-08-13T11:00:00.000Z",
      now,
    }),
    false,
  );
});

test("/r/[code] preserves first valid touch before creating a new session", () => {
  const existingLookup = routeSrc.indexOf(".from(\"referral_sessions\")");
  const insertSession = routeSrc.indexOf(".from(\"referral_sessions\")\n    .insert");
  assert.ok(existingLookup > -1, "existing referral session lookup is present");
  assert.ok(insertSession > existingLookup, "new sessions are created only after valid existing session check");
  assert.match(routeSrc, /parseAmbassadorReferralSessionId\(req\.cookies\.get\(AMBASSADOR_REF_COOKIE\)\?\.value\)/);
  assert.match(routeSrc, /return NextResponse\.redirect\(new URL\(destinationPath, req\.url\)\)/);
});

test("existing first-touch sessions remain claimable after public link deactivation", () => {
  assert.match(routeSrc, /\.eq\("active", true\)/, "new /r/[code] sessions require an active link");
  assert.match(migration093, /legitimately issued while its link was active remains[\s\S]*claimable until expiry/);
  assert.match(migration093, /FROM public\.ambassador_links l\s+WHERE l\.id = v_session\.ambassador_link_id;/);
  assert.doesNotMatch(
    migration093,
    /WHERE l\.id = v_session\.ambassador_link_id\s+AND l\.active = true/,
  );
});

test("ambassador link destination SQL constraint rejects backslash redirects", () => {
  assert.match(migration093, /DROP CONSTRAINT IF EXISTS ambassador_links_destination_check/);
  assert.match(migration093, /UPDATE public\.ambassador_links\s+SET destination_path = '\/'/);
  assert.match(migration093, /position\(chr\(92\) in destination_path\) = 0/);
  assert.match(migration093, /lower\(destination_path\) NOT LIKE '%5c%'/);
});

test("/r/[code] rate limits tracking without breaking navigation", () => {
  assert.deepEqual(AMBASSADOR_REFERRAL_RATE_LIMIT, { limit: 20, windowSeconds: 60 });
  assert.equal(shouldSkipAmbassadorSessionCreationForRateLimit({ allowed: false }), true);
  assert.equal(
    shouldSkipAmbassadorSessionCreationForRateLimit({ allowed: false, infrastructureUnavailable: true }),
    true,
  );
  assert.equal(shouldSkipAmbassadorSessionCreationForRateLimit({ allowed: true }), false);
  assert.match(routeSrc, /rateLimitByIp\(req, `ambassador-referral-\$\{code\}`/);
  assert.match(routeSrc, /shouldSkipAmbassadorSessionCreationForRateLimit\(rateLimit\)/);
  assert.match(routeSrc, /return NextResponse\.redirect\(new URL\(destinationPath, req\.url\)\)/);
  assert.match(routeSrc, /export const dynamic = "force-dynamic"/);
});

test("referral cookie is opaque HttpOnly first-party state", () => {
  assert.match(routeSrc, /response\.cookies\.set\(AMBASSADOR_REF_COOKIE, session\.id/);
  assert.match(routeSrc, /httpOnly:\s*true/);
  assert.match(routeSrc, /secure:\s*process\.env\.NODE_ENV === "production"/);
  assert.match(routeSrc, /sameSite:\s*"lax"/);
  assert.match(routeSrc, /path:\s*"\/"/);
  assert.match(routeSrc, /maxAge:\s*cookieMaxAgeSeconds/);
  assert.doesNotMatch(routeSrc, /teacher_id|ambassador_user_id|platform_fee_cents/);
});

test("claim endpoint is server-authoritative and does not trust client-selected ambassador ids", () => {
  assert.match(claimRouteSrc, /supabaseUser\.auth\.getUser\(\)/);
  assert.match(claimRouteSrc, /cookies\(\)/);
  assert.match(claimRouteSrc, /claimAmbassadorReferralForNewUser/);
  assert.doesNotMatch(claimRouteSrc, /ambassador_link_id|ambassador_user_id|teacher_id/);
});

test("profile ensure retries claim safely after profile hydration", () => {
  const ensureIndex = profileEnsureSrc.indexOf("ensureAuthProfileForUser");
  const claimIndex = profileEnsureSrc.indexOf("claimAmbassadorReferralForNewUser");
  assert.ok(ensureIndex > -1, "profile ensure call exists");
  assert.ok(claimIndex > ensureIndex, "claim happens after profile hydration");
  assert.doesNotMatch(profileEnsureSrc, /isNewProfile/);
  assert.doesNotMatch(profileEnsureSrc, /beforeEnsure/);
});

test("background client claim is bounded and uses the current auth session only", () => {
  assert.match(clientClaimSrc, /attemptedUserRef/);
  assert.match(clientClaimSrc, /supabase\.auth\.getSession\(\)/);
  assert.match(clientClaimSrc, /onAuthStateChange/);
  assert.match(clientClaimSrc, /Authorization:\s*`Bearer \$\{session\.access_token\}`/);
  assert.match(clientClaimSrc, /credentials:\s*"same-origin"/);
  assert.doesNotMatch(clientClaimSrc, /while\s*\(|setInterval|setTimeout/);
});

test("legacy friend referral credit system remains separate", () => {
  assert.match(authCallbackSrc, /referral_code/);
  assert.match(authCallbackSrc, /referred_by/);
  assert.match(creditsRouteSrc, /referral_code/);
  assert.match(creditsLibSrc, /REFERRAL_YEARLY_CAP/);
  assert.doesNotMatch(migration089, /ALTER TABLE public\.profiles.*referral_code/is);
  assert.doesNotMatch(migration089, /credit_transactions/);
});

test("ambassador PR stays away from restricted systems", () => {
  const forbidden = [
    /^app\/api\/stripe\//,
    /^lib\/payments\//,
    /^lib\/config\/membrePro\.ts$/,
    /^supabase\/migrations\/(?!089_ambassador|090_ambassador|091_ambassador|092_harden_recent_program_tables_rls\.sql$|093_ambassador_net_contribution_economics\.sql$)/,
    /^app\/yo\//,
    /^lib\/yo\//,
    /^public\/.*\.mp3$/i,
    /^scripts\/generate-yopratiqo-audio\.ts$/,
  ];
  for (const file of changedFiles()) {
    assert.equal(
      forbidden.some((pattern) => pattern.test(file)),
      false,
      `restricted system touched by ambassador PR: ${file}`,
    );
  }
});

async function run(): Promise<void> {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[ambassadors:tracking] ${tests.length} tests passed`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
