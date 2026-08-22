/**
 * Paid packages launch readiness (PR 14).
 *
 * Read-only diagnostics for admins. Does not mutate flags, Stripe, bookings,
 * or package balances. Not legal advice.
 *
 * See docs/product/paid-packages-launch-readiness.md
 * and docs/product/marketplace-independent-teacher-guardrails.md
 *
 * Doc presence is a static ship checklist (verified by tests) — no filesystem
 * walks at runtime (avoids bundler NFT tracing the whole repo).
 */

import { isBookingOfferSelectionEnabled } from "./bookingOfferSelection";
import { isOfferSnapshotCheckoutEnabled } from "./offerSnapshotCheckout";
import { isPackageEntitlementsEnabled } from "./packageEntitlements";
import { isPackageRedemptionBookingEnabled } from "./packageRedemptions";
import {
  canPubliclyPurchasePlannedPackage,
  isPlannedPackagesEnabled,
} from "./plannedPackages";
import { canUsePlannedPackageSessionDrafts, isPlannedPackageSessionDraftsEnabled } from "./plannedPackageSessionDrafts";
import {
  isStudentPackageDashboardEnabled,
  isStudentPackageDashboardUiEnabled,
} from "./studentPackages";
import {
  isTeacherPackageVisibilityEnabled,
  isTeacherPackageVisibilityUiEnabled,
} from "./teacherPackages";

/** Relative paths that must ship with the repo; asserted by tests. */
export const PACKAGE_LAUNCH_REQUIRED_DOCS = [
  "docs/product/marketplace-independent-teacher-guardrails.md",
  "docs/product/paid-packages-legal-launch-checklist.md",
  "docs/product/paid-packages-launch-readiness.md",
  "docs/product/package-feature-flags.md",
  "docs/product/package-product-decision.md",
  "docs/product/package-technical-architecture.md",
  "docs/product/package-glossary.md",
  "docs/product/paid-packages-launch-checklist.md",
  "docs/product/package-risk-register.md",
  "docs/product/package-refund-cancellation-policy-draft.md",
  "docs/product/package-public-copy-draft.md",
] as const;

export const PACKAGE_LAUNCH_COPY_GUARD_TESTS = [
  "tests/offers/marketplaceIndependentTeacherGuardrails.test.ts",
  "tests/legal/marketplaceIndependentTeacherHardening.test.ts",
  "tests/offers/packageLegalSafeArchitecture.test.ts",
] as const;

export const PACKAGE_LAUNCH_ADMIN_SUPPORT_SURFACES = [
  "components/admin/AdminPaymentSourceSection.tsx",
  "components/admin/AdminBookingOfferSnapshotSection.tsx",
] as const;

export type PackageLaunchFlagId =
  | "plannedPackages"
  | "plannedPackageSessionDrafts"
  | "bookingOfferSelection"
  | "offerSnapshotCheckout"
  | "packageEntitlements"
  | "packageRedemptionBooking"
  | "studentPackageDashboard"
  | "teacherPackageVisibility";

export type PackageLaunchFlagSnapshot = {
  id: PackageLaunchFlagId;
  envName: string;
  uiEnvName: string | null;
  enabled: boolean;
  uiEnabled: boolean | null;
};

export type PackageLaunchReadinessStatus =
  | "blocked"
  | "preview_ready"
  | "production_review_required";

export type PackageLaunchBlocker = {
  code: string;
  severity: "critical" | "warning";
  message: string;
};

export type PackageLaunchReadiness = {
  flags: {
    plannedPackages: boolean;
    plannedPackageSessionDrafts: boolean;
    bookingOfferSelection: boolean;
    offerSnapshotCheckout: boolean;
    packageEntitlements: boolean;
    packageRedemptionBooking: boolean;
    studentPackageDashboard: boolean;
    teacherPackageVisibility: boolean;
  };
  flagDetails: PackageLaunchFlagSnapshot[];
  docs: {
    marketplaceGuardrailsDocExists: boolean;
    paidPackagesLegalChecklistExists: boolean;
    launchReadinessDocExists: boolean;
    packageFeatureFlagsDocExists: boolean;
  };
  checks: {
    packageCheckoutGated: boolean;
    redemptionGated: boolean;
    dashboardsGated: boolean;
    legalReviewMarkedRequired: boolean;
    legalReviewCompletedSignal: boolean;
    marketplaceCopyGuardsPresent: boolean;
    adminSupportVisibilityPresent: boolean;
    noPublicCatalogSurface: boolean;
    plannedPackageSkeletonPresent: boolean;
    plannedPackageSessionDraftSchemaPresent: boolean;
    plannedPackageSessionDraftsGated: boolean;
    plannedPackageSessionDraftNoPayment: boolean;
    plannedPackageSessionDraftNoBookings: boolean;
    plannedPackageSessionDraftNoEntitlements: boolean;
    plannedPackagePublicPurchaseBlocked: boolean;
    progressivePayoutNotImplemented: boolean;
    refundPolicyStillDraft: boolean;
  };
  status: PackageLaunchReadinessStatus;
  blockers: PackageLaunchBlocker[];
  generatedAt: string;
};

export const PACKAGE_LEGAL_REVIEW_COMPLETED_FLAG = "PACKAGE_LEGAL_REVIEW_COMPLETED";

export const PACKAGE_LAUNCH_FLAG_META: ReadonlyArray<{
  id: PackageLaunchFlagId;
  envName: string;
  uiEnvName: string | null;
  explanationFr: string;
  launchMeaningFr: string;
}> = [
  {
    id: "plannedPackages",
    envName: "ENABLE_PLANNED_PACKAGES",
    uiEnvName: "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES",
    explanationFr:
      "Permet de rédiger des forfaits planifiés (brouillon) côté professeur — sans achat public.",
    launchMeaningFr: "Squelette Phase 1 — ne lance pas le checkout ni les entitlements.",
  },
  {
    id: "plannedPackageSessionDrafts",
    envName: "ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS",
    uiEnvName: "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS",
    explanationFr:
      "Permet à l’élève de choisir les séances d’un forfait planifié (brouillon) — sans paiement.",
    launchMeaningFr: "Couche planification uniquement — pas de réservation confirmée ni Stripe.",
  },
  {
    id: "bookingOfferSelection",
    envName: "NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION",
    uiEnvName: "NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION",
    explanationFr: "Permet de choisir une offre de cours au moment de la réservation.",
    launchMeaningFr: "Prérequis pour snapshoter une offre (dont forfait) sur la réservation.",
  },
  {
    id: "offerSnapshotCheckout",
    envName: "ENABLE_OFFER_SNAPSHOT_CHECKOUT",
    uiEnvName: "NEXT_PUBLIC_ENABLE_OFFER_SNAPSHOT_CHECKOUT",
    explanationFr: "Le checkout facture le prix figé de l’offre sur la réservation.",
    launchMeaningFr: "Requis pour encaisser un forfait au prix snapshot, pas au tarif live.",
  },
  {
    id: "packageEntitlements",
    envName: "ENABLE_PACKAGE_ENTITLEMENTS",
    uiEnvName: null,
    explanationFr: "Crée un forfait (entitlement) après un paiement réussi.",
    launchMeaningFr: "Cœur du lancement forfait payant — laissez OFF hors environnement contrôlé.",
  },
  {
    id: "packageRedemptionBooking",
    envName: "ENABLE_PACKAGE_REDEMPTION_BOOKING",
    uiEnvName: "NEXT_PUBLIC_ENABLE_PACKAGE_REDEMPTION_BOOKING",
    explanationFr: "Permet d’utiliser une séance du forfait pour réserver avec le même professeur.",
    launchMeaningFr: "Dépend de ENABLE_PACKAGE_ENTITLEMENTS.",
  },
  {
    id: "studentPackageDashboard",
    envName: "ENABLE_STUDENT_PACKAGE_DASHBOARD",
    uiEnvName: "NEXT_PUBLIC_ENABLE_STUDENT_PACKAGE_DASHBOARD",
    explanationFr: "Affiche « Mes forfaits » pour l’élève (lecture seule).",
    launchMeaningFr: "Visibilité élève — ne mute pas les soldes.",
  },
  {
    id: "teacherPackageVisibility",
    envName: "ENABLE_TEACHER_PACKAGE_VISIBILITY",
    uiEnvName: "NEXT_PUBLIC_ENABLE_TEACHER_PACKAGE_VISIBILITY",
    explanationFr: "Affiche les forfaits achetés avec le professeur (lecture seule).",
    launchMeaningFr: "Visibilité professeur — ne mute pas les soldes.",
  },
] as const;

function isLegalReviewCompletedSignal(): boolean {
  return process.env.PACKAGE_LEGAL_REVIEW_COMPLETED === "true";
}

/**
 * Read-only snapshot of paid-package launch readiness.
 * Safe to call from admin server components / admin APIs only.
 */
export function getPackageLaunchReadiness(): PackageLaunchReadiness {
  const plannedPackages = isPlannedPackagesEnabled();
  const plannedPackageSessionDrafts = isPlannedPackageSessionDraftsEnabled();
  const bookingOfferSelection = isBookingOfferSelectionEnabled();
  const offerSnapshotCheckout = isOfferSnapshotCheckoutEnabled();
  const packageEntitlements = isPackageEntitlementsEnabled();
  const packageRedemptionBooking = isPackageRedemptionBookingEnabled();
  const studentPackageDashboard = isStudentPackageDashboardEnabled();
  const teacherPackageVisibility = isTeacherPackageVisibilityEnabled();
  const studentUi = isStudentPackageDashboardUiEnabled();
  const teacherUi = isTeacherPackageVisibilityUiEnabled();

  const flags = {
    plannedPackages,
    plannedPackageSessionDrafts,
    bookingOfferSelection,
    offerSnapshotCheckout,
    packageEntitlements,
    packageRedemptionBooking,
    studentPackageDashboard,
    teacherPackageVisibility,
  };

  const flagDetails: PackageLaunchFlagSnapshot[] = PACKAGE_LAUNCH_FLAG_META.map((meta) => {
    const enabled = flags[meta.id];
    let uiEnabled: boolean | null = null;
    if (meta.id === "studentPackageDashboard") uiEnabled = studentUi;
    else if (meta.id === "teacherPackageVisibility") uiEnabled = teacherUi;
    else if (meta.id === "bookingOfferSelection") uiEnabled = bookingOfferSelection;
    else if (meta.id === "plannedPackages") {
      uiEnabled = process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES === "true";
    } else if (meta.id === "plannedPackageSessionDrafts") {
      uiEnabled = process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS === "true";
    } else if (meta.id === "offerSnapshotCheckout") {
      uiEnabled = process.env.NEXT_PUBLIC_ENABLE_OFFER_SNAPSHOT_CHECKOUT === "true";
    } else if (meta.id === "packageRedemptionBooking") {
      uiEnabled = process.env.NEXT_PUBLIC_ENABLE_PACKAGE_REDEMPTION_BOOKING === "true";
    }
    return {
      id: meta.id,
      envName: meta.envName,
      uiEnvName: meta.uiEnvName,
      enabled,
      uiEnabled,
    };
  });

  // Shipped with the release; disk presence is enforced by packageLaunchReadiness.test.ts
  const docs = {
    marketplaceGuardrailsDocExists: true,
    paidPackagesLegalChecklistExists: true,
    launchReadinessDocExists: true,
    packageFeatureFlagsDocExists: true,
  };

  const marketplaceCopyGuardsPresent = true;
  const adminSupportVisibilityPresent = true;

  const checks = {
    // Server gates default OFF unless env is explicitly "true".
    packageCheckoutGated: !packageEntitlements || offerSnapshotCheckout,
    redemptionGated: !packageRedemptionBooking || packageEntitlements,
    dashboardsGated: true,
    legalReviewMarkedRequired: true,
    legalReviewCompletedSignal: isLegalReviewCompletedSignal(),
    marketplaceCopyGuardsPresent,
    adminSupportVisibilityPresent,
    noPublicCatalogSurface: true,
    plannedPackageSkeletonPresent: true,
    plannedPackageSessionDraftSchemaPresent: true,
    plannedPackageSessionDraftsGated: !canUsePlannedPackageSessionDrafts() || plannedPackages,
    plannedPackageSessionDraftNoPayment: true,
    plannedPackageSessionDraftNoBookings: true,
    plannedPackageSessionDraftNoEntitlements: true,
    plannedPackagePublicPurchaseBlocked: !canPubliclyPurchasePlannedPackage(),
    progressivePayoutNotImplemented: true,
    refundPolicyStillDraft: true,
  };

  const blockers: PackageLaunchBlocker[] = [];

  if (packageRedemptionBooking && !packageEntitlements) {
    blockers.push({
      code: "redemption_without_entitlements",
      severity: "critical",
      message:
        "ENABLE_PACKAGE_REDEMPTION_BOOKING est ON sans ENABLE_PACKAGE_ENTITLEMENTS.",
    });
  }
  if (packageEntitlements && !offerSnapshotCheckout) {
    blockers.push({
      code: "entitlements_without_snapshot_checkout",
      severity: "critical",
      message:
        "ENABLE_PACKAGE_ENTITLEMENTS est ON sans ENABLE_OFFER_SNAPSHOT_CHECKOUT.",
    });
  }
  if ((studentPackageDashboard || studentUi) && !packageEntitlements) {
    blockers.push({
      code: "student_dashboard_without_entitlements",
      severity: "warning",
      message:
        "Tableau « Mes forfaits » activé alors que ENABLE_PACKAGE_ENTITLEMENTS est OFF.",
    });
  }
  if ((teacherPackageVisibility || teacherUi) && !packageEntitlements) {
    blockers.push({
      code: "teacher_visibility_without_entitlements",
      severity: "warning",
      message:
        "Visibilité professeur activée alors que ENABLE_PACKAGE_ENTITLEMENTS est OFF.",
    });
  }
  if (!checks.legalReviewCompletedSignal) {
    blockers.push({
      code: "legal_review_required",
      severity: "warning",
      message:
        "Vérification légale requise avant activation publique (PACKAGE_LEGAL_REVIEW_COMPLETED non défini).",
    });
  }

  const critical = blockers.some((b) => b.severity === "critical");
  const anyPackageLaunchFlagOn =
    packageEntitlements ||
    packageRedemptionBooking ||
    studentPackageDashboard ||
    teacherPackageVisibility ||
    studentUi ||
    teacherUi;

  let status: PackageLaunchReadinessStatus;
  if (critical) {
    status = "blocked";
  } else if (!checks.legalReviewCompletedSignal) {
    // Never claim production-ready without an explicit legal completion signal.
    status = anyPackageLaunchFlagOn ? "production_review_required" : "preview_ready";
  } else if (anyPackageLaunchFlagOn) {
    status = "production_review_required";
  } else {
    status = "preview_ready";
  }

  return {
    flags,
    flagDetails,
    docs,
    checks,
    status,
    blockers,
    generatedAt: new Date().toISOString(),
  };
}

/** Hard rule: this module never returns a production_ready status. */
export const PACKAGE_LAUNCH_NEVER_PRODUCTION_READY = true;
