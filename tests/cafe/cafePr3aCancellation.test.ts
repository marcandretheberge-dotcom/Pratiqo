import assert from "node:assert/strict";
import {
  CafeRoomCancellationMigrationUnavailableError,
  cancelCafeSessionAndDeleteRoom,
} from "@/lib/cafe/adminRoomCancellation";
import { CafeRoomProviderError, type CafeRoomProvider } from "@/lib/cafe/roomProvider";

const SESSION_ID = "92000000-0000-4000-8000-000000000001";
const ACTOR_ID = "92000000-0000-4000-8000-000000000002";
const ROOM_ID = "cafe-abcdefghijklmnopqrstuvwx";

function fakeProvider(options: { failDelete?: boolean; roomId?: string } = {}) {
  const deleted: string[] = [];
  const provider: CafeRoomProvider = {
    provider: "daily",
    deterministicRoomId: () => options.roomId ?? ROOM_ID,
    opaqueParticipantId: () => "cp_abcdefghijklmnopqrstuvwx",
    ensureRoom: async () => { throw new Error("not used"); },
    createToken: async () => { throw new Error("not used"); },
    removeParticipant: async () => { throw new Error("not used"); },
    deleteRoom: async (roomId) => {
      if (options.failDelete) {
        throw new CafeRoomProviderError("provider_unavailable", "Daily unavailable", 15);
      }
      deleted.push(roomId);
    },
  };
  return { provider, deleted };
}

function fakeAdmin(options: {
  binding?: boolean;
  clearOk?: boolean;
  cancellationRpcErrorCode?: string;
} = {}) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const binding = options.binding ?? true;
  const clearOk = options.clearOk ?? true;
  const admin = {
    async rpc(name: string, args: Record<string, unknown>) {
      calls.push({ name, args });
      if (name === "cafe_admin_cancel_room_server") {
        if (options.cancellationRpcErrorCode) {
          return {
            data: null,
            error: { code: options.cancellationRpcErrorCode },
          };
        }
        return {
          data: {
            ok: true,
            code: "cancelled",
            status: "cancelled",
            sessionId: SESSION_ID,
            provider: binding ? "daily" : null,
            providerRoomId: binding ? ROOM_ID : null,
          },
          error: null,
        };
      }
      if (name === "cafe_clear_room_binding_server") {
        return {
          data: clearOk ? { ok: true, code: "cleared" } : { ok: false, code: "binding_conflict" },
          error: null,
        };
      }
      throw new Error(`Unexpected RPC ${name}`);
    },
  };
  return { admin, calls };
}

async function main() {
  {
    const { admin, calls } = fakeAdmin();
    const { provider, deleted } = fakeProvider();
    const result = await cancelCafeSessionAndDeleteRoom({
      admin: admin as never,
      actorId: ACTOR_ID,
      slug: "cafe-test",
      provider,
    });
    assert.deepEqual(result, {
      ok: true,
      code: "cancelled",
      status: "cancelled",
      providerRoomDeleted: true,
    });
    assert.deepEqual(deleted, [ROOM_ID]);
    assert.deepEqual(calls.map((call) => call.name), [
      "cafe_admin_cancel_room_server",
      "cafe_clear_room_binding_server",
    ]);
    assert.equal(calls[1]?.args.p_actor_id, ACTOR_ID);
    assert.equal(calls[1]?.args.p_provider_room_id, ROOM_ID);
  }

  {
    const { admin, calls } = fakeAdmin({ binding: false });
    const { provider, deleted } = fakeProvider();
    const result = await cancelCafeSessionAndDeleteRoom({
      admin: admin as never,
      actorId: ACTOR_ID,
      slug: "cafe-without-room",
      provider,
    });
    assert.equal(result.providerRoomDeleted, false);
    assert.deepEqual(deleted, []);
    assert.deepEqual(calls.map((call) => call.name), ["cafe_admin_cancel_room_server"]);
  }

  {
    const { admin, calls } = fakeAdmin();
    const { provider } = fakeProvider({ failDelete: true });
    await assert.rejects(
      cancelCafeSessionAndDeleteRoom({
        admin: admin as never,
        actorId: ACTOR_ID,
        slug: "cafe-provider-down",
        provider,
      }),
      (error: unknown) => error instanceof CafeRoomProviderError && error.code === "provider_unavailable",
    );
    assert.deepEqual(calls.map((call) => call.name), ["cafe_admin_cancel_room_server"]);
  }

  {
    const { admin, calls } = fakeAdmin();
    const { provider, deleted } = fakeProvider({ roomId: "cafe-differentabcdefghijklmnop" });
    await assert.rejects(
      cancelCafeSessionAndDeleteRoom({
        admin: admin as never,
        actorId: ACTOR_ID,
        slug: "cafe-binding-mismatch",
        provider,
      }),
      (error: unknown) => error instanceof CafeRoomProviderError && error.code === "internal_error",
    );
    assert.deepEqual(deleted, []);
    assert.deepEqual(calls.map((call) => call.name), ["cafe_admin_cancel_room_server"]);
  }

  for (const code of ["PGRST202", "42883"]) {
    const { admin, calls } = fakeAdmin({ cancellationRpcErrorCode: code });
    const { provider, deleted } = fakeProvider();
    await assert.rejects(
      cancelCafeSessionAndDeleteRoom({
        admin: admin as never,
        actorId: ACTOR_ID,
        slug: "pre-migration-cafe",
        provider,
      }),
      (error: unknown) => error instanceof CafeRoomCancellationMigrationUnavailableError,
    );
    assert.deepEqual(deleted, []);
    assert.deepEqual(calls.map((call) => call.name), ["cafe_admin_cancel_room_server"]);
  }

  console.log("[cafe:pr3a-cancellation] cancellation, retry, fallback and binding contracts passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
