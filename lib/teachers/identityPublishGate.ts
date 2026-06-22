/**
 * Safe publish/marketplace gate for Stripe Identity failure — no raw identity_status.
 * Uses public-safe teacher columns already exposed on owner rows.
 */
export function isIdentityVerificationFailed(input: {
  identity_verified?: boolean | null;
  stripe_identity_failed_reason?: string | null;
}): boolean {
  if (input.identity_verified === true) return false;
  return Boolean((input.stripe_identity_failed_reason ?? "").trim());
}
