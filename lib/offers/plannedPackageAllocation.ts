/**
 * Deterministic per-session cents allocation for planned packages.
 * Remainder goes to earlier sessions.
 */

export function allocatePlannedPackageSessionCents(
  totalCents: number,
  sessionCount: number,
): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error("invalid_total_cents");
  }
  if (!Number.isInteger(sessionCount) || sessionCount < 1) {
    throw new Error("invalid_session_count");
  }

  const base = Math.floor(totalCents / sessionCount);
  const remainder = totalCents - base * sessionCount;
  const out: number[] = [];
  for (let i = 0; i < sessionCount; i += 1) {
    out.push(base + (i < remainder ? 1 : 0));
  }
  return out;
}
