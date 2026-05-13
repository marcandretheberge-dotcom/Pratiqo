import type { TranslationKey } from "./translations";

export type TeacherTrustKey = "email" | "identity" | "zone" | "diploma" | "background";
export type TeacherTrustStatus = "verified" | "pending" | "missing" | "provided";

export type VerificationStatus = "not_started" | "pending" | "verified" | "rejected" | "needs_review" | "expired";
export type CredentialVerificationMethod =
  | "mycreds"
  | "institution_direct"
  | "official_registry"
  | "document_review"
  | "reference_check"
  | "platform_history"
  | "manual";
export type CredentialConfidenceLevel = "low" | "medium" | "high" | "official";

export type TeacherCredentialType = "degree" | "certificate" | "license" | "experience" | "portfolio";

export type TeacherCredential = {
  id: string;
  teacherId: string;
  type: TeacherCredentialType;
  title: string;
  institutionName: string | null;
  country: string | null;
  issuedYear: number | null;
  verificationStatus: VerificationStatus;
  verificationMethod: CredentialVerificationMethod | null;
  confidenceLevel: CredentialConfidenceLevel | null;
  publicLabel: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
};

export type TeacherIdentityVerification = {
  status: VerificationStatus;
  provider: "stripe_identity";
  verifiedAt: string | null;
  verifiedCountry: string | null;
};

export type TrustBadgeStrength = "basic" | "strong" | "official";
export type TrustBadgeKey =
  | "identity_verified"
  | "official_credential_verified"
  | "qualification_reviewed"
  | "experience_confirmed"
  | "pratiqo_profile_verified";

export type TrustBadge = {
  key: TrustBadgeKey;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  strength: TrustBadgeStrength;
};

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
  diplomaPending?: boolean | null;
  locationVerificationStatus?: string | null;
  cvSummary?: string | null;
  cvVerificationStatus?: string | null;
  bio?: string | null;
};

function normalizedStatus(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function isIdentityVerified(input: TeacherTrustInput): boolean {
  const identityStatus = normalizedStatus(input.identityStatus);
  const stripeIdentityStatus = normalizedStatus(input.stripeIdentityStatus);
  return (
    Boolean(input.identityVerified) ||
    identityStatus === "verified" ||
    stripeIdentityStatus === "verified"
  );
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
  const identityVerified = isIdentityVerified(input);

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
  } else if (input.diplomaPending) {
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

export function buildTeacherTrustBadges(input: {
  identity: TeacherTrustInput;
  credentials: TeacherCredential[];
  completedLessonsCount?: number | null;
  averageRating?: number | null;
}): TrustBadge[] {
  const identityVerified = isIdentityVerified(input.identity);
  if (!identityVerified) return [];

  const verified = input.credentials.filter((c) => c.verificationStatus === "verified");
  const officialCredential = verified.find((c) => {
    const isDegreeLike = c.type === "degree" || c.type === "certificate" || c.type === "license";
    const methodOk = c.verificationMethod === "mycreds" || c.verificationMethod === "institution_direct" || c.verificationMethod === "official_registry";
    return isDegreeLike && methodOk && c.confidenceLevel === "official";
  });

  const qualificationReviewed = officialCredential
    ? null
    : verified.find((c) => {
        const isDegreeLike = c.type === "degree" || c.type === "certificate" || c.type === "license";
        const conf = c.confidenceLevel;
        return isDegreeLike && (conf === "high" || conf === "medium");
      });

  const experienceConfirmed = verified.find((c) => (c.type === "experience" || c.type === "portfolio"));

  const badges: TrustBadge[] = [
    {
      key: "identity_verified",
      labelKey: "trustBadgeIdentityVerified",
      descriptionKey: "trustBadgeIdentityVerifiedDescription",
      strength: "strong",
    },
  ];

  if (officialCredential) {
    badges.push({
      key: "official_credential_verified",
      labelKey: "trustBadgeOfficialCredentialVerified",
      descriptionKey: "trustBadgeOfficialCredentialVerifiedDescription",
      strength: "official",
    });
  } else if (qualificationReviewed) {
    badges.push({
      key: "qualification_reviewed",
      labelKey: "trustBadgeQualificationReviewed",
      descriptionKey: "trustBadgeQualificationReviewedDescription",
      strength: "strong",
    });
  }

  if (experienceConfirmed) {
    badges.push({
      key: "experience_confirmed",
      labelKey: "trustBadgeExperienceConfirmed",
      descriptionKey: "trustBadgeExperienceConfirmedDescription",
      strength: "basic",
    });
  }

  if (badges.length >= 2) {
    badges.push({
      key: "pratiqo_profile_verified",
      labelKey: "trustBadgePratiqoProfileVerified",
      descriptionKey: "trustBadgePratiqoProfileVerifiedDescription",
      strength: officialCredential ? "official" : "strong",
    });
  }

  return badges;
}
