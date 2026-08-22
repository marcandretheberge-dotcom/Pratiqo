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

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export type AdminPlannedPackagePayoutEligibilityEntry = PlannedPackagePayoutEligibilityEntryDto & {
  latestTransferExecution: AdminTransferExecutionDto | null;
  canExecuteManualTransfer: boolean;
};

export type AdminPlannedPackagePayoutEligibilityContext = {
  enabled: boolean;
  adminViewEnabled: boolean;
  manualTransfersEnabled: boolean;
  canExecuteManualTransfer: boolean;
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
    return {
      enabled: false,
      adminViewEnabled: isPlannedPackagePayoutAdminViewEnabled(),
      manualTransfersEnabled: flags.manualTransfersEnabled,
      canExecuteManualTransfer: false,
      entries: [],
      noAutomaticPayoutCron: true,
    };
  }

  const [entries, transferMap] = await Promise.all([
    listPlannedPackagePayoutEligibilityForOrder(admin, orderId),
    loadAdminTransferExecutionsForOrder(admin, orderId),
  ]);

  const flags = getManualTransferAdminFlags();
  const canExecute = flags.manualTransfersEnabled && canExecutePlannedPackageTransferInCurrentEnvironment();

  const enriched: AdminPlannedPackagePayoutEligibilityEntry[] = entries.map((entry) => {
    const latestTransferExecution = transferMap.get(entry.id) ?? null;
    const canExecuteManualTransfer =
      canExecute &&
      entry.status === "eligible" &&
      entry.teacherNetCents != null &&
      entry.teacherNetCents > 0 &&
      entry.transferStatus !== "transferred" &&
      !entry.stripeTransferId &&
      latestTransferExecution?.status !== "succeeded";
    return {
      ...entry,
      latestTransferExecution,
      canExecuteManualTransfer,
    };
  });

  return {
    enabled: true,
    adminViewEnabled,
    manualTransfersEnabled: flags.manualTransfersEnabled,
    canExecuteManualTransfer: canExecute,
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
