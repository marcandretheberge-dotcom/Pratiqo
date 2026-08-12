// Regression suite for admin/promotions-student-credits-foundation.
//
// What this pins:
//   - /admin/promotions mounts under the admin layout (requireAdminPage).
//   - Promo + student-credit APIs all gate behind requireAdminApi.
//   - Validation: fixed/percent promo shapes, duplicate active codes,
//     mandatory credit reason notes, reject zero/negative amounts,
//     void requires a reason.
//   - Grant writes a ledger entry + audit action (via helpers).
//   - Migration 087 enables RLS with ZERO JWT policies on all four tables.
//   - No public route leaks promo/credit admin data.
//   - Checkout / Stripe payment math is untouched by this PR.
//   - Existing spendable credit_balance is intentionally NOT mutated here.

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { normalizePromoCode, createAdminPromoCode } from "@/lib/admin/promotions";
import {
  grantStudentCredit,
  voidStudentCredit,
  STUDENT_CREDIT_REASON_CODES,
} from "@/lib/admin/studentCredits";
import { isStudentCreditReasonCode } from "@/lib/admin/studentCreditConstants";
import { ADMIN_COMMAND_CENTER_MODULES } from "@/lib/admin/overview";

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

// ── Shared stubs ────────────────────────────────────────────────────────────

type InsertCall = { table: string; row: Record<string, unknown> };

function makeAdminStub(options?: {
  insertError?: { code?: string; message: string } | null;
  existingPromo?: Record<string, unknown> | null;
  student?: { id: string; role: string } | null;
  existingCredit?: Record<string, unknown> | null;
}) {
  const inserts: InsertCall[] = [];
  const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];

  const admin = {
    from(table: string) {
      return {
        insert(row: Record<string, unknown>) {
          inserts.push({ table, row });
          return {
            select() {
              return {
                async maybeSingle() {
                  if (options?.insertError) {
                    return { data: null, error: options.insertError };
                  }
                  return {
                    data: {
                      id: "generated-id",
                      ...row,
                      created_at: row.created_at ?? new Date().toISOString(),
                      updated_at: row.updated_at ?? new Date().toISOString(),
                    },
                    error: null,
                  };
                },
              };
            },
            // ledger insert has no select chain in some paths — support bare await
            then(resolve: (v: { data: null; error: null }) => void) {
              resolve({ data: null, error: null });
            },
          };
        },
        select(_cols: string) {
          return {
            eq(_col: string, _val: string) {
              return {
                async maybeSingle() {
                  if (table === "profiles") {
                    return {
                      data: options?.student ?? { id: "student-1", role: "student" },
                      error: null,
                    };
                  }
                  if (table === "admin_promo_codes") {
                    return { data: options?.existingPromo ?? null, error: null };
                  }
                  if (table === "student_credits") {
                    return { data: options?.existingCredit ?? null, error: null };
                  }
                  return { data: null, error: null };
                },
                order() {
                  return {
                    limit() {
                      return Promise.resolve({ data: [], error: null });
                    },
                  };
                },
              };
            },
            order() {
              return {
                limit() {
                  return Promise.resolve({ data: [], error: null });
                },
              };
            },
          };
        },
        update(patch: Record<string, unknown>) {
          updates.push({ table, patch });
          return {
            eq() {
              return {
                eq() {
                  return {
                    select() {
                      return {
                        async maybeSingle() {
                          return {
                            data: {
                              ...(options?.existingCredit ?? {}),
                              ...patch,
                              id: (options?.existingCredit?.id as string) ?? "credit-1",
                            },
                            error: null,
                          };
                        },
                      };
                    },
                  };
                },
                select() {
                  return {
                    async maybeSingle() {
                      return {
                        data: {
                          ...(options?.existingPromo ?? {}),
                          ...patch,
                          id: (options?.existingPromo?.id as string) ?? "promo-1",
                        },
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  return { admin: admin as never, inserts, updates };
}

// ── Page / command center ───────────────────────────────────────────────────

test("/admin/promotions page mounts under admin layout and does not import service-role", () => {
  const layout = READ("app/(app)/admin/layout.tsx");
  assert.match(layout, /requireAdminPage/);

  const page = READ("app/(app)/admin/promotions/page.tsx");
  assert.match(page, /data-testid="admin-promotions-page"/);
  assert.match(page, /Codes promo/);
  assert.match(page, /Crédits apprenants/);
  assert.match(page, /Fondation admin seulement/);
  assert.doesNotMatch(page, /getSupabaseAdmin|SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(page, /from\s+"@\/lib\/admin\/studentCredits"/);
  assert.match(page, /from\s+"@\/lib\/admin\/studentCreditConstants"/);
});

test("command center promotions card is ready and links to /admin/promotions", () => {
  const promo = ADMIN_COMMAND_CENTER_MODULES.find((m) => m.id === "promotions");
  assert.ok(promo);
  assert.equal(promo!.status, "ready");
  assert.equal(promo!.href, "/admin/promotions");
});

// ── API auth + surface contracts ────────────────────────────────────────────

const PROMO_API = READ("app/api/admin/promotions/route.ts");
const PROMO_PAUSE = READ("app/api/admin/promotions/[id]/pause/route.ts");
const PROMO_ARCHIVE = READ("app/api/admin/promotions/[id]/archive/route.ts");
const CREDIT_API = READ("app/api/admin/student-credits/route.ts");
const CREDIT_VOID = READ("app/api/admin/student-credits/[id]/void/route.ts");

for (const [label, src] of [
  ["GET/POST promotions", PROMO_API],
  ["pause", PROMO_PAUSE],
  ["archive", PROMO_ARCHIVE],
  ["GET/POST student-credits", CREDIT_API],
  ["void", CREDIT_VOID],
] as const) {
  test(`${label} requires requireAdminApi before work`, () => {
    assert.match(src, /import\s*\{[^}]*requireAdminApi[^}]*\}\s*from\s*"@\/lib\/auth\/admin"/);
    const handlers = Array.from(src.matchAll(/export\s+async\s+function\s+([A-Z]+)\s*\(/g)).map(
      (m) => m[1],
    );
    assert.ok(handlers.length > 0, `${label} must export handlers`);
    for (const name of handlers) {
      const block = src.slice(src.indexOf(`export async function ${name}`));
      assert.match(block, /await\s+requireAdminApi\(\s*req\s*\)/);
    }
  });

  test(`${label} uses nodejs runtime and never embeds service-role key`, () => {
    assert.match(src, /export\s+const\s+runtime\s*=\s*"nodejs"/);
    assert.doesNotMatch(src, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.doesNotMatch(stripCommentsAndStrings(src), /service_role/i);
  });

  test(`${label} does not import Stripe / checkout / YoPratiqo / messaging`, () => {
    const cleaned = stripCommentsAndStrings(src);
    assert.doesNotMatch(cleaned, /from\s+"stripe"|@\/lib\/email|@\/lib\/messages|@\/lib\/yo|@\/components\/yo/);
    assert.doesNotMatch(cleaned, /PaymentIntent|allow_promotion_codes|stripe\.coupons/);
  });
}

test("promotions API only exports GET and POST", () => {
  const exports = Array.from(PROMO_API.matchAll(/export\s+async\s+function\s+([A-Z]+)\s*\(/g)).map(
    (m) => m[1],
  );
  assert.deepEqual(exports.slice().sort(), ["GET", "POST"]);
});

test("student-credits API only exports GET and POST", () => {
  const exports = Array.from(CREDIT_API.matchAll(/export\s+async\s+function\s+([A-Z]+)\s*\(/g)).map(
    (m) => m[1],
  );
  assert.deepEqual(exports.slice().sort(), ["GET", "POST"]);
});

// ── Promo validation helpers ────────────────────────────────────────────────

test("normalizePromoCode uppercases and rejects spaces / invalid chars", () => {
  assert.equal(normalizePromoCode(" test10 "), "TEST10");
  assert.equal(normalizePromoCode("TEST 10"), null);
  assert.equal(normalizePromoCode(""), null);
  assert.equal(normalizePromoCode("ab"), "AB");
  assert.equal(normalizePromoCode("BAD!"), null);
});

test("admin can create valid percent promo code", async () => {
  const { admin, inserts } = makeAdminStub();
  const result = await createAdminPromoCode(admin, { id: "admin-1", email: "a@x.com" }, {
    code: "SAVE10",
    discountType: "percent",
    percentOff: 10,
    description: "Test",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.promo.code, "SAVE10");
  assert.equal(result.promo.discount_type, "percent");
  assert.equal(result.promo.percent_off, 10);
  assert.equal(result.promo.amount_cents, null);
  assert.ok(inserts.some((i) => i.table === "admin_promo_codes"));
  assert.ok(
    inserts.some(
      (i) => i.table === "admin_audit_log" && i.row.action === "promo_code.created",
    ),
  );
});

test("admin can create valid fixed-amount promo code", async () => {
  const { admin } = makeAdminStub();
  const result = await createAdminPromoCode(admin, { id: "admin-1", email: "a@x.com" }, {
    code: "FIVEOFF",
    discountType: "fixed_amount",
    amountCents: 500,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.promo.discount_type, "fixed_amount");
  assert.equal(result.promo.amount_cents, 500);
  assert.equal(result.promo.percent_off, null);
});

test("invalid promo code shapes are rejected", async () => {
  const { admin } = makeAdminStub();
  const badCode = await createAdminPromoCode(admin, { id: "admin-1", email: null }, {
    code: "HAS SPACE",
    discountType: "percent",
    percentOff: 10,
  });
  assert.equal(badCode.ok, false);

  const badPercent = await createAdminPromoCode(admin, { id: "admin-1", email: null }, {
    code: "BADPCT",
    discountType: "percent",
    percentOff: 150,
  });
  assert.equal(badPercent.ok, false);

  const zeroFixed = await createAdminPromoCode(admin, { id: "admin-1", email: null }, {
    code: "ZERO",
    discountType: "fixed_amount",
    amountCents: 0,
  });
  assert.equal(zeroFixed.ok, false);
});

test("duplicate active promo code is rejected (unique violation)", async () => {
  const { admin } = makeAdminStub({
    insertError: { code: "23505", message: "duplicate" },
  });
  const result = await createAdminPromoCode(admin, { id: "admin-1", email: null }, {
    code: "DUP10",
    discountType: "percent",
    percentOff: 10,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 409);
});

// ── Student credit helpers ──────────────────────────────────────────────────

test("reason code allowlist is exactly the seven documented codes", () => {
  assert.deepEqual([...STUDENT_CREDIT_REASON_CODES].sort(), [
    "admin_test",
    "contest_prize",
    "goodwill",
    "local_promotion",
    "other",
    "payment_issue",
    "support_compensation",
  ]);
  assert.equal(isStudentCreditReasonCode("support_compensation"), true);
  assert.equal(isStudentCreditReasonCode("not_a_reason"), false);
});

test("admin can grant student credit with required reason; ledger + audit written", async () => {
  const { admin, inserts } = makeAdminStub({
    student: { id: "student-1", role: "student" },
  });
  const result = await grantStudentCredit(admin, { id: "admin-1", email: "a@x.com" }, {
    studentProfileId: "student-1",
    amountCents: 1500,
    reasonCode: "goodwill",
    reasonNote: "Geste commercial après retard",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.credit.amount_cents, 1500);
  assert.equal(result.credit.remaining_cents, 1500);
  assert.equal(result.credit.status, "active");
  assert.ok(inserts.some((i) => i.table === "student_credits"));
  assert.ok(
    inserts.some(
      (i) =>
        i.table === "student_credit_ledger" &&
        i.row.entry_type === "grant" &&
        i.row.amount_cents === 1500,
    ),
  );
  assert.ok(
    inserts.some(
      (i) => i.table === "admin_audit_log" && i.row.action === "student_credit.granted",
    ),
  );
});

test("credit without reason note is rejected", async () => {
  const { admin } = makeAdminStub();
  const result = await grantStudentCredit(admin, { id: "admin-1", email: null }, {
    studentProfileId: "student-1",
    amountCents: 500,
    reasonCode: "other",
    reasonNote: "   ",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.error, /note/i);
});

test("negative or zero credit is rejected", async () => {
  const { admin } = makeAdminStub();
  for (const amountCents of [0, -100, 1.5]) {
    const result = await grantStudentCredit(admin, { id: "admin-1", email: null }, {
      studentProfileId: "student-1",
      amountCents,
      reasonCode: "admin_test",
      reasonNote: "test",
    });
    assert.equal(result.ok, false, `amount ${amountCents} must be rejected`);
  }
});

test("admin can void credit with reason; void without reason is rejected", async () => {
  const active = {
    id: "credit-1",
    student_profile_id: "student-1",
    amount_cents: 2000,
    currency: "CAD",
    remaining_cents: 2000,
    status: "active",
    reason_code: "goodwill",
    reason_note: "note",
    expires_at: null,
    created_by: "admin-1",
    created_at: new Date().toISOString(),
    voided_by: null,
    voided_at: null,
    void_reason: null,
  };

  const missingReason = await voidStudentCredit(
    makeAdminStub({ existingCredit: active }).admin,
    { id: "admin-1", email: null },
    "credit-1",
    "  ",
  );
  assert.equal(missingReason.ok, false);

  const probe = makeAdminStub({ existingCredit: active });
  const voided = await voidStudentCredit(
    probe.admin,
    { id: "admin-1", email: "a@x.com" },
    "credit-1",
    "Erreur de saisie",
  );
  assert.equal(voided.ok, true);
  if (!voided.ok) return;
  assert.equal(voided.credit.status, "voided");
  assert.equal(voided.credit.remaining_cents, 0);
  assert.ok(
    probe.inserts.some(
      (i) => i.table === "student_credit_ledger" && i.row.entry_type === "void",
    ),
  );
  assert.ok(
    probe.inserts.some(
      (i) => i.table === "admin_audit_log" && i.row.action === "student_credit.voided",
    ),
  );
});

// ── Migration / RLS ─────────────────────────────────────────────────────────

const MIGRATION = READ("supabase/migrations/087_admin_promotions_student_credits.sql");
const MIGRATION_CODE = stripSqlComments(MIGRATION);

test("migration 087 creates all four foundation tables", () => {
  for (const table of [
    "admin_promo_codes",
    "student_credits",
    "student_credit_ledger",
    "admin_audit_log",
  ]) {
    assert.match(
      MIGRATION,
      new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}`, "i"),
    );
  }
});

test("migration 087 enables RLS with ZERO policies (deny-by-default)", () => {
  for (const table of [
    "admin_promo_codes",
    "student_credits",
    "student_credit_ledger",
    "admin_audit_log",
  ]) {
    assert.match(
      MIGRATION,
      new RegExp(
        `alter\\s+table\\s+if\\s+exists\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,
        "i",
      ),
    );
  }
  assert.doesNotMatch(
    MIGRATION_CODE,
    /create\s+policy/i,
    "promo/credit admin tables must have zero JWT policies",
  );
});

test("migration 087 does not alter credit_balance, bookings, or Stripe tables", () => {
  assert.doesNotMatch(MIGRATION_CODE, /alter\s+table\s+public\.profiles/i);
  assert.doesNotMatch(MIGRATION_CODE, /alter\s+table\s+public\.bookings/i);
  assert.doesNotMatch(MIGRATION_CODE, /create\s+table[\s\S]*stripe/i);
  assert.doesNotMatch(MIGRATION_CODE, /alter\s+table[\s\S]*stripe/i);
});

// ── Public isolation + checkout unchanged ───────────────────────────────────

test("helpers do not mutate profiles.credit_balance", () => {
  const promotions = READ("lib/admin/promotions.ts");
  const credits = READ("lib/admin/studentCredits.ts");
  assert.doesNotMatch(stripCommentsAndStrings(promotions), /credit_balance/);
  assert.doesNotMatch(stripCommentsAndStrings(credits), /credit_balance/);
});

test("checkout and booking payment routes are unchanged by this foundation", () => {
  // This PR must not modify these files — pin their existence and absence of
  // admin_promo_codes / student_credits consumption.
  const checkout = READ("app/api/stripe/checkout/route.ts");
  const cleaned = stripCommentsAndStrings(checkout);
  assert.doesNotMatch(cleaned, /admin_promo_codes|student_credits|student_credit_ledger/);
  assert.doesNotMatch(cleaned, /allow_promotion_codes|stripe\.coupons|promotionCodes/);
});

test("no public app route outside /admin exposes student_credits or admin_promo_codes", () => {
  const root = process.cwd();
  const allowList = new Set(
    [
      "app/(app)/admin/promotions/page.tsx",
      "app/api/admin/promotions/route.ts",
      "app/api/admin/promotions/[id]/pause/route.ts",
      "app/api/admin/promotions/[id]/archive/route.ts",
      "app/api/admin/student-credits/route.ts",
      "app/api/admin/student-credits/[id]/void/route.ts",
      "lib/admin/promotions.ts",
      "lib/admin/studentCredits.ts",
      "lib/admin/studentCreditConstants.ts",
      "lib/admin/auditLog.ts",
      "lib/admin/overview.ts",
      "tests/admin/adminPromotionsCreditsFoundation.test.ts",
      "tests/admin/commandCenterHome.test.ts",
    ].map((p) => p.replace(/\//g, sep)),
  );

  const violations: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx|js|jsx)$/.test(entry)) continue;
      const rel = relative(root, full);
      if (allowList.has(rel)) continue;
      if (rel.startsWith(`supabase${sep}`)) continue;
      if (rel.startsWith(`docs${sep}`)) continue;
      const src = stripCommentsAndStrings(READ(rel));
      if (/admin_promo_codes|student_credit_ledger|from\("student_credits"\)/.test(src)) {
        // Allow overview module id "promotions" — already covered; only flag table access.
        if (/admin_promo_codes|student_credit_ledger|student_credits/.test(src)) {
          violations.push(rel);
        }
      }
    }
  };
  walk(join(root, "app"));
  walk(join(root, "components"));
  walk(join(root, "lib"));
  assert.deepEqual(violations, [], `public/non-admin surfaces must not touch promo/credit tables:\n${violations.join("\n")}`);
});

// ── Run ─────────────────────────────────────────────────────────────────────

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[admin:promotionsCreditsFoundation] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
