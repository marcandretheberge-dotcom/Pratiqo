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

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export type AdminPlannedPackagePayoutEligibilityContext = {
  enabled: boolean;
  adminViewEnabled: boolean;
  entries: PlannedPackagePayoutEligibilityEntryDto[];
  noStripeTransferCreated: true;
  noPayoutReleased: true;
};

export async function getAdminPlannedPackagePayoutEligibilityContext(
  admin: AdminClient,
  orderId: string,
): Promise<AdminPlannedPackagePayoutEligibilityContext> {
  const enabled = canUsePlannedPackagePayoutEligibilityLedger();
  const adminViewEnabled = canShowPlannedPackagePayoutAdminView();

  if (!enabled) {
    return {
      enabled: false,
      adminViewEnabled: isPlannedPackagePayoutEligibilityLedgerEnabled(),
      entries: [],
      noStripeTransferCreated: true,
      noPayoutReleased: true,
    };
  }

  const entries = await listPlannedPackagePayoutEligibilityForOrder(admin, orderId);

  return {
    enabled: true,
    adminViewEnabled,
    entries,
    noStripeTransferCreated: true,
    noPayoutReleased: true,
  };
}

export async function adminSyncPlannedPackagePayoutEligibility(args: {
  admin: AdminClient;
  orderId: string;
}): Promise<
  | {
      ok: true;
      entries: PlannedPackagePayoutEligibilityEntryDto[];
      noStripeTransferCreated: true;
      noPayoutReleased: true;
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

  const entries = await listPlannedPackagePayoutEligibilityForOrder(args.admin, args.orderId);

  return {
    ok: true,
    entries,
    noStripeTransferCreated: true,
    noPayoutReleased: true,
  };
}
