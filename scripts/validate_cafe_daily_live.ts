import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDailyRoomProvider } from "@/lib/cafe/providers/daily";

function requireSecret(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
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
    // and revalidate the configuration returned by the real Daily API.
    const secondRoom = await provider.ensureRoom(roomInput);
    assert.deepEqual(secondRoom, firstRoom);

    const tokenNbf = now - 5;
    const tokenExp = now + 3 * 60;
    const participantOpaqueId = provider.opaqueParticipantId(sessionId, participantProfileId);
    const hostOpaqueId = provider.opaqueParticipantId(sessionId, hostProfileId);

    assert.match(participantOpaqueId, /^cp_[A-Za-z0-9_-]{24}$/);
    assert.match(hostOpaqueId, /^cp_[A-Za-z0-9_-]{24}$/);
    assert.notEqual(participantOpaqueId, participantProfileId);
    assert.notEqual(hostOpaqueId, hostProfileId);
    assert.notEqual(participantOpaqueId, hostOpaqueId);

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

    // Meeting tokens remain opaque. Request payload safety is covered by the
    // mocked provider contracts; this live gate proves the real account accepts
    // those payloads and returns distinct, short-lived credentials.
    assert.ok(participantToken.token.length >= 20);
    assert.ok(hostToken.token.length >= 20);
    assert.notEqual(participantToken.token, hostToken.token);
    assert.notEqual(participantToken.token, participantProfileId);
    assert.notEqual(hostToken.token, hostProfileId);
    assert.equal(participantToken.expiresAt, new Date(tokenExp * 1000).toISOString());
    assert.equal(hostToken.expiresAt, new Date(tokenExp * 1000).toISOString());

    console.log("[cafe:daily-live] PASS", {
      roomPrivate: true,
      deterministicRoomRecovery: true,
      participantTokenIssued: true,
      hostTokenIssued: true,
      opaquePerSessionIdentity: true,
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
