/**
 * Admin planned package manual transfer reversal operations.
 */

import type { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  calculateRemainingReversibleTransferAmount,
  canExecutePlannedPackageTransferReversalInCurrentEnvironment,
  executePlannedPackageTransferReversal,
  type PlannedPackageTransferReversalExecutionRow,
} from "@/lib/offers/plannedPackageTransferReversal";
import {
  canUsePlannedPackageManualTransferReversals,
  isPlannedPackageManualTransferReversalsEnabled,
} from "@/lib/offers/plannedPackageManualTransferReversals";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export type AdminTransferReversalExecutionDto = {
  id: string;
  transferExecutionId: string;
  orderId: string;
  status: string;
  amountCents: number;
  currency: string;
  stripeTransferId: string;
  stripeTransferReversalId: string | null;
  reversalReason: string;
  adminNote: string | null;
  executedBy: string;
  executedAt: string | null;
  failureCode: string | null;
  failureMessage: string | null;
};

function mapReversalDto(row: PlannedPackageTransferReversalExecutionRow): AdminTransferReversalExecutionDto {
  return {
    id: row.id,
    transferExecutionId: row.transfer_execution_id,
    orderId: row.planned_package_order_id,
    status: row.status,
    amountCents: row.amount_cents,
    currency: row.currency,
    stripeTransferId: row.stripe_transfer_id,
    stripeTransferReversalId: row.stripe_transfer_reversal_id,
    reversalReason: row.reversal_reason,
    adminNote: row.admin_note,
    executedBy: row.executed_by,
    executedAt: row.executed_at,
    failureCode: row.failure_code,
    failureMessage: row.failure_message,
  };
}

export async function loadAdminTransferReversalsForOrder(
  admin: AdminClient,
  orderId: string,
): Promise<Map<string, AdminTransferReversalExecutionDto>> {
  const { data, error } = await admin
    .from("planned_package_transfer_reversal_executions")
    .select("*")
    .eq("planned_package_order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/planned-package-transfer-reversals] load failed", error.message);
    return new Map();
  }

  const map = new Map<string, AdminTransferReversalExecutionDto>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const transferExecutionId = String(row.transfer_execution_id ?? "");
    if (!transferExecutionId || map.has(transferExecutionId)) continue;
    map.set(
      transferExecutionId,
      mapReversalDto({
        id: String(row.id ?? ""),
        planned_package_order_id: String(row.planned_package_order_id ?? ""),
        transfer_execution_id: transferExecutionId,
        payout_eligibility_entry_id: String(row.payout_eligibility_entry_id ?? ""),
        booking_id: String(row.booking_id ?? ""),
        teacher_id: String(row.teacher_id ?? ""),
        student_id: String(row.student_id ?? ""),
        teacher_offer_id: (row.teacher_offer_id as string | null) ?? null,
        executed_by: String(row.executed_by ?? ""),
        status: String(row.status ?? ""),
        amount_cents: Number(row.amount_cents ?? 0),
        currency: String(row.currency ?? "CAD"),
        stripe_transfer_id: String(row.stripe_transfer_id ?? ""),
        stripe_transfer_reversal_id: (row.stripe_transfer_reversal_id as string | null) ?? null,
        stripe_balance_transaction_id: (row.stripe_balance_transaction_id as string | null) ?? null,
        idempotency_key: String(row.idempotency_key ?? ""),
        reversal_reason: String(row.reversal_reason ?? ""),
        admin_note: (row.admin_note as string | null) ?? null,
        failure_code: (row.failure_code as string | null) ?? null,
        failure_message: (row.failure_message as string | null) ?? null,
        executed_at: (row.executed_at as string | null) ?? null,
        created_at: String(row.created_at ?? ""),
        updated_at: String(row.updated_at ?? ""),
      }),
    );
  }
  return map;
}

export async function adminExecutePlannedPackageTransferReversal(args: {
  admin: AdminClient;
  orderId: string;
  transferExecutionId: string;
  amountCents?: number;
  reversalReason: string;
  adminNote?: string;
  adminUserId: string;
}): Promise<
  | {
      ok: true;
      reversalExecution: AdminTransferReversalExecutionDto;
      reusedExisting: boolean;
      noStripeRefundExecuted: true;
      noNewTransferCreated: true;
      noPayoutReleased: true;
    }
  | { ok: false; status: number; error: string; blockers?: string[] }
> {
  if (!canUsePlannedPackageManualTransferReversals()) {
    return { ok: false, status: 403, error: "manual_transfer_reversals_disabled" };
  }
  if (!canExecutePlannedPackageTransferReversalInCurrentEnvironment()) {
    return { ok: false, status: 403, error: "legal_review_required" };
  }

  const { data: transfer } = await args.admin
    .from("planned_package_transfer_executions")
    .select("planned_package_order_id")
    .eq("id", args.transferExecutionId)
    .maybeSingle();

  if (!transfer) {
    return { ok: false, status: 404, error: "transfer_execution_not_found" };
  }

  if (String(transfer.planned_package_order_id ?? "") !== args.orderId) {
    return { ok: false, status: 404, error: "transfer_execution_not_found" };
  }

  const result = await executePlannedPackageTransferReversal({
    admin: args.admin,
    transferExecutionId: args.transferExecutionId,
    amountCents: args.amountCents,
    reversalReason: args.reversalReason,
    adminNote: args.adminNote,
    adminUserId: args.adminUserId,
  });

  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      error: result.error,
      blockers: result.blockers,
    };
  }

  return {
    ok: true,
    reversalExecution: mapReversalDto(result.reversalExecution),
    reusedExisting: result.reusedExisting,
    noStripeRefundExecuted: true,
    noNewTransferCreated: true,
    noPayoutReleased: true,
  };
}

export function getManualTransferReversalAdminFlags() {
  return {
    manualTransferReversalsEnabled: canUsePlannedPackageManualTransferReversals(),
    manualTransferReversalsFlagOn: isPlannedPackageManualTransferReversalsEnabled(),
    canExecuteInEnvironment: canExecutePlannedPackageTransferReversalInCurrentEnvironment(),
  };
}

export { calculateRemainingReversibleTransferAmount };
