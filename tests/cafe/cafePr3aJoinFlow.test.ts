import assert from "node:assert/strict";
import {
  CafeRoomBindingRejectedError,
  authorizeBeforeSharedSessionLimit,
  executeCafeRoomJoinFlow,
  type CafeJoinAuthorized,
} from "@/lib/cafe/roomJoinFlow";
import type { CafeRoomProvider } from "@/lib/cafe/roomProvider";

const SESSION_ID = "93000000-0000-4000-8000-000000000001";
const PROFILE_ID = "93000000-0000-4000-8000-000000000002";
const ROOM_ID = "cafe-abcdefghijklmnopqrstuvwx";

const firstDecision: CafeJoinAuthorized = {
  ok: true,
  code: "join_authorized",
  sessionId: SESSION_ID,
  profileId: PROFILE_ID,
  role: "participant",
  displayName: "Alice",
  startsAt: "2026-11-11T19:00:00.000Z",
  endsAt: "2026-11-11T19:30:00.000Z",
  opensAt: "2026-11-11T18:50:00.000Z",
  closesAt: "2026-11-11T19:35:00.000Z",
  roomNbf: 1_794_423_840,
  roomExp: 1_794_427_200,
  tokenNbf: 1_794_424_000,
  tokenExp: 1_794_424_180,
  maxParticipants: 8,
  provider: null,
  providerRoomId: null,
};

function makeProvider() {
  const calls = {
    ensureRoom: 0,
    createToken: 0,
    deleteRoom: 0,
    bind: 0,
  };

  const provider: CafeRoomProvider = {
    provider: "daily",
    deterministicRoomId: () => ROOM_ID,
    opaqueParticipantId: () => "cp_abcdefghijklmnopqrstuvwx",
    ensureRoom: async () => {
      calls.ensureRoom += 1;
      return {
        provider: "daily",
        roomId: ROOM_ID,
        roomUrl: `https://pratiqo.daily.co/${ROOM_ID}`,
      };
    },
    createToken: async () => {
      calls.createToken += 1;
      return {
        token: "daily-token-long-enough-for-test",
        expiresAt: "2026-11-11T19:03:00.000Z",
      };
    },
    removeParticipant: async () => undefined,
    deleteRoom: async (roomId) => {
      assert.equal(roomId, ROOM_ID);
      calls.deleteRoom += 1;
    },
  };

  return { provider, calls };
}

async function main() {
  // A denied/unreserved caller never consumes the shared session counter.
  {
    let sharedLimitCalls = 0;
    const gate = await authorizeBeforeSharedSessionLimit({
      authorize: async () => ({ ok: false, code: "not_reserved" }),
      applyLimit: async () => {
        sharedLimitCalls += 1;
        return "limited";
      },
    });
    assert.deepEqual(gate, {
      decision: { ok: false, code: "not_reserved" },
      limitResult: null,
    });
    assert.equal(sharedLimitCalls, 0);
  }

  // A genuinely authorized caller consumes the shared counter by canonical
  // session ID, not by a client-controlled slug.
  {
    const seenSessions: string[] = [];
    const gate = await authorizeBeforeSharedSessionLimit({
      authorize: async () => firstDecision,
      applyLimit: async (sessionId) => {
        seenSessions.push(sessionId);
        return null;
      },
    });
    assert.equal(gate.decision.ok, true);
    assert.deepEqual(seenSessions, [SESSION_ID]);
  }

  // The participant is removed while Daily provisioning is in flight. The
  // second database authorization must stop token minting.
  {
    const { provider, calls } = makeProvider();
    const result = await executeCafeRoomJoinFlow({
      firstDecision,
      actorId: PROFILE_ID,
      role: "participant",
      provider,
      bindRoom: async () => {
        calls.bind += 1;
      },
      reauthorize: async () => ({ ok: false, code: "access_denied" }),
    });

    assert.deepEqual(result, {
      ok: false,
      decision: { ok: false, code: "access_denied" },
    });
    assert.equal(calls.ensureRoom, 1);
    assert.equal(calls.bind, 1);
    assert.equal(calls.createToken, 0);
    assert.equal(calls.deleteRoom, 0);
  }

  // A reservation cancelled during provisioning is equally authoritative.
  {
    const { provider, calls } = makeProvider();
    const result = await executeCafeRoomJoinFlow({
      firstDecision,
      actorId: PROFILE_ID,
      role: "participant",
      provider,
      bindRoom: async () => {
        calls.bind += 1;
      },
      reauthorize: async () => ({ ok: false, code: "not_reserved" }),
    });

    assert.equal(result.ok, false);
    assert.equal(calls.createToken, 0);
    assert.equal(calls.deleteRoom, 0);
  }

  // Cancellation may win the session-row race after Daily creates the room but
  // before the private binding is accepted. The unbound room must be deleted.
  {
    const { provider, calls } = makeProvider();
    await assert.rejects(
      executeCafeRoomJoinFlow({
        firstDecision,
        actorId: PROFILE_ID,
        role: "participant",
        provider,
        bindRoom: async () => {
          calls.bind += 1;
          throw new CafeRoomBindingRejectedError("session_unavailable", true);
        },
        reauthorize: async () => {
          throw new Error("reauthorize must not run after rejected binding");
        },
      }),
      /session_unavailable/,
    );
    assert.equal(calls.ensureRoom, 1);
    assert.equal(calls.bind, 1);
    assert.equal(calls.deleteRoom, 1);
    assert.equal(calls.createToken, 0);
  }

  // A binding conflict must fail closed without deleting a room that may belong
  // to another already-established binding.
  {
    const { provider, calls } = makeProvider();
    await assert.rejects(
      executeCafeRoomJoinFlow({
        firstDecision,
        actorId: PROFILE_ID,
        role: "participant",
        provider,
        bindRoom: async () => {
          calls.bind += 1;
          throw new CafeRoomBindingRejectedError("binding_conflict", false);
        },
        reauthorize: async () => {
          throw new Error("reauthorize must not run after binding conflict");
        },
      }),
      /binding_conflict/,
    );
    assert.equal(calls.deleteRoom, 0);
    assert.equal(calls.createToken, 0);
  }

  // A stable, authorized flow binds once and mints exactly one short-lived token.
  {
    const { provider, calls } = makeProvider();
    const result = await executeCafeRoomJoinFlow({
      firstDecision,
      actorId: PROFILE_ID,
      role: "participant",
      provider,
      bindRoom: async (sessionId, providerName, roomId) => {
        calls.bind += 1;
        assert.equal(sessionId, SESSION_ID);
        assert.equal(providerName, "daily");
        assert.equal(roomId, ROOM_ID);
      },
      reauthorize: async () => ({
        ...firstDecision,
        provider: "daily",
        providerRoomId: ROOM_ID,
      }),
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.roomUrl, `https://pratiqo.daily.co/${ROOM_ID}`);
      assert.equal(result.token, "daily-token-long-enough-for-test");
      assert.equal(result.opaqueParticipantId, "cp_abcdefghijklmnopqrstuvwx");
    }
    assert.equal(calls.ensureRoom, 1);
    assert.equal(calls.bind, 1);
    assert.equal(calls.createToken, 1);
    assert.equal(calls.deleteRoom, 0);
  }

  // Provider/binding identity cannot change between authorization decisions.
  {
    const { provider, calls } = makeProvider();
    await assert.rejects(
      executeCafeRoomJoinFlow({
        firstDecision,
        actorId: PROFILE_ID,
        role: "participant",
        provider,
        bindRoom: async () => {
          calls.bind += 1;
        },
        reauthorize: async () => ({
          ...firstDecision,
          provider: "daily",
          providerRoomId: "cafe-differentabcdefghijklmnop",
        }),
      }),
      /final_authorization_mismatch/,
    );
    assert.equal(calls.createToken, 0);
    assert.equal(calls.deleteRoom, 0);
  }

  console.log("[cafe:pr3a-join-flow] authorization ordering and stale-token prevention passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
