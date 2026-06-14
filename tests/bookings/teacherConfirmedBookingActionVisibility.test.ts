import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Regression guard: confirmed / paid bookings must NEVER show "Refuser".
//
// Production QA (P0.4) reported that the teacher dashboard was
// surfacing TWO simultaneous actions on automated/paid bookings:
//   • a top-of-dashboard "Refuser" (red X) button, rendered by
//     `TeacherRequestCard`, with `onDecline` calling
//     `POST /api/bookings/:id/decline`;
//   • a bottom-of-dashboard "Annuler ce cours" cancellation link
//     rendered by `TeacherScheduleCard` for the same student's
//     confirmed lessons.
//
// Schema reality (`supabase/migrations/030_cleanup_booked_status.sql`):
//   - the migration collapsed the legacy "pending" and
//     "pending_teacher" statuses into "pending_payment";
//   - it added a CHECK constraint locking the enum to
//     {pending_payment, confirmed, completed, cancelled,
//     cancelled_conflict};
//   - "pending_payment" means the student is mid-Stripe-Checkout —
//     there is no genuine manual-request state in the product today.
//
// → The "Refuser" CTA on a "pending_payment" row is a UX bug *and*
//   a data hazard (Stripe's webhook is still in flight when the
//   teacher sees the button). It must be hidden until a real
//   manual-approval flow is re-introduced.
//
// This test is a source-scan guard. It does NOT change the
// `/api/bookings/:id/decline` route, the `cancelTeacherBooking`
// client helper, the Stripe webhook, or the cancellation/refund
// pipeline — those are intentionally preserved so that, if a future
// product change re-introduces a true manual-approval flow, the
// rendering path can be re-enabled without re-implementing the
// server logic.
// ---------------------------------------------------------------------------

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const ROOT = process.cwd();
const DASHBOARD_SRC = readFileSync(
  join(ROOT, "components", "Dashboard.tsx"),
  "utf8",
);
const REQUEST_CARD_SRC = readFileSync(
  join(ROOT, "components", "dashboard", "teacher", "TeacherRequestCard.tsx"),
  "utf8",
);
const SCHEDULE_CARD_SRC = readFileSync(
  join(ROOT, "components", "dashboard", "teacher", "TeacherScheduleCard.tsx"),
  "utf8",
);
const STATUS_MIGRATION_SRC = readFileSync(
  join(ROOT, "supabase", "migrations", "030_cleanup_booked_status.sql"),
  "utf8",
);
const COMPLETED_MIGRATION_SRC = readFileSync(
  join(ROOT, "supabase", "migrations", "034_allow_completed_booking_status.sql"),
  "utf8",
);
const FR_DICT = JSON.parse(
  readFileSync(join(ROOT, "lib", "i18n", "locales", "fr.json"), "utf8"),
) as Record<string, unknown>;

// ── Helper: slice `Dashboard.tsx` from a `const NAME = teacherBookings.…`
// declaration to its matching closing `);\n` — covers both arrow-body
// and block-body filter callbacks without dragging in adjacent
// derivations (e.g. `monthRevenue`) that legitimately mention
// "confirmed".
function declarationBlock(varName: string): string {
  const startMarker = `const ${varName} = teacherBookings`;
  const startIdx = DASHBOARD_SRC.indexOf(startMarker);
  assert.ok(
    startIdx >= 0,
    `Dashboard.tsx must still define \`const ${varName} = teacherBookings…\` — re-anchor the test if the variable was renamed`,
  );
  // Walk forward until we close the wrapping `(...)` of the
  // teacherBookings.filter / teacherBookings.<chain>(...) call by
  // tracking parenthesis depth. Stop at the first depth-zero `;` that
  // terminates the assignment. We bound the search to 4_000 chars as a
  // safety rail.
  const tail = DASHBOARD_SRC.slice(startIdx, startIdx + 4000);
  let depth = 0;
  let inString: '"' | "'" | "`" | null = null;
  let escape = false;
  for (let i = 0; i < tail.length; i++) {
    const ch = tail[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }
    if (inString) {
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch as '"' | "'" | "`";
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === ";" && depth === 0) {
      return tail.slice(0, i + 1);
    }
  }
  // Fallback: if depth tracking failed we still want to fail loudly
  // rather than silently match unrelated text downstream — slice a
  // tight 200-char window which is enough for the new arrow filter.
  return tail.slice(0, 200);
}

const pendingListBlock = (): string => declarationBlock("pendingList");
const confirmedUpcomingBlock = (): string => declarationBlock("confirmedUpcoming");

// ── 1. The schema reality the fix relies on ──────────────────────────────

test("migration 030 collapsed pending/pending_teacher into pending_payment", () => {
  // The fix's premise is that there is no manual-approval state in
  // the schema. If a future migration re-introduces "pending" or
  // "pending_teacher" as a CHECK-constrained status, we will need to
  // revisit the dashboard filter — this guard fires first to remind
  // us.
  assert.match(
    STATUS_MIGRATION_SRC,
    /SET status\s*=\s*'pending_payment'\s*WHERE status IN \('pending',\s*'pending_teacher'\)/,
    "migration 030 must keep mapping legacy pending/pending_teacher rows to pending_payment",
  );
});

test("the booking status CHECK constraint excludes pending and pending_teacher", () => {
  // The active CHECK constraint lives in migration 034 (it superseded
  // the constraint declared in migration 030 to allow "completed").
  // We assert the post-034 list of allowed statuses does NOT include
  // either "pending" or "pending_teacher".
  const checkSection = COMPLETED_MIGRATION_SRC.match(
    /CHECK\s*\(\s*status IN\s*\(([\s\S]*?)\)\s*\)/,
  );
  assert.ok(checkSection, "migration 034 must declare the bookings_status_check");
  const allowed = checkSection![1];
  assert.match(allowed, /'pending_payment'/);
  assert.match(allowed, /'confirmed'/);
  assert.match(allowed, /'completed'/);
  assert.match(allowed, /'cancelled'/);
  assert.match(allowed, /'cancelled_conflict'/);
  assert.doesNotMatch(
    allowed,
    /'pending'(?!_)/,
    "post-030 schema must not allow bare 'pending' as a booking status",
  );
  assert.doesNotMatch(
    allowed,
    /'pending_teacher'/,
    "post-030 schema must not allow 'pending_teacher' as a booking status",
  );
});

// ── 2. The actual fix: pendingList must NOT include pending_payment ──────

test("Dashboard.tsx pendingList filter EXCLUDES pending_payment", () => {
  const block = pendingListBlock();
  assert.doesNotMatch(
    block,
    /["']pending_payment["']/,
    "pendingList filter must NOT mention 'pending_payment' — that is the QA-reported bug; pending_payment rows must surface in confirmedUpcoming after Stripe webhook flips them, not in the manual-approval section",
  );
});

test("Dashboard.tsx pendingList filter still tolerates the dead-code statuses", () => {
  // We intentionally keep "pending" and "pending_teacher" in the
  // filter even though the CHECK constraint prevents them from being
  // inserted today — that way, if a future product change re-
  // introduces a real manual-approval flow, the dashboard's pending-
  // requests section is already wired up and the only thing that
  // needs to ship is the migration + server-side guard.
  const block = pendingListBlock();
  assert.match(
    block,
    /["']pending["']/,
    "pendingList filter must keep 'pending' as a forward-compatible entry for any future manual-approval flow",
  );
  assert.match(
    block,
    /["']pending_teacher["']/,
    "pendingList filter must keep 'pending_teacher' as a forward-compatible entry for any future manual-approval flow",
  );
});

test("Dashboard.tsx pendingList filter does not pull in confirmed/completed/cancelled rows", () => {
  const block = pendingListBlock();
  assert.doesNotMatch(
    block,
    /["']confirmed["']/,
    "pendingList filter must never include 'confirmed' rows — they have their own card",
  );
  assert.doesNotMatch(
    block,
    /["']completed["']/,
    "pendingList filter must never include 'completed' rows",
  );
  assert.doesNotMatch(
    block,
    /["']cancelled["']/,
    "pendingList filter must never include 'cancelled' rows",
  );
  assert.doesNotMatch(
    block,
    /["']cancelled_conflict["']/,
    "pendingList filter must never include 'cancelled_conflict' rows",
  );
});

// ── 3. confirmedUpcoming was not weakened or expanded ────────────────────

test("Dashboard.tsx confirmedUpcoming still filters on activeStatuses = ['confirmed']", () => {
  // We assert (a) the surrounding context still derives
  // `activeStatuses = ["confirmed"]` and (b) the confirmedUpcoming
  // pipeline still uses it. This protects against a sloppy refactor
  // that, while removing pending_payment from pendingList,
  // accidentally pulls it into confirmedUpcoming and re-creates the
  // same QA bug from a different angle.
  assert.match(
    DASHBOARD_SRC,
    /const activeStatuses = \[["']confirmed["']\];/,
    "Dashboard.tsx must keep `const activeStatuses = ['confirmed']`",
  );
  const block = confirmedUpcomingBlock();
  assert.match(
    block,
    /activeStatuses\.includes\(b\.status\)/,
    "confirmedUpcoming must still gate on activeStatuses.includes(b.status)",
  );
  assert.doesNotMatch(
    block,
    /["']pending_payment["']/,
    "confirmedUpcoming must NOT pull in pending_payment — those rows are mid-checkout, not yet teacher-actionable",
  );
});

// ── 4. TeacherRequestCard component contract is preserved ────────────────

test("TeacherRequestCard still exposes its onDecline prop and renders the decline button", () => {
  // We do NOT delete the component or the decline call site. The
  // brief is explicit: "do not delete server actions unless tests
  // prove they are unused". The component must keep working so any
  // future manual-approval flow can re-mount it with no further
  // change.
  assert.match(
    REQUEST_CARD_SRC,
    /onDecline:\s*\(\)\s*=>\s*void/,
    "TeacherRequestCard must still declare `onDecline: () => void`",
  );
  assert.match(
    REQUEST_CARD_SRC,
    /onClick=\{onDecline\}/,
    "TeacherRequestCard must still wire the decline button to onDecline",
  );
  assert.match(
    REQUEST_CARD_SRC,
    /\{t\("declineButton"\)\}/,
    "TeacherRequestCard must still render the declineButton i18n label",
  );
});

test("TeacherRequestCard now carries the production-guard JSDoc", () => {
  // The component is no longer mounted on production rows today —
  // we want any future engineer reading it to understand the rule
  // before re-wiring it.
  assert.match(
    REQUEST_CARD_SRC,
    /production guard/i,
    "TeacherRequestCard must carry a production-guard comment naming pending_payment as the forbidden surface",
  );
  assert.match(
    REQUEST_CARD_SRC,
    /pending_payment/,
    "TeacherRequestCard's guard comment must explicitly name pending_payment",
  );
});

// ── 5. Server-side decline route + client helper are NOT deleted ─────────

test("client-side cancelTeacherBooking helper still POSTs to /api/bookings/:id/decline", () => {
  // The brief: "do not delete server actions unless tests prove they
  // are unused". We assert the helper that historically powered the
  // decline button is still defined and still reaches the backend
  // route — the only thing we changed is what UI lists invoke it.
  assert.match(
    DASHBOARD_SRC,
    /const cancelTeacherBooking = async \(id: string\) =>/,
    "Dashboard.tsx must keep cancelTeacherBooking declared (server action preserved for forward compatibility)",
  );
  assert.match(
    DASHBOARD_SRC,
    /\/api\/bookings\/\$\{encodeURIComponent\(id\)\}\/decline/,
    "Dashboard.tsx must keep wiring cancelTeacherBooking to /api/bookings/:id/decline",
  );
});

// ── 6. Confirmed lessons keep their proper cancellation flow ─────────────

test("TeacherScheduleCard still exposes the proper `cancelThisClass` action", () => {
  // The brief: "Keep the existing proper cancellation card/action
  // visible where it is currently valid." TeacherScheduleCard is
  // where confirmed/upcoming bookings render their proper, i18n-
  // labelled cancellation link.
  assert.match(
    SCHEDULE_CARD_SRC,
    /onRequestCancelClass\?\s*:\s*\(bookingId:\s*string\)\s*=>\s*void/,
    "TeacherScheduleCard must still declare optional onRequestCancelClass",
  );
  assert.match(
    SCHEDULE_CARD_SRC,
    /\{t\("cancelThisClass"\)\}/,
    "TeacherScheduleCard must still render the cancelThisClass i18n label",
  );
});

// ── 7. Empty-state copy still wired up ───────────────────────────────────

test("French dictionary still ships the empty-state and decline labels we rely on", () => {
  // We do not change i18n. We assert that:
  //   - the section's empty state ("noPending") still exists — the
  //     pendingList-now-empty case will use it;
  //   - the decline-button label and the confirm-prompt label still
  //     exist in case a future manual-approval flow re-mounts the
  //     card.
  for (const key of [
    "noPending",
    "pendingRequests",
    "declineButton",
    "declineBookingConfirm",
    "bookingDeclined",
    "cancelThisClass",
    "viewCancellationPolicy",
  ]) {
    assert.equal(
      typeof FR_DICT[key],
      "string",
      `lib/i18n/locales/fr.json must still expose '${key}'`,
    );
  }
});

// ── 8. The decline button is NOT rendered anywhere on confirmed rows ────

test("Dashboard.tsx does not pass any confirmedUpcoming row to TeacherRequestCard", () => {
  // The .map call site that mounts TeacherRequestCard must read from
  // pendingList, not confirmedUpcoming or todayList — otherwise the
  // QA bug returns through a different code path.
  const callSite = DASHBOARD_SRC.match(
    /\{pendingList\.map\(\(b\)\s*=>\s*\([\s\S]{0,400}?<TeacherRequestCard\b[\s\S]{0,400}?\)\s*\)\}/,
  );
  assert.ok(
    callSite,
    "Dashboard.tsx must mount TeacherRequestCard inside `{pendingList.map((b) => (...<TeacherRequestCard.../>...))}`",
  );
  // Defensive negative: there must NOT be any other TeacherRequestCard
  // mount that uses confirmedUpcoming or todayList.
  const allMounts = DASHBOARD_SRC.match(/<TeacherRequestCard\b/g) ?? [];
  assert.equal(
    allMounts.length,
    1,
    "Dashboard.tsx must mount TeacherRequestCard exactly once (the pendingList call site) — adding a second mount on confirmed/today rows would re-create the QA bug",
  );
});

// ── 9. No payment / Stripe / cancellation logic was touched ──────────────

test("the fix did not pull in any new payment / Stripe / cancellation imports into Dashboard.tsx", () => {
  // Light defensive guard: the brief forbids touching any payment-
  // related code. The dashboard already imports
  // `getBookingLifecycleState` and a few other booking helpers — we
  // assert no new Stripe SDK was added alongside the visibility fix.
  assert.doesNotMatch(
    DASHBOARD_SRC,
    /from\s+["']stripe["']/i,
    "Dashboard.tsx must not import the stripe server SDK during a UI-only fix",
  );
  assert.doesNotMatch(
    DASHBOARD_SRC,
    /from\s+["']@stripe\/stripe-js/i,
    "Dashboard.tsx must not import the @stripe/stripe-js client SDK during a UI-only fix",
  );
});

// ── Run ─────────────────────────────────────────────────────────────────

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log(
    `[bookings:teacherConfirmedBookingActionVisibility] ${passed} tests passed`,
  );
}
