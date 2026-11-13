import assert from "node:assert/strict";
import {
  cafeRoomMediaDefaults,
  cafeRoomReduce,
  initialCafeRoomUiState,
} from "@/lib/cafe/roomUiState";
import {
  cafeRoomJoinDiagnostic,
  requestCafeRoomJoin,
} from "@/lib/cafe/roomClient";

{
  const defaults = cafeRoomMediaDefaults();
  assert.equal(defaults.cameraArmed, false);
  assert.equal(defaults.micArmed, false);
}

{
  let state = initialCafeRoomUiState("demo");
  assert.equal(state.phase, "welcome");
  assert.equal(state.mode, "demo");

  state = cafeRoomReduce(state, { type: "start_media_prep" });
  assert.equal(state.phase, "media_prep");

  state = cafeRoomReduce(state, { type: "toggle_camera" });
  assert.equal(state.cameraArmed, true);
  state = cafeRoomReduce(state, { type: "toggle_mic" });
  assert.equal(state.micArmed, true);

  state = cafeRoomReduce(state, { type: "request_join" });
  assert.equal(state.phase, "joining");

  state = cafeRoomReduce(state, { type: "join_succeeded" });
  assert.equal(state.phase, "connected");

  state = cafeRoomReduce(state, { type: "connection_lost" });
  assert.equal(state.phase, "reconnecting");
  state = cafeRoomReduce(state, { type: "reconnected" });
  assert.equal(state.phase, "connected");

  state = cafeRoomReduce(state, { type: "leave" });
  assert.equal(state.phase, "left");
  assert.equal(state.cameraArmed, false);
  assert.equal(state.micArmed, false);
}

{
  // Camera/mic cannot arm from welcome — explicit prep only.
  let state = initialCafeRoomUiState("live");
  state = cafeRoomReduce(state, { type: "toggle_camera" });
  assert.equal(state.cameraArmed, false);
  state = cafeRoomReduce(state, { type: "request_join" });
  assert.equal(state.phase, "welcome");
}

async function assertJoinClientNeverLogsToken() {
  const result = await requestCafeRoomJoin({
    slug: "fr-introductions-a1",
    accessToken: "token",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          ok: true,
          role: "participant",
          roomUrl: "https://example.daily.co/cafe-room",
          token: "secret-meeting-token",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("expected ok");
  const diag = cafeRoomJoinDiagnostic(result);
  assert.equal(diag.ok, true);
  assert.equal(diag.role, "participant");
  assert.equal(typeof diag.tokenLength, "number");
  assert.equal(diag.roomHost, "example.daily.co");
  assert.equal("token" in diag, false);
  assert.equal("roomUrl" in diag, false);
  assert.doesNotMatch(JSON.stringify(diag), /secret-meeting-token/);
}

async function assertJoinDeniedCodesPassThrough() {
  const result = await requestCafeRoomJoin({
    slug: "fr-introductions-a1",
    accessToken: "token",
    fetchImpl: async () =>
      new Response(JSON.stringify({ ok: false, code: "not_reserved" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
  });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected failure");
  assert.equal(result.code, "not_reserved");
}

function success(role: "host" | "participant") {
  return new Response(JSON.stringify({
    ok: true,
    role,
    roomUrl: "https://example.daily.co/test-room",
    token: "test-meeting-token",
    expiresAt: "2099-01-01T00:00:00.000Z",
  }), { status: 200 });
}

async function assertAutomaticAdmissionUsesServerRoles() {
  const hostPaths: string[] = [];
  const host = await requestCafeRoomJoin({
    slug: "test-room",
    accessToken: "test-bearer",
    role: "auto",
    fetchImpl: async (path) => {
      hostPaths.push(String(path));
      return success("host");
    },
  });
  assert.equal(host.ok && host.role, "host");
  assert.deepEqual(hostPaths, ["/api/cafe/sessions/test-room/host"]);

  const participantPaths: string[] = [];
  const participant = await requestCafeRoomJoin({
    slug: "test-room",
    accessToken: "test-bearer",
    role: "auto",
    fetchImpl: async (path) => {
      participantPaths.push(String(path));
      return String(path).endsWith("/host")
        ? new Response(JSON.stringify({ ok: false, code: "access_denied" }), { status: 403 })
        : success("participant");
    },
  });
  assert.equal(participant.ok && participant.role, "participant");
  assert.deepEqual(participantPaths, [
    "/api/cafe/sessions/test-room/host",
    "/api/cafe/sessions/test-room/join",
  ]);

  // A provider problem, expired auth, rate limit or other denial is never
  // reinterpreted as permission to try a different admission route.
  for (const [status, code] of [
    [403, "too_early"], [403, "adult_rules_required"], [401, "access_denied"],
    [429, "rate_limited"], [503, "access_denied"], [500, "internal_error"],
  ] as const) {
    let requests = 0;
    const denied = await requestCafeRoomJoin({
      slug: "test-room",
      accessToken: "test-bearer",
      role: "auto",
      fetchImpl: async () => {
        requests += 1;
        return new Response(JSON.stringify({ ok: false, code }), { status });
      },
    });
    assert.equal(denied.ok, false);
    assert.equal(requests, 1, `${status}/${code} must not fall back`);
  }

  let networkRequests = 0;
  const network = await requestCafeRoomJoin({
    slug: "test-room", accessToken: "test-bearer", role: "auto",
    fetchImpl: async () => { networkRequests += 1; throw new Error("offline"); },
  });
  assert.deepEqual(network, { ok: false, code: "network_error" });
  assert.equal(networkRequests, 1);
}

async function assertMalformedResponsesAreRecoverable() {
  for (const body of ["null", "[]", '"unexpected"', "not json"]) {
    let requests = 0;
    const result = await requestCafeRoomJoin({
      slug: "test-room", accessToken: "test-bearer", role: "auto",
      fetchImpl: async () => { requests += 1; return new Response(body); },
    });
    assert.deepEqual(result, { ok: false, code: "response_lost" });
    assert.equal(requests, 1);
  }

  const mismatchedRole = await requestCafeRoomJoin({
    slug: "test-room", accessToken: "test-bearer", role: "host",
    fetchImpl: async () => success("participant"),
  });
  assert.equal(mismatchedRole.ok, false);
}

void (async () => {
  await assertJoinClientNeverLogsToken();
  await assertJoinDeniedCodesPassThrough();
  await assertAutomaticAdmissionUsesServerRoles();
  await assertMalformedResponsesAreRecoverable();
  console.log("[cafe:pr3b-room] UI state + join client contracts passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
