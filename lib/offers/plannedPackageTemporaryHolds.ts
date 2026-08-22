/**
 * Planned package temporary holds / pending orders — no payment.
 *
 * Requires planned packages + session drafts + preflight + ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS.
 */

import { canUsePlannedPackageCheckoutPreflight } from "./plannedPackageCheckoutPreflight";
import { isPlannedPackagesEnabled } from "./plannedPackages";

export const ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS_FLAG =
  "ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS";
export const NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS_FLAG =
  "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS";

export const DEFAULT_PLANNED_PACKAGE_HOLD_MINUTES = 15;

export type PlannedPackagePendingOrderStatus =
  | "pending_payment"
  | "expired"
  | "cancelled"
  | "paid";

export type PlannedPackageSessionHoldStatus =
  | "active"
  | "expired"
  | "cancelled"
  | "converted";

export type PlannedPackageSessionHoldDto = {
  id: string;
  sessionIndex: number;
  startsAt: string;
  endsAt: string;
  status: PlannedPackageSessionHoldStatus;
  expiresAt: string;
};

export type PlannedPackagePendingOrderDto = {
  id: string;
  draftId: string;
  studentId: string;
  teacherId: string;
  teacherOfferId: string;
  status: PlannedPackagePendingOrderStatus;
  sessionCount: number;
  durationMinutes: number;
  priceCentsSnapshot: number;
  currencySnapshot: string;
  titleSnapshot: string;
  holdExpiresAt: string;
  createdAt: string;
  updatedAt: string;
  holds: PlannedPackageSessionHoldDto[];
};

export function isPlannedPackageTemporaryHoldsEnabled(): boolean {
  return (
    process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS === "true"
  );
}

export function isPlannedPackageTemporaryHoldsUiEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES === "true" &&
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS === "true" &&
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT === "true" &&
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS === "true"
  );
}

export function canUsePlannedPackageTemporaryHolds(): boolean {
  return (
    isPlannedPackagesEnabled() &&
    canUsePlannedPackageCheckoutPreflight() &&
    isPlannedPackageTemporaryHoldsEnabled()
  );
}

export function getPlannedPackageHoldMinutes(): number {
  const raw = Number(process.env.PLANNED_PACKAGE_HOLD_MINUTES);
  if (Number.isFinite(raw) && raw >= 5 && raw <= 60) return Math.floor(raw);
  return DEFAULT_PLANNED_PACKAGE_HOLD_MINUTES;
}

/** Lazy expiration: active + expires_at > now. */
export function isActiveHold(
  hold: { status: string; expiresAt: string } | { status: string; expires_at: string },
  now: Date = new Date(),
): boolean {
  if (hold.status !== "active") return false;
  const expiresAt =
    "expiresAt" in hold && typeof hold.expiresAt === "string"
      ? hold.expiresAt
      : "expires_at" in hold
        ? hold.expires_at
        : "";
  const expires = new Date(expiresAt).getTime();
  if (!Number.isFinite(expires)) return false;
  return expires > now.getTime();
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  if (![as, ae, bs, be].every(Number.isFinite)) return false;
  return as < be && bs < ae;
}
