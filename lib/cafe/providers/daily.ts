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
import {
  effectiveDailyBool,
  isDailyExistingRoomConflict,
  isDailyRecordingEnabled,
  publicCafeDailyDiagnostic,
  readDailyErrorDiagnostic,
  type CafeDailyDiagnostic,
  type CafeDailyOperation,
} from "@/lib/cafe/providers/dailyDiagnostics";

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

type DailyAccountResponse = {
  domain_name?: unknown;
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

function providerError(
  code: "provider_unavailable" | "internal_error",
  message: string,
  options?: {
    retryAfterSeconds?: number;
    diagnostic?: CafeDailyDiagnostic;
    priorDiagnostics?: CafeDailyDiagnostic[];
  },
): CafeRoomProviderError {
  return new CafeRoomProviderError(code, message, options?.retryAfterSeconds, {
    diagnostic: options?.diagnostic ? publicCafeDailyDiagnostic(options.diagnostic) : undefined,
    priorDiagnostics: options?.priorDiagnostics?.map(publicCafeDailyDiagnostic),
  });
}

/** Room properties for create — recording omitted (Daily has no `"off"` enum). */
export function buildCafeDailyRoomProperties(input: CafeRoomInput): Record<string, unknown> {
  return {
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
    // Omit enable_recording: Daily accepts only cloud|cloud-audio-only|local|raw-tracks.
    // Absence keeps recording disabled per Daily's documented contract.
    enable_transcription_storage: false,
    enable_dialout: false,
  };
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
      throw providerError("provider_unavailable", "Daily request failed", {
        retryAfterSeconds: 15,
        diagnostic: {
          operation: "account_lookup",
          httpStatus: null,
          errorCode: "network_error",
          info: null,
          rejectedField: null,
          requestId: null,
        },
      });
    } finally {
      clearTimeout(timer);
    }
  }

  function roomUrl(roomId: string): string {
    return `https://${domain}/${roomId}`;
  }

  function validateRoom(
    raw: DailyRoomResponse,
    expected: CafeRoomInput,
    expectedRoomId: string,
  ): CafeProviderRoom {
    if (raw.name !== expectedRoomId || raw.privacy !== "private") {
      throw providerError("internal_error", "Daily room identity/config mismatch");
    }
    const roomConfig = raw.config ?? {};

    // Documented Daily defaults apply when fields are omitted from `config`.
    const chatOff = effectiveDailyBool(roomConfig.enable_chat, false) === false;
    const advancedChatOff = effectiveDailyBool(roomConfig.enable_advanced_chat, false) === false;
    // enable_shared_chat_history defaults to true; we require an explicit disable.
    const sharedChatOff = roomConfig.enable_shared_chat_history === false;
    const screenshareOff = roomConfig.enable_screenshare === false;
    const captionsOff = effectiveDailyBool(roomConfig.enable_live_captions_ui, false) === false;
    const knockingOff = effectiveDailyBool(roomConfig.enable_knocking, false) === false;
    const hiddenOff = effectiveDailyBool(roomConfig.enable_hidden_participants, false) === false;
    const transcriptionOff =
      effectiveDailyBool(roomConfig.enable_transcription_storage, false) === false;
    const dialoutOff = effectiveDailyBool(roomConfig.enable_dialout, false) === false;
    const recordingOff = !isDailyRecordingEnabled(roomConfig.enable_recording);
    const cloudRecordingNotForced = roomConfig.start_cloud_recording !== true;
    const autoTranscriptionOff = roomConfig.auto_start_transcription !== true;

    if (
      Number(roomConfig.nbf) !== expected.roomNbf
      || Number(roomConfig.exp) !== expected.roomExp
      || Number(roomConfig.max_participants) !== Math.min(8, expected.maxParticipants)
      || roomConfig.enable_prejoin_ui !== true
      || knockingOff !== true
      || chatOff !== true
      || advancedChatOff !== true
      || sharedChatOff !== true
      || screenshareOff !== true
      || captionsOff !== true
      || roomConfig.start_video_off !== true
      || roomConfig.start_audio_off !== true
      || roomConfig.eject_at_room_exp !== true
      || hiddenOff !== true
      || recordingOff !== true
      || transcriptionOff !== true
      || dialoutOff !== true
      || cloudRecordingNotForced !== true
      || autoTranscriptionOff !== true
    ) {
      throw providerError("internal_error", "Daily room safety config mismatch", {
        diagnostic: {
          operation: "room_get",
          httpStatus: 200,
          errorCode: "safety_config_mismatch",
          info: recordingOff
            ? null
            : "recording_enabled_in_config",
          rejectedField: isDailyRecordingEnabled(roomConfig.enable_recording)
            ? "enable_recording"
            : null,
          requestId: null,
        },
      });
    }

    if (typeof raw.url === "string") {
      let parsed: URL;
      try {
        parsed = new URL(raw.url);
      } catch {
        throw providerError("internal_error", "Daily room URL invalid");
      }
      const normalizedPath = parsed.pathname.replace(/\/$/, "");
      if (
        parsed.protocol !== "https:"
        || parsed.hostname !== domain
        || normalizedPath !== `/${expectedRoomId}`
      ) {
        throw providerError("internal_error", "Daily room URL mismatch");
      }
    }

    return { provider: "daily", roomId: expectedRoomId, roomUrl: roomUrl(expectedRoomId) };
  }

  async function rejectFromResponse(
    response: Response,
    operation: CafeDailyOperation,
    message: string,
    code: "provider_unavailable" | "internal_error",
    priorDiagnostics?: CafeDailyDiagnostic[],
  ): Promise<never> {
    const diagnostic = await readDailyErrorDiagnostic(response, operation);
    throw providerError(code, message, {
      retryAfterSeconds: code === "provider_unavailable" ? 15 : undefined,
      diagnostic,
      priorDiagnostics,
    });
  }

  async function getRoom(
    expected: CafeRoomInput,
    roomId: string,
    priorDiagnostics?: CafeDailyDiagnostic[],
  ): Promise<CafeProviderRoom> {
    const response = await dailyRequest(`/rooms/${encodeURIComponent(roomId)}`, { method: "GET" });
    if (response.status >= 500) {
      await rejectFromResponse(
        response,
        "room_get",
        "Daily room lookup unavailable",
        "provider_unavailable",
        priorDiagnostics,
      );
    }
    if (!response.ok) {
      await rejectFromResponse(
        response,
        "room_get",
        "Daily room recovery rejected",
        "internal_error",
        priorDiagnostics,
      );
    }
    const payload = (await response.json().catch(() => null)) as DailyRoomResponse | null;
    if (!payload) {
      throw providerError("internal_error", "Daily room response invalid", {
        diagnostic: {
          operation: "room_get",
          httpStatus: response.status,
          errorCode: "invalid_json",
          info: null,
          rejectedField: null,
          requestId: null,
        },
        priorDiagnostics,
      });
    }
    return validateRoom(payload, expected, roomId);
  }

  async function ensureRoom(input: CafeRoomInput): Promise<CafeProviderRoom> {
    const roomId = deterministicRoomId(input.sessionId);
    const createPayload = {
      name: roomId,
      privacy: "private",
      properties: buildCafeDailyRoomProperties(input),
    };

    const response = await dailyRequest("/rooms", {
      method: "POST",
      body: JSON.stringify(createPayload),
    });

    if (response.ok) {
      const payload = (await response.json().catch(() => null)) as DailyRoomResponse | null;
      if (!payload) {
        throw providerError("internal_error", "Daily room response invalid", {
          diagnostic: {
            operation: "room_create",
            httpStatus: response.status,
            errorCode: "invalid_json",
            info: null,
            rejectedField: null,
            requestId: null,
          },
        });
      }
      return validateRoom(payload, input, roomId);
    }

    if (response.status >= 500) {
      await rejectFromResponse(
        response,
        "room_create",
        "Daily room creation unavailable",
        "provider_unavailable",
      );
    }

    const createDiagnostic = await readDailyErrorDiagnostic(response, "room_create");

    // Only recover when Daily identifies an existing-room conflict — not every 400.
    if (isDailyExistingRoomConflict(response.status, createDiagnostic)) {
      return getRoom(input, roomId, [createDiagnostic]);
    }

    throw providerError("internal_error", "Daily room creation rejected", {
      diagnostic: createDiagnostic,
    });
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
        // Omit enable_recording — same enum contract as rooms; absence denies recording.
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
      await rejectFromResponse(
        response,
        "token_create",
        "Daily token service unavailable",
        "provider_unavailable",
      );
    }
    if (!response.ok) {
      await rejectFromResponse(
        response,
        "token_create",
        "Daily token request rejected",
        "internal_error",
      );
    }
    const payload = (await response.json().catch(() => null)) as DailyTokenResponse | null;
    if (!payload || typeof payload.token !== "string" || payload.token.length < 20) {
      throw providerError("internal_error", "Daily token response invalid", {
        diagnostic: {
          operation: "token_create",
          httpStatus: response.status,
          errorCode: "invalid_token_payload",
          info: null,
          rejectedField: null,
          requestId: null,
        },
      });
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
      await rejectFromResponse(
        response,
        "participant_remove",
        "Daily removal unavailable",
        "provider_unavailable",
      );
    }
    if (!response.ok) {
      await rejectFromResponse(
        response,
        "participant_remove",
        "Daily removal rejected",
        "internal_error",
      );
    }
  }

  async function deleteRoom(roomId: string) {
    const response = await dailyRequest(`/rooms/${encodeURIComponent(roomId)}`, { method: "DELETE" });
    if (response.status === 404) return;
    if (response.status >= 500) {
      await rejectFromResponse(
        response,
        "room_delete",
        "Daily room deletion unavailable",
        "provider_unavailable",
      );
    }
    if (!response.ok) {
      await rejectFromResponse(
        response,
        "room_delete",
        "Daily room deletion rejected",
        "internal_error",
      );
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

/**
 * Read-only account check: GET /v1/ and compare domain_name to configured DAILY_DOMAIN.
 * Logs only status + match boolean — never secret values.
 */
export async function verifyDailyAccountDomainMatch(input: {
  apiKey: string;
  domain: string;
  fetchImpl?: DailyFetch;
}): Promise<{
  httpStatus: number;
  domainMatches: boolean;
  diagnostic: CafeDailyDiagnostic;
}> {
  const apiKey = normalizeSecret(input.apiKey, "DAILY_API_KEY");
  const domain = normalizeDailyDomain(input.domain);
  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${DAILY_API_BASE}/`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      const diagnostic = await readDailyErrorDiagnostic(response, "account_lookup");
      return {
        httpStatus: response.status,
        domainMatches: false,
        diagnostic,
      };
    }
    const payload = (await response.json().catch(() => null)) as DailyAccountResponse | null;
    const returned =
      typeof payload?.domain_name === "string"
        ? payload.domain_name.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "")
        : null;
    const domainMatches = returned === domain;
    return {
      httpStatus: response.status,
      domainMatches,
      diagnostic: publicCafeDailyDiagnostic({
        operation: "account_lookup",
        httpStatus: response.status,
        errorCode: domainMatches ? null : "domain_mismatch",
        info: null,
        rejectedField: domainMatches ? null : "domain_name",
        requestId:
          response.headers.get("x-daily-request-id")
          ?? response.headers.get("x-request-id"),
      }),
    };
  } finally {
    clearTimeout(timer);
  }
}

export function getDailyRoomProviderFromEnv(): CafeRoomProvider {
  return createDailyRoomProvider({
    apiKey: process.env.DAILY_API_KEY ?? "",
    domain: process.env.DAILY_DOMAIN ?? "",
    roomHmacSecret: process.env.CAFE_DAILY_ROOM_HMAC_SECRET ?? "",
    participantHmacSecret: process.env.CAFE_DAILY_PARTICIPANT_HMAC_SECRET ?? "",
  });
}
