import { getDailyRoomProviderFromEnv } from "@/lib/cafe/providers/daily";
import { CafeRoomProviderError, type CafeRoomProvider } from "@/lib/cafe/roomProvider";
import type { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

type CancelRoomDecision = {
  ok?: boolean;
  code?: string;
  status?: string;
  sessionId?: string;
  provider?: string | null;
  providerRoomId?: string | null;
};

export class CafeRoomCancellationMigrationUnavailableError extends Error {
  constructor() {
    super("Cafe room cancellation RPC is not deployed");
    this.name = "CafeRoomCancellationMigrationUnavailableError";
  }
}

export type CafeAdminCancellationResult = {
  ok: true;
  code: "cancelled";
  status: "cancelled";
  providerRoomDeleted: boolean;
};

export async function cancelCafeSessionAndDeleteRoom(input: {
  admin: AdminClient;
  actorId: string;
  slug: string;
  provider?: CafeRoomProvider;
}): Promise<CafeAdminCancellationResult> {
  const { data, error } = await input.admin.rpc("cafe_admin_cancel_room_server", {
    p_actor_id: input.actorId,
    p_slug: input.slug,
  });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      throw new CafeRoomCancellationMigrationUnavailableError();
    }
    throw new Error(`cancel_rpc:${error.code ?? "unknown"}`);
  }

  const decision = (data ?? {}) as CancelRoomDecision;
  if (decision.ok !== true || decision.code !== "cancelled" || decision.status !== "cancelled") {
    throw new Error(`cancel_rejected:${decision.code ?? "unknown"}`);
  }

  if (!decision.provider && !decision.providerRoomId) {
    return { ok: true, code: "cancelled", status: "cancelled", providerRoomDeleted: false };
  }
  if (
    decision.provider !== "daily" ||
    typeof decision.sessionId !== "string" ||
    typeof decision.providerRoomId !== "string"
  ) {
    throw new CafeRoomProviderError("internal_error", "Cafe room binding invalid");
  }

  const provider = input.provider ?? getDailyRoomProviderFromEnv();
  const expectedRoomId = provider.deterministicRoomId(decision.sessionId);
  if (provider.provider !== "daily" || decision.providerRoomId !== expectedRoomId) {
    throw new CafeRoomProviderError("internal_error", "Cafe room binding mismatch");
  }

  // The DB cancellation commits before this provider call. On a provider outage,
  // the binding stays in place and the same admin action safely retries deletion.
  await provider.deleteRoom(decision.providerRoomId);

  const { data: clearData, error: clearError } = await input.admin.rpc(
    "cafe_clear_room_binding_server",
    {
      p_actor_id: input.actorId,
      p_session_id: decision.sessionId,
      p_provider: decision.provider,
      p_provider_room_id: decision.providerRoomId,
    },
  );
  if (clearError || !clearData || (clearData as { ok?: boolean }).ok !== true) {
    throw new Error(`clear_binding:${clearError?.code ?? "rejected"}`);
  }

  return { ok: true, code: "cancelled", status: "cancelled", providerRoomDeleted: true };
}
