/**
 * Server-side helper for the general admin audit log (migration 087).
 *
 * Always called through the service-role client after requireAdminApi.
 * Never throws — audit failures must not block the primary mutation,
 * but they ARE logged to stderr so monitoring can flag forensic gaps.
 *
 * DO NOT import from client components.
 */

import type { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export type AdminAuditAction =
  | "promo_code.created"
  | "promo_code.paused"
  | "promo_code.archived"
  | "student_credit.granted"
  | "student_credit.voided";

export type AdminAuditTargetType = "promo_code" | "student_credit";

export async function insertAdminAuditLog(
  admin: AdminClient,
  input: {
    actorProfileId: string;
    action: AdminAuditAction;
    targetType: AdminAuditTargetType;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const { error } = await admin.from("admin_audit_log").insert({
      actor_profile_id: input.actorProfileId,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      metadata: input.metadata ?? {},
    });
    if (error) {
      console.error("[admin/auditLog] insert failed", error.message);
    }
  } catch (e) {
    console.error("[admin/auditLog] insert threw", e);
  }
}
