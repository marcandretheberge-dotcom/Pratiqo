/**
 * PR 16B — Feature flag for policy-aware package-credit cancellation.
 *
 * When OFF: PR 10C behavior (always restore package credit on cancel/decline).
 * When ON: student cancellations use booking policy snapshots to decide
 * automatic credit return. Teacher cancel/decline still restores credit.
 *
 * Server must not rely only on NEXT_PUBLIC_*.
 *
 * See docs/product/marketplace-independent-teacher-guardrails.md
 */

export const OFFER_POLICY_ENFORCEMENT_FLAG = "ENABLE_OFFER_POLICY_ENFORCEMENT";
export const OFFER_POLICY_ENFORCEMENT_UI_FLAG = "NEXT_PUBLIC_ENABLE_OFFER_POLICY_ENFORCEMENT";

/** Server enforcement gate (cancel API). Default OFF. */
export function isOfferPolicyEnforcementEnabled(): boolean {
  return process.env.ENABLE_OFFER_POLICY_ENFORCEMENT === "true";
}

/** Client copy/hints only. Default OFF. Does not authorize server behavior. */
export function isOfferPolicyEnforcementUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_OFFER_POLICY_ENFORCEMENT === "true";
}
