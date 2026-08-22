/**
 * Planned package public launch activation profile.
 *
 * Documents the intended ON configuration for public_ready launch.
 * Does NOT hardcode PACKAGE_LEGAL_REVIEW_COMPLETED — production must set it
 * explicitly after real legal sign-off.
 *
 * Runtime still reads process.env; unset flags remain OFF (=== "true" only).
 * See docs/product/planned-package-public-launch-activation.md
 */

import {
  evaluatePlannedPackagePublicLaunchGate,
  getPlannedPackageLaunchMode,
  isPlannedPackagePublicPurchaseEnabled,
  isPlannedPackagePublicPurchaseUiEnabled,
  type PlannedPackageLaunchMode,
} from "./plannedPackagePublicLaunchGate";
import { isPlannedPackagesEnabled, isPackageLegalReviewCompleted } from "./plannedPackages";
import { isPlannedPackageSessionDraftsEnabled } from "./plannedPackageSessionDrafts";
import { isPlannedPackageCheckoutPreflightEnabled } from "./plannedPackageCheckoutPreflight";
import { isPlannedPackageTemporaryHoldsEnabled } from "./plannedPackageTemporaryHolds";
import { isPlannedPackageFulfillmentEngineEnabled } from "./plannedPackageFulfillment";
import { isPlannedPackageStripeCheckoutEnabled } from "./plannedPackageStripeCheckout";
import { isPlannedPackageAdminOpsEnabled } from "./plannedPackageAdminOps";
import {
  isPlannedPackageRefundAdminReviewEnabled,
  isPlannedPackageRefundQuotesEnabled,
} from "./plannedPackageRefundQuotes";
import { isPlannedPackageManualRefundsEnabled } from "./plannedPackageManualRefunds";
import {
  isPlannedPackagePayoutAdminViewEnabled,
  isPlannedPackagePayoutEligibilityLedgerEnabled,
} from "./plannedPackagePayoutEligibilityLedger";
import { isPlannedPackageManualTransfersEnabled } from "./plannedPackageManualTransfers";
import { isPlannedPackageManualTransferReversalsEnabled } from "./plannedPackageManualTransferReversals";
import { isPlannedPackageE2eQaToolsEnabled } from "./plannedPackageE2eQaTools";
import {
  isStudentPlannedPackageDashboardEnabled,
  isStudentPlannedPackageDashboardUiEnabled,
} from "./plannedPackageStudentDashboard";
import {
  isTeacherPlannedPackageDashboardEnabled,
  isTeacherPlannedPackageDashboardUiEnabled,
} from "./plannedPackageTeacherDashboard";

/** Intended launch profile for public activation (env-driven). */
export const PLANNED_PACKAGE_INTENDED_LAUNCH_PROFILE = "public_ready" as const;

/**
 * Flags that must be `true` for the public launch activation profile.
 * Does NOT include PACKAGE_LEGAL_REVIEW_COMPLETED (ops attestation, separate).
 */
export const PLANNED_PACKAGE_PUBLIC_LAUNCH_REQUIRED_FLAGS = [
  "ENABLE_PLANNED_PACKAGES",
  "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES",
  "ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS",
  "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS",
  "ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT",
  "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT",
  "ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS",
  "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS",
  "ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE",
  "ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT",
  "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT",
  "ENABLE_PLANNED_PACKAGE_ADMIN_OPS",
  "ENABLE_PLANNED_PACKAGE_REFUND_QUOTES",
  "ENABLE_PLANNED_PACKAGE_REFUND_ADMIN_REVIEW",
  "ENABLE_PLANNED_PACKAGE_MANUAL_REFUNDS",
  "ENABLE_PLANNED_PACKAGE_PAYOUT_ELIGIBILITY_LEDGER",
  "ENABLE_PLANNED_PACKAGE_PAYOUT_ADMIN_VIEW",
  "ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS",
  "ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFER_REVERSALS",
  "ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS",
  "ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD",
  "NEXT_PUBLIC_ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD",
  "ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD",
  "NEXT_PUBLIC_ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD",
  "ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE",
  "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE",
  "PLANNED_PACKAGE_LAUNCH_MODE",
] as const;

export type PlannedPackageLaunchFlagName =
  (typeof PLANNED_PACKAGE_PUBLIC_LAUNCH_REQUIRED_FLAGS)[number];

export type PlannedPackageLaunchFlagProfile = {
  intendedLaunchProfile: typeof PLANNED_PACKAGE_INTENDED_LAUNCH_PROFILE;
  currentLaunchMode: PlannedPackageLaunchMode;
  allPackageFlagsExpectedOn: true;
  requiredFlags: readonly PlannedPackageLaunchFlagName[];
  missingFlags: PlannedPackageLaunchFlagName[];
  presentFlags: PlannedPackageLaunchFlagName[];
  legalReviewRequired: true;
  legalReviewCompleted: boolean;
  publicLaunchFlagsEnabled: boolean;
  launchModeIsPublicReady: boolean;
  canPublicPurchaseProceed: boolean;
  learnerTermsStillRequired: true;
  teacherTermsStillRequired: true;
  stripeReadinessStillRequired: true;
  rollbackDocumented: true;
};

function isEnvTrue(name: string): boolean {
  return process.env[name] === "true";
}

function isLaunchModePublicReady(): boolean {
  return (process.env.PLANNED_PACKAGE_LAUNCH_MODE ?? "").trim().toLowerCase() === "public_ready";
}

function evaluateRequiredFlag(name: PlannedPackageLaunchFlagName): boolean {
  if (name === "PLANNED_PACKAGE_LAUNCH_MODE") return isLaunchModePublicReady();
  return isEnvTrue(name);
}

/**
 * Snapshot of intended vs current planned-package public launch activation.
 * Safe for admin readiness — no secrets.
 */
export function getPlannedPackageLaunchFlagProfile(): PlannedPackageLaunchFlagProfile {
  const missingFlags: PlannedPackageLaunchFlagName[] = [];
  const presentFlags: PlannedPackageLaunchFlagName[] = [];

  for (const name of PLANNED_PACKAGE_PUBLIC_LAUNCH_REQUIRED_FLAGS) {
    if (evaluateRequiredFlag(name)) presentFlags.push(name);
    else missingFlags.push(name);
  }

  const legalReviewCompleted = isPackageLegalReviewCompleted();
  const publicLaunchFlagsEnabled = missingFlags.length === 0;
  const launchModeIsPublicReady = getPlannedPackageLaunchMode() === "public_ready";

  const gate = evaluatePlannedPackagePublicLaunchGate({
    requireLearnerTerms: true,
    learnerTermsAccepted: true,
    learnerTermsPolicyVersion: undefined,
    requireTeacherTerms: true,
    teacherTermsAccepted: true,
    teacherTermsPolicyVersion: undefined,
  });

  // Profile-level "can proceed" assumes terms would be accepted; still requires legal + flags.
  const canPublicPurchaseProceed =
    publicLaunchFlagsEnabled &&
    legalReviewCompleted &&
    gate.canStartPackagePurchase &&
    !gate.blockers.includes("package_legal_review_required");

  return {
    intendedLaunchProfile: PLANNED_PACKAGE_INTENDED_LAUNCH_PROFILE,
    currentLaunchMode: getPlannedPackageLaunchMode(),
    allPackageFlagsExpectedOn: true,
    requiredFlags: PLANNED_PACKAGE_PUBLIC_LAUNCH_REQUIRED_FLAGS,
    missingFlags,
    presentFlags,
    legalReviewRequired: true,
    legalReviewCompleted,
    publicLaunchFlagsEnabled,
    launchModeIsPublicReady,
    canPublicPurchaseProceed,
    learnerTermsStillRequired: true,
    teacherTermsStillRequired: true,
    stripeReadinessStillRequired: true,
    rollbackDocumented: true,
  };
}

/** Human status for admin readiness banner. */
export type PlannedPackageActivationStatus =
  | "flags_incomplete"
  | "legal_review_blocked"
  | "public_launch_ready";

export function getPlannedPackageActivationStatus(
  profile: PlannedPackageLaunchFlagProfile = getPlannedPackageLaunchFlagProfile(),
): PlannedPackageActivationStatus {
  if (!profile.publicLaunchFlagsEnabled) return "flags_incomplete";
  if (!profile.legalReviewCompleted) return "legal_review_blocked";
  return "public_launch_ready";
}

/**
 * Apply the intended activation profile into process.env (tests / local tooling only).
 * Never sets PACKAGE_LEGAL_REVIEW_COMPLETED.
 */
export function applyPlannedPackagePublicLaunchActivationEnv(options?: {
  legalReviewCompleted?: boolean;
}): void {
  const pairs: Array<[string, string]> = [
    ["ENABLE_PLANNED_PACKAGES", "true"],
    ["NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES", "true"],
    ["ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS", "true"],
    ["NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS", "true"],
    ["ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT", "true"],
    ["NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT", "true"],
    ["ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS", "true"],
    ["NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS", "true"],
    ["ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE", "true"],
    ["ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT", "true"],
    ["NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT", "true"],
    ["ENABLE_PLANNED_PACKAGE_ADMIN_OPS", "true"],
    ["ENABLE_PLANNED_PACKAGE_REFUND_QUOTES", "true"],
    ["ENABLE_PLANNED_PACKAGE_REFUND_ADMIN_REVIEW", "true"],
    ["ENABLE_PLANNED_PACKAGE_MANUAL_REFUNDS", "true"],
    ["ENABLE_PLANNED_PACKAGE_PAYOUT_ELIGIBILITY_LEDGER", "true"],
    ["ENABLE_PLANNED_PACKAGE_PAYOUT_ADMIN_VIEW", "true"],
    ["ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS", "true"],
    ["ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFER_REVERSALS", "true"],
    ["ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS", "true"],
    ["ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD", "true"],
    ["NEXT_PUBLIC_ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD", "true"],
    ["ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD", "true"],
    ["NEXT_PUBLIC_ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD", "true"],
    ["ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE", "true"],
    ["NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE", "true"],
    ["PLANNED_PACKAGE_LAUNCH_MODE", "public_ready"],
  ];
  for (const [k, v] of pairs) process.env[k] = v;

  if (options?.legalReviewCompleted === true) {
    process.env.PACKAGE_LEGAL_REVIEW_COMPLETED = "true";
  } else if (options?.legalReviewCompleted === false) {
    delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
  }
}

/** Sanity: current runtime readers for activation (used by tests). */
export function readPlannedPackageActivationFlagSnapshot(): Record<string, boolean | string> {
  return {
    plannedPackages: isPlannedPackagesEnabled(),
    sessionDrafts: isPlannedPackageSessionDraftsEnabled(),
    checkoutPreflight: isPlannedPackageCheckoutPreflightEnabled(),
    temporaryHolds: isPlannedPackageTemporaryHoldsEnabled(),
    fulfillment: isPlannedPackageFulfillmentEngineEnabled(),
    stripeCheckout: isPlannedPackageStripeCheckoutEnabled(),
    adminOps: isPlannedPackageAdminOpsEnabled(),
    refundQuotes: isPlannedPackageRefundQuotesEnabled(),
    refundAdminReview: isPlannedPackageRefundAdminReviewEnabled(),
    manualRefunds: isPlannedPackageManualRefundsEnabled(),
    payoutLedger: isPlannedPackagePayoutEligibilityLedgerEnabled(),
    payoutAdminView: isPlannedPackagePayoutAdminViewEnabled(),
    manualTransfers: isPlannedPackageManualTransfersEnabled(),
    manualTransferReversals: isPlannedPackageManualTransferReversalsEnabled(),
    e2eQaTools: isPlannedPackageE2eQaToolsEnabled(),
    studentDashboard: isStudentPlannedPackageDashboardEnabled(),
    studentDashboardUi: isStudentPlannedPackageDashboardUiEnabled(),
    teacherDashboard: isTeacherPlannedPackageDashboardEnabled(),
    teacherDashboardUi: isTeacherPlannedPackageDashboardUiEnabled(),
    publicPurchase: isPlannedPackagePublicPurchaseEnabled(),
    publicPurchaseUi: isPlannedPackagePublicPurchaseUiEnabled(),
    launchMode: getPlannedPackageLaunchMode(),
    legalReviewCompleted: isPackageLegalReviewCompleted(),
  };
}
