import { createHmac } from "node:crypto";
import {
  CafeRoomProviderError,
  type CafeProviderRoom,
  type CafeProviderToken,
  type CafeRemovalInput,
  type CafeRoomInput,
  type CafeRoomProvider,
  type CafeTokenInput,
} from "@/lib/cafe/roomProvider";

const DAILY_API_BASE = "https://api.daily.co/v1";
const REQUEST_TIMEOUT_MS = 6_000;

type DailyFetch = typeof fetch;

type DailyConfig = {
  apiKey: string;
  domain: string;
  roomHmacSecret: string;
  participantHmacSecret: string;
  fetchImpl?: DailyFetch;
};

type DailyRoomResponse = {
  name?: unknown;
  url?: unknown;
  privacy?: unknown;
  // Daily accepts room settings under `properties` when creating/updating a
  // room, but returns them under `config` from room responses.
  config?: Record<string, unknown> | null;
};

type DailyTokenResponse = {
  token?: unknown;
};

function normalizeSecret(value: string, name: string): string {
  const normalized = value.trim();
  if (normalized.length < 32) throw new Error(`${name} must be at least 32 characters`);
  return normalized;
}

function normalizeDailyDomain(raw: string): string {
  const value = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!/^[a-z0-9-]+\.daily\.co$/.test(value)) {
    throw new Error("DAILY_DOMAIN must look like pratiqo.daily.co");
  }
  return value;
}

function hmacId(secret: string, scope: string, input: string, length: number): string {
  return createHmac("sha256", secret)
    .update(`${scope}:${input}`, "utf8")
    .digest("base64url")
    .slice(0, length);
}

function safeFirstName(value: string): string {
  const first = value.trim().split(/\s+/)[0]?.slice(0, 40);
  return first || "Participant";
}

export function createDailyRoomProvider(config: DailyConfig): CafeRoomProvider {
  const apiKey = normalizeSecret(config.apiKey, "DAILY_API_KEY");
  const domain = normalizeDailyDomain(config.domain);
  const roomHmacSecret = normalizeSecret(config.roomHmacSecret, "CAFE_DAILY_ROOM_HMAC_SECRET");
  const participantHmacSecret = normalizeSecret(
    config.participantHmacSecret,
    "CAFE_DAILY_PARTICIPANT_HMAC_SECRET",
  );
  const fetchImpl = config.fetchImpl ?? fetch;

  const deterministicRoomId = (sessionId: string) =>
    `cafe-${hmacId(roomHmacSecret, "room", sessionId, 24)}`;
  const opaqueParticipantId = (sessionId: string, profileId: string) =>
    `cp_${hmacId(participantHmacSecret, "participant", `${sessionId}:${profileId}`, 24)}`;

  async function dailyRequest(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetchImpl(`${DAILY_API_BASE}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
        cache: "no-store",
      });
    } catch {
      throw new CafeRoomProviderError("provider_unavailable", "Daily request failed", 15);
    } finally {
      clearTimeout(timer);
    }
  }

  function roomUrl(roomId: string): string {
    return `https://${domain}/${roomId}`;
  }

  function validateRoom(raw: DailyRoomResponse, expected: CafeRoomInput, expectedRoomId: string): CafeProviderRoom {
    if (raw.name !== expectedRoomId || raw.privacy !== "private") {
      throw new CafeRoomProviderError("internal_error", "Daily room identity/config mismatch");
    }
    const roomConfig = raw.config ?? {};
    if (
      Number(roomConfig.nbf) !== expected.roomNbf ||
      Number(roomConfig.exp) !== expected.roomExp ||
      Number(roomConfig.max_participants) !== Math.min(8, expected.maxParticipants) ||
      roomConfig.enable_prejoin_ui !== true ||
      roomConfig.enable_knocking !== false ||
      roomConfig.enable_chat !== false ||
      roomConfig.enable_advanced_chat !== false ||
      roomConfig.enable_shared_chat_history !== false ||
      roomConfig.enable_screenshare !== false ||
      roomConfig.enable_live_captions_ui !== false ||
      roomConfig.start_video_off !== true ||
      roomConfig.start_audio_off !== true ||
      roomConfig.eject_at_room_exp !== true ||
      roomConfig.enable_hidden_participants !== false ||
      roomConfig.enable_recording !== "off" ||
      roomConfig.enable_transcription_storage !== false ||
      roomConfig.enable_dialout !== false ||
      roomConfig.start_cloud_recording === true ||
      roomConfig.auto_start_transcription === true
    ) {
      throw new CafeRoomProviderError("internal_error", "Daily room safety config mismatch");
    }

    if (typeof raw.url === "string") {
      let parsed: URL;
      try {
        parsed = new URL(raw.url);
      } catch {
        throw new CafeRoomProviderError("internal_error", "Daily room URL invalid");
      }
      const normalizedPath = parsed.pathname.replace(/\/$/, "");
      if (parsed.protocol !== "https:" || parsed.hostname !== domain || normalizedPath !== `/${expectedRoomId}`) {
        throw new CafeRoomProviderError("internal_error", "Daily room URL mismatch");
      }
    }

    return { provider: "daily", roomId: expectedRoomId, roomUrl: roomUrl(expectedRoomId) };
  }

  async function getRoom(expected: CafeRoomInput, roomId: string): Promise<CafeProviderRoom> {
    const response = await dailyRequest(`/rooms/${encodeURIComponent(roomId)}`, { method: "GET" });
    if (response.status >= 500) {
      throw new CafeRoomProviderError("provider_unavailable", "Daily room lookup unavailable", 15);
    }
    if (!response.ok) {
      throw new CafeRoomProviderError("internal_error", "Daily room provisioning rejected");
    }
    const payload = (await response.json().catch(() => null)) as DailyRoomResponse | null;
    if (!payload) throw new CafeRoomProviderError("internal_error", "Daily room response invalid");
    return validateRoom(payload, expected, roomId);
  }

  async function ensureRoom(input: CafeRoomInput): Promise<CafeProviderRoom> {
    const roomId = deterministicRoomId(input.sessionId);
    const createPayload = {
      name: roomId,
      privacy: "private",
      properties: {
        nbf: input.roomNbf,
        exp: input.roomExp,
        eject_at_room_exp: true,
        max_participants: Math.min(8, input.maxParticipants),
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
        enable_recording: "off",
        enable_transcription_storage: false,
        enable_dialout: false,
      },
    };

    const response = await dailyRequest("/rooms", {
      method: "POST",
      body: JSON.stringify(createPayload),
    });

    if (response.ok) {
      const payload = (await response.json().catch(() => null)) as DailyRoomResponse | null;
      if (!payload) throw new CafeRoomProviderError("internal_error", "Daily room response invalid");
      return validateRoom(payload, input, roomId);
    }

    // Daily returns a client error when a deterministic room already exists.
    // Never inspect or log the provider body: verify the room through GET instead.
    if (response.status === 400 || response.status === 409) {
      return getRoom(input, roomId);
    }
    if (response.status >= 500) {
      throw new CafeRoomProviderError("provider_unavailable", "Daily room creation unavailable", 15);
    }
    throw new CafeRoomProviderError("internal_error", "Daily room creation rejected");
  }

  async function createToken(input: CafeTokenInput): Promise<CafeProviderToken> {
    const opaqueUserId = opaqueParticipantId(input.sessionId, input.profileId);
    const tokenPayload = {
      properties: {
        room_name: input.roomId,
        nbf: input.nbf,
        exp: input.exp,
        eject_at_token_exp: false,
        is_owner: false,
        user_name: safeFirstName(input.displayName),
        user_id: opaqueUserId,
        start_video_off: true,
        start_audio_off: true,
        enable_prejoin_ui: true,
        enable_screenshare: false,
        enable_live_captions_ui: false,
        enable_recording: "off",
        enable_recording_ui: false,
        start_cloud_recording: false,
        auto_start_transcription: false,
        permissions: {
          hasPresence: true,
          canSend: ["video", "audio"],
          // Host moderation is deliberately Pratiqo-owned. Daily's
          // `participants` admin grant can modify other users' permissions,
          // so it is not issued to pilot hosts.
          canAdmin: false,
        },
      },
    };

    const response = await dailyRequest("/meeting-tokens", {
      method: "POST",
      body: JSON.stringify(tokenPayload),
    });
    if (response.status >= 500) {
      throw new CafeRoomProviderError("provider_unavailable", "Daily token service unavailable", 15);
    }
    if (!response.ok) {
      throw new CafeRoomProviderError("internal_error", "Daily token request rejected");
    }
    const payload = (await response.json().catch(() => null)) as DailyTokenResponse | null;
    if (!payload || typeof payload.token !== "string" || payload.token.length < 20) {
      throw new CafeRoomProviderError("internal_error", "Daily token response invalid");
    }
    return { token: payload.token, expiresAt: new Date(input.exp * 1000).toISOString() };
  }

  async function removeParticipant(input: CafeRemovalInput) {
    const response = await dailyRequest(`/rooms/${encodeURIComponent(input.roomId)}/eject`, {
      method: "POST",
      body: JSON.stringify({
        user_ids: [opaqueParticipantId(input.sessionId, input.profileId)],
        ban: true,
      }),
    });
    if (response.status >= 500) {
      throw new CafeRoomProviderError("provider_unavailable", "Daily removal unavailable", 15);
    }
    if (!response.ok) {
      throw new CafeRoomProviderError("internal_error", "Daily removal rejected");
    }
  }

  async function deleteRoom(roomId: string) {
    const response = await dailyRequest(`/rooms/${encodeURIComponent(roomId)}`, { method: "DELETE" });
    if (response.status === 404) return;
    if (response.status >= 500) {
      throw new CafeRoomProviderError("provider_unavailable", "Daily room deletion unavailable", 15);
    }
    if (!response.ok) {
      throw new CafeRoomProviderError("internal_error", "Daily room deletion rejected");
    }
  }

  return {
    provider: "daily",
    deterministicRoomId,
    opaqueParticipantId,
    ensureRoom,
    createToken,
    removeParticipant,
    deleteRoom,
  };
}

export function getDailyRoomProviderFromEnv(): CafeRoomProvider {
  return createDailyRoomProvider({
    apiKey: process.env.DAILY_API_KEY ?? "",
    domain: process.env.DAILY_DOMAIN ?? "",
    roomHmacSecret: process.env.CAFE_DAILY_ROOM_HMAC_SECRET ?? "",
    participantHmacSecret: process.env.CAFE_DAILY_PARTICIPANT_HMAC_SECRET ?? "",
  });
}
