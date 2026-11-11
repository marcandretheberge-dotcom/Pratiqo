import assert from "node:assert/strict";
import { createDailyRoomProvider } from "@/lib/cafe/providers/daily";
import { CafeRoomProviderError } from "@/lib/cafe/roomProvider";

const baseConfig = {
  apiKey: "daily-api-key-abcdefghijklmnopqrstuvwxyz",
  domain: "pratiqo.daily.co",
  roomHmacSecret: "room-secret-abcdefghijklmnopqrstuvwxyz012345",
  participantHmacSecret: "participant-secret-abcdefghijklmnopqrstuv",
};
const input = {
  sessionId: "91000000-0000-4000-8000-000000000001",
  startsAt: "2026-11-11T19:00:00.000Z",
  endsAt: "2026-11-11T19:30:00.000Z",
  roomNbf: 1_794_423_840,
  roomExp: 1_794_427_200,
  maxParticipants: 8,
};

async function main() {
  const unsafeProvider = createDailyRoomProvider({
    ...baseConfig,
    fetchImpl: (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        name: string;
        privacy: string;
        properties: Record<string, unknown>;
      };
      return Response.json({
        name: body.name,
        privacy: body.privacy,
        url: `https://pratiqo.daily.co/${body.name}`,
        config: { ...body.properties, enable_recording: "cloud" },
      });
    }) as typeof fetch,
  });
  await assert.rejects(
    unsafeProvider.ensureRoom(input),
    (error: unknown) => error instanceof CafeRoomProviderError && error.code === "internal_error",
  );

  const wrongResponseShapeProvider = createDailyRoomProvider({
    ...baseConfig,
    fetchImpl: (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        name: string;
        privacy: string;
        properties: Record<string, unknown>;
      };
      // Daily accepts `properties` in the request but returns room settings in
      // `config`. An unexpected response shape must fail closed.
      return Response.json({
        name: body.name,
        privacy: body.privacy,
        url: `https://pratiqo.daily.co/${body.name}`,
        properties: body.properties,
      });
    }) as typeof fetch,
  });
  await assert.rejects(
    wrongResponseShapeProvider.ensureRoom(input),
    (error: unknown) => error instanceof CafeRoomProviderError && error.code === "internal_error",
  );

  const rejectedBodyProvider = createDailyRoomProvider({
    ...baseConfig,
    fetchImpl: (async () => Response.json(
      { secret_provider_detail: "never expose this" },
      { status: 422 },
    )) as typeof fetch,
  });
  await assert.rejects(
    rejectedBodyProvider.ensureRoom(input),
    (error: unknown) => {
      assert.ok(error instanceof CafeRoomProviderError);
      assert.equal(error.code, "internal_error");
      assert.equal(error.message.includes("never expose this"), false);
      return true;
    },
  );

  assert.throws(() => createDailyRoomProvider({ ...baseConfig, domain: "evil.example.com" }));
  assert.throws(() => createDailyRoomProvider({ ...baseConfig, roomHmacSecret: "short" }));
  assert.throws(() => createDailyRoomProvider({ ...baseConfig, participantHmacSecret: "short" }));

  console.log("[cafe:pr3a-daily-safety] unsafe config, response shape and error contracts passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
