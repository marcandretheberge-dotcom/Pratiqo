import assert from "node:assert/strict";
import { formatLocalISODate } from "@/lib/slots";
import { isScheduleEditLockedByNotice } from "@/lib/scheduleLockout";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function isoForOffsetDays(now: Date, offsetDays: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + offsetDays);
  return formatLocalISODate(d);
}

test("past period is locked", () => {
  const now = new Date(2026, 4, 21, 12, 0, 0, 0);
  assert.equal(isScheduleEditLockedByNotice(isoForOffsetDays(now, -1), "soir", now), true);
});

test("slot 23h59 from now is locked", () => {
  const now = new Date(2026, 4, 21, 12, 1, 0, 0);
  assert.equal(isScheduleEditLockedByNotice(isoForOffsetDays(now, 1), "apresmidi", now), true);
});

test("slot more than 24h from now is editable", () => {
  const now = new Date(2026, 4, 21, 11, 59, 0, 0);
  assert.equal(isScheduleEditLockedByNotice(isoForOffsetDays(now, 1), "apresmidi", now), false);
});

test("future week slot is editable", () => {
  const now = new Date(2026, 4, 21, 12, 0, 0, 0);
  assert.equal(isScheduleEditLockedByNotice(isoForOffsetDays(now, 7), "matin", now), false);
});

test("all-day block uses the start of the date", () => {
  const now = new Date(2026, 4, 21, 12, 0, 0, 0);
  assert.equal(isScheduleEditLockedByNotice(isoForOffsetDays(now, 1), "all", now), true);
  assert.equal(isScheduleEditLockedByNotice(isoForOffsetDays(now, 3), "all", now), false);
});

(async () => {
  for (const t of tests) {
    await t.fn();
    console.log(`ok - ${t.name}`);
  }
  console.log(`[bookings:scheduleLockout] ${tests.length} tests passed`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
