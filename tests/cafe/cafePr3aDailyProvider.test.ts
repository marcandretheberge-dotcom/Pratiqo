import assert from "node:assert/strict";
import { createDailyRoomProvider, verifyDailyAccountDomainMatch } from "@/lib/cafe/providers/daily";
import { CafeRoomProviderError } from "@/lib/cafe/roomProvider";

const API_KEY = "daily-api-key-abcdefghijklmnopqrstuvwxyz";
const ROOM_SECRET = "room-secret-abcdefghijklmnopqrstuvwxyz012345";
const PARTICIPANT_SECRET = "participant-secret-abcdefghijklmnopqrstuv";
const SESSION_ID = "90000000-0000-4000-8000-000000000001";
const PROFILE_ID = "90000000-0000-4000-8000-000000000002";

const roomInput = {
  sessionId: SESSION_ID,
  startsAt: "2026-11-11T19:00:00.000Z",
  endsAt: "2026-11-11T19:30:00.000Z",
  roomNbf: 1_794_423_840,
  roomExp: 1_794_427_200,
  maxParticipants: 8,
};

type Call = { url: string; method: string; body: unknown; authorization: string | null };

async function main() {
  const calls: Call[] = [];

  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as unknown : null;
    const headers = new Headers(init?.headers);
    calls.push({ url, method, body, authorization: headers.get("authorization") });

    if (url.endsWith("/rooms") && method === "POST") {
      const payload = body as { name: string; privacy: string; properties: Record<string, unknown> };
      return Response.json({
        name: payload.name,
        privacy: payload.privacy,
        config: payload.properties,
        url: `https://pratiqo.daily.co/${payload.name}`,
      });
    }
    if (url.endsWith("/meeting-tokens") && method === "POST") {
      return Response.json({ token: "daily-token-value-long-enough-for-test" });
    }
    if (url.includes("/eject") && method === "POST") return Response.json({ ok: true });
    if (url.includes("/rooms/") && method === "DELETE") return new Response(null, { status: 204 });
    return new Response(null, { status: 404 });
  }) as typeof fetch;

  const provider = createDailyRoomProvider({
    apiKey: API_KEY,
    domain: "pratiqo.daily.co",
    roomHmacSecret: ROOM_SECRET,
    participantHmacSecret: PARTICIPANT_SECRET,
    fetchImpl,
  });

  const roomId = provider.deterministicRoomId(SESSION_ID);
  assert.match(roomId, /^cafe-[A-Za-z0-9_-]{24}$/);
  assert.equal(provider.deterministicRoomId(SESSION_ID), roomId);
  assert.notEqual(provider.deterministicRoomId("other-session"), roomId);

  const opaqueId = provider.opaqueParticipantId(SESSION_ID, PROFILE_ID);
  assert.match(opaqueId, /^cp_[A-Za-z0-9_-]{24}$/);
  assert.notEqual(opaqueId, PROFILE_ID);
  assert.notEqual(provider.opaqueParticipantId("other-session", PROFILE_ID), opaqueId);

  const room = await provider.ensureRoom(roomInput);
  assert.equal(room.roomId, roomId);
  assert.equal(room.roomUrl, `https://pratiqo.daily.co/${roomId}`);

  const roomCall = calls.find((call) => call.url.endsWith("/rooms") && call.method === "POST");
  assert.ok(roomCall);
  assert.equal(roomCall.authorization, `Bearer ${API_KEY}`);
  const roomBody = roomCall.body as {
    name: string;
    privacy: string;
    properties: Record<string, unknown>;
  };
  assert.equal(roomBody.name, roomId);
  assert.equal(roomBody.privacy, "private");
  assert.deepEqual(roomBody.properties, {
    nbf: roomInput.roomNbf,
    exp: roomInput.roomExp,
    eject_at_room_exp: true,
    max_participants: 8,
    enable_prejoin_ui: true,
    enable_knocking: false,
    enable_chat: false,
    enable_advanced_chat: false,
    enable_shared_chat_history: false,
    enable_screenshare: false,
    enable_live_captions_ui: false,
    start_video_off: true,
    start_audio_off: true,
    enable_hidden_participants: false,
    enable_transcription_storage: false,
    enable_dialout: false,
  });
  assert.equal("enable_recording" in roomBody.properties, false);
  assert.equal("geo" in roomBody.properties, false);

  await provider.createToken({
    sessionId: SESSION_ID,
    profileId: PROFILE_ID,
    roomId,
    role: "participant",
    displayName: "Alice Example",
    nbf: 100,
    exp: 280,
  });
  await provider.createToken({
    sessionId: SESSION_ID,
    profileId: PROFILE_ID,
    roomId,
    role: "host",
    displayName: "Alice Example",
    nbf: 100,
    exp: 280,
  });

  const tokenCalls = calls.filter((call) => call.url.endsWith("/meeting-tokens"));
  assert.equal(tokenCalls.length, 2);
  const participantToken = tokenCalls[0]?.body as { properties: Record<string, unknown> };
  const hostToken = tokenCalls[1]?.body as { properties: Record<string, unknown> };

  for (const tokenBody of [participantToken, hostToken]) {
    assert.equal(tokenBody.properties.room_name, roomId);
    assert.equal(tokenBody.properties.user_name, "Alice");
    assert.equal(tokenBody.properties.user_id, opaqueId);
    assert.equal(tokenBody.properties.is_owner, false);
    assert.equal(tokenBody.properties.eject_at_token_exp, false);
    assert.equal(tokenBody.properties.start_video_off, true);
    assert.equal(tokenBody.properties.start_audio_off, true);
    assert.equal(tokenBody.properties.enable_screenshare, false);
    assert.equal(tokenBody.properties.enable_live_captions_ui, false);
    assert.equal("enable_recording" in tokenBody.properties, false);
    assert.equal(tokenBody.properties.enable_recording_ui, false);
    assert.equal(tokenBody.properties.start_cloud_recording, false);
    assert.equal(tokenBody.properties.auto_start_transcription, false);
    assert.equal((tokenBody.properties.permissions as Record<string, unknown>).canAdmin, false);
    const serialized = JSON.stringify(tokenBody);
    assert.equal(serialized.includes(PROFILE_ID), false);
    assert.equal(/email|surname|stripe|teacher/i.test(serialized), false);
  }

  await provider.removeParticipant({ roomId, sessionId: SESSION_ID, profileId: PROFILE_ID });
  const ejectCall = calls.find((call) => call.url.includes("/eject"));
  assert.ok(ejectCall);
  assert.deepEqual(ejectCall.body, { user_ids: [opaqueId], ban: true });
  await provider.deleteRoom(roomId);

  // Identified existing-room conflict (409) recovers via GET.
  const duplicateCalls: Call[] = [];
  const duplicateFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as unknown : null;
    duplicateCalls.push({ url, method, body, authorization: null });
    if (url.endsWith("/rooms") && method === "POST") {
      return Response.json({ private_provider_message: "do not inspect" }, { status: 409 });
    }
    if (url.endsWith(`/rooms/${roomId}`) && method === "GET") {
      return Response.json({
        name: roomId,
        url: `https://pratiqo.daily.co/${roomId}`,
        privacy: "private",
        config: roomBody.properties,
      });
    }
    return new Response(null, { status: 404 });
  }) as typeof fetch;
  const duplicateProvider = createDailyRoomProvider({
    apiKey: API_KEY,
    domain: "pratiqo.daily.co",
    roomHmacSecret: ROOM_SECRET,
    participantHmacSecret: PARTICIPANT_SECRET,
    fetchImpl: duplicateFetch,
  });
  const duplicateRoom = await duplicateProvider.ensureRoom(roomInput);
  assert.equal(duplicateRoom.roomId, roomId);
  assert.equal(duplicateCalls.length, 2);

  // 400 "already exists" also recovers via GET.
  const existsCalls: Call[] = [];
  const existsFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    existsCalls.push({ url, method, body: null, authorization: null });
    if (url.endsWith("/rooms") && method === "POST") {
      return Response.json(
        { error: "invalid-request-error", info: "a room with that name already exists" },
        { status: 400 },
      );
    }
    if (url.endsWith(`/rooms/${roomId}`) && method === "GET") {
      return Response.json({
        name: roomId,
        url: `https://pratiqo.daily.co/${roomId}`,
        privacy: "private",
        config: roomBody.properties,
      });
    }
    return new Response(null, { status: 404 });
  }) as typeof fetch;
  const existsProvider = createDailyRoomProvider({
    apiKey: API_KEY,
    domain: "pratiqo.daily.co",
    roomHmacSecret: ROOM_SECRET,
    participantHmacSecret: PARTICIPANT_SECRET,
    fetchImpl: existsFetch,
  });
  assert.equal((await existsProvider.ensureRoom(roomInput)).roomId, roomId);
  assert.equal(existsCalls.length, 2);

  // Invalid payload 400 must NOT fall through to GET — preserves create diagnostic.
  const invalidCalls: Call[] = [];
  const invalidFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    invalidCalls.push({ url, method, body: null, authorization: null });
    if (url.endsWith("/rooms") && method === "POST") {
      return new Response(
        JSON.stringify({
          error: "invalid-request-error",
          info: "invalid value for property enable_recording: off",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "x-daily-request-id": "req_test_recording",
          },
        },
      );
    }
    return new Response(null, { status: 404 });
  }) as typeof fetch;
  const invalidProvider = createDailyRoomProvider({
    apiKey: API_KEY,
    domain: "pratiqo.daily.co",
    roomHmacSecret: ROOM_SECRET,
    participantHmacSecret: PARTICIPANT_SECRET,
    fetchImpl: invalidFetch,
  });
  await assert.rejects(
    invalidProvider.ensureRoom(roomInput),
    (error: unknown) => {
      assert.ok(error instanceof CafeRoomProviderError);
      assert.equal(error.message, "Daily room creation rejected");
      assert.equal(error.diagnostic?.operation, "room_create");
      assert.equal(error.diagnostic?.httpStatus, 400);
      assert.equal(error.diagnostic?.rejectedField, "enable_recording");
      assert.match(error.diagnostic?.requestId ?? "", /^request_sha256:[a-f0-9]{24}$/);
      assert.equal(JSON.stringify(error).includes("req_test_recording"), false);
      assert.equal(error.message.includes("off"), false);
      assert.equal(invalidCalls.some((call) => call.method === "GET"), false);
      return true;
    },
  );

  // Conflict POST then failed GET keeps prior create diagnostic.
  const conflictFailFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.endsWith("/rooms") && method === "POST") {
      return Response.json(
        { error: "invalid-request-error", info: "a room named cafe-x already exists" },
        { status: 400 },
      );
    }
    if (url.includes("/rooms/") && method === "GET") {
      return Response.json({ error: "not-found", info: "room missing" }, { status: 404 });
    }
    return new Response(null, { status: 404 });
  }) as typeof fetch;
  const conflictFailProvider = createDailyRoomProvider({
    apiKey: API_KEY,
    domain: "pratiqo.daily.co",
    roomHmacSecret: ROOM_SECRET,
    participantHmacSecret: PARTICIPANT_SECRET,
    fetchImpl: conflictFailFetch,
  });
  await assert.rejects(
    conflictFailProvider.ensureRoom(roomInput),
    (error: unknown) => {
      assert.ok(error instanceof CafeRoomProviderError);
      assert.equal(error.message, "Daily room recovery rejected");
      assert.equal(error.diagnostic?.operation, "room_get");
      assert.equal(error.diagnostic?.httpStatus, 404);
      assert.equal(error.priorDiagnostics?.[0]?.operation, "room_create");
      assert.equal(error.priorDiagnostics?.[0]?.httpStatus, 400);
      return true;
    },
  );

  const outageProvider = createDailyRoomProvider({
    apiKey: API_KEY,
    domain: "pratiqo.daily.co",
    roomHmacSecret: ROOM_SECRET,
    participantHmacSecret: PARTICIPANT_SECRET,
    fetchImpl: (async () => new Response(null, { status: 503 })) as typeof fetch,
  });
  await assert.rejects(
    outageProvider.ensureRoom(roomInput),
    (error: unknown) => error instanceof CafeRoomProviderError && error.code === "provider_unavailable",
  );

  // Raw fetch errors can contain URLs, credentials or participant data. They
  // must not escape, and each operation must keep its own diagnostic identity.
  const fakeNetworkSecret = "eyJhbGciOiJIUzI1NiJ9.eyJ0ZXN0Ijp0cnVlfQ.syntheticSignature";
  const failedFetch = (async () => {
    throw new Error(`api_key=${fakeNetworkSecret}`);
  }) as typeof fetch;
  const networkProvider = createDailyRoomProvider({
    apiKey: API_KEY,
    domain: "pratiqo.daily.co",
    roomHmacSecret: ROOM_SECRET,
    participantHmacSecret: PARTICIPANT_SECRET,
    fetchImpl: failedFetch,
  });
  const networkOperations: Array<[string, () => Promise<unknown>]> = [
    ["room_create", () => networkProvider.ensureRoom(roomInput)],
    ["token_create", () => networkProvider.createToken({
      sessionId: SESSION_ID, profileId: PROFILE_ID, roomId, role: "participant",
      displayName: "Validation", nbf: 100, exp: 280,
    })],
    ["participant_remove", () => networkProvider.removeParticipant({
      roomId, sessionId: SESSION_ID, profileId: PROFILE_ID,
    })],
    ["room_delete", () => networkProvider.deleteRoom(roomId)],
    ["account_lookup", () => verifyDailyAccountDomainMatch({
      apiKey: API_KEY, domain: "pratiqo.daily.co", fetchImpl: failedFetch,
    })],
  ];
  for (const [operation, execute] of networkOperations) {
    await assert.rejects(execute(), (error: unknown) => {
      assert.ok(error instanceof CafeRoomProviderError);
      assert.equal(error.code, "provider_unavailable");
      assert.equal(error.retryAfterSeconds, 15);
      assert.equal(error.diagnostic?.operation, operation);
      assert.equal(error.diagnostic?.httpStatus, null);
      assert.equal(error.diagnostic?.errorCode, "network_error");
      assert.equal(error.message.includes(fakeNetworkSecret), false);
      assert.equal(JSON.stringify(error).includes(fakeNetworkSecret), false);
      return true;
    });
  }

  const recoveryNetworkProvider = createDailyRoomProvider({
    apiKey: API_KEY,
    domain: "pratiqo.daily.co",
    roomHmacSecret: ROOM_SECRET,
    participantHmacSecret: PARTICIPANT_SECRET,
    fetchImpl: (async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Response.json({
          error: "invalid-request-error",
          info: `a room named ${fakeNetworkSecret} already exists`,
        }, { status: 400 });
      }
      throw new Error(`api_key=${fakeNetworkSecret}`);
    }) as typeof fetch,
  });
  await assert.rejects(recoveryNetworkProvider.ensureRoom(roomInput), (error: unknown) => {
    assert.ok(error instanceof CafeRoomProviderError);
    assert.equal(error.diagnostic?.operation, "room_get");
    assert.equal(error.diagnostic?.errorCode, "network_error");
    assert.equal(error.priorDiagnostics?.length, 1);
    assert.equal(error.priorDiagnostics?.[0]?.operation, "room_create");
    assert.equal(error.priorDiagnostics?.[0]?.httpStatus, 400);
    assert.equal(error.priorDiagnostics?.[0]?.info, "room_already_exists");
    assert.equal(JSON.stringify(error).includes(fakeNetworkSecret), false);
    return true;
  });

  console.log("[cafe:pr3a-daily] Daily request/response, token, identity and error contracts passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
