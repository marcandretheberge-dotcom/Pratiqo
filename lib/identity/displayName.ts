/**
 * Centralized display-name policy for Pratiqo public surfaces.
 *
 * Marketplace rule (pre-launch): every public/pre-booking surface that shows
 * a teacher's name should show first name + first-initial of the second
 * token, with a trailing period. This protects teachers from being trivially
 * googled or DM'd before any booking has happened, while keeping the page
 * personal enough to feel human.
 *
 *   Marie Dubois            → "Marie D."
 *   Carlos da Silva         → "Carlos D."   (D from the particle "da")
 *   Marc-André Théberge     → "Marc-André T."
 *   Madonna                 → "Madonna"     (single-token names unchanged)
 *
 * Where to use:
 *   - public/teacher profile title, headline, bio fallback,
 *   - SEO <title>, OpenGraph + Twitter card,
 *   - JSON-LD `Person.name`,
 *   - landing/search/map/related/hero/quiz cards,
 *   - autocomplete dropdown labels,
 *   - booking modal title and teacher block (pre-payment).
 *
 * Where NOT to use (full name MUST be preserved):
 *   - receipts and payment vault (`app/(app)/student/payments/*`),
 *   - admin / support tooling, resolution cases,
 *   - emails sent TO the teacher themselves about their own activity,
 *   - Stripe customer/transfer metadata, payout reports,
 *   - legal / audit logs.
 *
 * This module is pure (no I/O, no `Date.now()`) and safe to call in SSR /
 * RSC / SSG / client renders.
 */

/**
 * Mask a teacher's full name to first-name + first-initial of next token.
 *
 * Algorithm:
 *   1. Coerce non-string / null / undefined → "".
 *   2. Normalize internal whitespace; trim.
 *   3. Split on whitespace.
 *      - 0 tokens → "".
 *      - 1 token  → return that token unchanged (mononym; e.g. "Madonna").
 *      - 2+ tokens → return `parts[0] + " " + initial(parts[1]) + "."`.
 *   4. `initial(token)` returns the first **Unicode grapheme**, uppercased.
 *      Uses `Array.from(...)` so accented letters, surrogate pairs, and
 *      combining marks survive correctly (e.g. "Łukasz" → "Ł").
 *
 * Note: we take the first **trailing token**, not the last whitespace-
 * separated chunk. For "Carlos da Silva" the result is "Carlos D." (from
 * the particle "da"), which matches the documented examples and avoids
 * leaking a stronger identifier like "S." from "Silva".
 */
export function publicFirstNameWithInitial(name: string | null | undefined): string {
  if (typeof name !== "string") return "";

  const normalized = name.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) return "";

  const parts = normalized.split(" ");
  if (parts.length === 1) return parts[0];

  const second = parts[1];
  const firstGrapheme = Array.from(second)[0];
  if (!firstGrapheme) {
    return parts[0];
  }

  return `${parts[0]} ${firstGrapheme.toUpperCase()}.`;
}
