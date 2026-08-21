import { isPackageEntitlementsEnabled } from "@/lib/offers/packageEntitlements";
import {
  canDraftPlannedPackageOffers,
  isPlannedPackageOfferType,
} from "@/lib/offers/plannedPackages";
import { TEACHER_OFFER_MVP_TYPES, type TeacherOfferType } from "@/lib/offers/types";

/**
 * Offer types shown in the create/edit form.
 * Planned package (`package`) is shown when ENABLE_PLANNED_PACKAGES is ON
 * (draft skeleton) or when entitlements are ON (legacy path).
 * Existing package drafts remain editable when flags are OFF.
 */
export function getTeacherOfferFormTypes(
  currentType?: TeacherOfferType | "" | null,
): readonly TeacherOfferType[] {
  const includePackage = canDraftPlannedPackageOffers() || isPackageEntitlementsEnabled();
  if (includePackage) {
    return TEACHER_OFFER_MVP_TYPES;
  }
  const base = TEACHER_OFFER_MVP_TYPES.filter((type) => type !== "package");
  if (isPlannedPackageOfferType(currentType)) {
    return [...base, "package"];
  }
  return base;
}

export function isTeacherOfferPackageTypeAvailable(): boolean {
  return canDraftPlannedPackageOffers() || isPackageEntitlementsEnabled();
}
