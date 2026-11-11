import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDailyRoomProvider } from "@/lib/cafe/providers/daily";

function requireSecret(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) {
    throw new Error("Daily meeting token is not a JWT");
  }
  const decoded = Buffer.from(parts[1], "base64url").toString("utf8");
  const payload = JSON.parse(decoded) as unknown;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Daily meeting token payload is invalid");
  }
  return payload as Record<string, unknown>;
}

function assertSafeToken(input: {
  payload: Record<string, unknown>;
  roomId: string;
  profileId: string;
  opaqueParticipantId: string;
  nbf: number;
  exp: number;
}) {
  const properties = input.payload.properties;
  assert.ok(properties && typeof properties === "object" && !Array.isArray(properties));
  const token = properties as Record<string, unknown>;

  assert.equal(token.room_name, input.roomId);
  assert.equal(token.nbf, input.nbf);
  assert.equal(token.exp, input.exp);
  assert.equal(token.is_owner, false);
  assert.equal(token.user_id, input.opaqueParticipantId);
  assert.notEqual(token.user_id, input.profileId);
  assert.equal(token.start_video_off, true);
  assert.equal(token.start_audio_off, true);
  assert.equal(token.enable_screenshare, false);
  assert.equal(token.enable_live_captions_ui, false);
  assert.equal(token.enable_recording, "off");
  assert.equal(token.enable_recording_ui, false);
  assert.equal(token.start_cloud_recording, false);
  assert.equal(token.auto_start_transcription, false);
  assert.equal(token.eject_at_token_exp, false);

  const permissions = token.permissions;
  assert.ok(permissions && typeof permissions === "object" && !Array.isArray(permissions));
  const grants = permissions as Record<string, unknown>;
  assert.equal(grants.hasPresence, true);
  assert.deepEqual(grants.canSend, ["video", "audio"]);
  assert.equal(grants.canAdmin, false);

  const serialized = JSON.stringify(input.payload);
  assert.equal(serialized.includes(input.profileId), false);
  assert.equal(/email|surname|stripe|teacher/i.test(serialized), false);
}

async function main() {
  const apiKey = requireSecret("DAILY_API_KEY");
  const domain = requireSecret("DAILY_DOMAIN");
  const roomHmacSecret = requireSecret("CAFE_DAILY_ROOM_HMAC_SECRET");
  const participantHmacSecret = requireSecret("CAFE_DAILY_PARTICIPANT_HMAC_SECRET");

  const provider = createDailyRoomProvider({
    apiKey,
    domain,
    roomHmacSecret,
    participantHmacSecret,
  });

  const now = Math.floor(Date.now() / 1000);
  const sessionId = randomUUID();
  const participantProfileId = randomUUID();
  const hostProfileId = randomUUID();
  const roomInput = {
    sessionId,
    startsAt: new Date((now + 60) * 1000).toISOString(),
    endsAt: new Date((now + 15 * 60) * 1000).toISOString(),
    roomNbf: now - 30,
    roomExp: now + 15 * 60,
    maxParticipants: 8,
  };

  let roomId: string | null = null;
  try {
    const firstRoom = await provider.ensureRoom(roomInput);
    roomId = firstRoom.roomId;
    assert.equal(firstRoom.provider, "daily");
    assert.match(firstRoom.roomId, /^cafe-[A-Za-z0-9_-]{24}$/);
    assert.equal(firstRoom.roomUrl.includes("?"), false);

    // A second call must recover the deterministic existing room through GET
    // and revalidate the room configuration returned by the real Daily API.
    const secondRoom = await provider.ensureRoom(roomInput);
    assert.deepEqual(secondRoom, firstRoom);

    const tokenNbf = now - 5;
    const tokenExp = now + 3 * 60;
    const participantOpaqueId = provider.opaqueParticipantId(sessionId, participantProfileId);
    const hostOpaqueId = provider.opaqueParticipantId(sessionId, hostProfileId);

    const participantToken = await provider.createToken({
      sessionId,
      profileId: participantProfileId,
      roomId: firstRoom.roomId,
      role: "participant",
      displayName: "Validation Participant",
      nbf: tokenNbf,
      exp: tokenExp,
    });
    const hostToken = await provider.createToken({
      sessionId,
      profileId: hostProfileId,
      roomId: firstRoom.roomId,
      role: "host",
      displayName: "Validation Host",
      nbf: tokenNbf,
      exp: tokenExp,
    });

    assertSafeToken({
      payload: decodeJwtPayload(participantToken.token),
      roomId: firstRoom.roomId,
      profileId: participantProfileId,
      opaqueParticipantId: participantOpaqueId,
      nbf: tokenNbf,
      exp: tokenExp,
    });
    assertSafeToken({
      payload: decodeJwtPayload(hostToken.token),
      roomId: firstRoom.roomId,
      profileId: hostProfileId,
      opaqueParticipantId: hostOpaqueId,
      nbf: tokenNbf,
      exp: tokenExp,
    });

    assert.notEqual(participantOpaqueId, hostOpaqueId);
    assert.equal(participantToken.expiresAt, new Date(tokenExp * 1000).toISOString());
    assert.equal(hostToken.expiresAt, new Date(tokenExp * 1000).toISOString());

    console.log("[cafe:daily-live] PASS", {
      roomPrivate: true,
      deterministicRoomRecovery: true,
      participantTokenSafe: true,
      hostTokenSafe: true,
      recordingDisabled: true,
      transcriptionDisabled: true,
      chatDisabled: true,
      screenshareDisabled: true,
    });
  } finally {
    if (roomId) {
      await provider.deleteRoom(roomId);
      console.log("[cafe:daily-live] temporary room deleted");
    }
  }
}

main().catch((error) => {
  console.error("[cafe:daily-live] validation failed", {
    errorClass: error instanceof Error ? error.name : "unknown",
    message: error instanceof Error ? error.message : "unknown",
  });
  process.exitCode = 1;
});
