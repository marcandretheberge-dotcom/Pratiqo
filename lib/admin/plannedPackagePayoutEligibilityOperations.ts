/**
 * Admin planned package payout eligibility operations — ledger only, no Stripe transfer.
 */

import type { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  canShowPlannedPackagePayoutAdminView,
  canUsePlannedPackagePayoutEligibilityLedger,
  isPlannedPackagePayoutAdminViewEnabled,
  isPlannedPackagePayoutEligibilityLedgerEnabled,
} from "@/lib/offers/plannedPackagePayoutEligibilityLedger";
import {
  listPlannedPackagePayoutEligibilityForOrder,
  syncPlannedPackagePayoutEligibilityForOrder,
  type PlannedPackagePayoutEligibilityEntryDto,
} from "@/lib/offers/plannedPackagePayoutEligibility";
import {
  getManualTransferAdminFlags,
  loadAdminTransferExecutionsForOrder,
  type AdminTransferExecutionDto,
} from "@/lib/admin/plannedPackageTransferOperations";
import { canExecutePlannedPackageTransferInCurrentEnvironment } from "@/lib/offers/plannedPackageManualTransfer";
import {
  getManualTransferReversalAdminFlags,
  loadAdminTransferReversalsForOrder,
  type AdminTransferReversalExecutionDto,
} from "@/lib/admin/plannedPackageTransferReversalOperations";
import { canExecutePlannedPackageTransferReversalInCurrentEnvironment } from "@/lib/offers/plannedPackageTransferReversal";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export type AdminPlannedPackagePayoutEligibilityEntry = PlannedPackagePayoutEligibilityEntryDto & {
  latestTransferExecution: AdminTransferExecutionDto | null;
  latestTransferReversalExecution: AdminTransferReversalExecutionDto | null;
  canExecuteManualTransfer: boolean;
  canExecuteManualTransferReversal: boolean;
};

export type AdminPlannedPackagePayoutEligibilityContext = {
  enabled: boolean;
  adminViewEnabled: boolean;
  manualTransfersEnabled: boolean;
  manualTransferReversalsEnabled: boolean;
  canExecuteManualTransfer: boolean;
  canExecuteManualTransferReversal: boolean;
  entries: AdminPlannedPackagePayoutEligibilityEntry[];
  noAutomaticPayoutCron: true;
};

export async function getAdminPlannedPackagePayoutEligibilityContext(
  admin: AdminClient,
  orderId: string,
): Promise<AdminPlannedPackagePayoutEligibilityContext> {
  const enabled = canUsePlannedPackagePayoutEligibilityLedger();
  const adminViewEnabled = canShowPlannedPackagePayoutAdminView();

  if (!enabled) {
    const flags = getManualTransferAdminFlags();
    const reversalFlags = getManualTransferReversalAdminFlags();
    return {
      enabled: false,
      adminViewEnabled: isPlannedPackagePayoutAdminViewEnabled(),
      manualTransfersEnabled: flags.manualTransfersEnabled,
      manualTransferReversalsEnabled: reversalFlags.manualTransferReversalsEnabled,
      canExecuteManualTransfer: false,
      canExecuteManualTransferReversal: false,
      entries: [],
      noAutomaticPayoutCron: true,
    };
  }

  const [entries, transferMap, reversalMap] = await Promise.all([
    listPlannedPackagePayoutEligibilityForOrder(admin, orderId),
    loadAdminTransferExecutionsForOrder(admin, orderId),
    loadAdminTransferReversalsForOrder(admin, orderId),
  ]);

  const flags = getManualTransferAdminFlags();
  const reversalFlags = getManualTransferReversalAdminFlags();
  const canExecute = flags.manualTransfersEnabled && canExecutePlannedPackageTransferInCurrentEnvironment();
  const canExecuteReversal =
    reversalFlags.manualTransferReversalsEnabled &&
    canExecutePlannedPackageTransferReversalInCurrentEnvironment();

  const enriched: AdminPlannedPackagePayoutEligibilityEntry[] = entries.map((entry) => {
    const latestTransferExecution = transferMap.get(entry.id) ?? null;
    const latestTransferReversalExecution = latestTransferExecution
      ? (reversalMap.get(latestTransferExecution.id) ?? null)
      : null;
    const canExecuteManualTransfer =
      canExecute &&
      entry.status === "eligible" &&
      entry.teacherNetCents != null &&
      entry.teacherNetCents > 0 &&
      entry.transferStatus !== "transferred" &&
      !entry.stripeTransferId &&
      latestTransferExecution?.status !== "succeeded";
    const canExecuteManualTransferReversal =
      canExecuteReversal &&
      latestTransferExecution?.status === "succeeded" &&
      latestTransferExecution.remainingReversibleCents > 0;
    return {
      ...entry,
      latestTransferExecution,
      latestTransferReversalExecution,
      canExecuteManualTransfer,
      canExecuteManualTransferReversal,
    };
  });

  return {
    enabled: true,
    adminViewEnabled,
    manualTransfersEnabled: flags.manualTransfersEnabled,
    manualTransferReversalsEnabled: reversalFlags.manualTransferReversalsEnabled,
    canExecuteManualTransfer: canExecute,
    canExecuteManualTransferReversal: canExecuteReversal,
    entries: enriched,
    noAutomaticPayoutCron: true,
  };
}

export async function adminSyncPlannedPackagePayoutEligibility(args: {
  admin: AdminClient;
  orderId: string;
}): Promise<
  | {
      ok: true;
      entries: AdminPlannedPackagePayoutEligibilityEntry[];
      noAutomaticPayoutCron: true;
    }
  | { ok: false; status: number; error: string }
> {
  if (!canUsePlannedPackagePayoutEligibilityLedger()) {
    return { ok: false, status: 403, error: "payout_eligibility_disabled" };
  }

  const result = await syncPlannedPackagePayoutEligibilityForOrder({
    admin: args.admin,
    orderId: args.orderId,
  });

  if (!result.ok) {
    const status =
      result.error === "order_not_found"
        ? 404
        : result.error === "order_not_fulfilled" || result.error === "no_package_bookings"
          ? 409
          : 403;
    return { ok: false, status, error: result.error };
  }

  const entries = await getAdminPlannedPackagePayoutEligibilityContext(args.admin, args.orderId);

  return {
    ok: true,
    entries: entries.entries,
    noAutomaticPayoutCron: true,
  };
}
