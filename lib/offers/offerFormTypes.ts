import { isPackageEntitlementsEnabled } from "@/lib/offers/packageEntitlements";
import { TEACHER_OFFER_MVP_TYPES, type TeacherOfferType } from "@/lib/offers/types";

/**
 * Offer types shown in the create/edit form.
 * Package/forfait stays hidden until package entitlements launch is enabled —
 * does not flip any env flags.
 * Existing package drafts remain editable (type kept in the list).
 */
export function getTeacherOfferFormTypes(
  currentType?: TeacherOfferType | "" | null,
): readonly TeacherOfferType[] {
  if (isPackageEntitlementsEnabled()) {
    return TEACHER_OFFER_MVP_TYPES;
  }
  const base = TEACHER_OFFER_MVP_TYPES.filter((type) => type !== "package");
  if (currentType === "package") {
    return [...base, "package"];
  }
  return base;
}

export function isTeacherOfferPackageTypeAvailable(): boolean {
  return isPackageEntitlementsEnabled();
}
