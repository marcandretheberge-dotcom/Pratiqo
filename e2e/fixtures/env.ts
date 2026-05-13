/**
 * E2E environment helpers.
 *
 * Reads optional environment variables that gate authenticated/payment specs.
 * When a required variable is missing, the spec self-skips with a clear
 * reason — CI stays green without forcing every contributor to provision a
 * full Stripe + Supabase test stack.
 */

export const E2E_AUTH_ENABLED = process.env.E2E_AUTH === "1";

export type AuthSecrets = {
  studentEmail: string;
  studentPassword: string;
  teacherEmail: string;
  teacherPassword: string;
  stripeTestCard: string;
};

/**
 * Returns the auth/stripe secret bundle or `null` if anything is missing.
 * Callers should `test.skip(!secrets, "reason")` and bail.
 */
export function getAuthSecrets(): AuthSecrets | null {
  if (!E2E_AUTH_ENABLED) return null;
  const studentEmail = process.env.E2E_STUDENT_EMAIL;
  const studentPassword = process.env.E2E_STUDENT_PASSWORD;
  const teacherEmail = process.env.E2E_TEACHER_EMAIL;
  const teacherPassword = process.env.E2E_TEACHER_PASSWORD;
  if (!studentEmail || !studentPassword || !teacherEmail || !teacherPassword) {
    return null;
  }
  return {
    studentEmail,
    studentPassword,
    teacherEmail,
    teacherPassword,
    stripeTestCard: process.env.E2E_STRIPE_TEST_CARD ?? "4242424242424242",
  };
}
