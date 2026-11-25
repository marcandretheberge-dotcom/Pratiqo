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
      assert.equal(JSON.stringify(error.diagnostic ?? {}).includes("never expose this"), false);
      return true;
    },
  );

  // Omitted enable_recording in returned config is accepted (recording disabled).
  const omittedRecordingProvider = createDailyRoomProvider({
    ...baseConfig,
    fetchImpl: (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        name: string;
        privacy: string;
        properties: Record<string, unknown>;
      };
      const safeConfig = { ...body.properties };
      delete safeConfig.enable_recording;
      return Response.json({
        name: body.name,
        privacy: body.privacy,
        url: `https://pratiqo.daily.co/${body.name}`,
        config: safeConfig,
      });
    }) as typeof fetch,
  });
  const safeRoom = await omittedRecordingProvider.ensureRoom(input);
  assert.match(safeRoom.roomId, /^cafe-/);

  const defaultFalseFields = [
    "enable_chat",
    "enable_advanced_chat",
    "enable_live_captions_ui",
    "enable_knocking",
    "enable_hidden_participants",
    "enable_transcription_storage",
    "enable_dialout",
    "start_cloud_recording",
    "auto_start_transcription",
  ];

  function providerWithConfig(
    override: Record<string, unknown>,
    recoverExistingRoom = false,
    omitDefaultFalseFields = false,
  ) {
    let roomId = "";
    let properties: Record<string, unknown> = {};
    return createDailyRoomProvider({
      ...baseConfig,
      fetchImpl: (async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          const body = JSON.parse(String(init.body)) as {
            name: string;
            properties: Record<string, unknown>;
          };
          roomId = body.name;
          properties = { ...body.properties };
          if (recoverExistingRoom) {
            return Response.json(
              { error: "invalid-request-error", info: "a room with that name already exists" },
              { status: 400 },
            );
          }
        }
        if (omitDefaultFalseFields) {
          for (const field of defaultFalseFields) delete properties[field];
        }
        return Response.json({
          name: roomId,
          privacy: "private",
          url: `https://pratiqo.daily.co/${roomId}`,
          config: { ...properties, ...override },
        });
      }) as typeof fetch,
    });
  }

  // A successful create and conflict recovery must both reject enabled or
  // unrecognized recording configurations, including future provider modes.
  for (const recoverExistingRoom of [false, true]) {
    for (const value of [
      "cloud", "cloud-audio-only", "local", "raw-tracks", ["local"],
      true, null, "", "off", 1, {}, "future-mode", ["future-mode"], ["cloud", null],
    ]) {
      await assert.rejects(
        providerWithConfig({ enable_recording: value }, recoverExistingRoom).ensureRoom(input),
        (error: unknown) => {
          assert.ok(error instanceof CafeRoomProviderError);
          assert.equal(error.code, "internal_error");
          assert.equal(error.diagnostic?.rejectedField, "enable_recording");
          return true;
        },
        `Unsafe recording config must be rejected: ${JSON.stringify(value)}`,
      );
    }
    // Daily omits default-disabled fields; that valid response remains usable.
    assert.match(
      (await providerWithConfig({}, recoverExistingRoom, true).ensureRoom(input)).roomId,
      /^cafe-/,
    );
  }

  // Truthy strings, nulls and other malformed values must never become false.
  for (const field of defaultFalseFields) {
    for (const value of [true, "true", "false", null, 1, {}, []]) {
      await assert.rejects(
        providerWithConfig({ [field]: value }).ensureRoom(input),
        (error: unknown) => error instanceof CafeRoomProviderError && error.code === "internal_error",
        `Unsafe ${field} config must be rejected: ${JSON.stringify(value)}`,
      );
    }
  }

  assert.throws(() => createDailyRoomProvider({ ...baseConfig, domain: "evil.example.com" }));
  assert.throws(() => createDailyRoomProvider({ ...baseConfig, roomHmacSecret: "short" }));
  assert.throws(() => createDailyRoomProvider({ ...baseConfig, participantHmacSecret: "short" }));

  console.log("[cafe:pr3a-daily-safety] unsafe config, response shape and error contracts passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
