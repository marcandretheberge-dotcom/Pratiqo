import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Teacher } from "@/types";
import { loadLearnerDemandSupply } from "@/lib/learnerDemandSupply";
import { matchLearnerDemand } from "@/lib/learnerDemand";

async function main() {
  process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS = "false";
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "false";
  process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "false";
  const common = { user_id: "owner", price_per_lesson: 45, timezone: "America/Toronto",
    availability: ["Lun Matin"], default_lesson_duration_minutes: 60, schedule_mode: "legacy_blocks",
    stripe_account_id: "acct_test", stripe_connect_onboarding_complete: true, stripe_connect_charges_enabled: true,
    stripe_connect_payouts_enabled: true, stripe_connect_requirements_due: [], stripe_connect_disabled_reason: null };
  const data: Record<string, unknown[]> = {
    teachers: [{ ...common, id: "paid" }, { ...common, id: "deferred", stripe_account_id: null },
      { ...common, id: "full", availability: [] }],
    teacher_disciplines: ["paid", "deferred", "full"].map(id => ({ teacher_id: id, discipline_id: "langues", specialite: "Français" })),
  };
  let zoneError: string | null = "42P01";
  const client = { from(table: string) {
    const query = {
      select() { return query; }, in() { return query; }, eq() { return query; }, order() { return query; },
      gt() { return query; }, lt() { return query; }, gte() { return query; }, lte() { return query; },
      then(resolve: (value: unknown) => unknown) {
        const rows = data[table] ?? [];
        return Promise.resolve(resolve({ data: rows, count: rows.length,
          error: table === "teacher_teaching_zones_public" && zoneError ? { code: zoneError } : null }));
      },
    };
    return query;
  } } as unknown as SupabaseClient;
  const publicTeachers = ["paid", "deferred", "full"].map(id => ({ id, name: "Fixture", discipline: "Langues",
    category: "Langues", city: "Saint-Georges", teachingMode: "both", pricePerLesson: 45,
    availability: [], languages: [], levels: [], imageUrl: "", bio: "", rating: 0, reviews: 0, distance: 0, isVerified: false,
    location: { lat: 46, lng: -70 } } as Teacher));
  const supply = await loadLearnerDemandSupply(client, publicTeachers);
  assert.deepEqual(supply.map(t => [t.id, t.bookingAction, t.bookingReady]),
    [["paid", "book", true], ["deferred", "request", false], ["full", "contact", false]]);
  const need = { subject: "francais", city: "Saint-Georges", acceptsOnline: false };
  assert.equal(matchLearnerDemand(supply, need).matchCount, 2);
  assert.equal(matchLearnerDemand(supply, need).primaryTeacherId, "paid");
  const evenings = await loadLearnerDemandSupply(client, publicTeachers, "weekday_evening");
  assert.equal(matchLearnerDemand(evenings, need).outcome, "waitlist");
  zoneError = "XX000";
  await assert.rejects(loadLearnerDemandSupply(client, publicTeachers), /teacher_teaching_zones_unavailable/);
  console.log("PASS shared server supply: paid/request/contact, exact historical specialty, preference, missing-view fallback and real failure");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
