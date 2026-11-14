import assert from "node:assert/strict";
import { createCafeCommunityTransport } from "../../lib/cafe/communityClient";
import { CAFE_LANGUAGE_CODES, cafeLanguageLabel, cafeLanguageOptions, canonicalCafeLanguage, cafeScheduledIso } from "../../lib/cafe/communityLanguages";

void (async () => {
  assert.equal(new Set(CAFE_LANGUAGE_CODES).size, 184);
  const originalDisplayNames = Intl.DisplayNames;
  try {
    // Chromium may ship smaller ICU locale data than the server runtime.
    Object.defineProperty(Intl, "DisplayNames", { configurable: true, writable: true, value: class { of() { return undefined; } } });
    for (const locale of ["fr", "en", "es"]) {
      assert.ok(CAFE_LANGUAGE_CODES.every((code) => cafeLanguageLabel(code, locale) !== code));
    }
    assert.equal(cafeLanguageLabel("aa", "en"), "Afar");
    assert.equal(cafeLanguageLabel("ab", "en"), "Abkhazian");
  } finally { Object.defineProperty(Intl, "DisplayNames", { configurable: true, writable: true, value: originalDisplayNames }); }
  assert.ok(cafeLanguageOptions("en").some((language) => language.code === "hi" && language.label === "Hindi"));
  assert.equal(canonicalCafeLanguage("espagnol"), "es"); assert.equal(canonicalCafeLanguage("PT-br"), "pt-br"); assert.equal(canonicalCafeLanguage("yue"), "yue"); assert.equal(canonicalCafeLanguage("not a language"), null);
  const originalZone = process.env.TZ; process.env.TZ = "America/Toronto";
  try {
    assert.equal(cafeScheduledIso("2026-12-01T18:30", Date.parse("2026-11-13T00:00:00Z")), "2026-12-01T23:30:00.000Z");
    assert.equal(cafeScheduledIso("2026-12-01T18:30", Date.parse("2026-12-02T00:00:00Z")), null);
    assert.equal(cafeScheduledIso("2027-03-14T02:30", Date.parse("2027-03-01T00:00:00Z")), null);
    assert.equal(cafeScheduledIso("2027-08-14T02:30", Date.parse("2027-03-01T00:00:00Z")), null);
  } finally { if (originalZone === undefined) delete process.env.TZ; else process.env.TZ = originalZone; }
  let seen: { url: string; init?: RequestInit } | null = null;
  const malformed = createCafeCommunityTransport(async (url, init) => { seen = { url: String(url), init }; return new Response("null", { status: 200 }); });
  assert.deepEqual(await malformed.snapshot("private-token", "test-room"), { ok: false, code: "unavailable" });
  const request = seen as { url:string;init?:RequestInit } | null;
  assert.equal(request?.url, "/api/cafe/community?roomId=test-room"); assert.equal(request?.init?.cache, "no-store"); assert.equal((request?.init?.headers as Record<string,string>).Authorization, "Bearer private-token"); assert.ok(!request?.url.includes("private-token"));
  const denied = createCafeCommunityTransport(async () => new Response(JSON.stringify({ ok: false, code: "room_access_denied", token: "do-not-return" }), { status: 403 }));
  assert.deepEqual(await denied.snapshot("token", null), { ok: false, code: "room_access_denied" });
  const abort = new AbortController(); abort.abort(); let signal: AbortSignal | null | undefined;
  const captured = createCafeCommunityTransport(async (_url, init) => { signal = init?.signal; return new Response('{"ok":true,"callId":"abc","secret":"hidden"}', { status:200 }); });
  assert.deepEqual(await captured.command("token", { action: "call.end", callId: "abc" }, abort.signal), { ok:true, callId:"abc" }); assert.equal(signal?.aborted, true);
  console.log("communityClient: language coverage, time-zone/DST dates, private transport and safe response projection passed");
})().catch((error) => { console.error(error); process.exitCode = 1; });
