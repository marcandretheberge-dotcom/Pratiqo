import type { TranslationKey } from "@/lib/translations";
import { isFounderTeacher } from "@/lib/teachers/founderTeachers";

export type TeacherBadgeType = "trust" | "marketplace" | "product";
export type TeacherBadgeIcon = "shield" | "diploma" | "sparkles" | "star" | "pro" | "experience";
export type TeacherBadgeId =
  | "identity_verified"
  | "verified_experience"
  | "diploma_verified"
  | "founder"
  | "new_teacher"
  | "pro";

export type TeacherBadge = {
  id: TeacherBadgeId;
  labelKey: TranslationKey;
  descriptionKey?: TranslationKey;
  type: TeacherBadgeType;
  icon: TeacherBadgeIcon;
  priority: number;
};

export type PublicTeacherCredentialLike = {
  type?: string | null;
  verificationStatus?: string | null;
  verification_status?: string | null;
};

export type TeacherBadgeInput = {
  teacherId?: string | null;
  identityVerified?: boolean | null;
  identityStatus?: string | null;
  stripeIdentityStatus?: string | null;
  diplomaVerified?: boolean | null;
  credentials?: PublicTeacherCredentialLike[] | null;
  profilePlan?: string | null;
  reviewCount?: number | null;
  founder?: boolean | null;
  /**
   * Admin-controlled "Expérience vérifiée" badge. Source of truth:
   * `public.teachers.verified_experience_active` (migration 081). Admin
   * toggles only — NEVER auto-derived from diploma/CV uploads. Reads
   * are projected through `list_public_teachers()`; the admin actor /
   * timestamp stay strictly server-side.
   */
  verifiedExperience?: boolean | null;
};

function normalized(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

export function isPublicTeacherIdentityVerified(input: Pick<TeacherBadgeInput, "identityVerified" | "identityStatus" | "stripeIdentityStatus">): boolean {
  return (
    Boolean(input.identityVerified) ||
    normalized(input.identityStatus) === "verified" ||
    normalized(input.stripeIdentityStatus) === "verified"
  );
}

export function hasVerifiedDiplomaEvidence(input: Pick<TeacherBadgeInput, "diplomaVerified" | "credentials">): boolean {
  if (Boolean(input.diplomaVerified)) return true;

  return (input.credentials ?? []).some((credential) => {
    const status = normalized(credential.verificationStatus ?? credential.verification_status);
    const type = normalized(credential.type);
    return status === "verified" && (type === "degree" || type === "certificate" || type === "license");
  });
}

export function hasPublicTeacherReviews(input: { rating?: number | null; reviewCount?: number | null }): boolean {
  const rating = Number(input.rating ?? 0);
  const reviewCount = Number(input.reviewCount ?? 0);
  return Number.isFinite(rating) && rating > 0 && Number.isFinite(reviewCount) && reviewCount > 0;
}

function isProPlan(plan: string | null | undefined): boolean {
  const normalizedPlan = normalized(plan);
  return normalizedPlan === "pro" || normalizedPlan === "enterprise";
}

export function buildTeacherBadges(input: TeacherBadgeInput): TeacherBadge[] {
  const badges: TeacherBadge[] = [];

  if (isPublicTeacherIdentityVerified(input)) {
    badges.push({
      id: "identity_verified",
      labelKey: "teacherBadgeIdentityVerified",
      descriptionKey: "teacherTrustIdentityVerifiedDescription",
      type: "trust",
      icon: "shield",
      priority: 10,
    });
  }

  // Admin-controlled "Expérience vérifiée". Slotted at priority 15 so it
  // appears right after identity (10) and before founder (20) in the
  // headline slot. Compact (2-badge) cards therefore promote it ahead of
  // the marketplace founder pill, which is intentional — experience is a
  // trust signal, founder is a marketing signal.
  if (input.verifiedExperience === true) {
    badges.push({
      id: "verified_experience",
      labelKey: "teacherBadgeVerifiedExperience",
      descriptionKey: "teacherBadgeVerifiedExperienceDescription",
      type: "trust",
      icon: "experience",
      priority: 15,
    });
  }

  if (input.founder === true || (input.founder == null && isFounderTeacher(input.teacherId))) {
    badges.push({
      id: "founder",
      labelKey: "teacherBadgeFounder",
      descriptionKey: "teacherBadgeFounderDescription",
      type: "marketplace",
      icon: "sparkles",
      priority: 20,
    });
  }

  if (hasVerifiedDiplomaEvidence(input)) {
    badges.push({
      id: "diploma_verified",
      labelKey: "teacherBadgeDiplomaVerified",
      descriptionKey: "trustDiplomaVerifiedDescription",
      type: "trust",
      icon: "diploma",
      priority: 30,
    });
  }

  if (Number(input.reviewCount ?? 0) <= 0) {
    badges.push({
      id: "new_teacher",
      labelKey: "teacherBadgeNewTeacher",
      type: "marketplace",
      icon: "star",
      priority: 40,
    });
  }

  if (isProPlan(input.profilePlan)) {
    badges.push({
      id: "pro",
      labelKey: "teacherBadgePro",
      descriptionKey: "teacherBadgeProDescription",
      type: "product",
      icon: "pro",
      priority: 50,
    });
  }

  const unique = new Map<TeacherBadgeId, TeacherBadge>();
  for (const badge of badges) {
    if (!unique.has(badge.id)) unique.set(badge.id, badge);
  }

  return [...unique.values()].sort((a, b) => a.priority - b.priority);
}

export function getCompactTeacherBadges(input: TeacherBadgeInput, max = 2): TeacherBadge[] {
  return buildTeacherBadges(input).slice(0, Math.max(0, max));
}
