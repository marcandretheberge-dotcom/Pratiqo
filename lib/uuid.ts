/**
 * Strict UUID string check (8-4-4-4-12 lowercase hex per RFC).
 * Used for client-side guards before Postgres UUID columns / Stripe payloads — does not replace server validation.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidString(value: string | null | undefined): boolean {
  if (value == null || typeof value !== "string") return false;
  const t = value.trim();
  return t.length > 0 && UUID_RE.test(t);
}
