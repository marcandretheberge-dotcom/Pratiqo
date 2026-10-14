import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateBookingSubmission } from "@/lib/bookings/validateBookingSubmission";
import type { ParsedCreateBookingRequest } from "@/lib/bookings/parseCreateBookingRequest";

async function main() {
  process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS = "false";
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "false";
  process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "false";
  const id = "11111111-1111-4111-8111-111111111111";
  const teacher = { id, user_id: id, price_per_lesson: 45, teaching_mode: "both", timezone: "America/Toronto", availability: ["Lun Matin"], schedule_mode: "legacy_blocks" };
  const rows: Record<string, unknown[]> = { teachers_public: [teacher], teachers: [teacher] };
  let failure = "";
  const admin = { from(table: string) {
    const filters: [string, unknown][] = [];
    const result = () => ({ data: (rows[table] ?? []).filter(row => filters.every(([key, value]) => (row as Record<string, unknown>)[key] === value)), error: table === failure ? { code: "XX000" } : null });
    const q = { select() { return q; }, eq(key: string, value: unknown) { filters.push([key, value]); return q; },
      in() { return q; }, not() { return q; }, gte() { return q; }, lte() { return q; },
      maybeSingle() { const r = result(); return Promise.resolve({ ...r, data: r.data[0] ?? null }); },
      then(resolve: (value: unknown) => unknown) { return Promise.resolve(resolve(result())); } };
    return q;
  } } as unknown as SupabaseClient;
  const request: ParsedCreateBookingRequest = { teacherId: id, date: "2026-11-02", slotDate: "2026-11-02", time: "9h00", timeSlot: "9h00",
    price: 45, durationMinutes: 60, teachingMode: "person", lessonType: "regular", studentLevel: null, studentAddress: null, learnerProfileId: null, teacherOfferId: null };
  const check = (patch: Partial<ParsedCreateBookingRequest> = {}) => validateBookingSubmission(admin, id, { ...request, ...patch }, new Date("2026-10-28T12:00:00Z"));
  assert.equal((await check()).ok, true); // No Stripe flag required to validate a deferred request.
  process.env.NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION = "true";
  rows.teacher_offers = [{ id, teacher_id: id, title: "Lesson", status: "published", published_at: "2026-10-01",
    offer_type: "private_lesson", format: "in_person", price_cents: 6000, currency: "CAD", duration_minutes: 45 }];
  for (const flag of ["false", "true"]) {
    process.env.ENABLE_OFFER_SNAPSHOT_CHECKOUT = flag;
    assert.equal((await check({ teacherOfferId: id })).ok, true, "legacy modal payload remains compatible with authoritative offer snapshots");
  }
  assert.equal((await check({ teacherOfferId: id, teachingMode: "online" })).ok, false);
  process.env.NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION = "false";
  assert.equal((await check({ teacherOfferId: id })).ok, false);
  assert.deepEqual(await check({ price: 1 }), { ok: false, status: 409, error: "price_changed" });
  assert.equal((await check({ timeSlot: "23h00" })).ok, false);
  assert.equal((await check({ learnerProfileId: id })).ok, false);
  rows.bookings = [{ teacher_id: id, slot_date: request.slotDate, time_slot: "9h30", duration_minutes: 60 }];
  assert.equal((await check()).ok, false);
  rows.bookings = [];
  teacher.teaching_mode = "online";
  assert.equal((await check()).ok, false);
  assert.equal((await check({ teachingMode: "online" })).ok, true);
  rows.teachers_public = [];
  assert.deepEqual(await check(), { ok: false, status: 404, error: "invalid_teacher" });
  failure = "teachers_public";
  assert.deepEqual(await check(), { ok: false, status: 503, error: "server_error" });
  console.log("PASS submission preflight: public eligibility, format, real slot, overlapping duration, current price, learner ownership, data failure, deferred path");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
