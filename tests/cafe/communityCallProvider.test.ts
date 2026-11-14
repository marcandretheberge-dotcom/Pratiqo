import assert from "node:assert/strict";
import { createCommunityCallService } from "../../lib/cafe/communityCallProvider";
import { CafeRoomProviderError, type CafeRoomProvider } from "../../lib/cafe/roomProvider";

const actorId = "10000000-0000-4000-8000-000000000001";
const otherId = "10000000-0000-4000-8000-000000000002";
const callId = "20000000-0000-4000-8000-000000000001";
const roomId = "30000000-0000-4000-8000-000000000001";
const now = Date.parse("2026-11-13T12:00:00Z");
const authorized = {
  ok: true, callId, roomId, fromId: actorId, toId: otherId, displayName: "Alex",
  acceptedAt: "2026-11-13T11:59:00Z", endsAt: "2026-11-13T12:59:00Z",
};
function harness() {
  const events: Array<{ name: string; input: unknown }> = [];
  let enabled = true;
  let checks = 0;
  let auth: (n: number) => unknown = () => authorized;
  let rows: unknown[] = [];
  let ejectError: Error | null = null;
  let tokenError: Error | null = null;
  let ensureError: Error | null = null;
  let deleteError: Error | null = null;
  let doneError = false;
  let newerGeneration = false;
  const provider: CafeRoomProvider = {
    provider: "daily", deterministicRoomId: (id) => `call-${id}`, opaqueParticipantId: (_id, profile) => `opaque-${profile}`,
    async ensureRoom(input) { events.push({ name: "ensure", input }); if (ensureError) throw ensureError; return { provider: "daily", roomId: `call-${input.sessionId}`, roomUrl: "https://test.daily.co/private" }; },
    async createToken(input) {
      events.push({ name: "token", input }); if (tokenError) throw tokenError;
      return { token: "private-token", expiresAt: new Date(input.exp * 1000).toISOString() };
    },
    async removeParticipant(input) { events.push({ name: "eject", input }); if (ejectError) throw ejectError; },
    async deleteRoom(input) { events.push({ name: "delete", input }); if (deleteError) throw deleteError; },
  };
  const service = createCommunityCallService({
    now: () => now, enabled: () => enabled, provider: () => { events.push({ name: "provider", input: null }); return provider; },
    async rpc(name, input) {
      events.push({ name, input });
      if (name === "cafe_community_authorize_call_server") return { data: auth(++checks), error: null };
      if (name === "cafe_community_cleanup_pending_server") return { data: rows, error: null };
      if (name === "cafe_community_cleanup_done_server") return { data: { ok: !doneError, completed: !newerGeneration }, error: doneError ? {} : null };
      return { data: { ok: true }, error: null };
    },
  });
  return { ...service, events, setEnabled: (v: boolean) => { enabled = v; }, setAuth: (v: typeof auth) => { auth = v; },
    setRows: (v: unknown[]) => { rows = v; }, setEjectError: (v: Error) => { ejectError = v; },
    setTokenError: (v: Error) => { tokenError = v; }, setDeleteError: (v: Error) => { deleteError = v; },
    setEnsureError: (v: Error) => { ensureError = v; },
    setDoneError: () => { doneError = true; }, setNewerGeneration: () => { newerGeneration = true; } };
}
const pendingRow = { callId, fromId: actorId, toId: otherId, generation: 1 };

async function main() {
  let h = harness();
  const joined = await h.joinCommunityCall({ actorId, callId });
  assert.equal(joined.ok, true);
  assert.equal(h.events.filter((e) => e.name === "cafe_community_authorize_call_server").length, 3);
  assert.deepEqual((h.events.find((e) => e.name === "ensure")!.input as { maxParticipants: number }).maxParticipants, 2);
  const minted = h.events.find((e) => e.name === "token")!.input as Record<string, unknown>;
  assert.equal(minted.role, "participant"); assert.equal(minted.profileId, actorId);
  assert.equal(minted.exp, now / 1000 + 120);

  for (const failureAt of [1, 2, 3]) {
    h = harness(); h.setAuth((n) => n >= failureAt ? { ok: false, code: "blocked" } : authorized);
    assert.equal((await h.joinCommunityCall({ actorId, callId })).ok, false);
    assert.equal(h.events.filter((e) => e.name === "token").length, failureAt === 3 ? 1 : 0);
    assert.equal(h.events.filter((e) => e.name === "eject").length, failureAt === 1 ? 0 : 2);
    if (failureAt > 1) {
      assert.ok(h.events.findIndex((e) => e.name === "cafe_community_command_server") < h.events.findIndex((e) => e.name === "eject"));
      assert.ok(h.events.findIndex((e) => e.name === "eject") < h.events.findIndex((e) => e.name === "delete"));
    }
  }
  h = harness(); h.setAuth(() => ({ ...authorized, toId: roomId, fromId: callId }));
  assert.equal((await h.joinCommunityCall({ actorId, callId })).ok, false);
  assert.equal(h.events.some((e) => e.name === "provider"), false);
  h = harness(); h.setAuth((n) => n === 1 ? authorized : { ...authorized, endsAt: "2026-11-13T12:30:00Z" });
  assert.equal((await h.joinCommunityCall({ actorId, callId })).ok, false);
  assert.equal(h.events.some((e) => e.name === "token"), false);
  h = harness(); h.setEnabled(false);
  assert.equal((await h.joinCommunityCall({ actorId, callId })).ok, false);
  assert.equal(h.events.length, 0);
  h = harness(); h.setTokenError(new Error("private provider response"));
  assert.deepEqual(await h.joinCommunityCall({ actorId, callId }), { ok: false, code: "provider_unavailable", retryAfter: 5 });
  assert.equal(h.events.filter((e) => e.name === "eject").length, 2);
  h = harness(); h.setEnsureError(new Error("request completed remotely but response timed out"));
  assert.equal((await h.joinCommunityCall({ actorId, callId })).ok, false);
  assert.ok(h.events.some((e) => e.name === "cafe_community_command_server"));
  assert.equal(h.events.filter((e) => e.name === "eject").length, 2);

  h = harness();
  assert.deepEqual(await h.cleanupCommunityCalls({ actorId }), { pending: false });
  assert.equal(h.events.some((e) => e.name === "provider"), false);
  h = harness(); h.setEnabled(false); h.setRows([pendingRow]);
  assert.deepEqual(await h.cleanupCommunityCalls({ actorId, callIds: [roomId] }), { pending: false });
  assert.deepEqual(h.events.filter((e) => e.name === "eject").map((e) => e.input), [actorId, otherId].map((profileId) => ({ roomId: `call-${callId}`, sessionId: callId, profileId })));
  assert.equal(h.events.some((e) => JSON.stringify(e.input).includes(`call-${roomId}`)), false);
  assert.deepEqual(h.events.find((e) => e.name === "cafe_community_cleanup_done_server")!.input, { p_call_id: callId, p_generation: 1 });
  h = harness(); h.setRows([pendingRow]); h.setNewerGeneration();
  assert.deepEqual(await h.cleanupCommunityCalls({ actorId }), { pending: true }, "an older cleanup worker cannot acknowledge a newer teardown generation");

  for (const failure of ["eject", "delete", "done"] as const) {
    h = harness(); h.setRows([pendingRow]);
    if (failure === "eject") h.setEjectError(new Error("timeout"));
    if (failure === "delete") h.setDeleteError(new Error("timeout"));
    if (failure === "done") h.setDoneError();
    assert.deepEqual(await h.cleanupCommunityCalls({ actorId }), { pending: true });
    if (failure !== "done") assert.equal(h.events.some((e) => e.name === "cafe_community_cleanup_done_server"), false);
  }
  h = harness(); h.setRows([pendingRow]);
  h.setEjectError(new CafeRoomProviderError("provider_unavailable", "absent", undefined, { diagnostic: {
    operation: "eject", httpStatus: 404, errorCode: null, info: null, rejectedField: null, requestId: null,
  } }));
  assert.deepEqual(await h.cleanupCommunityCalls({ actorId: null }), { pending: false });
  assert.deepEqual(h.events[0].input, { p_actor_id: null });
  h = harness(); h.setRows([{ callId, fromId: actorId, toId: "invalid" }]);
  assert.deepEqual(await h.cleanupCommunityCalls({ actorId }), { pending: true });
  assert.equal(h.events.some((e) => e.name === "provider"), false);
  console.log("community call provider: authorization races, mutual-call isolation, teardown and retry cases passed");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
