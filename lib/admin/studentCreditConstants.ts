/**
 * Shared student-credit constants safe for client + server imports.
 * Keep this file free of Supabase / service-role imports.
 */

export const STUDENT_CREDIT_REASON_CODES = [
  "support_compensation",
  "contest_prize",
  "local_promotion",
  "payment_issue",
  "admin_test",
  "goodwill",
  "other",
] as const;

export type StudentCreditReasonCode = (typeof STUDENT_CREDIT_REASON_CODES)[number];

export function isStudentCreditReasonCode(value: unknown): value is StudentCreditReasonCode {
  return typeof value === "string" && (STUDENT_CREDIT_REASON_CODES as readonly string[]).includes(value);
}
