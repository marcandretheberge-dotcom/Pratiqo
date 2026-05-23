import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Tests for the v1 first-lesson satisfaction guarantee claim flow.
//
// The flow is implemented as a thin server endpoint that:
//   1. authenticates the student,
//   2. checks eligibility (lib/guarantee/firstLesson.ts),
//   3. inserts a support_case (category=refund_request, payout_hold=true),
//   4. stamps profiles.first_lesson_guarantee_used_at,
//   5. sends the existing support admin alert.
//
// To keep this test free from a live Supabase, we exercise the eligibility
// helper end-to-end against an in-memory admin and source-scan the endpoint
// file to assert it never:
//   - calls stripe.refunds.create (or stripe.refunds.*),
//   - mutates booking_payments refund state,
//   - promises automatic / instant refund or tax receipts in the i18n copy.
// ---------------------------------------------------------------------------

import {
  FIRST_LESSON_CLAIM_WINDOW_MS,
  FIRST_LESSON_GUARANTEE_MARKER,
  firstLessonGuaranteeEligibility,
} from "@/lib/guarantee/firstLesson";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const ROOT = process.cwd();
const ENDPOINT_PATH = join(ROOT, "app", "api", "support", "cases", "first-lesson-guarantee", "route.ts");
const HELPER_PATH = join(ROOT, "lib", "guarantee", "firstLesson.ts");
const MIGRATION_PATH = join(ROOT, "supabase", "migrations", "068_first_lesson_guarantee.sql");
const ENDPOINT_SRC = readFileSync(ENDPOINT_PATH, "utf8");
const HELPER_SRC = readFileSync(HELPER_PATH, "utf8");
const MIGRATION_SRC = readFileSync(MIGRATION_PATH, "utf8");
const FR = JSON.parse(readFileSync(join(ROOT, "lib", "i18n", "locales", "fr.json"), "utf8"));
const EN = JSON.parse(readFileSync(join(ROOT, "lib", "i18n", "locales", "en.json"), "utf8"));
const ES = JSON.parse(readFileSync(join(ROOT, "lib", "i18n", "locales", "es.json"), "utf8"));
const LEGAL_SRC = readFileSync(join(ROOT, "app", "(app)", "legal", "annulation", "page.tsx"), "utf8");
const PAYMENTS_SRC = readFileSync(join(ROOT, "app", "(app)", "student", "payments", "page.tsx"), "utf8");

// ---------------------------------------------------------------------------
// End-to-end claim simulation: eligibility -> support_case insert -> stamp
// profile. The fake admin records the inserted row + the stamp so we can
// assert the contract without hitting Supabase.
// ---------------------------------------------------------------------------

type ProfileRow = { id: string; first_lesson_guarantee_used_at: string | null };
type BookingRow = {
  id: string;
  student_id: string;
  teacher_id: string;
  status: string | null;
  completed_at: string | null;
  completion_outcome: string | null;
};
type SupportCaseRow = {
  id: string;
  student_id: string;
  teacher_id: string;
  booking_id: string;
  category: string;
  payout_hold: boolean;
  payout_hold_reason: string | null;
  requested_resolution: string | null;
  role: string;
  status: string;
  priority: string;
  description: string;
  evidence_urls: string[];
  opened_by_user_id: string;
};

type BookingPaymentRow = {
  booking_id: string;
  refund_status: string | null;
  refunded_at: string | null;
};

class FakeAdmin {
  profiles = new Map<string, ProfileRow>();
  bookings: BookingRow[] = [];
  supportCases: SupportCaseRow[] = [];
  bookingPayments: BookingPaymentRow[] = [];
  insertedSupportCase: SupportCaseRow | null = null;
  profileStampUpdates: Array<{ id: string; first_lesson_guarantee_used_at: string }> = [];
  bookingPaymentMutations: Array<Record<string, unknown>> = [];

  from(table: string) {
    return new FakeQuery(this, table);
  }
}

class FakeQuery {
  private filters: Array<{ kind: "eq" | "ilike"; column: string; value: unknown }> = [];
  private orFilter: string | null = null;
  private orderColumn: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private op: "select" | "update" | "insert" = "select";
  private patch: Record<string, unknown> | null = null;
  private insertRow: Record<string, unknown> | null = null;

  constructor(private readonly admin: FakeAdmin, private readonly table: string) {}

  select() {
    return this;
  }

  insert(row: Record<string, unknown>) {
    this.op = "insert";
    this.insertRow = row;
    return this;
  }

  update(patch: Record<string, unknown>) {
    this.op = "update";
    this.patch = patch;
    if (this.table === "booking_payments") {
      this.admin.bookingPaymentMutations.push(patch);
    }
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ kind: "eq", column, value });
    return this;
  }

  ilike(column: string, pattern: string) {
    this.filters.push({ kind: "ilike", column, value: pattern });
    return this;
  }

  or(expr: string) {
    this.orFilter = expr;
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orderColumn = column;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  single() {
    return Promise.resolve(this.executeOne());
  }

  maybeSingle() {
    return Promise.resolve(this.executeOne());
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    if (this.op === "select") {
      return Promise.resolve({ data: this.runSelect(), error: null }).then(onfulfilled, onrejected);
    }
    if (this.op === "update") {
      const result = this.applyUpdate();
      return Promise.resolve({ data: result, error: null }).then(onfulfilled, onrejected);
    }
    if (this.op === "insert") {
      const result = this.applyInsert();
      return Promise.resolve({ data: [result], error: null }).then(onfulfilled, onrejected);
    }
    return Promise.resolve({ data: [], error: null }).then(onfulfilled, onrejected);
  }

  private executeOne() {
    if (this.op === "select") {
      const rows = this.runSelect();
      return { data: rows[0] ?? null, error: null };
    }
    if (this.op === "update") {
      const updated = this.applyUpdate();
      return { data: updated[0] ?? null, error: null };
    }
    if (this.op === "insert") {
      const inserted = this.applyInsert();
      return { data: inserted, error: null };
    }
    return { data: null, error: null };
  }

  private applyInsert(): SupportCaseRow {
    if (this.table !== "support_cases" || !this.insertRow) {
      return {} as SupportCaseRow;
    }
    const id = `case-${this.admin.supportCases.length + 1}`;
    const row: SupportCaseRow = {
      id,
      booking_id: String(this.insertRow.booking_id),
      student_id: String(this.insertRow.student_id),
      teacher_id: String(this.insertRow.teacher_id),
      category: String(this.insertRow.category),
      payout_hold: Boolean(this.insertRow.payout_hold),
      payout_hold_reason: (this.insertRow.payout_hold_reason as string | null) ?? null,
      requested_resolution: (this.insertRow.requested_resolution as string | null) ?? null,
      role: String(this.insertRow.role),
      status: String(this.insertRow.status),
      priority: String(this.insertRow.priority),
      description: String(this.insertRow.description),
      evidence_urls: (this.insertRow.evidence_urls as string[] | null) ?? [],
      opened_by_user_id: String(this.insertRow.opened_by_user_id),
    };
    this.admin.supportCases.push(row);
    this.admin.insertedSupportCase = row;
    return row;
  }

  private applyUpdate(): Array<Record<string, unknown>> {
    if (this.table === "profiles" && this.patch) {
      const id = this.filters.find((f) => f.column === "id")?.value as string | undefined;
      if (!id) return [];
      const stamp = String(this.patch.first_lesson_guarantee_used_at ?? "");
      const profile = this.admin.profiles.get(id);
      if (profile) profile.first_lesson_guarantee_used_at = stamp;
      this.admin.profileStampUpdates.push({ id, first_lesson_guarantee_used_at: stamp });
      return [{ id, first_lesson_guarantee_used_at: stamp }];
    }
    return [];
  }

  private runSelect(): unknown[] {
    let rows: unknown[];
    if (this.table === "profiles") rows = Array.from(this.admin.profiles.values());
    else if (this.table === "bookings") rows = this.admin.bookings.slice();
    else if (this.table === "support_cases") rows = this.admin.supportCases.slice();
    else if (this.table === "booking_payments") rows = this.admin.bookingPayments.slice();
    else rows = [];

    for (const filter of this.filters) {
      if (filter.kind === "eq") {
        rows = rows.filter((row) => (row as Record<string, unknown>)[filter.column] === filter.value);
      } else if (filter.kind === "ilike") {
        const raw = String(filter.value);
        const prefix = raw.endsWith("%") ? raw.slice(0, -1) : raw;
        rows = rows.filter((row) =>
          String((row as Record<string, unknown>)[filter.column] ?? "").startsWith(prefix),
        );
      }
    }
    if (this.orFilter && this.table === "bookings") {
      rows = rows.filter((row) => {
        const r = row as BookingRow;
        return (
          Boolean(r.completed_at) || String(r.status ?? "").toLowerCase() === "completed"
        );
      });
    }
    if (this.orderColumn) {
      const column = this.orderColumn;
      rows = rows.slice().sort((a, b) => {
        const av = (a as Record<string, unknown>)[column] as string | null;
        const bv = (b as Record<string, unknown>)[column] as string | null;
        const aMs = av ? Date.parse(av) : Number.POSITIVE_INFINITY;
        const bMs = bv ? Date.parse(bv) : Number.POSITIVE_INFINITY;
        return this.orderAsc ? aMs - bMs : bMs - aMs;
      });
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    return rows;
  }
}

// Mirror of what the API route's "happy path" does after eligibility passes,
// so we can assert the resulting state without booting Next.js.
async function simulateClaim(admin: FakeAdmin, params: { studentId: string; bookingId: string; teacherId: string; description?: string; now?: number }) {
  const eligibility = await firstLessonGuaranteeEligibility(admin, {
    studentId: params.studentId,
    bookingId: params.bookingId,
    now: params.now,
  });
  if (!eligibility.eligible) return { ok: false as const, reason: eligibility.reason };

  const composed = [
    FIRST_LESSON_GUARANTEE_MARKER,
    `Booking ${params.bookingId} completed at ${eligibility.completedAt}.`,
    "Student is invoking the first-lesson satisfaction guarantee for manual review.",
    params.description ? `Student comment: ${params.description}` : "Student did not provide additional details.",
  ].join("\n");

  const insertResult = await admin
    .from("support_cases")
    .insert({
      booking_id: params.bookingId,
      opened_by_user_id: params.studentId,
      student_id: params.studentId,
      teacher_id: params.teacherId,
      role: "student",
      category: "refund_request",
      status: "new",
      priority: "high",
      title: "First lesson satisfaction guarantee",
      description: composed,
      requested_resolution: "refund",
      evidence_urls: [],
      payout_hold: true,
      payout_hold_reason: "First lesson satisfaction guarantee — pending manual review",
    })
    .select("id")
    .single();
  const inserted = (insertResult.data as SupportCaseRow | null) ?? null;
  if (!inserted) return { ok: false as const, reason: "insert_failed" as const };

  await admin
    .from("profiles")
    .update({ first_lesson_guarantee_used_at: new Date(params.now ?? Date.now()).toISOString() })
    .eq("id", params.studentId);

  return { ok: true as const, supportCaseId: inserted.id };
}

// ---------------------------------------------------------------------------

const NOW = Date.parse("2026-05-22T12:00:00Z");
const STUDENT = "student-1";
const TEACHER = "teacher-1";
const BOOKING = "booking-1";

function eligibleAdmin(): FakeAdmin {
  const admin = new FakeAdmin();
  admin.profiles.set(STUDENT, { id: STUDENT, first_lesson_guarantee_used_at: null });
  admin.bookings = [
    {
      id: BOOKING,
      student_id: STUDENT,
      teacher_id: TEACHER,
      status: "completed",
      completed_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
      completion_outcome: "held",
    },
  ];
  admin.bookingPayments = [
    {
      booking_id: BOOKING,
      refund_status: null,
      refunded_at: null,
    },
  ];
  return admin;
}

// -------- Happy path --------------------------------------------------------

test("creates a support_case with category=refund_request and payout_hold=true", async () => {
  const admin = eligibleAdmin();
  const out = await simulateClaim(admin, {
    studentId: STUDENT,
    bookingId: BOOKING,
    teacherId: TEACHER,
    now: NOW,
  });
  assert.equal(out.ok, true);
  assert.ok(admin.insertedSupportCase);
  assert.equal(admin.insertedSupportCase!.category, "refund_request");
  assert.equal(admin.insertedSupportCase!.payout_hold, true);
  assert.equal(admin.insertedSupportCase!.role, "student");
  assert.equal(admin.insertedSupportCase!.requested_resolution, "refund");
  assert.ok(
    admin.insertedSupportCase!.description.startsWith(FIRST_LESSON_GUARANTEE_MARKER),
    "description must start with the [FIRST_LESSON_GUARANTEE] marker",
  );
});

test("stamps profiles.first_lesson_guarantee_used_at on success", async () => {
  const admin = eligibleAdmin();
  const out = await simulateClaim(admin, {
    studentId: STUDENT,
    bookingId: BOOKING,
    teacherId: TEACHER,
    now: NOW,
  });
  assert.equal(out.ok, true);
  assert.equal(admin.profileStampUpdates.length, 1);
  assert.equal(admin.profileStampUpdates[0]!.id, STUDENT);
  assert.ok(admin.profileStampUpdates[0]!.first_lesson_guarantee_used_at);
});

test("does NOT mutate booking_payments refund state", async () => {
  const admin = eligibleAdmin();
  await simulateClaim(admin, { studentId: STUDENT, bookingId: BOOKING, teacherId: TEACHER, now: NOW });
  assert.equal(admin.bookingPaymentMutations.length, 0);
  assert.equal(admin.bookingPayments[0]!.refund_status, null);
  assert.equal(admin.bookingPayments[0]!.refunded_at, null);
});

// -------- Rejection paths ---------------------------------------------------

test("rejects outside window", async () => {
  const admin = eligibleAdmin();
  admin.bookings[0]!.completed_at = new Date(NOW - FIRST_LESSON_CLAIM_WINDOW_MS - 60_000).toISOString();
  const out = await simulateClaim(admin, { studentId: STUDENT, bookingId: BOOKING, teacherId: TEACHER, now: NOW });
  assert.equal(out.ok, false);
  if (!out.ok) assert.equal(out.reason, "outside_window");
  assert.equal(admin.profileStampUpdates.length, 0);
  assert.equal(admin.supportCases.length, 0);
});

test("rejects already used (profile stamp set)", async () => {
  const admin = eligibleAdmin();
  admin.profiles.set(STUDENT, {
    id: STUDENT,
    first_lesson_guarantee_used_at: new Date(NOW - 48 * 60 * 60 * 1000).toISOString(),
  });
  const out = await simulateClaim(admin, { studentId: STUDENT, bookingId: BOOKING, teacherId: TEACHER, now: NOW });
  assert.equal(out.ok, false);
  if (!out.ok) assert.equal(out.reason, "already_claimed");
  assert.equal(admin.supportCases.length, 0);
});

test("rejects when current booking is not the student's first completed lesson", async () => {
  const admin = eligibleAdmin();
  admin.bookings.unshift({
    id: "older-booking",
    student_id: STUDENT,
    teacher_id: TEACHER,
    status: "completed",
    completed_at: new Date(NOW - 30 * 24 * 60 * 60 * 1000).toISOString(),
    completion_outcome: "held",
  });
  const out = await simulateClaim(admin, { studentId: STUDENT, bookingId: BOOKING, teacherId: TEACHER, now: NOW });
  assert.equal(out.ok, false);
  if (!out.ok) assert.equal(out.reason, "not_first_lesson");
  assert.equal(admin.supportCases.length, 0);
});

// -------- API route source guards ------------------------------------------
//
// The endpoint must never call Stripe or mutate booking_payments refund state.
// We source-scan to guarantee these properties stay true under refactor.

test("endpoint source does NOT import Stripe or call stripe.refunds.*", () => {
  assert.ok(
    !/from\s+["']stripe["']/.test(ENDPOINT_SRC),
    "endpoint must not import the Stripe SDK",
  );
  assert.ok(
    !/stripe\.refunds\.(create|update)/.test(ENDPOINT_SRC),
    "endpoint must not call stripe.refunds.create or stripe.refunds.update",
  );
  assert.ok(
    !/stripe\.refunds/.test(ENDPOINT_SRC),
    "endpoint must not touch stripe.refunds at all",
  );
});

test("endpoint source does NOT update booking_payments refund_status / refunded_at", () => {
  assert.ok(
    !/booking_payments[\s\S]{0,200}\.update\(/.test(ENDPOINT_SRC),
    "endpoint must not run .update on booking_payments",
  );
  assert.ok(
    !/refund_status/.test(ENDPOINT_SRC),
    "endpoint must not reference refund_status",
  );
  assert.ok(
    !/refunded_at/.test(ENDPOINT_SRC),
    "endpoint must not reference refunded_at",
  );
});

test("endpoint source explicitly sets payout_hold: true and category: refund_request", () => {
  assert.ok(
    /payout_hold:\s*true/.test(ENDPOINT_SRC),
    "endpoint must set payout_hold: true for the support_case",
  );
  assert.ok(
    /category:\s*["']refund_request["']/.test(ENDPOINT_SRC),
    "endpoint must use category: 'refund_request'",
  );
});

test("endpoint source stamps profiles.first_lesson_guarantee_used_at AFTER support_case insert", () => {
  const insertIdx = ENDPOINT_SRC.search(/support_cases[\s\S]{0,200}\.insert\(/);
  const stampIdx = ENDPOINT_SRC.search(/first_lesson_guarantee_used_at/);
  assert.ok(insertIdx >= 0, "endpoint must insert into support_cases");
  assert.ok(stampIdx > insertIdx, "profile stamp must occur AFTER the support_case insert");
});

test("eligibility helper does NOT import Stripe or write to booking_payments", () => {
  // Match actual code patterns (imports, calls) rather than the literal word
  // in comments — the helper's own docstring contains "Stripe" deliberately
  // to reassure future readers that it stays out of payment logic.
  assert.ok(
    !/from\s+["']stripe["']/i.test(HELPER_SRC),
    "helper must not import the Stripe SDK",
  );
  assert.ok(
    !/\bstripe\.[a-z]+/i.test(HELPER_SRC),
    "helper must not call any stripe.* method",
  );
  assert.ok(
    !/\.from\(\s*["']booking_payments["']/.test(HELPER_SRC),
    "helper must not query booking_payments",
  );
  assert.ok(!/\.update\(|\.insert\(/.test(HELPER_SRC), "helper must be read-only");
});

test("migration adds profiles.first_lesson_guarantee_used_at and does not alter booking_payments or refund enums", () => {
  assert.ok(
    /ALTER TABLE\s+public\.profiles[\s\S]+first_lesson_guarantee_used_at\s+timestamptz/i.test(MIGRATION_SRC),
    "migration must add profiles.first_lesson_guarantee_used_at timestamptz",
  );
  // Strip SQL line comments so policy-explainer prose doesn't trip the guards.
  // Anything that survives is actual DDL.
  const sqlOnly = MIGRATION_SRC
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  assert.ok(
    !/booking_payments/i.test(sqlOnly),
    "migration DDL must not alter booking_payments",
  );
  assert.ok(
    !/refund_status/i.test(sqlOnly),
    "migration DDL must not alter refund enums",
  );
  assert.ok(
    !/\bALTER\s+TABLE\b[\s\S]+\brefund/i.test(sqlOnly),
    "migration DDL must not alter any refund-related column on existing tables",
  );
});

// -------- Safety copy -------------------------------------------------------

const SAFETY_FORBIDDEN_PATTERNS = [
  { name: "instant refund (en)", pattern: /instant\s+refund/i },
  { name: "automatic refund (en)", pattern: /automatic\s+refund/i },
  { name: "automatically refund", pattern: /automatically\s+refunds?/i },
  { name: "remboursement automatique (fr)", pattern: /remboursement\s+automatique/i },
  { name: "remboursement instantané (fr)", pattern: /remboursement\s+instantan[ée]/i },
  { name: "reembolso automático (es)", pattern: /reembolso\s+autom[aá]tico/i },
  { name: "reembolso instantáneo (es)", pattern: /reembolso\s+instant[aá]neo/i },
  { name: "tax receipt", pattern: /tax\s+receipt/i },
  { name: "reçu fiscal", pattern: /re[çc]u\s+fiscal/i },
  { name: "recibo fiscal", pattern: /recibo\s+fiscal/i },
  { name: "Revenu Québec", pattern: /revenu\s+qu[eé]bec/i },
  { name: "guaranteed teacher quality (en)", pattern: /guarantee\w*\s+(teacher|tutor)\s+quality/i },
  { name: "qualité du professeur garantie (fr)", pattern: /qualit[ée]\s+du\s+(professeur|prof)\s+garantie/i },
];

function assertNoForbidden(label: string, text: string) {
  for (const { name, pattern } of SAFETY_FORBIDDEN_PATTERNS) {
    assert.ok(
      !pattern.test(text),
      `${label} must NOT contain unsafe copy "${name}" — matched by ${pattern}`,
    );
  }
}

test("guarantee i18n copy (fr) is conservative and contains required keys", () => {
  for (const key of [
    "guaranteeFirstLessonTitle",
    "guaranteeFirstLessonBody",
    "guaranteeFirstLessonCta",
    "guaranteeFiledConfirmation",
    "guaranteeClaimWindowExpired",
    "guaranteeAlreadyUsed",
    "guaranteeNotEligibleNotFirst",
    "guaranteeNotEligibleNotCompleted",
  ]) {
    assert.ok(FR[key], `fr.${key} must exist`);
    assert.ok(EN[key], `en.${key} must exist`);
    assert.ok(ES[key], `es.${key} must exist`);
  }
  // Exact copy match required by the brief.
  assert.equal(FR.guaranteeFirstLessonTitle, "Garantie satisfaction du premier cours");
  assert.equal(EN.guaranteeFirstLessonTitle, "First lesson satisfaction guarantee");
  assert.equal(ES.guaranteeFirstLessonTitle, "Garantía de satisfacción de la primera clase");
});

test("guarantee i18n copy does not promise automatic/instant refunds, tax receipts, or teacher quality", () => {
  const allGuaranteeCopy = [FR, EN, ES]
    .flatMap((locale) =>
      Object.entries(locale as Record<string, string>)
        .filter(([key]) => key.startsWith("guarantee"))
        .map(([, value]) => String(value)),
    )
    .join(" ");
  assertNoForbidden("guarantee i18n copy", allGuaranteeCopy);
});

test("legal annulation page section uses conservative copy", () => {
  // Section must exist.
  assert.ok(/garantie\s+satisfaction\s+du\s+premier\s+cours/i.test(LEGAL_SRC));
  // Must not promise automatic refunds.
  assertNoForbidden("legal/annulation page", LEGAL_SRC);
  // Must explicitly state manual review (the policy contract).
  assert.ok(
    /manuel(le)?(\s|ment)|examin\w+\s+par/i.test(LEGAL_SRC),
    "legal section must mention manual review",
  );
});

test("student payments page CTA uses conservative copy keys only", () => {
  // CTA strings come from guarantee* keys (no inline copy promising refunds).
  assert.ok(/t\("guaranteeFirstLessonTitle"\)/.test(PAYMENTS_SRC));
  assert.ok(/t\("guaranteeFirstLessonBody"\)/.test(PAYMENTS_SRC));
  assert.ok(/t\("guaranteeFirstLessonCta"\)/.test(PAYMENTS_SRC));
  assertNoForbidden("student payments page", PAYMENTS_SRC);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[guarantee:firstLessonClaim] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
