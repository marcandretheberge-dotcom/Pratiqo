import type { CafeRoomProvider } from "@/lib/cafe/roomProvider";

export type CafeJoinRole = "participant" | "host";

export type CafeJoinDenied = {
  ok: false;
  code: string;
  opensAt?: string;
};

export type CafeJoinAuthorized = {
  ok: true;
  code: "join_authorized";
  sessionId: string;
  profileId: string;
  role: CafeJoinRole;
  displayName: string;
  startsAt: string;
  endsAt: string;
  opensAt: string;
  closesAt: string;
  roomNbf: number;
  roomExp: number;
  tokenNbf: number;
  tokenExp: number;
  maxParticipants: number;
  provider: string | null;
  providerRoomId: string | null;
};

export type CafeJoinDecision = CafeJoinDenied | CafeJoinAuthorized;

type JoinFlowSuccess = {
  ok: true;
  role: CafeJoinRole;
  sessionId: string;
  opaqueParticipantId: string;
  roomUrl: string;
  token: string;
  expiresAt: string;
};

type JoinFlowDenied = {
  ok: false;
  decision: CafeJoinDenied;
};

export type CafeRoomJoinFlowResult = JoinFlowSuccess | JoinFlowDenied;

export class CafeRoomBindingRejectedError extends Error {
  readonly cleanupProviderRoom: boolean;

  constructor(message: string, cleanupProviderRoom: boolean) {
    super(message);
    this.name = "CafeRoomBindingRejectedError";
    this.cleanupProviderRoom = cleanupProviderRoom;
  }
}

export async function authorizeBeforeSharedSessionLimit<T>(input: {
  authorize: () => Promise<CafeJoinDecision>;
  applyLimit: (sessionId: string) => Promise<T>;
}): Promise<{
  decision: CafeJoinDecision;
  limitResult: T | null;
}> {
  const decision = await input.authorize();
  if (!decision.ok) return { decision, limitResult: null };
  return {
    decision,
    limitResult: await input.applyLimit(decision.sessionId),
  };
}

export async function executeCafeRoomJoinFlow(input: {
  firstDecision: CafeJoinAuthorized;
  actorId: string;
  role: CafeJoinRole;
  provider: CafeRoomProvider;
  bindRoom: (sessionId: string, provider: "daily", roomId: string) => Promise<void>;
  reauthorize: () => Promise<CafeJoinDecision>;
}): Promise<CafeRoomJoinFlowResult> {
  const { firstDecision, actorId, role, provider } = input;
  if (firstDecision.profileId !== actorId || firstDecision.role !== role) {
    throw new Error("authorization_identity_mismatch");
  }

  const expectedRoomId = provider.deterministicRoomId(firstDecision.sessionId);
  if (
    (firstDecision.provider && firstDecision.provider !== provider.provider) ||
    (firstDecision.providerRoomId && firstDecision.providerRoomId !== expectedRoomId)
  ) {
    throw new Error("binding_mismatch");
  }

  const room = await provider.ensureRoom({
    sessionId: firstDecision.sessionId,
    startsAt: firstDecision.startsAt,
    endsAt: firstDecision.endsAt,
    roomNbf: firstDecision.roomNbf,
    roomExp: firstDecision.roomExp,
    maxParticipants: firstDecision.maxParticipants,
  });

  try {
    await input.bindRoom(firstDecision.sessionId, provider.provider, room.roomId);
  } catch (error) {
    if (error instanceof CafeRoomBindingRejectedError && error.cleanupProviderRoom) {
      // Cancellation may win the session-row race after Daily created the
      // deterministic room but before the binding transaction. No token exists
      // yet, so deleting this unbound room is safe and prevents an orphan.
      await provider.deleteRoom(room.roomId);
    }
    throw error;
  }

  // This second database decision is intentionally after the provider round
  // trip. Cancellation, reservation cancellation, account blocking or a host
  // removal that happens during provisioning therefore prevents token minting.
  const finalDecision = await input.reauthorize();
  if (!finalDecision.ok) return { ok: false, decision: finalDecision };

  if (
    finalDecision.profileId !== actorId ||
    finalDecision.role !== role ||
    finalDecision.sessionId !== firstDecision.sessionId ||
    finalDecision.provider !== provider.provider ||
    finalDecision.providerRoomId !== room.roomId
  ) {
    throw new Error("final_authorization_mismatch");
  }

  const opaqueParticipantId = provider.opaqueParticipantId(finalDecision.sessionId, actorId);
  const providerToken = await provider.createToken({
    sessionId: finalDecision.sessionId,
    profileId: actorId,
    roomId: room.roomId,
    role,
    displayName: finalDecision.displayName,
    nbf: finalDecision.tokenNbf,
    exp: finalDecision.tokenExp,
  });

  return {
    ok: true,
    role,
    sessionId: finalDecision.sessionId,
    opaqueParticipantId,
    roomUrl: room.roomUrl,
    token: providerToken.token,
    expiresAt: providerToken.expiresAt,
  };
}
