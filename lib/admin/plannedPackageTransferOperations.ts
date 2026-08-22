/**
 * Admin planned package manual transfer operations.
 */

import type { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  canExecutePlannedPackageTransferInCurrentEnvironment,
  executeApprovedPlannedPackageTransfer,
  type PlannedPackageTransferExecutionRow,
} from "@/lib/offers/plannedPackageManualTransfer";
import {
  canUsePlannedPackageManualTransfers,
  isPlannedPackageManualTransfersEnabled,
} from "@/lib/offers/plannedPackageManualTransfers";
import { calculateRemainingReversibleTransferAmount } from "@/lib/offers/plannedPackageTransferReversal";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export type AdminTransferExecutionDto = {
  id: string;
  entryId: string;
  orderId: string;
  status: string;
  amountCents: number;
  currency: string;
  stripeTransferId: string | null;
  stripeDestinationAccountId: string | null;
  executedBy: string;
  executedAt: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  reversedCents: number;
  reversalStatus: string | null;
  remainingReversibleCents: number;
};

function mapExecutionDto(
  row: PlannedPackageTransferExecutionRow,
  extra?: { reversedCents?: number; reversalStatus?: string | null },
): AdminTransferExecutionDto {
  const reversedCents = Number(extra?.reversedCents ?? 0);
  const amountCents = row.amount_cents;
  return {
    id: row.id,
    entryId: row.payout_eligibility_entry_id,
    orderId: row.planned_package_order_id,
    status: row.status,
    amountCents,
    currency: row.currency,
    stripeTransferId: row.stripe_transfer_id,
    stripeDestinationAccountId: row.stripe_destination_account_id,
    executedBy: row.executed_by,
    executedAt: row.executed_at,
    failureCode: row.failure_code,
    failureMessage: row.failure_message,
    reversedCents,
    reversalStatus: extra?.reversalStatus ?? null,
    remainingReversibleCents: calculateRemainingReversibleTransferAmount({
      transferAmountCents: amountCents,
      reversedCents,
    }),
  };
}

export async function loadAdminTransferExecutionsForOrder(
  admin: AdminClient,
  orderId: string,
): Promise<Map<string, AdminTransferExecutionDto>> {
  const { data, error } = await admin
    .from("planned_package_transfer_executions")
    .select("*")
    .eq("planned_package_order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/planned-package-transfers] load failed", error.message);
    return new Map();
  }

  const map = new Map<string, AdminTransferExecutionDto>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const entryId = String(row.payout_eligibility_entry_id ?? "");
    if (!entryId || map.has(entryId)) continue;
    map.set(
      entryId,
      mapExecutionDto(
        {
          id: String(row.id ?? ""),
          planned_package_order_id: String(row.planned_package_order_id ?? ""),
          payout_eligibility_entry_id: entryId,
          booking_id: String(row.booking_id ?? ""),
          teacher_id: String(row.teacher_id ?? ""),
          student_id: String(row.student_id ?? ""),
          teacher_offer_id: (row.teacher_offer_id as string | null) ?? null,
          executed_by: String(row.executed_by ?? ""),
          status: String(row.status ?? ""),
          amount_cents: Number(row.amount_cents ?? 0),
          currency: String(row.currency ?? "CAD"),
          stripe_transfer_id: (row.stripe_transfer_id as string | null) ?? null,
          stripe_transfer_group: (row.stripe_transfer_group as string | null) ?? null,
          stripe_destination_account_id: (row.stripe_destination_account_id as string | null) ?? null,
          idempotency_key: String(row.idempotency_key ?? ""),
          failure_code: (row.failure_code as string | null) ?? null,
          failure_message: (row.failure_message as string | null) ?? null,
          executed_at: (row.executed_at as string | null) ?? null,
          created_at: String(row.created_at ?? ""),
          updated_at: String(row.updated_at ?? ""),
        },
        {
          reversedCents: Number(row.reversed_cents ?? 0),
          reversalStatus: (row.reversal_status as string | null) ?? null,
        },
      ),
    );
  }
  return map;
}

export async function adminExecutePlannedPackageManualTransfer(args: {
  admin: AdminClient;
  orderId: string;
  entryId: string;
  adminUserId: string;
}): Promise<
  | {
      ok: true;
      execution: AdminTransferExecutionDto;
      reusedExisting: boolean;
      noTransferReversalExecuted: true;
      noPayoutReleased: true;
      noStripeRefundExecuted: true;
    }
  | { ok: false; status: number; error: string; blockers?: string[] }
> {
  if (!canUsePlannedPackageManualTransfers()) {
    return { ok: false, status: 403, error: "manual_transfers_disabled" };
  }
  if (!canExecutePlannedPackageTransferInCurrentEnvironment()) {
    return { ok: false, status: 403, error: "legal_review_required" };
  }

  const { data: entry } = await args.admin
    .from("planned_package_payout_eligibility_entries")
    .select("planned_package_order_id")
    .eq("id", args.entryId)
    .maybeSingle();

  if (!entry) {
    return { ok: false, status: 404, error: "eligibility_entry_not_found" };
  }

  if (String(entry.planned_package_order_id ?? "") !== args.orderId) {
    return { ok: false, status: 404, error: "eligibility_entry_not_found" };
  }

  const result = await executeApprovedPlannedPackageTransfer({
    admin: args.admin,
    payoutEligibilityEntryId: args.entryId,
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
    execution: mapExecutionDto(result.execution),
    reusedExisting: result.reusedExisting,
    noTransferReversalExecuted: true,
    noPayoutReleased: true,
    noStripeRefundExecuted: true,
  };
}

export function getManualTransferAdminFlags() {
  return {
    manualTransfersEnabled: canUsePlannedPackageManualTransfers(),
    manualTransfersFlagOn: isPlannedPackageManualTransfersEnabled(),
    canExecuteInEnvironment: canExecutePlannedPackageTransferInCurrentEnvironment(),
  };
}
