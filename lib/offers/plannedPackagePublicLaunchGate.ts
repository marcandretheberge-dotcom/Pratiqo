/**
 * Planned package public launch gate — centralizes flags, legal review,
 * canary restrictions, and purchase capabilities. Defaults OFF.
 *
 * Does not move money. Does not bypass legal review.
 * See docs/product/planned-package-public-launch-gate.md
 */

import { canUsePlannedPackageAdminOps, isPlannedPackageAdminOpsEnabled } from "./plannedPackageAdminOps";
import {
  canUsePlannedPackageCheckoutPreflight,
  isPlannedPackageCheckoutPreflightEnabled,
} from "./plannedPackageCheckoutPreflight";
import { isPlannedPackageE2eQaToolsEnabled } from "./plannedPackageE2eQaTools";
import {
  canUsePlannedPackageFulfillmentEngine,
  isPlannedPackageFulfillmentEngineEnabled,
} from "./plannedPackageFulfillment";
import {
  canUsePlannedPackageManualRefunds,
  isPlannedPackageManualRefundsEnabled,
} from "./plannedPackageManualRefunds";
import {
  canUsePlannedPackageManualTransferReversals,
  isPlannedPackageManualTransferReversalsEnabled,
} from "./plannedPackageManualTransferReversals";
import {
  canUsePlannedPackageManualTransfers,
  isPlannedPackageManualTransfersEnabled,
} from "./plannedPackageManualTransfers";
import {
  canUsePlannedPackagePayoutEligibilityLedger,
  isPlannedPackagePayoutAdminViewEnabled,
  isPlannedPackagePayoutEligibilityLedgerEnabled,
} from "./plannedPackagePayoutEligibilityLedger";
import {
  canUsePlannedPackageRefundQuotes,
  isPlannedPackageRefundAdminReviewEnabled,
  isPlannedPackageRefundQuotesEnabled,
} from "./plannedPackageRefundQuotes";
import {
  canUsePlannedPackageSessionDrafts,
  isPlannedPackageSessionDraftsEnabled,
} from "./plannedPackageSessionDrafts";
import {
  canUsePlannedPackageStripeCheckout,
  isPlannedPackageStripeCheckoutEnabled,
} from "./plannedPackageStripeCheckout";
import { isStudentPlannedPackageDashboardEnabled } from "./plannedPackageStudentDashboard";
import { isTeacherPlannedPackageDashboardEnabled } from "./plannedPackageTeacherDashboard";
import {
  canUsePlannedPackageTemporaryHolds,
  isPlannedPackageTemporaryHoldsEnabled,
} from "./plannedPackageTemporaryHolds";
/** Public learner/teacher terms version — bump when copy/policy changes. */
export const PLANNED_PACKAGE_PUBLIC_TERMS_VERSION = "planned_package_terms_v1_2026_08";

function isPlannedPackagesEnabledLocal(): boolean {
  return (
    process.env.ENABLE_PLANNED_PACKAGES === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES === "true"
  );
}

function isPackageLegalReviewCompletedLocal(): boolean {
  return process.env.PACKAGE_LEGAL_REVIEW_COMPLETED === "true";
}

export const ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE_FLAG =
  "ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE";
export const NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE_FLAG =
  "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE";
export const PLANNED_PACKAGE_LAUNCH_MODE_FLAG = "PLANNED_PACKAGE_LAUNCH_MODE";
export const PLANNED_PACKAGE_CANARY_TEACHER_IDS_FLAG = "PLANNED_PACKAGE_CANARY_TEACHER_IDS";
export const PLANNED_PACKAGE_CANARY_OFFER_IDS_FLAG = "PLANNED_PACKAGE_CANARY_OFFER_IDS";

export type PlannedPackageLaunchMode =
  | "disabled"
  | "staging_only"
  | "admin_preview"
  | "limited_teacher_canary"
  | "public_ready";

export type PlannedPackagePublicLaunchBlockerCode =
  | "planned_package_public_purchase_disabled"
  | "package_legal_review_required"
  | "teacher_package_terms_required"
  | "learner_package_terms_required"
  | "package_canary_not_allowed"
  | "package_e2e_qa_required"
  | "package_dashboard_required"
  | "package_admin_ops_required"
  | "package_refund_infrastructure_required"
  | "package_payout_infrastructure_required"
  | "planned_packages_disabled"
  | "package_checkout_chain_incomplete"
  | "package_launch_mode_blocks_purchase"
  | "package_purchase_disabled"
  | "progressive_payout_not_ready"
  | "package_refund_policy_draft";

export type PlannedPackagePublicLaunchGateInput = {
  teacherId?: string | null;
  offerId?: string | null;
  /** When true, require learner terms accepted for purchase/checkout. */
  requireLearnerTerms?: boolean;
  learnerTermsAccepted?: boolean;
  learnerTermsPolicyVersion?: string | null;
  /** When true, require teacher terms for purchase/publish paths. */
  requireTeacherTerms?: boolean;
  teacherTermsAccepted?: boolean;
  teacherTermsPolicyVersion?: string | null;
  /** Admin preview may inspect copy without enabling purchase. */
  isAdminPreviewRequest?: boolean;
};

export type PlannedPackagePublicLaunchGateResult = {
  canShowPackagePublicly: boolean;
  canStartPackagePurchase: boolean;
  canCreateSessionDraft: boolean;
  canCreatePendingOrder: boolean;
  canOpenCheckout: boolean;
  launchMode: PlannedPackageLaunchMode;
  termsVersion: string;
  blockers: PlannedPackagePublicLaunchBlockerCode[];
  warnings: string[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseCsvIds(raw: string | undefined): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  if (!raw?.trim()) return { valid, invalid };
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!id) continue;
    if (UUID_RE.test(id)) valid.push(id.toLowerCase());
    else invalid.push(id);
  }
  return { valid, invalid };
}

export function isPlannedPackagePublicPurchaseEnabled(): boolean {
  return process.env.ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE === "true";
}

/** UI may mirror the server flag; server must not rely only on NEXT_PUBLIC. */
export function isPlannedPackagePublicPurchaseUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE === "true";
}

export function getPlannedPackageLaunchMode(): PlannedPackageLaunchMode {
  const raw = (process.env.PLANNED_PACKAGE_LAUNCH_MODE ?? "disabled").trim().toLowerCase();
  if (
    raw === "staging_only" ||
    raw === "admin_preview" ||
    raw === "limited_teacher_canary" ||
    raw === "public_ready"
  ) {
    return raw;
  }
  return "disabled";
}

export function getPlannedPackageCanaryTeacherIds(): {
  ids: string[];
  invalidEntries: string[];
} {
  const parsed = parseCsvIds(process.env.PLANNED_PACKAGE_CANARY_TEACHER_IDS);
  return { ids: parsed.valid, invalidEntries: parsed.invalid };
}

export function getPlannedPackageCanaryOfferIds(): {
  ids: string[];
  invalidEntries: string[];
} {
  const parsed = parseCsvIds(process.env.PLANNED_PACKAGE_CANARY_OFFER_IDS);
  return { ids: parsed.valid, invalidEntries: parsed.invalid };
}

export function isTeacherPackageTermsAccepted(args: {
  acceptedAt?: string | null;
  policyVersion?: string | null;
}): boolean {
  return (
    Boolean(args.acceptedAt) &&
    args.policyVersion === PLANNED_PACKAGE_PUBLIC_TERMS_VERSION
  );
}

export function isLearnerPackageTermsAccepted(args: {
  acceptedAt?: string | null;
  policyVersion?: string | null;
}): boolean {
  return (
    Boolean(args.acceptedAt) &&
    args.policyVersion === PLANNED_PACKAGE_PUBLIC_TERMS_VERSION
  );
}

function isNonProductionRuntime(): boolean {
  const vercel = (process.env.VERCEL_ENV ?? "").toLowerCase();
  if (vercel === "production") return false;
  if (vercel === "preview" || vercel === "development") return true;
  const node = (process.env.NODE_ENV ?? "").toLowerCase();
  return node !== "production";
}

/** Checkout chain flags required for any real purchase path. */
export function hasPlannedPackageCheckoutChainEnabled(): boolean {
  return (
    isPlannedPackagesEnabledLocal() &&
    isPlannedPackageSessionDraftsEnabled() &&
    isPlannedPackageCheckoutPreflightEnabled() &&
    isPlannedPackageTemporaryHoldsEnabled() &&
    isPlannedPackageFulfillmentEngineEnabled() &&
    isPlannedPackageStripeCheckoutEnabled()
  );
}

export function hasPlannedPackageRefundInfrastructureEnabled(): boolean {
  return (
    isPlannedPackageRefundQuotesEnabled() &&
    isPlannedPackageRefundAdminReviewEnabled() &&
    isPlannedPackageManualRefundsEnabled() &&
    canUsePlannedPackageRefundQuotes() &&
    canUsePlannedPackageManualRefunds()
  );
}

export function hasPlannedPackagePayoutInfrastructureEnabled(): boolean {
  return (
    isPlannedPackagePayoutEligibilityLedgerEnabled() &&
    isPlannedPackagePayoutAdminViewEnabled() &&
    isPlannedPackageManualTransfersEnabled() &&
    isPlannedPackageManualTransferReversalsEnabled() &&
    canUsePlannedPackagePayoutEligibilityLedger() &&
    canUsePlannedPackageManualTransfers() &&
    canUsePlannedPackageManualTransferReversals()
  );
}

export function hasPlannedPackageDashboardFlagsEnabled(): boolean {
  return (
    isStudentPlannedPackageDashboardEnabled() && isTeacherPlannedPackageDashboardEnabled()
  );
}

function collectInfrastructureBlockers(): PlannedPackagePublicLaunchBlockerCode[] {
  const blockers: PlannedPackagePublicLaunchBlockerCode[] = [];
  if (!isPlannedPackagesEnabledLocal()) {
    blockers.push("planned_packages_disabled");
  }
  if (!hasPlannedPackageCheckoutChainEnabled()) {
    blockers.push("package_checkout_chain_incomplete");
  }
  if (!isPlannedPackageAdminOpsEnabled() || !canUsePlannedPackageAdminOps()) {
    blockers.push("package_admin_ops_required");
  }
  if (!hasPlannedPackageRefundInfrastructureEnabled()) {
    blockers.push("package_refund_infrastructure_required");
  }
  if (!hasPlannedPackagePayoutInfrastructureEnabled()) {
    blockers.push("package_payout_infrastructure_required");
  }
  if (!hasPlannedPackageDashboardFlagsEnabled()) {
    blockers.push("package_dashboard_required");
  }
  return blockers;
}

function canaryAllowsOffer(input: PlannedPackagePublicLaunchGateInput): {
  allowed: boolean;
  warning?: string;
} {
  const teachers = getPlannedPackageCanaryTeacherIds();
  const offers = getPlannedPackageCanaryOfferIds();
  if (teachers.ids.length === 0 && offers.ids.length === 0) {
    return { allowed: false, warning: "canary_allowlist_empty" };
  }
  const teacherId = input.teacherId?.trim().toLowerCase() ?? "";
  const offerId = input.offerId?.trim().toLowerCase() ?? "";
  if (teacherId && teachers.ids.includes(teacherId)) return { allowed: true };
  if (offerId && offers.ids.includes(offerId)) return { allowed: true };
  return { allowed: false };
}

/**
 * Evaluate public launch capabilities for planned packages.
 * Server boundaries should call this rather than ad hoc flag checks.
 */
export function evaluatePlannedPackagePublicLaunchGate(
  input: PlannedPackagePublicLaunchGateInput = {},
): PlannedPackagePublicLaunchGateResult {
  const launchMode = getPlannedPackageLaunchMode();
  const termsVersion = PLANNED_PACKAGE_PUBLIC_TERMS_VERSION;
  const blockers: PlannedPackagePublicLaunchBlockerCode[] = [];
  const warnings: string[] = [];

  const teachers = getPlannedPackageCanaryTeacherIds();
  const offers = getPlannedPackageCanaryOfferIds();
  for (const id of teachers.invalidEntries) {
    warnings.push(`invalid_canary_teacher_id:${id}`);
  }
  for (const id of offers.invalidEntries) {
    warnings.push(`invalid_canary_offer_id:${id}`);
  }

  const infraBlockers = collectInfrastructureBlockers();
  const publicPurchaseFlag = isPlannedPackagePublicPurchaseEnabled();
  const legalOk = isPackageLegalReviewCompletedLocal();
  const draftsUsable = canUsePlannedPackageSessionDrafts();
  const holdsUsable = canUsePlannedPackageTemporaryHolds();
  const preflightUsable = canUsePlannedPackageCheckoutPreflight();
  const stripeUsable = canUsePlannedPackageStripeCheckout();
  const fulfillmentUsable = canUsePlannedPackageFulfillmentEngine();

  // Show packages on profile when purchase is possible OR session-draft preview is on.
  const canShowPackagePublicly =
    (publicPurchaseFlag && infraBlockers.length === 0 && legalOk) ||
    (isPlannedPackagesEnabledLocal() && isPlannedPackageSessionDraftsEnabled()) ||
    launchMode === "admin_preview";

  if (!publicPurchaseFlag) {
    blockers.push("planned_package_public_purchase_disabled");
  }
  if (!legalOk) {
    blockers.push("package_legal_review_required");
  }
  blockers.push(...infraBlockers);

  if (launchMode === "public_ready" && !isPlannedPackageE2eQaToolsEnabled()) {
    // E2E tools flag documents staging QA readiness; required before declaring public_ready.
    blockers.push("package_e2e_qa_required");
  }

  if (launchMode === "disabled" || launchMode === "admin_preview") {
    blockers.push("package_launch_mode_blocks_purchase");
  }

  if (launchMode === "staging_only" && !isNonProductionRuntime()) {
    blockers.push("package_launch_mode_blocks_purchase");
    warnings.push("staging_only_rejected_in_production");
  }

  let canaryOk = true;
  if (launchMode === "limited_teacher_canary") {
    const canary = canaryAllowsOffer(input);
    canaryOk = canary.allowed;
    if (canary.warning) warnings.push(canary.warning);
    if (!canary.allowed) {
      blockers.push("package_canary_not_allowed");
    }
  }

  if (input.requireTeacherTerms) {
    const teacherOk =
      input.teacherTermsAccepted === true &&
      (input.teacherTermsPolicyVersion == null ||
        input.teacherTermsPolicyVersion === termsVersion);
    if (!teacherOk) {
      blockers.push("teacher_package_terms_required");
    }
  }

  if (input.requireLearnerTerms) {
    const learnerOk =
      input.learnerTermsAccepted === true &&
      (input.learnerTermsPolicyVersion == null ||
        input.learnerTermsPolicyVersion === termsVersion);
    if (!learnerOk) {
      blockers.push("learner_package_terms_required");
    }
  }

  const uniqueBlockers = [...new Set(blockers)];

  const modeAllowsPurchase =
    launchMode === "public_ready" ||
    launchMode === "staging_only" ||
    launchMode === "limited_teacher_canary";

  const basePurchaseReady =
    publicPurchaseFlag &&
    legalOk &&
    infraBlockers.length === 0 &&
    modeAllowsPurchase &&
    !(launchMode === "staging_only" && !isNonProductionRuntime()) &&
    !(launchMode === "limited_teacher_canary" && !canaryOk) &&
    !(launchMode === "public_ready" && !isPlannedPackageE2eQaToolsEnabled());

  const teacherTermsBlock = uniqueBlockers.includes("teacher_package_terms_required");
  const learnerTermsBlock = uniqueBlockers.includes("learner_package_terms_required");

  const canStartPackagePurchase =
    basePurchaseReady && !teacherTermsBlock && !learnerTermsBlock;

  // Session drafts remain available for QA/preview when draft flags are on,
  // even if public purchase is OFF — but public purchase mode tightens canary.
  const canCreateSessionDraft =
    draftsUsable &&
    (launchMode === "admin_preview"
      ? false
      : !publicPurchaseFlag
        ? true
        : basePurchaseReady && !teacherTermsBlock);

  const canCreatePendingOrder =
    holdsUsable &&
    preflightUsable &&
    (launchMode === "admin_preview"
      ? false
      : !publicPurchaseFlag
        ? holdsUsable && preflightUsable
        : basePurchaseReady && !teacherTermsBlock);

  const canOpenCheckout =
    stripeUsable &&
    fulfillmentUsable &&
    canStartPackagePurchase &&
    !learnerTermsBlock;

  if (input.isAdminPreviewRequest) {
    return {
      canShowPackagePublicly: true,
      canStartPackagePurchase: false,
      canCreateSessionDraft: false,
      canCreatePendingOrder: false,
      canOpenCheckout: false,
      launchMode,
      termsVersion,
      blockers: uniqueBlockers,
      warnings: [...warnings, "admin_preview_no_mutations"],
    };
  }

  return {
    canShowPackagePublicly,
    canStartPackagePurchase,
    canCreateSessionDraft,
    canCreatePendingOrder,
    canOpenCheckout,
    launchMode,
    termsVersion,
    blockers: uniqueBlockers,
    warnings,
  };
}

/** True when public purchase flag + deps + legal + launch mode allow purchase (no per-offer checks). */
export function canPubliclyPurchasePlannedPackageViaGate(): boolean {
  const gate = evaluatePlannedPackagePublicLaunchGate();
  return (
    isPlannedPackagePublicPurchaseEnabled() &&
    gate.blockers.filter(
      (b) =>
        b !== "package_canary_not_allowed" &&
        b !== "teacher_package_terms_required" &&
        b !== "learner_package_terms_required",
    ).length === 0 &&
    (gate.launchMode === "public_ready" ||
      gate.launchMode === "staging_only" ||
      gate.launchMode === "limited_teacher_canary")
  );
}

/** Admin-only copy preview payload — never mutates. */
export function getPlannedPackageAdminLaunchPreview(): {
  termsVersion: string;
  launchMode: PlannedPackageLaunchMode;
  ctaEnabledCopyKey: string;
  ctaDisabledCopyKeys: string[];
  consentCopyKeys: string[];
  cancellationCopyKeys: string[];
  blockers: PlannedPackagePublicLaunchBlockerCode[];
  warnings: string[];
  mutatesData: false;
} {
  const gate = evaluatePlannedPackagePublicLaunchGate({ isAdminPreviewRequest: true });
  return {
    termsVersion: gate.termsVersion,
    launchMode: gate.launchMode,
    ctaEnabledCopyKey: "plannedPackagePlanThisPackage",
    ctaDisabledCopyKeys: [
      "plannedPackageBeingPrepared",
      "plannedPackageBookingsNotOpenYet",
    ],
    consentCopyKeys: [
      "plannedPackageConsentIndependentTeacher",
      "plannedPackageConsentScheduledSessions",
      "plannedPackageConsentPaymentFacilitated",
      "plannedPackageConsentSessionsAfterPayment",
      "plannedPackageConsentCancellationPolicy",
      "plannedPackageConsentSupportContact",
      "plannedPackageConsentCheckbox",
    ],
    cancellationCopyKeys: [
      "plannedPackageCancellationContactSupport",
      "plannedPackageCancellationCompletedDiffers",
      "plannedPackageCancellationReviewedByPolicy",
    ],
    blockers: gate.blockers,
    warnings: gate.warnings,
    mutatesData: false,
  };
}
