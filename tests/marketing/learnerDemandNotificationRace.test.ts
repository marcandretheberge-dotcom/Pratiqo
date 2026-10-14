import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { processLearnerDemandMatches } from "@/lib/learnerDemandNotifications";

async function main() {
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "false";
  process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "false";
  process.env.ENABLE_TEACHER_SCHEDULE_EXCEPTIONS = "false";
  process.env.RESEND_API_KEY = "re_mock_only";
  const id = "11111111-1111-4111-8111-111111111111";
  const teacher = { id, user_id: id, name: "Fixture", discipline: "Piano", category: "Musique", city: "Quebec", teaching_mode: "both",
    availability: ["Lun Matin"], price_per_lesson: 45, timezone: "America/Toronto", schedule_mode: "legacy_blocks",
    default_lesson_duration_minutes: 60, stripe_account_id: "acct_mock", stripe_connect_onboarding_complete: true,
    stripe_connect_charges_enabled: true, stripe_connect_payouts_enabled: true, stripe_connect_requirements_due: [], location: {}, languages: [], levels: [] };
  const lead: Record<string, unknown> = { id, email: "fixture@example.test", subject: "piano", city: "Quebec", accepts_online: false,
    requested_format: "in_person", local_waitlist: false, locale: "fr", availability_preference: "any", status: "open", alert_consent_at: "2026-01-01", adult_contact_confirmed: true };
  let withdraw = false;
  const admin = { from(table: string) {
    const filters: ((row: Record<string, unknown>) => boolean)[] = [];
    let patch: Record<string, unknown> | undefined;
    function execute(single: boolean) {
      if (withdraw && table === "learner_demand_leads" && !patch && single && lead.status === "matched") lead.status = "closed";
      const rows: Record<string, unknown>[] = table === "learner_demand_leads" ? [lead] : ["teachers", "teachers_public"].includes(table) ? [teacher] : [];
      const found = rows.filter(row => filters.every(f => f(row)));
      if (patch) found.forEach(row => Object.assign(row, patch));
      return { data: single ? found[0] ? { ...found[0] } : null : found.map(row => ({ ...row })), count: found.length, error: null };
    }
    const q = { select() { return q; }, update(value: Record<string, unknown>) { patch = value; return q; },
      eq(key: string, value: unknown) { filters.push(row => row[key] === value); return q; },
      not(key: string) { filters.push(row => row[key] != null); return q; },
      in() { return q; }, gt() { return q; }, gte() { return q; }, lte() { return q; }, lt() { return q; }, order() { return q; }, limit() { return q; },
      maybeSingle() { return Promise.resolve(execute(true)); },
      then(resolve: (value: unknown) => unknown) { return Promise.resolve(resolve(execute(false))); } };
    return q;
  } } as unknown as SupabaseClient;
  const original = globalThis.fetch;
  let sends = 0; let reject = false;
  globalThis.fetch = async () => { sends++; return new Response(JSON.stringify(reject ? { name: "validation_error", message: "mock" } : { id: "mock" }),
    { status: reject ? 422 : 200, headers: { "content-type": "application/json" } }); };
  try {
    await Promise.all([processLearnerDemandMatches(admin), processLearnerDemandMatches(admin)]);
    assert.equal(sends, 1); assert.equal(lead.status, "notified");
    lead.status = "open"; withdraw = true;
    await processLearnerDemandMatches(admin);
    assert.equal(sends, 1); assert.equal(lead.status, "closed");
    lead.status = "open"; withdraw = false; reject = true;
    await processLearnerDemandMatches(admin); await processLearnerDemandMatches(admin);
    assert.equal(sends, 2); assert.equal(lead.status, "matched");
    console.log("PASS notification race: competing claims send once, withdrawal before handoff stops send, failed/ambiguous send is not automatically retried");
  } finally { globalThis.fetch = original; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
