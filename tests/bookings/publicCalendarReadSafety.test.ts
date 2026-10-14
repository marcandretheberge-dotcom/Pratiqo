import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { expireStalePlannedPackageHolds, listActiveHoldsForTeacherDay, hasActivePlannedPackageHoldConflict } from "@/lib/offers/plannedPackageHoldQueries";
import { computeAvailableDaysForTeacher } from "@/lib/teacherSlotQueries";
import { computeTeacherAvailabilityPreview } from "@/lib/bookings/availabilityPreview";

type Row = Record<string, unknown>;
function database(tables: Record<string, Row[]>, readOnly: boolean) {
  let writes = 0;
  const client = { from(table: string) {
    let patch: Row | undefined;
    const filters: Array<(row: Row) => boolean> = [];
    const q = {
      select() { return q; },
      update(value: Row) { assert.equal(readOnly, false, `unexpected mutation: ${table}`); patch = value; return q; },
      insert() { throw Error("unexpected insert"); }, delete() { throw Error("unexpected delete"); },
      eq(k: string, v: unknown) { filters.push(row => row[k] === v); return q; },
      in(k: string, values: unknown[]) { filters.push(row => values.includes(row[k])); return q; },
      not(k: string, _op: string, v: unknown) { filters.push(row => row[k] !== v); return q; },
      gt(k: string, v: string) { filters.push(row => String(row[k]) > v); return q; },
      lt(k: string, v: string) { filters.push(row => String(row[k]) < v); return q; },
      gte(k: string, v: string) { filters.push(row => String(row[k]) >= v); return q; },
      lte(k: string, v: string) { filters.push(row => String(row[k]) <= v); return q; },
      maybeSingle() { return Promise.resolve({ data: tables[table]?.[0] ?? null, error: null }); },
      async then(resolve: (value: unknown) => unknown) {
        const data = (tables[table] ?? []).filter(row => filters.every(f => f(row)));
        if (patch) for (const row of data) { Object.assign(row, patch); writes++; }
        return resolve({ data, error: null, count: data.length });
      },
    };
    return q;
  } } as unknown as SupabaseClient;
  return { client, writes: () => writes };
}
const now = new Date("2026-10-12T12:00:00Z");
const hold = { id: "h", teacher_id: "t", student_id: "s", pending_order_id: "o", status: "active", expires_at: "2026-10-12T12:15:00Z", starts_at: "2026-10-13T13:00:00Z", ends_at: "2026-10-13T14:00:00Z" };

test("repeated public calendar reads never mutate orders, holds or bookings", async () => {
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "true";
  const tables = {
    teachers: [{ id: "t", timezone: "America/Toronto", availability: ["Mar Matin"], default_lesson_duration_minutes: 60 }],
    planned_package_session_holds: [hold],
    planned_package_pending_orders: [{ id: "o", status: "pending_payment", hold_expires_at: hold.expires_at }],
  };
  const before = JSON.stringify(tables);
  const mock = database(tables, true);
  for (let i = 0; i < 3; i++) {
    assert.equal((await listActiveHoldsForTeacherDay({ admin: mock.client, teacherId: "t", slotDate: "2026-10-13", now })).length, 1);
    assert.equal(await hasActivePlannedPackageHoldConflict({ admin: mock.client, teacherId: "t", startsAt: hold.starts_at, endsAt: hold.ends_at, now }), true);
    await computeAvailableDaysForTeacher(mock.client, "t", 4);
    const preview = await computeTeacherAvailabilityPreview(mock.client, "t", { startDate: "2026-10-13", days: 7, durationMinutes: 60, now });
    assert.equal("error" in preview, false);
  }
  assert.equal(mock.writes(), 0);
  assert.equal(JSON.stringify(tables), before);
  for (const route of ["slots", "available-days"]) {
    const source = readFileSync(`app/api/teachers/[id]/${route}/route.ts`, "utf8");
    assert.doesNotMatch(source, /\.update\(|\.insert\(|\.delete\(|expireStale/);
  }
});

test("expiry is idempotent and cannot expire valid or already confirmed concurrent claims", async () => {
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "true";
  const tables = {
    planned_package_pending_orders: [
      { id: "old", status: "pending_payment", hold_expires_at: now.toISOString() },
      { id: "valid", status: "pending_payment", hold_expires_at: hold.expires_at },
      { id: "confirmed", status: "payment_confirmed", hold_expires_at: now.toISOString() },
    ],
    planned_package_session_holds: [
      { ...hold, pending_order_id: "old", expires_at: now.toISOString() },
      { ...hold, pending_order_id: "valid" },
      { ...hold, pending_order_id: "confirmed", expires_at: now.toISOString() },
    ],
  };
  const mock = database(tables, false);
  await Promise.all([expireStalePlannedPackageHolds(mock.client, now), expireStalePlannedPackageHolds(mock.client, now)]);
  assert.deepEqual(tables.planned_package_pending_orders.map(r => r.status), ["expired", "pending_payment", "payment_confirmed"]);
  assert.deepEqual(tables.planned_package_session_holds.map(r => r.status), ["expired", "active", "active"]);
  assert.equal(mock.writes(), 2);
});
