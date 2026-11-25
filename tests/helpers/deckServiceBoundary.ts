import assert from "node:assert/strict";

/** Test the lesson boundary, independently of other authorised work in the repository. */
export function assertDeckServiceBoundary(label: string, source: string) {
  assert.doesNotMatch(source, /\b(?:fetch|getSupabaseClient|createClient|loadStripe)\s*\(/, `${label} must delegate service calls to its dedicated components`);
  assert.doesNotMatch(source, /(?:from\s*|import\s*\()["'][^"']*(?:supabase|stripe|lib\/(?:payments|pricing|commissions)|scripts\/generate)/i, `${label} must not own payment, database or generation dependencies`);
}
