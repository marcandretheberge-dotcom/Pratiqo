// Regression suite for payments/admin-student-credits-spendable.
//
// What this pins:
//   - Migration 088 adds SECURITY DEFINER RPCs for atomic grant/void.
//   - RPCs are granted to service_role only (not anon/authenticated).
//   - Helpers call the RPCs (not multi-step non-atomic inserts).
//   - Grant increments spendable credit_balance (dollars) via RPC.
//   - Void is unused-only and rejects insufficient balance / partial use.
//   - credit_transactions types admin_grant / admin_void are recognized.
//   - Checkout still consumes profiles.credit_balance only.
//   - Promo codes remain foundation-only (not applied at checkout).
//   - Admin UI copy states credits are spendable.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  centsToCreditBalanceDollars,
  grantStudentCredit,
  isCreditUnusedForVoid,
  VOID_UNSAFE_MESSAGE,
  voidStudentCredit,
} from "@/lib/admin/studentCredits";
import type { CreditType } from "@/lib/credits";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const READ = (relPath: string) =>
  readFileSync(join(process.cwd(), relPath), "utf8").replace(/\r\n/g, "\n");

function stripCommentsAndStrings(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[^"'\n]*?\/\/[^\n]*$/gm, (line) => line.replace(/\/\/[^\n]*$/, ""))
    .replace(/`(?:[^`\\]|\\.)*`/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ");
}

// ── Conversion + void eligibility helpers ───────────────────────────────────

test("centsToCreditBalanceDollars matches existing dollar credit_balance units", () => {
  assert.equal(centsToCreditBalanceDollars(2500), 25);
  assert.equal(centsToCreditBalanceDollars(99), 0.99);
  assert.equal(centsToCreditBalanceDollars(1), 0.01);
});

test("isCreditUnusedForVoid requires active + remaining == amount", () => {
  assert.equal(
    isCreditUnusedForVoid({ status: "active", amount_cents: 1000, remaining_cents: 1000 }),
    true,
  );
  assert.equal(
    isCreditUnusedForVoid({ status: "active", amount_cents: 1000, remaining_cents: 500 }),
    false,
  );
  assert.equal(
    isCreditUnusedForVoid({ status: "voided", amount_cents: 1000, remaining_cents: 1000 }),
    false,
  );
});

test("CreditType includes admin_grant and admin_void", () => {
  const allowed: CreditType[] = [
    "companion_evolution",
    "referral",
    "referee_bonus",
    "review",
    "credit_used",
    "admin_grant",
    "admin_void",
  ];
  assert.ok(allowed.includes("admin_grant"));
  assert.ok(allowed.includes("admin_void"));
  const creditsLib = READ("lib/credits.ts");
  assert.match(creditsLib, /admin_grant/);
  assert.match(creditsLib, /admin_void/);
});

// ── RPC stub helpers ────────────────────────────────────────────────────────

type RpcCall = { name: string; args: Record<string, unknown> };

function makeRpcAdmin(options: {
  grant?: { data?: unknown; error?: { message: string } | null };
  void?: { data?: unknown; error?: { message: string } | null };
}) {
  const calls: RpcCall[] = [];
  const admin = {
    rpc(name: string, args: Record<string, unknown>) {
      calls.push({ name, args });
      if (name === "admin_grant_student_credit") {
        return Promise.resolve(
          options.grant ?? {
            data: {
              id: "credit-grant-1",
              student_profile_id: args.p_student_profile_id,
              amount_cents: args.p_amount_cents,
              currency: args.p_currency,
              remaining_cents: args.p_amount_cents,
              status: "active",
              reason_code: args.p_reason_code,
              reason_note: args.p_reason_note,
              expires_at: args.p_expires_at,
              created_by: args.p_actor_id,
              created_at: new Date().toISOString(),
              voided_by: null,
              voided_at: null,
              void_reason: null,
              spendable: true,
              new_credit_balance: centsToCreditBalanceDollars(Number(args.p_amount_cents)),
            },
            error: null,
          },
        );
      }
      if (name === "admin_void_student_credit") {
        return Promise.resolve(
          options.void ?? {
            data: {
              id: args.p_credit_id,
              student_profile_id: "student-1",
              amount_cents: 2500,
              currency: "CAD",
              remaining_cents: 0,
              status: "voided",
              reason_code: "goodwill",
              reason_note: "note",
              expires_at: null,
              created_by: "admin-1",
              created_at: new Date().toISOString(),
              voided_by: args.p_actor_id,
              voided_at: new Date().toISOString(),
              void_reason: args.p_void_reason,
              spendable: false,
              new_credit_balance: 0,
            },
            error: null,
          },
        );
      }
      return Promise.resolve({ data: null, error: { message: `unknown rpc ${name}` } });
    },
  };
  return { admin: admin as never, calls };
}

test("admin grant calls admin_grant_student_credit RPC with cents + reason", async () => {
  const { admin, calls } = makeRpcAdmin({});
  const result = await grantStudentCredit(admin, { id: "admin-1", email: "a@x.com" }, {
    studentProfileId: "student-1",
    amountCents: 2500,
    reasonCode: "goodwill",
    reasonNote: "Compensation support",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.credit.amount_cents, 2500);
  assert.equal(result.credit.spendable, true);
  assert.equal(result.credit.new_credit_balance, 25);
  assert.equal(calls[0]?.name, "admin_grant_student_credit");
  assert.equal(calls[0]?.args.p_amount_cents, 2500);
  assert.equal(calls[0]?.args.p_reason_note, "Compensation support");
});

test("grant without reason is rejected before RPC", async () => {
  const { admin, calls } = makeRpcAdmin({});
  const result = await grantStudentCredit(admin, { id: "admin-1", email: null }, {
    studentProfileId: "student-1",
    amountCents: 500,
    reasonCode: "other",
    reasonNote: "   ",
  });
  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
});

test("grant with zero/negative amount is rejected before RPC", async () => {
  const { admin, calls } = makeRpcAdmin({});
  for (const amountCents of [0, -100]) {
    const result = await grantStudentCredit(admin, { id: "admin-1", email: null }, {
      studentProfileId: "student-1",
      amountCents,
      reasonCode: "admin_test",
      reasonNote: "test",
    });
    assert.equal(result.ok, false);
  }
  assert.equal(calls.length, 0);
});

test("admin void of unused credit calls admin_void_student_credit RPC", async () => {
  const { admin, calls } = makeRpcAdmin({});
  const result = await voidStudentCredit(
    admin,
    { id: "admin-1", email: "a@x.com" },
    "credit-1",
    "Erreur de saisie",
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.credit.status, "voided");
  assert.equal(result.credit.remaining_cents, 0);
  assert.equal(calls[0]?.name, "admin_void_student_credit");
  assert.equal(calls[0]?.args.p_void_reason, "Erreur de saisie");
});

test("void without reason is rejected before RPC", async () => {
  const { admin, calls } = makeRpcAdmin({});
  const result = await voidStudentCredit(admin, { id: "admin-1", email: null }, "credit-1", " ");
  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
});

test("void partially used or insufficient balance maps to safe admin error", async () => {
  for (const message of ["ALREADY_USED", "BALANCE_INSUFFICIENT", "NOT_ACTIVE"]) {
    const { admin } = makeRpcAdmin({
      void: { data: null, error: { message } },
    });
    const result = await voidStudentCredit(
      admin,
      { id: "admin-1", email: null },
      "credit-1",
      "Annuler",
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, VOID_UNSAFE_MESSAGE);
    assert.equal(result.status, 400);
  }
});

// ── Migration 088 contract ──────────────────────────────────────────────────

const M088 = READ("supabase/migrations/088_admin_student_credits_spendable.sql");
const M088_CODE = stripSqlComments(M088);

test("migration 088 creates grant and void SECURITY DEFINER RPCs", () => {
  assert.match(M088, /create\s+or\s+replace\s+function\s+public\.admin_grant_student_credit/i);
  assert.match(M088, /create\s+or\s+replace\s+function\s+public\.admin_void_student_credit/i);
  assert.match(M088, /security\s+definer/i);
  assert.match(M088, /set\s+search_path\s*=\s*public/i);
});

test("migration 088 grant writes student_credits, ledger, credit_transactions, credit_balance, audit", () => {
  assert.match(M088_CODE, /insert\s+into\s+public\.student_credits/i);
  assert.match(M088_CODE, /insert\s+into\s+public\.student_credit_ledger/i);
  assert.match(M088_CODE, /insert\s+into\s+public\.credit_transactions/i);
  assert.match(M088_CODE, /'admin_grant'/);
  assert.match(M088_CODE, /credit_balance\s*=\s*coalesce\(credit_balance,\s*0\)\s*\+\s*v_amount_dollars/i);
  assert.match(M088_CODE, /insert\s+into\s+public\.admin_audit_log/i);
  assert.match(M088_CODE, /student_credit\.granted/);
});

test("migration 088 void is unused-only and decrements credit_balance", () => {
  assert.match(M088_CODE, /remaining_cents\s+is\s+distinct\s+from\s+v_row\.amount_cents/i);
  assert.match(M088_CODE, /BALANCE_INSUFFICIENT|balance_insufficient/i);
  assert.match(M088_CODE, /'admin_void'/);
  assert.match(M088_CODE, /credit_balance\s*=\s*greatest\(0,\s*coalesce\(credit_balance,\s*0\)\s*-\s*v_amount_dollars\)/i);
  assert.match(M088_CODE, /student_credit\.voided/);
});

test("migration 088 RPCs are executable by service_role only", () => {
  assert.match(M088_CODE, /revoke\s+all\s+on\s+function\s+public\.admin_grant_student_credit/i);
  assert.match(M088_CODE, /revoke\s+all\s+on\s+function\s+public\.admin_void_student_credit/i);
  assert.match(
    M088_CODE,
    /grant\s+execute\s+on\s+function\s+public\.admin_grant_student_credit[\s\S]*to\s+service_role/i,
  );
  assert.match(
    M088_CODE,
    /grant\s+execute\s+on\s+function\s+public\.admin_void_student_credit[\s\S]*to\s+service_role/i,
  );
  assert.doesNotMatch(
    M088_CODE,
    /grant\s+execute\s+on\s+function\s+public\.admin_grant_student_credit[\s\S]*to\s+authenticated/i,
  );
  assert.doesNotMatch(
    M088_CODE,
    /grant\s+execute\s+on\s+function\s+public\.admin_grant_student_credit[\s\S]*to\s+anon/i,
  );
});

test("migration 088 does not touch promo codes, bookings, or Stripe", () => {
  assert.doesNotMatch(M088_CODE, /admin_promo_codes/);
  assert.doesNotMatch(M088_CODE, /alter\s+table\s+public\.bookings/i);
  assert.doesNotMatch(M088_CODE, /stripe/i);
});

// ── Helpers + APIs + UI ─────────────────────────────────────────────────────

test("studentCredits helpers call RPCs rather than multi-step inserts", () => {
  const src = READ("lib/admin/studentCredits.ts");
  const cleaned = stripCommentsAndStrings(src);
  assert.match(src, /admin\.rpc\(\s*"admin_grant_student_credit"/);
  assert.match(src, /admin\.rpc\(\s*"admin_void_student_credit"/);
  assert.doesNotMatch(cleaned, /\.from\(\s*"student_credits"\s*\)\s*\.insert/);
  assert.doesNotMatch(cleaned, /\.from\(\s*"credit_transactions"\s*\)/);
});

test("student-credits APIs still require requireAdminApi and mark spendable", () => {
  const route = READ("app/api/admin/student-credits/route.ts");
  assert.match(route, /requireAdminApi/);
  assert.match(route, /appliedToSpendableBalance:\s*true/);
  assert.match(route, /admin_grant_student_credit|SECURITY DEFINER|088/);
  const voidRoute = READ("app/api/admin/student-credits/[id]/void/route.ts");
  assert.match(voidRoute, /requireAdminApi/);
  assert.match(voidRoute, /unused only|insuffisant|088/i);
});

test("admin promotions UI states credits are spendable; promo codes remain foundation-only", () => {
  const page = READ("app/(app)/admin/promotions/page.tsx");
  assert.match(page, /solde utilisable de l['’]apprenant|solde utilisable/);
  assert.match(page, /codes promo restent une fondation|pas encore appliqués au paiement/i);
  assert.match(page, /Utilisable/);
  assert.doesNotMatch(
    stripCommentsAndStrings(page),
    /Fondation admin seulement\. L['’]application automatique au paiement sera activée/,
  );
});

test("checkout still consumes profiles.credit_balance and does not apply promo codes", () => {
  const checkout = READ("app/api/stripe/checkout/route.ts");
  const cleaned = stripCommentsAndStrings(checkout);
  assert.match(checkout, /credit_balance/);
  assert.doesNotMatch(cleaned, /admin_promo_codes|admin_grant_student_credit|student_credit_ledger/);
  assert.doesNotMatch(cleaned, /allow_promotion_codes|stripe\.coupons|promotionCodes/);
});

test("promo APIs still do not touch credit_balance", () => {
  const promotions = READ("lib/admin/promotions.ts");
  assert.doesNotMatch(stripCommentsAndStrings(promotions), /credit_balance/);
  assert.doesNotMatch(stripCommentsAndStrings(promotions), /admin_grant_student_credit/);
});

// ── Run ─────────────────────────────────────────────────────────────────────

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[payments:adminStudentCreditsSpendable] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
