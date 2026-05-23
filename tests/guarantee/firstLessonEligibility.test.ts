import assert from "node:assert/strict";

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

// ---------------------------------------------------------------------------
// Minimal Supabase admin fake. We only implement the surface area used by
// firstLessonGuaranteeEligibility: `.from(t).select(...).eq().maybeSingle()`,
// `.from("bookings").select().eq().or().order().limit().maybeSingle()`, and
// `.from("support_cases").select().eq().ilike().limit()` resolved as a
// thenable. Mirrors the FakeAdmin pattern used elsewhere in the codebase.
// ---------------------------------------------------------------------------

type ProfileRow = { id: string; first_lesson_guarantee_used_at: string | null };
type BookingRow = {
  id: string;
  student_id: string;
  status: string | null;
  completed_at: string | null;
  completion_outcome: string | null;
};
type SupportCaseRow = { id: string; student_id: string; description: string };

class FakeAdmin {
  profiles = new Map<string, ProfileRow>();
  bookings: BookingRow[] = [];
  supportCases: SupportCaseRow[] = [];

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

  constructor(private readonly admin: FakeAdmin, private readonly table: string) {}

  select() {
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

  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orderColumn = column;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  maybeSingle() {
    const rows = this.runSelect();
    return Promise.resolve({ data: rows[0] ?? null, error: null });
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve({ data: this.runSelect(), error: null }).then(onfulfilled, onrejected);
  }

  private runSelect(): unknown[] {
    let rows: unknown[];
    if (this.table === "profiles") {
      rows = Array.from(this.admin.profiles.values());
    } else if (this.table === "bookings") {
      rows = this.admin.bookings.slice();
    } else if (this.table === "support_cases") {
      rows = this.admin.supportCases.slice();
    } else {
      rows = [];
    }
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
      // Reuse the exact filter string COMPLETED_LESSON_FOR_COMPANION_FILTER.
      const wantsCompleted = /completed_at\.not\.is\.null/.test(this.orFilter);
      const wantsStatusCompleted = /status\.eq\.completed/.test(this.orFilter);
      rows = rows.filter((row) => {
        const r = row as BookingRow;
        const completedAt = r.completed_at !== null && r.completed_at !== undefined;
        const statusCompleted = String(r.status ?? "").toLowerCase() === "completed";
        return (wantsCompleted && completedAt) || (wantsStatusCompleted && statusCompleted);
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

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

const NOW = Date.parse("2026-05-22T12:00:00Z");
const STUDENT = "student-1";
const BOOKING = "booking-1";

function freshAdmin(): FakeAdmin {
  const admin = new FakeAdmin();
  admin.profiles.set(STUDENT, { id: STUDENT, first_lesson_guarantee_used_at: null });
  return admin;
}

test("eligible: current booking is student's first completed booking and within 24h", async () => {
  const admin = freshAdmin();
  admin.bookings = [
    {
      id: BOOKING,
      student_id: STUDENT,
      status: "completed",
      completed_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
      completion_outcome: "held",
    },
  ];
  const out = await firstLessonGuaranteeEligibility(admin, {
    studentId: STUDENT,
    bookingId: BOOKING,
    now: NOW,
  });
  assert.equal(out.eligible, true);
});

test("not_completed: booking is still confirmed (not completed) and has no completed_at", async () => {
  const admin = freshAdmin();
  admin.bookings = [
    {
      id: BOOKING,
      student_id: STUDENT,
      status: "confirmed",
      completed_at: null,
      completion_outcome: null,
    },
  ];
  const out = await firstLessonGuaranteeEligibility(admin, {
    studentId: STUDENT,
    bookingId: BOOKING,
    now: NOW,
  });
  assert.equal(out.eligible, false);
  if (!out.eligible) assert.equal(out.reason, "not_completed");
});

test("outside_window: completed >24h ago", async () => {
  const admin = freshAdmin();
  admin.bookings = [
    {
      id: BOOKING,
      student_id: STUDENT,
      status: "completed",
      completed_at: new Date(NOW - FIRST_LESSON_CLAIM_WINDOW_MS - 60_000).toISOString(),
      completion_outcome: "held",
    },
  ];
  const out = await firstLessonGuaranteeEligibility(admin, {
    studentId: STUDENT,
    bookingId: BOOKING,
    now: NOW,
  });
  assert.equal(out.eligible, false);
  if (!out.eligible) assert.equal(out.reason, "outside_window");
});

test("not_first_lesson: an earlier completed booking exists for this student", async () => {
  const admin = freshAdmin();
  admin.bookings = [
    {
      id: "older-booking",
      student_id: STUDENT,
      status: "completed",
      completed_at: new Date(NOW - 10 * 24 * 60 * 60 * 1000).toISOString(),
      completion_outcome: "held",
    },
    {
      id: BOOKING,
      student_id: STUDENT,
      status: "completed",
      completed_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
      completion_outcome: "held",
    },
  ];
  const out = await firstLessonGuaranteeEligibility(admin, {
    studentId: STUDENT,
    bookingId: BOOKING,
    now: NOW,
  });
  assert.equal(out.eligible, false);
  if (!out.eligible) assert.equal(out.reason, "not_first_lesson");
});

test("already_claimed: profile.first_lesson_guarantee_used_at is set", async () => {
  const admin = freshAdmin();
  admin.profiles.set(STUDENT, {
    id: STUDENT,
    first_lesson_guarantee_used_at: new Date(NOW - 24 * 60 * 60 * 1000).toISOString(),
  });
  admin.bookings = [
    {
      id: BOOKING,
      student_id: STUDENT,
      status: "completed",
      completed_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
      completion_outcome: "held",
    },
  ];
  const out = await firstLessonGuaranteeEligibility(admin, {
    studentId: STUDENT,
    bookingId: BOOKING,
    now: NOW,
  });
  assert.equal(out.eligible, false);
  if (!out.eligible) assert.equal(out.reason, "already_claimed");
});

test("already_claimed (defense-in-depth): support_cases has a [FIRST_LESSON_GUARANTEE] marker even when profile stamp is null", async () => {
  const admin = freshAdmin();
  admin.bookings = [
    {
      id: BOOKING,
      student_id: STUDENT,
      status: "completed",
      completed_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
      completion_outcome: "held",
    },
  ];
  admin.supportCases = [
    {
      id: "case-1",
      student_id: STUDENT,
      description: `${FIRST_LESSON_GUARANTEE_MARKER}\nBooking ${BOOKING} ...`,
    },
  ];
  const out = await firstLessonGuaranteeEligibility(admin, {
    studentId: STUDENT,
    bookingId: BOOKING,
    now: NOW,
  });
  assert.equal(out.eligible, false);
  if (!out.eligible) assert.equal(out.reason, "already_claimed");
});

test("student_no_show: completion_outcome=absent disqualifies the claim", async () => {
  const admin = freshAdmin();
  admin.bookings = [
    {
      id: BOOKING,
      student_id: STUDENT,
      status: "completed",
      completed_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
      completion_outcome: "absent",
    },
  ];
  const out = await firstLessonGuaranteeEligibility(admin, {
    studentId: STUDENT,
    bookingId: BOOKING,
    now: NOW,
  });
  assert.equal(out.eligible, false);
  if (!out.eligible) assert.equal(out.reason, "student_no_show");
});

test("not_completed: booking belongs to a different student", async () => {
  const admin = freshAdmin();
  admin.bookings = [
    {
      id: BOOKING,
      student_id: "someone-else",
      status: "completed",
      completed_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
      completion_outcome: "held",
    },
  ];
  const out = await firstLessonGuaranteeEligibility(admin, {
    studentId: STUDENT,
    bookingId: BOOKING,
    now: NOW,
  });
  assert.equal(out.eligible, false);
  if (!out.eligible) assert.equal(out.reason, "not_completed");
});

test("FIRST_LESSON_CLAIM_WINDOW_MS exactly equals 24 hours", () => {
  assert.equal(FIRST_LESSON_CLAIM_WINDOW_MS, 24 * 60 * 60 * 1000);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[guarantee:firstLessonEligibility] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
