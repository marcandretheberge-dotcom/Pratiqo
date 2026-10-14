import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";

const adminUrl = process.env.LEARNER_LOCAL_PG_URL;
if (!adminUrl) throw Error("LEARNER_LOCAL_PG_URL required (disposable local PostgreSQL)");
const url = new URL(adminUrl);
assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
assert.equal(url.port, "55439");
assert.equal(url.pathname, "/postgres");
const database = `pratiqo_booking_test_${process.pid}`;
const target = new URL(url); target.pathname = `/${database}`;
const run = promisify(execFile);
async function sql(query: string, connection = target.toString()) {
  const { stdout } = await run(process.env.PSQL_PATH ?? "psql", [connection, "-X", "-qAt", "-w", "-v", "ON_ERROR_STOP=1", "-c", query]);
  return stdout.trim();
}
const insert = (time: string, status = "pending_payment", teacher = "teacher") =>
  `INSERT INTO bookings(teacher_id,slot_date,time_slot,duration_minutes,status) VALUES ('${teacher}','2026-11-02','${time}',60,'${status}')`;
async function main() {
  await sql(`CREATE DATABASE ${database}`, adminUrl);
  try {
    await sql("CREATE TABLE bookings(id bigserial PRIMARY KEY, teacher_id text NOT NULL, slot_date date, time_slot text, duration_minutes integer, status text NOT NULL)");
    await sql(readFileSync("supabase/migrations/130_booking_interval_exclusion.sql", "utf8"));
    const outcomes = await Promise.allSettled([sql(insert("9h00")), sql(insert("9:30"))]);
    assert.equal(outcomes.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(await sql("SELECT count(*) FROM bookings"), "1");
    await sql("TRUNCATE bookings");
    await sql(insert("9h00", "confirmed"));
    await sql(insert("10h00")); // Half-open endpoints allow an adjacent lesson.
    await sql(insert("9h30", "cancelled"));
    await assert.rejects(sql("UPDATE bookings SET status='confirmed' WHERE status='cancelled'"));
    await sql(insert("9h30", "confirmed", "other"));
    await assert.rejects(sql(insert("25h00")));
    await assert.rejects(sql(insert("9h60")));
    await sql("UPDATE bookings SET status='cancelled' WHERE time_slot='9h00'");
    await sql(insert("9h00"));
    const duplicate = await Promise.allSettled([sql(insert("12h00")), sql(insert("12:00"))]);
    assert.equal(duplicate.filter(r => r.status === "fulfilled").length, 1);
    // Existing conflicts stop migration rather than deleting or rewriting data.
    await sql("ALTER TABLE bookings DROP CONSTRAINT booking_no_overlapping_active_interval");
    await sql(insert("12h30"));
    await assert.rejects(sql(`ALTER TABLE bookings ADD CONSTRAINT booking_no_overlapping_active_interval
      EXCLUDE USING gist (teacher_id WITH =, (public.booking_wall_interval(slot_date,time_slot,coalesce(duration_minutes,60))) WITH &&)
      WHERE (status IN ('pending_payment','confirmed'))`));
    console.log("PASS actual migration 130: concurrent overlaps, duplicate labels, adjacent slots, teachers, status updates, invalid times, preflight safety");
  } finally { await sql(`DROP DATABASE ${database}`, adminUrl); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "booking_test_failed"); process.exitCode = 1; });
