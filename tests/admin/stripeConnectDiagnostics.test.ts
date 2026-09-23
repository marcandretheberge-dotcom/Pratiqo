/**
 * Admin Stripe Connect diagnostics.
 *
 * Pins:
 *   - API is admin-only and read-only
 *   - diagnostics use database-synced fields, not live Stripe calls
 *   - Stripe account IDs are masked in responses
 *   - current readiness logic is reported, not changed
 *   - likely false negatives from collapsed requirements are flagged
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  deriveAdminStripeActionSummary,
  deriveAdminStripeDiagnosticsTeacher,
  explainStripeRequirement,
  listAdminStripeDiagnostics,
  maskStripeAccountId,
  normalizeAdminStripeDiagnosticsFilter,
  normalizeRequirementsDue,
  summarizeAdminStripeDiagnostics,
  type AdminStripeDiagnosticLabel,
} from "@/lib/admin/stripeDiagnostics";
import { ADMIN_COMMAND_CENTER_MODULES } from "@/lib/admin/overview";

const ROOT = process.cwd();
const NOW = new Date("2026-08-17T12:00:00.000Z");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function baseProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "profile-teacher-1",
    email: "teacher@example.com",
    name: "Prof Stripe",
    role: "teacher",
    country_code: "CA",
    is_active: true,
    deactivated_at: null,
    deleted_at: null,
    anonymized_at: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function baseTeacher(overrides: Record<string, unknown> = {}) {
  return {
    id: "teacher-1",
    user_id: "profile-teacher-1",
    name: "Prof Stripe",
    country_code: "CA",
    availability: ["monday 09:00"],
    is_public: true,
    is_demo: false,
    deactivated_at: null,
    deleted_at: null,
    identity_verified: true,
    identity_status: "verified",
    stripe_identity_status: "verified",
    stripe_identity_failed_reason: null,
    stripe_account_id: "acct_ready1234",
    stripe_connect_onboarding_complete: true,
    stripe_connect_charges_enabled: true,
    stripe_connect_payouts_enabled: true,
    stripe_connect_requirements_due: [],
    stripe_connect_disabled_reason: null,
    stripe_connect_last_synced_at: "2026-08-17T11:00:00.000Z",
    ...overrides,
  };
}

test("admin diagnostics route and page exist under admin guard conventions", () => {
  assert.ok(existsSync(join(ROOT, "app/api/admin/stripe-diagnostics/route.ts")));
  assert.ok(existsSync(join(ROOT, "app/(app)/admin/stripe-diagnostics/page.tsx")));
  const layout = read("app/(app)/admin/layout.tsx");
  assert.match(layout, /requireAdminPage\(/);
});

test("diagnostics API rejects non-admin users before loading diagnostics", () => {
  const route = read("app/api/admin/stripe-diagnostics/route.ts");
  const authIndex = route.indexOf("requireAdminApi(req)");
  const loadIndex = route.indexOf("await listAdminStripeDiagnostics");
  assert.ok(authIndex >= 0, "requireAdminApi missing");
  assert.ok(loadIndex > authIndex, "diagnostics must load only after admin guard");
  assert.match(route, /if\s*\(auth\.status\s*===\s*"error"\)\s*return auth\.response/);
});

test("diagnostics API is GET-only and does not call Stripe APIs", () => {
  const route = read("app/api/admin/stripe-diagnostics/route.ts");
  const helper = read("lib/admin/stripeDiagnostics.ts");
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  for (const source of [route, helper]) {
    assert.doesNotMatch(source, /from\s+["']stripe["']/i);
    assert.doesNotMatch(source, /stripe\.accounts\.(retrieve|create)/i);
    assert.doesNotMatch(source, /stripe\.accountLinks\.create/i);
    assert.doesNotMatch(source, /stripe\.identity\.verificationSessions\.create/i);
    assert.doesNotMatch(source, /checkout\.sessions\.create|refunds\.create|transfers\.create/i);
    assert.doesNotMatch(source, /from\s+["']@\/lib\/payments\//);
    assert.doesNotMatch(source, /from\s+["']@\/lib\/stripe/);
  }
});

test("diagnostics helper exposes all required labels", () => {
  const helper = read("lib/admin/stripeDiagnostics.ts");
  const labels: AdminStripeDiagnosticLabel[] = [
    "missing_stripe_account",
    "connect_started",
    "onboarding_incomplete",
    "onboarding_complete",
    "charges_enabled",
    "charges_disabled",
    "payouts_enabled",
    "payouts_disabled",
    "requirements_due_blocking_current_logic",
    "disabled_by_stripe",
    "market_not_supported",
    "country_code_missing",
    "sync_never_run",
    "sync_stale_over_24h",
    "sync_stale_over_7d",
    "identity_verified",
    "identity_pending",
    "identity_failed",
    "identity_missing",
    "possible_false_negative_from_collapsed_requirements",
  ];
  for (const label of labels) assert.match(helper, new RegExp(label));
});

test("Stripe account IDs are masked and full IDs are not required client-side", () => {
  assert.equal(maskStripeAccountId("acct_1234567890"), "acct_****7890");
  assert.equal(maskStripeAccountId(null), null);
  const page = read("app/(app)/admin/stripe-diagnostics/page.tsx");
  assert.match(page, /maskedStripeAccountId/);
  assert.doesNotMatch(page, /stripe_account_id/);
});

test("diagnostics page renders action guidance and friendly requirement details", () => {
  const page = read("app/(app)/admin/stripe-diagnostics/page.tsx");
  assert.match(page, /What this means/);
  assert.match(page, /What to do next/);
  assert.match(page, /Owner:/);
  assert.match(page, /Severity:/);
  assert.match(page, /requirementsDueDetails/);
  assert.match(page, /item\.friendly/);
  assert.match(page, /item\.raw/);
});

test("ready Canadian teacher reports current payment and payout readiness", () => {
  const diagnostic = deriveAdminStripeDiagnosticsTeacher(
    { profile: baseProfile(), teacher: baseTeacher() as never },
    NOW,
  );

  assert.equal(diagnostic.hasStripeAccount, true);
  assert.equal(diagnostic.maskedStripeAccountId, "acct_****1234");
  assert.equal(diagnostic.marketPayoutSupported, true);
  assert.equal(diagnostic.currentLogic.paymentReady, true);
  assert.equal(diagnostic.currentLogic.payoutReady, true);
  assert.equal(diagnostic.currentLogic.bookingReady, true);
  assert.ok(diagnostic.labels.includes("connect_started"));
  assert.ok(diagnostic.labels.includes("onboarding_complete"));
  assert.ok(diagnostic.labels.includes("charges_enabled"));
  assert.ok(diagnostic.labels.includes("payouts_enabled"));
  assert.ok(diagnostic.labels.includes("identity_verified"));
  assert.equal(diagnostic.actionSummary.severity, "ok");
  assert.equal(diagnostic.actionSummary.owner, "none");
  assert.equal(diagnostic.actionSummary.title, "Stripe payment setup ready");
  assert.deepEqual(diagnostic.actionSummary.nextSteps, ["No immediate action."]);
});

test("missing Stripe account produces teacher action guidance", () => {
  const diagnostic = deriveAdminStripeDiagnosticsTeacher(
    { profile: baseProfile(), teacher: null },
    NOW,
  );
  assert.equal(diagnostic.actionSummary.severity, "blocked");
  assert.equal(diagnostic.actionSummary.owner, "teacher");
  assert.equal(diagnostic.actionSummary.title, "Stripe Connect not started");
  assert.match(diagnostic.actionSummary.explanation, /has not created a Stripe Connect account/);
  assert.ok(diagnostic.actionSummary.nextSteps.includes("Go to payment setup."));
});

test("onboarding incomplete produces continue onboarding guidance", () => {
  const diagnostic = deriveAdminStripeDiagnosticsTeacher(
    {
      profile: baseProfile(),
      teacher: baseTeacher({
        stripe_connect_onboarding_complete: false,
        stripe_connect_charges_enabled: false,
        stripe_connect_payouts_enabled: false,
      }) as never,
    },
    NOW,
  );
  assert.equal(diagnostic.actionSummary.severity, "blocked");
  assert.equal(diagnostic.actionSummary.owner, "teacher");
  assert.equal(diagnostic.actionSummary.title, "Stripe onboarding incomplete");
  assert.ok(
    diagnostic.actionSummary.nextSteps.includes(
      "Ask the teacher to continue Stripe onboarding from Pratiqo.",
    ),
  );
});

test("raw Stripe requirements get friendly admin translations", () => {
  assert.deepEqual(explainStripeRequirement("external_account"), {
    raw: "external_account",
    friendly: "Add payout bank account",
  });
  assert.deepEqual(explainStripeRequirement("tos_acceptance.date"), {
    raw: "tos_acceptance.date",
    friendly: "Accept Stripe terms",
  });
  assert.deepEqual(explainStripeRequirement("tos_acceptance.ip"), {
    raw: "tos_acceptance.ip",
    friendly: "Accept Stripe terms from browser/IP",
  });
  assert.deepEqual(explainStripeRequirement("requirements.past_due"), {
    raw: "requirements.past_due",
    friendly: "Missing info is past due; Stripe blocked capability",
  });
});

test("external_account produces add bank account guidance", () => {
  const diagnostic = deriveAdminStripeDiagnosticsTeacher(
    {
      profile: baseProfile(),
      teacher: baseTeacher({
        stripe_connect_onboarding_complete: false,
        stripe_connect_requirements_due: ["external_account"],
      }) as never,
    },
    NOW,
  );
  assert.ok(
    diagnostic.actionSummary.nextSteps.includes(
      "Teacher must add a payout bank account or external payout account in Stripe.",
    ),
  );
  assert.deepEqual(diagnostic.connect.requirementsDueDetails, [
    { raw: "external_account", friendly: "Add payout bank account" },
  ]);
});

test("tos_acceptance.date and tos_acceptance.ip produce accept Stripe terms guidance", () => {
  const diagnostic = deriveAdminStripeDiagnosticsTeacher(
    {
      profile: baseProfile(),
      teacher: baseTeacher({
        stripe_connect_onboarding_complete: false,
        stripe_connect_requirements_due: ["tos_acceptance.date", "tos_acceptance.ip"],
      }) as never,
    },
    NOW,
  );
  assert.ok(
    diagnostic.actionSummary.nextSteps.includes(
      "Teacher must accept Stripe's connected account terms inside the Stripe onboarding flow.",
    ),
  );
  assert.deepEqual(diagnostic.connect.requirementsDueDetails, [
    { raw: "tos_acceptance.date", friendly: "Accept Stripe terms" },
    { raw: "tos_acceptance.ip", friendly: "Accept Stripe terms from browser/IP" },
  ]);
});

test("requirements.past_due produces past-due blocked guidance", () => {
  const diagnostic = deriveAdminStripeDiagnosticsTeacher(
    {
      profile: baseProfile(),
      teacher: baseTeacher({
        stripe_connect_requirements_due: ["requirements.past_due"],
        stripe_connect_disabled_reason: "requirements.past_due",
      }) as never,
    },
    NOW,
  );
  assert.equal(diagnostic.actionSummary.severity, "blocked");
  assert.equal(diagnostic.actionSummary.owner, "teacher");
  assert.equal(diagnostic.actionSummary.title, "Stripe requirements are past due");
  assert.match(diagnostic.actionSummary.explanation, /past due/);
});

test("disabled_by_stripe produces blocked guidance", () => {
  const diagnostic = deriveAdminStripeDiagnosticsTeacher(
    {
      profile: baseProfile(),
      teacher: baseTeacher({
        stripe_connect_disabled_reason: "rejected.fraud",
      }) as never,
    },
    NOW,
  );
  assert.equal(diagnostic.actionSummary.severity, "blocked");
  assert.equal(diagnostic.actionSummary.owner, "stripe");
  assert.equal(diagnostic.actionSummary.title, "Stripe disabled this account or capability");
  assert.ok(
    diagnostic.actionSummary.nextSteps.includes(
      "If the teacher says everything is complete, check the connected account in Stripe Dashboard.",
    ),
  );
});

test("stale sync produces admin refresh and webhook guidance", () => {
  const diagnostic = deriveAdminStripeDiagnosticsTeacher(
    {
      profile: baseProfile(),
      teacher: baseTeacher({
        stripe_connect_last_synced_at: "2026-08-10T00:00:00.000Z",
      }) as never,
    },
    NOW,
  );
  assert.equal(diagnostic.actionSummary.severity, "warning");
  assert.equal(diagnostic.actionSummary.owner, "admin");
  assert.equal(diagnostic.actionSummary.title, "Stripe status may be stale");
  assert.ok(
    diagnostic.actionSummary.nextSteps.includes(
      "Confirm production Stripe account.updated webhooks are configured.",
    ),
  );
});

test("requirements due can flag possible false negatives under collapsed requirements", () => {
  const diagnostic = deriveAdminStripeDiagnosticsTeacher(
    {
      profile: baseProfile(),
      teacher: baseTeacher({
        stripe_connect_requirements_due: ["future_requirements.eventually_due"],
        stripe_connect_payouts_enabled: true,
        stripe_connect_charges_enabled: true,
      }) as never,
    },
    NOW,
  );

  assert.equal(diagnostic.currentLogic.paymentReady, false);
  assert.equal(diagnostic.currentLogic.payoutReady, false);
  assert.ok(diagnostic.labels.includes("requirements_due_blocking_current_logic"));
  assert.ok(diagnostic.labels.includes("possible_false_negative_from_collapsed_requirements"));
  assert.ok(diagnostic.warnings.includes("possible_false_negative_from_collapsed_requirements"));
  assert.equal(diagnostic.actionSummary.severity, "warning");
  assert.equal(diagnostic.actionSummary.owner, "admin");
  assert.equal(diagnostic.actionSummary.title, "Possible false negative");
  assert.match(diagnostic.actionSummary.explanation, /eventual or future requirements/);
});

test("identity_missing says Identity is separate from Connect/payment activation", () => {
  const diagnostic = deriveAdminStripeDiagnosticsTeacher(
    {
      profile: baseProfile(),
      teacher: baseTeacher({
        identity_verified: false,
        identity_status: "none",
        stripe_identity_status: null,
      }) as never,
    },
    NOW,
  );
  assert.equal(diagnostic.actionSummary.severity, "warning");
  assert.equal(diagnostic.actionSummary.owner, "teacher");
  assert.equal(diagnostic.actionSummary.title, "Stripe Identity not completed");
  assert.match(diagnostic.actionSummary.explanation, /separate from Stripe Connect/);
  assert.match(diagnostic.actionSummary.explanation, /not necessarily payment activation/);
});

test("action summary helper can return direct charges and payouts guidance", () => {
  const charges = deriveAdminStripeActionSummary({
    labels: ["charges_disabled"],
    requirementsDue: [],
    disabledReason: null,
    paymentReady: false,
    payoutReady: true,
  });
  assert.equal(charges.title, "Payments not enabled");
  assert.ok(charges.nextSteps.includes("Check the raw requirements."));

  const payouts = deriveAdminStripeActionSummary({
    labels: ["payouts_disabled"],
    requirementsDue: [],
    disabledReason: null,
    paymentReady: true,
    payoutReady: false,
  });
  assert.equal(payouts.title, "Payouts not enabled");
  assert.ok(
    payouts.nextSteps.includes(
      "In most cases this means adding a bank account or debit payout method.",
    ),
  );
});

test("missing account, stale sync, unsupported market, and identity failures are labelled", () => {
  const missing = deriveAdminStripeDiagnosticsTeacher(
    { profile: baseProfile({ country_code: "" }), teacher: null },
    NOW,
  );
  assert.ok(missing.labels.includes("missing_stripe_account"));
  assert.ok(missing.labels.includes("country_code_missing"));
  assert.ok(missing.labels.includes("sync_never_run"));
  assert.ok(missing.labels.includes("identity_missing"));

  const stale = deriveAdminStripeDiagnosticsTeacher(
    {
      profile: baseProfile({ id: "profile-teacher-2", country_code: "UY" }),
      teacher: baseTeacher({
        id: "teacher-2",
        user_id: "profile-teacher-2",
        country_code: "UY",
        stripe_identity_status: "failed",
        stripe_identity_failed_reason: "document_unverified",
        identity_verified: false,
        identity_status: "failed",
        stripe_connect_last_synced_at: "2026-08-01T00:00:00.000Z",
      }) as never,
    },
    NOW,
  );
  assert.ok(stale.labels.includes("market_not_supported"));
  assert.ok(stale.labels.includes("sync_stale_over_24h"));
  assert.ok(stale.labels.includes("sync_stale_over_7d"));
  assert.ok(stale.labels.includes("identity_failed"));
});

test("summary counts are computed from diagnostics rows", () => {
  const ready = deriveAdminStripeDiagnosticsTeacher(
    { profile: baseProfile(), teacher: baseTeacher() as never },
    NOW,
  );
  const falseNegative = deriveAdminStripeDiagnosticsTeacher(
    {
      profile: baseProfile({ id: "profile-teacher-2" }),
      teacher: baseTeacher({
        id: "teacher-2",
        user_id: "profile-teacher-2",
        stripe_account_id: "acct_false9999",
        stripe_connect_requirements_due: ["eventually_due"],
      }) as never,
    },
    NOW,
  );
  const missing = deriveAdminStripeDiagnosticsTeacher(
    { profile: baseProfile({ id: "profile-teacher-3", country_code: "" }), teacher: null },
    NOW,
  );
  const summary = summarizeAdminStripeDiagnostics([ready, falseNegative, missing]);

  assert.equal(summary.totalTeachers, 3);
  assert.equal(summary.teachersWithStripeAccount, 2);
  assert.equal(summary.teachersWithoutStripeAccount, 1);
  assert.equal(summary.paymentReadyUnderCurrentLogic, 1);
  assert.equal(summary.payoutReadyUnderCurrentLogic, 1);
  assert.equal(summary.requirementsDueNonEmpty, 1);
  assert.equal(summary.possibleFalseNegatives, 1);
  assert.equal(summary.countryCodeMissing, 1);
});

test("normalizes requirements and filters", () => {
  assert.deepEqual(normalizeRequirementsDue('["a"," b ",""]'), ["a", "b"]);
  assert.deepEqual(normalizeRequirementsDue("currently_due"), ["currently_due"]);
  assert.deepEqual(normalizeRequirementsDue(null), []);
  assert.equal(normalizeAdminStripeDiagnosticsFilter("charges_disabled"), "charges_disabled");
  assert.equal(normalizeAdminStripeDiagnosticsFilter("bad"), "all");
});

test("admin loader can search by full Stripe ID without exposing it", async () => {
  function queryResult<T>(rows: T[]) {
    const promise = Promise.resolve({ data: rows, error: null }) as Promise<{ data: T[]; error: null }> &
      Record<string, unknown>;
    promise.eq = () => promise;
    promise.in = () => promise;
    promise.order = () => promise;
    promise.limit = () => promise;
    return promise;
  }

  const admin = {
    from(table: string) {
      return {
        select() {
          if (table === "profiles") {
            return queryResult([
              baseProfile({ id: "profile-teacher-1", email: "one@example.com" }),
              baseProfile({ id: "profile-teacher-2", email: "two@example.com" }),
            ]);
          }
          if (table === "teachers") {
            return queryResult([
              baseTeacher({
                id: "teacher-1",
                user_id: "profile-teacher-1",
                stripe_account_id: "acct_exact1234",
              }),
              baseTeacher({
                id: "teacher-2",
                user_id: "profile-teacher-2",
                stripe_account_id: "acct_private9999",
              }),
            ]);
          }
          return queryResult([]);
        },
      };
    },
  };

  const diagnostics = await listAdminStripeDiagnostics(admin as never, {
    q: "acct_private9999",
    now: NOW,
  });

  assert.equal(diagnostics.teachers.length, 1);
  assert.equal(diagnostics.teachers[0].maskedStripeAccountId, "acct_****9999");
  assert.equal(JSON.stringify(diagnostics).includes("acct_private9999"), false);
});

test("admin command center exposes diagnostics module", () => {
  const diagnosticsModule = ADMIN_COMMAND_CENTER_MODULES.find((candidate) => candidate.id === "stripe_diagnostics");
  assert.ok(diagnosticsModule);
  assert.equal(diagnosticsModule.href, "/admin/stripe-diagnostics");
  assert.equal(diagnosticsModule.status, "ready");
});

test("restricted systems are not imported or modified by diagnostics surfaces", () => {
  const surfaces = [
    "lib/admin/stripeDiagnostics.ts",
    "app/api/admin/stripe-diagnostics/route.ts",
    "app/(app)/admin/stripe-diagnostics/page.tsx",
  ];
  for (const rel of surfaces) {
    const src = read(rel);
    assert.doesNotMatch(src, /@\/lib\/payments|@\/lib\/pricing|@\/lib\/stripe/i);
    assert.doesNotMatch(src, /STRIPE_SECRET|sk_live|sk_test|webhook_secret/i);
    assert.doesNotMatch(src, /\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
    assert.doesNotMatch(src, /from\s+["'][^"']*(checkout|refund|transfer|commission|membrePro|YoPratiqo)/i);
    assert.doesNotMatch(src, /\.(refunds|transfers|checkout)\./i);
  }
});

async function run() {
  let passed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      passed += 1;
      console.log(`ok - ${name}`);
    } catch (error) {
      console.error(`not ok - ${name}`);
      console.error(error);
      process.exitCode = 1;
      break;
    }
  }
  if (process.exitCode !== 1) {
    console.log(`\n${passed}/${tests.length} tests passed`);
  }
}

void run();
