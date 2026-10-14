import assert from "node:assert/strict";
import { POST } from "@/app/api/learner-demand/route";

async function main() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-key";
  process.env.VERCEL_ENV = "preview";
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalFetch = globalThis.fetch;
  const writes: Record<string, unknown>[] = [];
  const rows = new Map<string, Record<string, unknown>>();
  let failRead = false;
  let failWrite = false;
  globalThis.fetch = (async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, "supabase.test.invalid", "no real network or messages");
    if (url.pathname.endsWith("/teachers_public")) {
      return new Response(JSON.stringify(failRead ? { code: "test_failure" } : []), { status: failRead ? 503 : 200 });
    }
    assert.ok(url.pathname.endsWith("/learner_demand_leads"));
    assert.equal(init?.method, "POST");
    assert.equal(url.searchParams.get("on_conflict"), "email_normalized,subject_normalized,city_normalized,accepts_online,requested_format");
    const row = JSON.parse(String(init?.body)) as Record<string, unknown>;
    writes.push(row);
    if (failWrite) return new Response(JSON.stringify({ code: "test_failure" }), { status: 503 });
    const key = [row.email_normalized, row.subject_normalized, row.city_normalized, row.accepts_online, row.requested_format].join("|");
    rows.set(key, row);
    return new Response(JSON.stringify({ status: row.status }), { status: 200 });
  }) as typeof fetch;
  const base = { subject: "Français", city: "Saint-Georges", acceptsOnline: false, requestedFormat: "in_person" };
  const submit = (payload: object) => POST(new Request("https://app.test/api/learner-demand", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }));
  try {
    const search = await submit({ ...base, intent: "search" });
    assert.equal(search.status, 200);
    assert.equal((await search.json()).saved, false);
    assert.equal(writes.length, 0, "search never persists a lead");
    assert.equal((await submit({ ...base, email: "adult@example.test" })).status, 400);
    const payload = { ...base, email: "ADULT@example.test", alertConsent: true, adultContactConfirmed: true };
    for (let i = 0; i < 2; i++) {
      const response = await submit(payload);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.saved, true);
      assert.equal(body.outcome, "waitlist");
      assert.doesNotMatch(JSON.stringify(body), /adult@example|email|alert_consent|marketing_consent/i);
    }
    assert.equal(rows.size, 1);
    assert.equal(writes[0].marketing_consent, false);
    assert.equal(writes[0].discipline_id, "francais");
    assert.equal(writes[0].city, base.city);
    assert.equal(writes[0].requested_format, "in_person");
    await submit({ ...payload, requestedFormat: "online" });
    assert.equal(rows.size, 2, "online cannot overwrite the local need");
    failRead = true;
    assert.equal((await submit({ ...base, intent: "search" })).status, 503);
    failRead = false; failWrite = true;
    assert.equal((await submit(payload)).status, 503, "never report success before persistence");
    console.log("PASS learner-demand API: read-only search, explicit adult/alert consent, normalized format-aware upsert, private response, data errors");
  } finally { globalThis.fetch = originalFetch; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
