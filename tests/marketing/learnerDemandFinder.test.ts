/**
 * Regression suite for the public learner-demand funnel.
 *
 * The contract is intentionally narrow: three quick learner questions,
 * immediate matching when supply exists, and a private server-side waitlist
 * when it does not. No account, password, phone, or street address is required.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();
const pageSrc = readFileSync(join(root, "app", "(marketing)", "trouver-mon-prof", "page.tsx"), "utf8");
const finderSrc = readFileSync(join(root, "components", "marketing", "LearnerTeacherFinder.tsx"), "utf8");
const apiSrc = readFileSync(join(root, "app", "api", "learner-demand", "route.ts"), "utf8");
const helperSrc = readFileSync(join(root, "lib", "learnerDemand.ts"), "utf8");
const notificationSrc = readFileSync(join(root, "lib", "learnerDemandNotifications.ts"), "utf8");
const emailSrc = readFileSync(join(root, "lib", "email", "templates", "learnerDemand.ts"), "utf8");
const cronSrc = readFileSync(join(root, "app", "api", "cron", "learner-demand", "route.ts"), "utf8");
const migrationSrc = readFileSync(join(root, "supabase", "migrations", "088_learner_demand_funnel.sql"), "utf8");
const vercelSrc = readFileSync(join(root, "vercel.json"), "utf8");

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

test("/trouver-mon-prof reuses the shared marketing shell and dedicated finder", () => {
  assert.match(pageSrc, /<LandingHeader\s*\/>/);
  assert.match(pageSrc, /<LandingFooter\s*\/>/);
  assert.match(pageSrc, /<LandingSkipLink\s+locale=/);
  assert.match(pageSrc, /<LearnerTeacherFinder\s*\/>/);
  assert.match(pageSrc, /canonical:\s*`\$\{SITE_URL\}\/trouver-mon-prof`/);
});

test("finder is exactly a three-step pre-account funnel", () => {
  assert.match(finderSrc, /type Step = 1 \| 2 \| 3/);
  assert.match(finderSrc, /setStep\(2\)/);
  assert.match(finderSrc, /setStep\(3\)/);
  assert.match(finderSrc, /\(step \/ 3\) \* 100/);
  assert.match(finderSrc, /subject:/);
  assert.match(finderSrc, /city:/);
  assert.match(finderSrc, /acceptsOnline/);
  assert.match(finderSrc, /email:/);

  const code = stripComments(finderSrc);
  assert.ok(!/type=["']password["']/.test(code), "finder must not ask for a password");
  assert.ok(!/type=["']tel["']/.test(code), "finder must not ask for a phone number");
  assert.ok(!/street|postal|zip|address-line/i.test(code), "finder must not ask for a street/postal address");
});

test("email collection states the narrow match-notification purpose and links privacy policy", () => {
  assert.match(finderSrc, /professeur correspondant[^\n]+devient disponible/);
  assert.match(finderSrc, /href="\/legal\/confidentialite"/);
  assert.ok(!/newsletter|infolettre|promotions|offres de Pratiqo/i.test(finderSrc), "transactional match purpose must not be bundled with marketing consent");
});

test("finder posts only to the hardened learner-demand API", () => {
  assert.match(finderSrc, /fetch\("\/api\/learner-demand"/);
  assert.match(finderSrc, /method:\s*"POST"/);
  assert.match(apiSrc, /rateLimitByIp\(request, "learner-demand"/);
  assert.match(apiSrc, /MAX_BODY_BYTES = 4_096/);
  assert.match(apiSrc, /getSupabaseAdmin\(\)/);
  assert.match(apiSrc, /TEACHERS_PUBLIC_TABLE/);
  assert.match(apiSrc, /isLaunchEligibleTeacherRow/);
});

test("all match outcomes stay positive and the funnel has no dead-end copy", () => {
  for (const outcome of ["local_match", "online_match", "waitlist"]) {
    assert.ok(finderSrc.includes(outcome), `finder must handle ${outcome}`);
  }
  assert.match(finderSrc, /On cherche le bon prof pour toi/);
  assert.ok(!/Aucun professeur trouvé|Aucun résultat trouvé|No teachers found/i.test(finderSrc));
  assert.match(finderSrc, /recruitShareUrl/);
  assert.match(finderSrc, /navigator\.share/);
});

test("existing matches deep-link to the best teacher profile instead of forcing a second search", () => {
  assert.match(helperSrc, /openTeacher/);
  assert.match(helperSrc, /source:\s*"learner_finder"/);
  assert.match(helperSrc, /primaryTeacherId/);
  assert.match(helperSrc, /local_match/);
  assert.match(helperSrc, /online_match/);
});

test("waitlist storage is private, deduplicated and RLS-protected", () => {
  assert.match(migrationSrc, /CREATE TABLE IF NOT EXISTS public\.learner_demand_leads/);
  assert.match(migrationSrc, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migrationSrc, /REVOKE ALL ON TABLE public\.learner_demand_leads FROM anon, authenticated/);
  assert.match(migrationSrc, /CREATE UNIQUE INDEX IF NOT EXISTS idx_learner_demand_open_dedupe/);
  assert.match(migrationSrc, /email_normalized/);
  assert.match(migrationSrc, /subject_normalized/);
  assert.match(migrationSrc, /city_normalized/);
  assert.ok(!/CREATE POLICY/i.test(migrationSrc), "private waitlist must not expose anon/authenticated RLS policies");
  assert.match(apiSrc, /from\("learner_demand_leads"\)\.upsert/);
});

test("open waitlist leads are re-matched and notified with transactional email", () => {
  assert.match(notificationSrc, /eq\("status", "open"\)/);
  assert.match(notificationSrc, /matchLearnerDemand/);
  assert.match(notificationSrc, /sendLearnerDemandMatchEmail/);
  assert.match(notificationSrc, /status:\s*"notified"/);
  assert.match(emailSrc, /You're receiving this email because you asked us/);
  assert.match(emailSrc, /Tu reçois ce courriel parce que tu nous as demandé/);
  assert.match(cronSrc, /verifyCronSecret/);
  assert.match(cronSrc, /processLearnerDemandMatches/);
  assert.match(vercelSrc, /"path": "\/api\/cron\/learner-demand"/);
});

test("finder does not import Stripe, booking or payment internals", () => {
  const code = stripComments(`${pageSrc}\n${finderSrc}\n${apiSrc}`);
  for (const [pattern, label] of [
    [/\bstripe\b/i, "Stripe"],
    [/@\/lib\/payments/, "payment internals"],
    [/BookingModal/, "booking modal"],
  ] as const) {
    assert.ok(!pattern.test(code), `${label} must stay out of the pre-lead funnel`);
  }
});

async function run() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (error) {
      console.error(`not ok - ${name}`);
      throw error;
    }
  }
  console.log(`[marketing:learnerDemandFinder] ${tests.length} tests passed`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
