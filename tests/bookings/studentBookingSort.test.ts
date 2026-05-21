import assert from "node:assert/strict";
import { bookingStartMinutes, compareBookingsByStartAsc } from "@/lib/bookings/sort";

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

test("same-day student bookings sort by actual start time", () => {
  const sorted = [
    { id: "noon", slot_date: "2026-06-04", time_slot: "12h00", created_at: "2026-05-01T09:00:00Z" },
    { id: "ten", slot_date: "2026-06-04", time_slot: "10h00", created_at: "2026-05-01T10:00:00Z" },
    { id: "nine", slot_date: "2026-06-04", time_slot: "9h00", created_at: "2026-05-01T11:00:00Z" },
  ].sort(compareBookingsByStartAsc);

  assert.deepEqual(
    sorted.map((booking) => booking.id),
    ["nine", "ten", "noon"],
  );
});

test("date remains primary sort key before start time", () => {
  const sorted = [
    { id: "tomorrow", slot_date: "2026-06-05", time_slot: "08h00" },
    { id: "today", slot_date: "2026-06-04", time_slot: "18h00" },
  ].sort(compareBookingsByStartAsc);

  assert.deepEqual(
    sorted.map((booking) => booking.id),
    ["today", "tomorrow"],
  );
});

test("start parser handles compact and colon slot formats", () => {
  assert.equal(bookingStartMinutes("10h00"), 600);
  assert.equal(bookingStartMinutes("10:00"), 600);
  assert.equal(bookingStartMinutes("10h00 - 11h00"), 600);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[bookings:studentSort] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
