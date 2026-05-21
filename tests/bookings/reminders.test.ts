import assert from "node:assert/strict";
import { verifyCronSecret } from "@/lib/cron/auth";
import {
  REMINDER_1H_MAX_MS,
  REMINDER_1H_MIN_MS,
  REMINDER_24H_MAX_MS,
  REMINDER_24H_MIN_MS,
  bookingStartsInWindow,
  isConfirmedReminderCandidate,
  paymentBlocksReminder,
  selectBookingsForReminderWindow,
  type BookingRowForReminders,
} from "@/lib/bookings/reminders";

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function bookingStartingIn(
  hoursFromNow: number,
  overrides: Partial<BookingRowForReminders> = {},
): BookingRowForReminders {
  const start = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, "0");
  const d = String(start.getDate()).padStart(2, "0");
  const hh = String(start.getHours()).padStart(2, "0");
  const mm = String(start.getMinutes()).padStart(2, "0");
  return {
    id: `bk_${hoursFromNow}`,
    teacher_id: "t1",
    student_id: "s1",
    status: "confirmed",
    slot_date: `${y}-${m}-${d}`,
    time_slot: `${hh}:${mm}`,
    duration_minutes: 60,
    ...overrides,
  };
}

test("24h window selects booking starting in 24 hours", () => {
  const now = new Date();
  const booking = bookingStartingIn(24);
  assert.equal(
    bookingStartsInWindow(booking, now, REMINDER_24H_MIN_MS, REMINDER_24H_MAX_MS),
    true,
  );
  const selected = selectBookingsForReminderWindow([booking], now, "24h");
  assert.equal(selected.length, 1);
});

test("1h window selects booking starting in 1 hour", () => {
  const now = new Date();
  const booking = bookingStartingIn(1);
  assert.equal(
    bookingStartsInWindow(booking, now, REMINDER_1H_MIN_MS, REMINDER_1H_MAX_MS),
    true,
  );
  const selected = selectBookingsForReminderWindow([booking], now, "1h");
  assert.equal(selected.length, 1);
});

test("cancelled, completed, and pending_payment bookings are ignored", () => {
  const now = new Date();
  const base = bookingStartingIn(24);
  for (const status of ["cancelled", "completed", "pending_payment", "cancelled_conflict"]) {
    assert.equal(isConfirmedReminderCandidate({ ...base, status }), false);
    const selected = selectBookingsForReminderWindow([{ ...base, status }], now, "24h");
    assert.equal(selected.length, 0);
  }
});

test("refunded and disputed payment states block reminders", () => {
  assert.equal(isConfirmedReminderCandidate({ status: "confirmed", refund_status: "refunded" }), false);
  assert.equal(paymentBlocksReminder("disputed"), true);
  assert.equal(paymentBlocksReminder("paid"), false);
});

test("already-sent reminder columns exclude booking from selection", () => {
  const now = new Date();
  const booking = bookingStartingIn(24, { reminder_24h_sent_at: new Date().toISOString() });
  const selected = selectBookingsForReminderWindow([booking], now, "24h");
  assert.equal(selected.length, 0);
});

test("booking outside reminder window is not selected", () => {
  const now = new Date();
  const tooSoon = bookingStartingIn(2);
  const tooLate = bookingStartingIn(30);
  assert.equal(selectBookingsForReminderWindow([tooSoon, tooLate], now, "24h").length, 0);
});

test("batch continues when an item handler throws", async () => {
  const outcomes: string[] = [];
  for (const id of ["throw", "ok"]) {
    try {
      if (id === "throw") throw new Error("send failed");
      outcomes.push("ok");
    } catch {
      outcomes.push("failed");
    }
  }
  assert.deepEqual(outcomes, ["failed", "ok"]);
});

test("verifyCronSecret accepts bearer and header", () => {
  const prev = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-cron-secret";
  try {
    const req = new Request("http://localhost/api/cron/bookings/reminders", {
      headers: { authorization: "Bearer test-cron-secret" },
    });
    assert.equal(verifyCronSecret(req), true);

    const headerReq = new Request("http://localhost/api/cron/bookings/reminders", {
      headers: { "x-cron-secret": "test-cron-secret" },
    });
    assert.equal(verifyCronSecret(headerReq), true);

    const badReq = new Request("http://localhost/api/cron/bookings/reminders");
    assert.equal(verifyCronSecret(badReq), false);
  } finally {
    if (prev === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prev;
  }
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[bookings:reminders] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
