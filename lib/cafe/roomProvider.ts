export type CafeRoomRole = "participant" | "host" | "support";

export type CafeRoomInput = {
  sessionId: string;
  startsAt: string;
  endsAt: string;
  roomNbf: number;
  roomExp: number;
  maxParticipants: number;
};

export type CafeProviderRoom = {
  provider: "daily";
  roomId: string;
  roomUrl: string;
};

export type CafeTokenInput = {
  sessionId: string;
  profileId: string;
  roomId: string;
  role: CafeRoomRole;
  displayName: string;
  nbf: number;
  exp: number;
};

export type CafeProviderToken = {
  token: string;
  expiresAt: string;
};

export type CafeRemovalInput = {
  roomId: string;
  sessionId: string;
  profileId: string;
};

export interface CafeRoomProvider {
  readonly provider: "daily";
  deterministicRoomId(sessionId: string): string;
  opaqueParticipantId(sessionId: string, profileId: string): string;
  ensureRoom(input: CafeRoomInput): Promise<CafeProviderRoom>;
  createToken(input: CafeTokenInput): Promise<CafeProviderToken>;
  removeParticipant(input: CafeRemovalInput): Promise<void>;
  deleteRoom(roomId: string): Promise<void>;
}

export type CafeRoomProviderErrorCode = "provider_unavailable" | "internal_error";

export class CafeRoomProviderError extends Error {
  readonly code: CafeRoomProviderErrorCode;
  readonly retryAfterSeconds?: number;

  constructor(code: CafeRoomProviderErrorCode, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "CafeRoomProviderError";
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
