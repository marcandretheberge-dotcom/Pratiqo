import { isCafeCommunityEnabled } from "./communityFeatureFlag";
import { isCafeRoomProviderEnabled } from "./roomFeatureFlag";
import { CafeRoomProviderError, type CafeRoomProvider } from "./roomProvider";
import type { CafeCommunityCallAuthorization, CafeCommunityCallJoin } from "./communityTypes";

type RpcResult = { data: unknown; error: unknown };
type CleanupRow = { callId: string; fromId: string; toId: string; generation: number };
type Dependencies = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;
  provider: () => CafeRoomProvider;
  enabled: () => boolean;
  now?: () => number;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const uuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value);

function cleanupRow(value: unknown): CleanupRow | null {
  if (!object(value) || !uuid(value.callId) || !uuid(value.fromId) || !uuid(value.toId) ||
    typeof value.generation !== "number" || !Number.isSafeInteger(value.generation) || value.generation < 1) return null;
  return { callId: value.callId, fromId: value.fromId, toId: value.toId, generation: value.generation };
}

function authorization(value: unknown, actorId: string, callId: string, now: number): CafeCommunityCallAuthorization | null {
  if (!object(value) || value.ok !== true || value.callId !== callId || !uuid(value.roomId) ||
      !uuid(value.fromId) || !uuid(value.toId) || value.fromId === value.toId ||
      ![value.fromId, value.toId].includes(actorId) || typeof value.displayName !== "string" ||
      !value.displayName.trim() || value.displayName.length > 80 ||
      typeof value.acceptedAt !== "string" || typeof value.endsAt !== "string") return null;
  const start = Date.parse(value.acceptedAt);
  const end = Date.parse(value.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > now + 5_000 || end <= now ||
      end - start > 3_600_000 || end <= start) return null;
  return value as CafeCommunityCallAuthorization;
}

function sameCall(a: CafeCommunityCallAuthorization, b: CafeCommunityCallAuthorization): boolean {
  return a.callId === b.callId && a.roomId === b.roomId && a.fromId === b.fromId &&
    a.toId === b.toId && a.acceptedAt === b.acceptedAt && a.endsAt === b.endsAt;
}

function absent(error: unknown): boolean {
  return error instanceof CafeRoomProviderError && error.diagnostic?.httpStatus === 404;
}

/** Delete alone is not evidence of participant ejection. Ban both identities first. */
async function closeProviderCall(provider: CafeRoomProvider, row: Pick<CleanupRow, "callId" | "fromId" | "toId">): Promise<boolean> {
  const roomId = provider.deterministicRoomId(row.callId);
  const ejections = await Promise.allSettled([row.fromId, row.toId].map((profileId) =>
    provider.removeParticipant({ roomId, sessionId: row.callId, profileId })));
  const ejected = ejections.every((result) => result.status === "fulfilled" || absent(result.reason));
  // Still attempt deletion if ejection is temporarily unavailable; retain the
  // outbox item until both operations are acknowledged or already absent.
  let deleted = false;
  try { await provider.deleteRoom(roomId); deleted = true; } catch (error) { deleted = absent(error); }
  return ejected && deleted;
}

/** Server-only service. Injection exercises actual authorization / provider races. */
export function createCommunityCallService(deps: Dependencies) {
  const now = deps.now ?? Date.now;
  async function authorize(actorId: string, callId: string) {
    const result = await deps.rpc("cafe_community_authorize_call_server", {
      p_actor_id: actorId, p_call_id: callId,
    });
    return result.error ? null : authorization(result.data, actorId, callId, now());
  }

  async function cleanupCommunityCalls(input: { actorId: string | null; callIds?: string[] }): Promise<{ pending: boolean }> {
    try {
      if (input.actorId !== null && !uuid(input.actorId)) return { pending: true };
      const result = await deps.rpc("cafe_community_cleanup_pending_server", { p_actor_id: input.actorId });
      if (result.error || !Array.isArray(result.data)) return { pending: true };
      const rows = result.data.map(cleanupRow);
      if (rows.some((row) => row === null)) return { pending: true };
      // Caller-supplied IDs can only prioritize rows authorized by the RPC.
      const requested = new Set(input.callIds ?? []);
      const authorizedRows = (rows as CleanupRow[]).sort((a, b) => Number(requested.has(b.callId)) - Number(requested.has(a.callId)));
      if (authorizedRows.length === 0) return { pending: false };
      // Closing remains possible with the video feature switched off. Do not
      // instantiate Daily at all for ordinary text actions without cleanup.
      const provider = deps.provider();
      // Daily requests have a 6s deadline each. Two parallel ejections then
      // one deletion take at most ~12s/row; reserve room for RPCs in a 60s job.
      const limit = input.actorId === null ? 3 : 2;
      let pending = authorizedRows.length > limit;
      for (const row of authorizedRows.slice(0, limit)) {
        if (!(await closeProviderCall(provider, row))) { pending = true; continue; }
        const done = await deps.rpc("cafe_community_cleanup_done_server", { p_call_id: row.callId, p_generation: row.generation });
        if (done.error || !object(done.data) || done.data.ok !== true || done.data.completed !== true) pending = true;
      }
      return { pending };
    } catch { return { pending: true }; }
  }

  async function joinCommunityCall(input: { actorId: string; callId: string }): Promise<CafeCommunityCallJoin> {
    if (!deps.enabled()) return { ok: false, code: "disabled" };
    if (!uuid(input.actorId) || !uuid(input.callId)) return { ok: false, code: "call_unavailable" };
    let original: CafeCommunityCallAuthorization | null = null;
    let provider: CafeRoomProvider | null = null;
    let provisioningAttempted = false;
    async function revokeProvisionedCall() {
      if (!original || !provider) return;
      // Commit an outbox item before best-effort network cleanup, so a timeout
      // cannot erase the obligation to close an already provisioned call.
      try {
        await deps.rpc("cafe_community_command_server", {
          p_actor_id: input.actorId, p_action: "call.end", p_payload: { callId: input.callId },
        });
      } catch { /* Revoked accounts may no longer command; block already queues cleanup. */ }
      try {
        // The call/member may have been physically deleted while ensureRoom
        // was in flight. Only a retained, closed copied-ID outbox row can be
        // requeued by this service-only compensation RPC.
        await deps.rpc("cafe_community_cleanup_requeue_server", { p_call_id: input.callId });
      } catch { /* Preserve immediate best-effort ejection during database outages. */ }
      try {
        await closeProviderCall(provider, original);
        // This emergency close did not observe an outbox generation. Leave it
        // pending for the normal CAS worker; never acknowledge newer work.
      } catch { /* The transactional outbox retries; never return the token. */ }
    }
    try {
      original = await authorize(input.actorId, input.callId);
      if (!original) return { ok: false, code: "call_unavailable" };
      provider = deps.provider();
      provisioningAttempted = true;
      const room = await provider.ensureRoom({
        sessionId: input.callId, startsAt: original.acceptedAt, endsAt: original.endsAt,
        roomNbf: Math.floor(Date.parse(original.acceptedAt) / 1000) - 30,
        roomExp: Math.floor(Date.parse(original.endsAt) / 1000), maxParticipants: 2,
      });
      const beforeToken = await authorize(input.actorId, input.callId);
      if (!beforeToken || !sameCall(original, beforeToken) || !deps.enabled()) {
        await revokeProvisionedCall();
        return { ok: false, code: "call_unavailable" };
      }
      const expiry = Math.min(Math.floor(now() / 1000) + 120, Math.floor(Date.parse(original.endsAt) / 1000));
      const token = await provider.createToken({
        sessionId: input.callId, profileId: input.actorId, roomId: room.roomId,
        role: "participant", displayName: beforeToken.displayName,
        nbf: Math.floor(now() / 1000) - 5, exp: expiry,
      });
      const afterToken = await authorize(input.actorId, input.callId);
      if (!afterToken || !sameCall(original, afterToken) || !deps.enabled()) {
        await revokeProvisionedCall();
        return { ok: false, code: "call_unavailable" };
      }
      return { ok: true, roomUrl: room.roomUrl, token: token.token, expiresAt: token.expiresAt, endsAt: original.endsAt };
    } catch {
      // After provisioning, an unknown authorization/provider outcome must not
      // leave a previously connected participant in an unmonitored call.
      // A POST can succeed at Daily even if its response times out or fails
      // safety validation. Its deterministic room must still be cleaned up.
      if (provisioningAttempted) await revokeProvisionedCall();
      return { ok: false, code: "provider_unavailable", retryAfter: 5 };
    }
  }
  return { joinCommunityCall, cleanupCommunityCalls };
}

async function service() {
  const [{ getSupabaseAdmin }, { getDailyRoomProviderFromEnv }] = await Promise.all([
    import("../supabaseAdmin"), import("./providers/daily"),
  ]);
  const admin = getSupabaseAdmin();
  return createCommunityCallService({
    rpc: (name, args) => admin.rpc(name, args), provider: getDailyRoomProviderFromEnv,
    enabled: () => isCafeCommunityEnabled() && isCafeRoomProviderEnabled(),
  });
}

export async function joinCommunityCall(input: { actorId: string; callId: string }): Promise<CafeCommunityCallJoin> {
  try { return await (await service()).joinCommunityCall(input); }
  catch { return { ok: false, code: "provider_unavailable", retryAfter: 5 }; }
}

export async function cleanupCommunityCalls(input: { actorId: string | null; callIds?: string[] }): Promise<{ pending: boolean }> {
  try { return await (await service()).cleanupCommunityCalls(input); }
  catch { return { pending: true }; }
}
