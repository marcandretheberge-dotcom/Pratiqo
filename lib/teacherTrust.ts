import type { TranslationKey } from "./translations";

export type TeacherTrustKey = "email" | "identity" | "zone" | "diploma" | "background";
export type TeacherTrustStatus = "verified" | "pending" | "missing" | "provided";

export type TeacherTrustItem = {
  key: TeacherTrustKey;
  status: TeacherTrustStatus;
  publicLabelKey: TranslationKey;
  publicDescriptionKey: TranslationKey;
  icon?: "mail" | "shield" | "map" | "diploma" | "briefcase";
};

export type TeacherTrustInput = {
  isVerified?: boolean | null;
  identityVerified?: boolean | null;
  identityStatus?: string | null;
  stripeIdentityStatus?: string | null;
  diplomaVerified?: boolean | null;
  diplomaUrl?: string | null;
  locationVerificationStatus?: string | null;
  cvSummary?: string | null;
  cvVerificationStatus?: string | null;
  bio?: string | null;
};

function normalizedStatus(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

export function buildTeacherTrustItems(input: TeacherTrustInput): TeacherTrustItem[] {
  const items: TeacherTrustItem[] = [
    {
      key: "email",
      status: "verified",
      publicLabelKey: "trustEmailVerified",
      publicDescriptionKey: "trustEmailVerifiedDescription",
      icon: "mail",
    },
  ];

  const identityStatus = normalizedStatus(input.identityStatus);
  const stripeIdentityStatus = normalizedStatus(input.stripeIdentityStatus);
  const identityVerified =
    Boolean(input.identityVerified) ||
    identityStatus === "verified" ||
    stripeIdentityStatus === "verified";

  if (identityVerified) {
    items.push({
      key: "identity",
      status: "verified",
      publicLabelKey: "trustIdentityVerified",
      publicDescriptionKey: "trustIdentityVerifiedDescription",
      icon: "shield",
    });
  } else if (identityStatus === "pending" || stripeIdentityStatus === "requires_input" || stripeIdentityStatus === "processing") {
    items.push({
      key: "identity",
      status: "pending",
      publicLabelKey: "trustIdentityPending",
      publicDescriptionKey: "trustIdentityPendingDescription",
      icon: "shield",
    });
  }

  const locationStatus = normalizedStatus(input.locationVerificationStatus);
  if (locationStatus === "verified") {
    items.push({
      key: "zone",
      status: "verified",
      publicLabelKey: "trustZoneVerified",
      publicDescriptionKey: "trustZoneVerifiedDescription",
      icon: "map",
    });
  } else if (locationStatus === "pending") {
    items.push({
      key: "zone",
      status: "pending",
      publicLabelKey: "trustZonePending",
      publicDescriptionKey: "trustZonePendingDescription",
      icon: "map",
    });
  }

  if (input.diplomaVerified) {
    items.push({
      key: "diploma",
      status: "verified",
      publicLabelKey: "trustDiplomaVerified",
      publicDescriptionKey: "trustDiplomaVerifiedDescription",
      icon: "diploma",
    });
  } else if (input.diplomaUrl) {
    items.push({
      key: "diploma",
      status: "pending",
      publicLabelKey: "trustDiplomaPending",
      publicDescriptionKey: "trustDiplomaPendingDescription",
      icon: "diploma",
    });
  }

  const cvStatus = normalizedStatus(input.cvVerificationStatus);
  if (cvStatus === "verified") {
    items.push({
      key: "background",
      status: "verified",
      publicLabelKey: "trustBackgroundVerified",
      publicDescriptionKey: "trustBackgroundVerifiedDescription",
      icon: "briefcase",
    });
  } else if (cvStatus === "provided" || cvStatus === "pending" || Boolean(input.cvSummary?.trim()) || Boolean(input.bio?.trim())) {
    items.push({
      key: "background",
      status: cvStatus === "pending" ? "pending" : "provided",
      publicLabelKey: "trustBackgroundProvided",
      publicDescriptionKey: "trustBackgroundProvidedDescription",
      icon: "briefcase",
    });
  }

  return items;
}

export function getPublicTeacherTrustBadgeKey(items: TeacherTrustItem[]): TranslationKey | null {
  const hasPending = items.some((item) => item.status === "pending");
  const verifiedCount = items.filter((item) => item.status === "verified" && item.key !== "email").length;
  const identityVerified = items.some((item) => item.key === "identity" && item.status === "verified");

  if (identityVerified && verifiedCount >= 2) return "trustProfileVerified";
  if (identityVerified) return "trustIdentityVerified";
  if (hasPending) return "trustProfilePending";
  return null;
}
