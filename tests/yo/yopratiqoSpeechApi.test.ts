import assert from "node:assert/strict";
import { createSpeechTurnHandler, type SpeechServices } from "../../lib/yo/speech/server";
import { SPEECH_CONSENT_VERSION } from "../../lib/yo/speech/contract";

async function main() {
  const body = { requestId: "00000000-0000-4000-8000-000000000001", language: "ja", locale: "fr", scenarioId: "hotel", consent: SPEECH_CONSENT_VERSION, rememberCorrections: false, audio: Buffer.alloc(4_800, 7).toString("base64"), history: [] };
  const request = (value = body, origin = "https://pratiqo.test") => new Request("https://pratiqo.test/api/yo/speech/turn", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(value) });
  let reserved = 0, called = 0;
  const finished: unknown[][] = [];
  const base: SpeechServices = { enabled: () => true, configured: () => true, authenticate: async () => "verified-owner",
    reserve: async (owner) => { assert.equal(owner, "verified-owner"); reserved++; return "reserved"; },
    finish: async (...args) => { finished.push(args); return "finished"; },
    run: async () => { called++; return { transcript: "Bonjour", reply: "Salut", audio: "AQABAA==", feedback: null, usageMicroUsd: 10_000 }; },
  };
  assert.equal((await createSpeechTurnHandler({ ...base, enabled: () => false })(request())).status, 404);
  assert.equal((await createSpeechTurnHandler({ ...base, configured: () => false })(request())).status, 503);
  assert.equal((await createSpeechTurnHandler({ ...base, authenticate: async () => null })(request())).status, 401);
  assert.equal((await createSpeechTurnHandler(base)(request(body, "https://attacker.test"))).status, 403);
  assert.equal((await createSpeechTurnHandler(base)(request({ ...body, consent: "no-consent" }))).status, 400);
  assert.equal((await createSpeechTurnHandler(base)(request({ ...body, audio: Buffer.alloc(4_800).toString("base64") }))).status, 400);
  assert.equal((await createSpeechTurnHandler(base)(request({ ...body, audio: Buffer.alloc(720_002).toString("base64") }))).status, 400);
  assert.equal(reserved, 0); assert.equal(called, 0);
  const valid = await createSpeechTurnHandler(base)(request());
  assert.equal(valid.status, 200); assert.equal(valid.headers.get("cache-control"), "private, no-store");
  assert.equal(reserved, 1); assert.equal(called, 1);
  assert.equal(finished[0][0], "verified-owner"); assert.equal(finished[0][2], true); assert.equal(finished[0][4], null);
  for (const code of ["duplicate", "busy", "rate_limit", "trial_complete", "pilot_complete", "unavailable"]) {
    const response = await createSpeechTurnHandler({ ...base, reserve: async () => code })(request());
    assert.equal((await response.json()).error, code);
  }
  assert.equal(called, 1, "a duplicate or unavailable reservation never reaches OpenAI");
  const failed = await createSpeechTurnHandler({ ...base, run: async () => { throw new Error("provider_timeout"); } })(request());
  assert.equal(failed.status, 503); assert.equal(finished.at(-1)?.[2], false); assert.equal(finished.at(-1)?.[3], null);
  const overBudget = await createSpeechTurnHandler({ ...base, run: async () => ({ transcript: "", reply: "", audio: "", feedback: null, usageMicroUsd: 200_001 }) })(request());
  assert.equal(overBudget.status, 503); assert.equal(finished.at(-1)?.[5], true, "unexpected usage trips the database circuit breaker");
  const unavailableDb = await createSpeechTurnHandler({ ...base, reserve: async () => { throw new Error("db_down"); } })(request());
  assert.equal(unavailableDb.status, 503); assert.equal(called, 1);
  const notSaved = await createSpeechTurnHandler({ ...base, finish: async () => { throw new Error("finish_failed"); } })(request());
  assert.equal(notSaved.status, 503, "never report a saved review or successful accounting when its transaction failed");
  console.log("Speech API: configured/authenticated/consented gating, same origin, bounded nonsilent PCM, DB fail-closed reservation, replay, no-refund failures and usage circuit breaker passed");
}
void main();
