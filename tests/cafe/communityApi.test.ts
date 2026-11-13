import assert from "node:assert/strict";
import test from "node:test";
import {
  createCafeCommunityHandlers,
  type CafeCommunityServerDependencies,
} from "../../lib/cafe/communityServer";
import {
  communityTimestamp,
  parseCommunityCommand,
  readCommunityJson,
} from "../../lib/cafe/communityValidation";

const ACTOR = "91000000-0000-4000-8000-000000000001";
const PEER = "91000000-0000-4000-8000-000000000002";
const OUTSIDER = "91000000-0000-4000-8000-000000000003";
const ROOM = "92000000-0000-4000-8000-000000000001";
const OTHER_ROOM = "92000000-0000-4000-8000-000000000002";
const CALL = "93000000-0000-4000-8000-000000000001";
const MESSAGE = "94000000-0000-4000-8000-000000000001";
const REPORT = "95000000-0000-4000-8000-000000000001";
const REQUEST_ID = "96000000-0000-4000-8000-000000000001";
const NOW = "2026-11-13T16:00:00.000Z";
const LATER = "2026-11-13T16:30:00.000Z";
const URL_BASE = "https://pratiqo.example/api/cafe/community";

function member(id = ACTOR) {
  return { id, displayName: id === ACTOR ? "Alex" : "Nour", nativeLanguages: ["ar"], learningLanguages: ["ja", "it"] };
}

function room() {
  return {
    id: ROOM, title: "Around the world", languages: ["ar", "ja", "it"], creator: member(),
    mode: "now", state: "live", startsAt: null, capacity: 8,
    participants: [member(), member(PEER)], rsvpCount: 0, myRsvp: false,
  };
}

function snapshot() {
  return {
    ok: true, me: member(), people: [{ ...member(PEER), online: true, roomId: ROOM }], rooms: [room()],
    room: { ...room(), messages: [{ id: MESSAGE, roomId: ROOM, sender: member(PEER), body: "Bonjour !", createdAt: NOW }] },
    calls: [{ id: CALL, roomId: ROOM, from: member(), to: member(PEER), status: "pending", createdAt: NOW, expiresAt: LATER, endsAt: null }],
    blockedMembers: [], serverTime: NOW,
  };
}

function request(body?: unknown, options: { method?: string; origin?: string | null; path?: string } = {}) {
  return new Request(`${URL_BASE}${options.path ?? ""}`, {
    method: options.method ?? (body === undefined ? "GET" : "POST"),
    headers: {
      Authorization: "Bearer browser-session-token",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.origin === null ? {} : { Origin: options.origin ?? "https://pratiqo.example" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function harness(overrides: Partial<CafeCommunityServerDependencies> = {}) {
  const seen = {
    auth: 0,
    rpc: [] as Array<{ name: string; args: Record<string, unknown> }>,
    limits: [] as Array<{ actorId: string; operation: string }>,
    joins: [] as Array<{ actorId: string; callId: string }>,
    cleanup: [] as Array<{ actorId: string; callIds?: string[] }>,
    logs: [] as Array<{ operation: string; code?: string }>,
  };
  const deps: CafeCommunityServerDependencies = {
    enabled: () => true,
    videoEnabled: () => true,
    now: () => Date.parse(NOW),
    authenticate: async () => {
      seen.auth += 1;
      return { ok: true, id: ACTOR, email: "private@example.invalid" };
    },
    rpc: async (name, args) => {
      seen.rpc.push({ name, args });
      return { data: { ok: true }, error: null };
    },
    limit: async (_req, actorId, operation) => {
      seen.limits.push({ actorId, operation });
      return null;
    },
    joinCall: async input => {
      seen.joins.push(input);
      return { ok: true, roomUrl: "https://pratiqo.daily.co/community-call", token: "private-daily-token", expiresAt: LATER, endsAt: LATER };
    },
    cleanupCalls: async input => {
      seen.cleanup.push(input);
      return { pending: false };
    },
    onError: (operation, code) => { seen.logs.push({ operation, code }); },
    ...overrides,
  };
  return { handlers: createCafeCommunityHandlers(deps), seen };
}

async function body(response: Response, status = 200) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store, max-age=0");
  assert.equal(response.headers.get("Pragma"), "no-cache");
  assert.equal(response.headers.get("Vary"), "Authorization, Cookie");
  return await response.json() as Record<string, unknown>;
}

test("disabled community and video endpoints reveal no auth, provider or database behavior", async () => {
  const off = harness({ enabled: () => false });
  assert.deepEqual(await body(await off.handlers.snapshot(request()), 404), { ok: false, code: "not_found" });
  assert.deepEqual(await body(await off.handlers.command(request({ action: "member.block", targetId: PEER })), 404), { ok: false, code: "not_found" });
  assert.deepEqual(await body(await off.handlers.callJoin(request(undefined, { method: "POST" }), CALL), 404), { ok: false, code: "not_found" });
  assert.equal(off.seen.auth, 0);
  assert.equal(off.seen.rpc.length, 0);
  assert.equal(off.seen.joins.length, 0);

  const videoOff = harness({ videoEnabled: () => false });
  await body(await videoOff.handlers.callJoin(request(undefined, { method: "POST" }), CALL), 404);
  assert.equal(videoOff.seen.auth, 0);
  assert.equal(videoOff.seen.joins.length, 0);
  assert.deepEqual(await body(await videoOff.handlers.callStatus(request(), CALL), 409), { ok: false, code: "call_unavailable" });
  assert.equal(videoOff.seen.auth, 1);
  await body(await videoOff.handlers.command(request({ action: "call.invite", roomId: ROOM, targetId: PEER, requestId: REQUEST_ID })), 404);
  await body(await videoOff.handlers.command(request({ action: "call.respond", callId: CALL, accept: true })), 404);
  assert.equal(videoOff.seen.rpc.length, 0);

  // Turning off new calls must never disable decline, end or personal blocking.
  await body(await videoOff.handlers.command(request({ action: "call.respond", callId: CALL, accept: false })));
  await body(await videoOff.handlers.command(request({ action: "call.end", callId: CALL })));
  await body(await videoOff.handlers.command(request({ action: "member.block", targetId: PEER })));
  assert.equal(videoOff.seen.rpc.length, 3);
  assert.equal(videoOff.seen.cleanup.length, 2);
});

test("all entry points authenticate a permanent account and keep failures private", async () => {
  const denied = harness({ authenticate: async () => ({ ok: false, status: 401, error: "unauthorized" }) });
  const responses = [
    denied.handlers.snapshot(request()),
    denied.handlers.command(request({ action: "room.join", roomId: ROOM })),
    denied.handlers.callStatus(request(), CALL),
    denied.handlers.callJoin(request(undefined, { method: "POST" }), CALL),
    denied.handlers.reports(request()),
    denied.handlers.reviewReport(request({ action: "review", reportId: REPORT })),
  ];
  for (const response of responses) assert.deepEqual(await body(await response, 401), { ok: false, code: "unauthorized" });
  assert.equal(denied.seen.rpc.length, 0);
  assert.equal(denied.seen.joins.length, 0);

  const anonymous = harness({ authenticate: async () => ({ ok: false, status: 401, error: "permanent_account_required" }) });
  assert.equal((await body(await anonymous.handlers.snapshot(request()), 401)).code, "permanent_account_required");
});

test("mutations reject cross-origin requests and accept same-origin or Bearer CLI requests", async () => {
  const h = harness();
  const mutation = { action: "room.join", roomId: ROOM };
  for (const origin of ["https://attacker.example", "null", "https://pratiqo.example/", "https://pratiqo.example.evil.invalid"]) {
    assert.equal((await body(await h.handlers.command(request(mutation, { origin })), 403)).code, "origin_not_allowed");
  }
  assert.equal(h.seen.auth, 0);
  assert.equal(h.seen.rpc.length, 0);
  await body(await h.handlers.command(request(mutation)));
  await body(await h.handlers.command(request(mutation, { origin: null })));
  assert.equal(h.seen.rpc.length, 2);
});

test("verified actor identity is the only RPC actor; private and unknown input fields are stripped", async () => {
  const h = harness();
  const response = await h.handlers.command(request({
    action: "profile.save", actorId: OUTSIDER, p_actor_id: OUTSIDER, role: "admin", providerRoomId: "forged",
    displayName: "  Alex  ", nativeLanguages: ["AR", "cmn", "ar"], learningLanguages: ["ja", "IT", "pt-BR"],
    adultAgreement: true, rulesAgreement: true,
  }));
  assert.deepEqual(await body(response), { ok: true });
  assert.deepEqual(h.seen.rpc, [{
    name: "cafe_community_command_server",
    args: {
      p_actor_id: ACTOR, p_action: "profile.save", p_payload: {
        displayName: "Alex", nativeLanguages: ["ar", "cmn"], learningLanguages: ["ja", "it", "pt-br"],
        adultAgreement: true, rulesAgreement: true,
      },
    },
  }]);
  assert.deepEqual(h.seen.limits, [{ actorId: ACTOR, operation: "profile.save" }]);
});

test("profile, scheduling, language, size, capacity and action validation fail before RPC access", async () => {
  const h = harness();
  const profile = { action: "profile.save", displayName: "Alex", nativeLanguages: ["ar"], learningLanguages: ["ja"], adultAgreement: true, rulesAgreement: true };
  const create = { action: "room.create", requestId: REQUEST_ID, title: "A chat", languages: ["ja"], mode: "scheduled", startsAt: LATER, capacity: 8 };
  const invalid = [
    { ...profile, adultAgreement: false }, { ...profile, rulesAgreement: "true" },
    { ...profile, displayName: "x".repeat(41) }, { ...profile, displayName: "A\u0000B" },
    { ...profile, nativeLanguages: [] }, { ...profile, learningLanguages: ["ja;select"] },
    { ...profile, learningLanguages: Array.from({ length: 11 }, () => "ja") },
    { ...create, capacity: 9 }, { ...create, capacity: 2.5 }, { ...create, title: "x".repeat(121) },
    { ...create, startsAt: NOW }, { ...create, startsAt: "2027-02-30T12:00:00Z" },
    { ...create, startsAt: "2027-01-01T12:00" }, { ...create, startsAt: "2027-11-13T16:30:00Z" }, { ...create, mode: "now" },
    { action: "message.send", roomId: ROOM, requestId: REQUEST_ID, body: "x".repeat(2_001) },
    { action: "message.send", roomId: ROOM, requestId: REQUEST_ID, body: " \n " },
    { action: "member.block", targetId: ACTOR }, { action: "room.join", roomId: "not-a-uuid" },
    { action: "admin.ban", targetId: PEER },
  ];
  for (const command of invalid) assert.equal((await body(await h.handlers.command(request(command)), 400)).code, "invalid_request");
  assert.equal(h.seen.rpc.length, 0);
  const scheduled = parseCommunityCommand({ ...create, startsAt: "2026-11-13T13:30:00-03:00" }, Date.parse(NOW));
  assert.equal(scheduled?.action, "room.create");
  if (scheduled?.action === "room.create") assert.equal(scheduled.startsAt, LATER);
  assert.equal(communityTimestamp("2028-02-29T12:00:00Z"), "2028-02-29T12:00:00.000Z");
});

test("body limit counts streamed UTF-8 bytes even when Content-Length is absent or dishonest", async () => {
  const h = harness();
  for (const declared of [null, "1"]) {
    const encoded = new TextEncoder().encode(JSON.stringify({ action: "message.send", body: "🙂".repeat(5_000) }));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded.slice(0, 8_000));
        controller.enqueue(encoded.slice(8_000));
        controller.close();
      },
    });
    const input = new Request(URL_BASE, {
      method: "POST", headers: { "Content-Type": "application/json", ...(declared ? { "Content-Length": declared } : {}) },
      body: stream, duplex: "half",
    } as RequestInit & { duplex: string });
    assert.equal((await body(await h.handlers.command(input), 413)).code, "payload_too_large");
  }
  assert.equal(h.seen.rpc.length, 0);
  const invalidUtf8 = new Request(URL_BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: new Uint8Array([0xff]) });
  assert.deepEqual(await readCommunityJson(invalidUtf8), { ok: false, code: "invalid_request", status: 400 });
  const media = new Request(URL_BASE, { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" });
  assert.equal((await body(await h.handlers.command(media), 415)).code, "unsupported_media_type");
});

test("reports require bounded, room-scoped selected evidence and return no private cleanup metadata", async () => {
  const h = harness({ rpc: async (_name, args) => {
    assert.equal(args.p_actor_id, ACTOR);
    assert.deepEqual(args.p_payload, { targetId: PEER, roomId: ROOM, callId: null, reason: "sexual_harassment", messageIds: [MESSAGE], details: "Please review." });
    return { data: { ok: true, reportId: REPORT, cleanupCallIds: [CALL], providerToken: "hidden", reporterEmail: "hidden" }, error: null };
  } });
  const report = { action: "report.submit", targetId: PEER, roomId: ROOM, reason: "sexual_harassment", messageIds: [MESSAGE, MESSAGE], details: "Please review." };
  assert.deepEqual(await body(await h.handlers.command(request(report))), { ok: true, reportId: REPORT });
  assert.deepEqual(h.seen.cleanup, [{ actorId: ACTOR, callIds: [CALL] }]);
  for (const invalid of [{ ...report, roomId: null }, { ...report, messageIds: Array.from({ length: 11 }, () => MESSAGE) }, { ...report, reason: "dislike" }]) {
    await body(await h.handlers.command(request(invalid)), 400);
  }
});

test("a committed block remains successful if provider cleanup fails and teardown does not need the video flag", async () => {
  const h = harness({
    videoEnabled: () => false,
    rpc: async () => ({ data: { ok: true, cleanupCallIds: [CALL, CALL, "invalid"], secret: "hidden" }, error: null }),
    cleanupCalls: async input => {
      assert.deepEqual(input, { actorId: ACTOR, callIds: [CALL] });
      throw new Error("private-provider-error-with-token");
    },
  });
  assert.deepEqual(await body(await h.handlers.command(request({ action: "member.block", targetId: PEER }))), { ok: true, cleanupPending: true });
  assert.deepEqual(h.seen.logs, [{ operation: "cleanup", code: undefined }]);
});

test("heartbeat retries actor-owned cleanup without turning snapshot reads into mutations", async () => {
  const h = harness({ rpc: async name => ({ data: name.endsWith("snapshot_server") ? snapshot() : { ok: true }, error: null }) });
  await body(await h.handlers.snapshot(request(undefined, { path: `?roomId=${ROOM}` })));
  assert.equal(h.seen.cleanup.length, 0);
  await body(await h.handlers.command(request({ action: "presence.heartbeat", presenceSessionId: REQUEST_ID, roomId: ROOM })));
  assert.deepEqual(h.seen.cleanup, [{ actorId: ACTOR }]);
});

test("snapshot field whitelists remove nested account, provider and private metadata", async () => {
  const raw = snapshot();
  const tainted = {
    ...raw, email: "hidden", cleanupCallIds: [CALL], me: { ...raw.me, role: "admin", email: "hidden" },
    people: raw.people.map(person => ({ ...person, email: "hidden", accessToken: "hidden" })),
    rooms: raw.rooms.map(item => ({ ...item, providerRoomId: "hidden", creator: { ...item.creator, email: "hidden" } })),
    room: { ...raw.room, messages: raw.room.messages.map(message => ({ ...message, ip: "hidden", sender: { ...message.sender, email: "hidden" } })) },
    calls: raw.calls.map(call => ({ ...call, token: "hidden", from: { ...call.from, email: "hidden" }, to: { ...call.to, email: "hidden" } })),
  };
  let rpcCalls = 0;
  const h = harness({ rpc: async (name, args) => {
    rpcCalls += 1;
    assert.equal(name, "cafe_community_snapshot_server");
    assert.deepEqual(args, { p_actor_id: ACTOR, p_room_id: ROOM });
    return { data: tainted, error: null };
  } });
  assert.deepEqual(await body(await h.handlers.snapshot(request(undefined, { path: `?roomId=${ROOM}&actorId=${OUTSIDER}` }))), raw);
  assert.equal(rpcCalls, 1);
  assert.equal(h.seen.cleanup.length, 0);
  assert.equal(h.seen.joins.length, 0);
});

test("malformed or mismatched RPC projections never disclose another actor's room or invitation", async () => {
  const raw = snapshot();
  const invalid = [
    { ...raw, me: member(OUTSIDER) },
    { ...raw, me: null },
    { ...raw, room: { ...raw.room, id: OTHER_ROOM } },
    { ...raw, room: { ...raw.room, participants: [member(PEER)] } },
    { ...raw, room: { ...raw.room, messages: [{ ...raw.room.messages[0], roomId: OTHER_ROOM }] } },
    { ...raw, calls: [{ ...raw.calls[0], from: member(OUTSIDER), to: member(PEER) }] },
  ];
  for (const data of invalid) {
    const h = harness({ rpc: async () => ({ data, error: null }) });
    assert.deepEqual(await body(await h.handlers.snapshot(request(undefined, { path: `?roomId=${ROOM}` })), 503), { ok: false, code: "cafe_unavailable" });
  }
});

test("unsupported methods and OPTIONS also carry private no-store headers", async () => {
  const h = harness();
  const denied = h.handlers.methodResponse(request(undefined, { method: "DELETE" }), "GET, HEAD, POST, OPTIONS");
  assert.deepEqual(await body(denied, 405), { ok: false, code: "method_not_allowed" });
  assert.equal(denied.headers.get("Allow"), "GET, HEAD, POST, OPTIONS");
  const options = h.handlers.methodResponse(request(undefined, { method: "OPTIONS" }), "GET, HEAD, POST, OPTIONS");
  assert.equal(options.status, 204);
  assert.equal(options.headers.get("Cache-Control"), "private, no-store, max-age=0");
  assert.equal(await options.text(), "");
  const off = harness({ enabled: () => false });
  await body(off.handlers.methodResponse(request(undefined, { method: "OPTIONS" }), "GET, OPTIONS"), 404);
  assert.equal(h.seen.auth, 0);
});

test("membership and call denial codes map to actionable statuses without exposing RPC diagnostics", async () => {
  for (const [code, status] of [
    ["room_access_denied", 403], ["call_access_denied", 403], ["report_access_denied", 403],
    ["room_not_found", 404], ["report_not_found", 404], ["room_not_started", 409], ["call_busy", 409], ["invalid_action", 400],
  ] as const) {
    const h = harness({ rpc: async () => ({ data: { ok: false, code, details: "private", cleanupCallIds: [CALL] }, error: null }) });
    assert.deepEqual(await body(await h.handlers.snapshot(request()), status), { ok: false, code });
  }
  const h = harness({ rpc: async () => ({ data: { ok: false, code: "private SQL or provider error" }, error: null }) });
  assert.deepEqual(await body(await h.handlers.snapshot(request()), 503), { ok: false, code: "cafe_unavailable" });
});

test("call status never returns provider credentials or private call participants", async () => {
  const h = harness({ rpc: async (name, args) => {
    assert.equal(name, "cafe_community_authorize_call_server");
    assert.deepEqual(args, { p_actor_id: ACTOR, p_call_id: CALL });
    return { data: { ok: true, callId: CALL, roomId: ROOM, fromId: ACTOR, toId: PEER, displayName: "Alex", acceptedAt: NOW, endsAt: LATER, token: "hidden", roomUrl: "hidden" }, error: null };
  } });
  assert.deepEqual(await body(await h.handlers.callStatus(request(), CALL)), { ok: true, callId: CALL, roomId: ROOM, endsAt: LATER });
  assert.equal(h.seen.cleanup.length, 0);
  assert.equal(h.seen.joins.length, 0);
});

test("call join returns only short-lived Daily join credentials and rejects unexpected destinations", async () => {
  const h = harness();
  assert.deepEqual(await body(await h.handlers.callJoin(request(undefined, { method: "POST" }), CALL)), {
    ok: true, roomUrl: "https://pratiqo.daily.co/community-call", token: "private-daily-token", expiresAt: LATER, endsAt: LATER,
  });
  assert.deepEqual(h.seen.joins, [{ actorId: ACTOR, callId: CALL }]);
  for (const roomUrl of ["http://pratiqo.daily.co/call", "https://attacker.example/call", "https://pratiqo.daily.co.evil.invalid/call", "https://pratiqo.daily.co/call?token=private"]) {
    const invalid = harness({ joinCall: async () => ({ ok: true, roomUrl, token: "private-daily-token", expiresAt: LATER, endsAt: LATER }) });
    assert.deepEqual(await body(await invalid.handlers.callJoin(request(undefined, { method: "POST" }), CALL), 503), { ok: false, code: "cafe_unavailable" });
  }
});

test("rate limiting fails closed before reads, writes and token provisioning", async () => {
  for (const status of [429, 503] as const) {
    const h = harness({ limit: async () => ({ status, retryAfter: 45 }) });
    const responses = [
      await h.handlers.snapshot(request()),
      await h.handlers.command(request({ action: "message.send", roomId: ROOM, requestId: REQUEST_ID, body: "Hi" })),
      await h.handlers.callJoin(request(undefined, { method: "POST" }), CALL),
    ];
    for (const response of responses) {
      assert.equal(response.headers.get("Retry-After"), "45");
      assert.deepEqual(await body(response, status), { ok: false, code: status === 429 ? "rate_limited" : "cafe_unavailable", retryAfter: 45 });
    }
    assert.equal(h.seen.rpc.length, 0);
    assert.equal(h.seen.joins.length, 0);
  }
});

test("moderation uses verified actor RPC checks and strips unselected data from report responses", async () => {
  const denial = harness({ rpc: async () => ({ data: { ok: false, code: "access_denied" }, error: null }) });
  await body(await denial.handlers.reports(request()), 403);
  await body(await denial.handlers.reviewReport(request({ action: "review", reportId: REPORT, role: "admin" })), 403);

  const report = { id: REPORT, reporter: member(), target: member(PEER), reason: "sexual_harassment", details: "Please review.", createdAt: NOW, status: "open", messages: [{ id: MESSAGE, senderId: PEER, body: "Selected evidence", createdAt: NOW }] };
  const h = harness({ rpc: async (name, args) => {
    assert.equal(args.p_actor_id, ACTOR);
    if (name === "cafe_community_reports_server") return { data: { ok: true, reports: [{ ...report, fullTranscript: "hidden", reporter: { ...report.reporter, email: "hidden" }, messages: [{ ...report.messages[0], privateIp: "hidden" }] }] }, error: null };
    assert.equal(name, "cafe_community_review_report_server");
    assert.deepEqual(args, { p_actor_id: ACTOR, p_report_id: REPORT });
    return { data: { ok: true, secret: "hidden" }, error: null };
  } });
  assert.deepEqual(await body(await h.handlers.reports(request())), { ok: true, reports: [report] });
  assert.deepEqual(await body(await h.handlers.reviewReport(request({ action: "review", reportId: REPORT, role: "admin", actorId: OUTSIDER }))), { ok: true });
});

test("transient transaction errors retry once with the same request nonce and never log user content", async () => {
  const calls: Record<string, unknown>[] = [];
  const h = harness({ rpc: async (_name, args) => {
    calls.push(args);
    return calls.length === 1 ? { data: null, error: { code: "40001" } } : { data: { ok: true }, error: null };
  } });
  assert.deepEqual(await body(await h.handlers.command(request({ action: "message.send", roomId: ROOM, requestId: REQUEST_ID, body: "Private conversation" }))), { ok: true });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], calls[1]);
  assert.deepEqual(h.seen.logs, []);
  const failed = harness({ rpc: async () => ({ data: null, error: { code: "private message / token" } }) });
  await body(await failed.handlers.snapshot(request()), 503);
  assert.deepEqual(failed.seen.logs, [{ operation: "snapshot", code: undefined }]);
});
