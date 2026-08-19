/**
 * Canonical teacher identity-verification helper.
 *
 * A teacher is publicly identity-verified when EITHER:
 *   1. Stripe Identity verified them, OR
 *   2. a Pratiqo admin marked them verified manually.
 *
 * Manual verification is a separate source. It must never be written
 * into stripe_identity_status / Stripe Identity session fields.
 */

export type TeacherIdentityVerificationSource = "stripe_identity" | "admin_manual" | "none";

export type TeacherIdentityVerificationInput = {
  identityVerified?: boolean | null;
  identityStatus?: string | null;
  stripeIdentityStatus?: string | null;
  identityVerifiedManually?: boolean | null;
};

export const MANUAL_IDENTITY_NOTE_MAX_LENGTH = 500;

function normalized(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

export function isStripeTeacherIdentityVerified(
  input: Pick<TeacherIdentityVerificationInput, "identityVerified" | "identityStatus" | "stripeIdentityStatus">,
): boolean {
  return (
    Boolean(input.identityVerified) ||
    normalized(input.identityStatus) === "verified" ||
    normalized(input.stripeIdentityStatus) === "verified"
  );
}

export function isTeacherIdentityVerified(input: TeacherIdentityVerificationInput): boolean {
  return isStripeTeacherIdentityVerified(input) || Boolean(input.identityVerifiedManually);
}

export function getTeacherIdentityVerificationSource(
  input: TeacherIdentityVerificationInput,
): TeacherIdentityVerificationSource {
  if (isStripeTeacherIdentityVerified(input)) return "stripe_identity";
  if (Boolean(input.identityVerifiedManually)) return "admin_manual";
  return "none";
}

export function describeStripeIdentityStatus(
  status: string | null | undefined,
): "verified" | "pending" | "requires_input" | "failed" | "not_started" {
  const value = normalized(status);
  if (value === "verified") return "verified";
  if (value === "pending" || value === "processing") return "pending";
  if (value === "requires_input" || value === "requires_action") return "requires_input";
  if (value === "failed" || value === "canceled" || value === "cancelled") return "failed";
  return "not_started";
}

/**
 * Admin-only note sanitizer. Stores plain text, never HTML.
 * Rejects markup rather than rendering it.
 */
export function sanitizeManualIdentityVerificationNote(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  if (/<[^>]*>/.test(value) || /javascript:|data:text\/html|on\w+\s*=/i.test(value)) return null;
  const withoutControls = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  const trimmed = withoutControls.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MANUAL_IDENTITY_NOTE_MAX_LENGTH);
}
