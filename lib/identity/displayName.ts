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

const NAME_PARTICLE_KEYS = new Set([
  "de",
  "del",
  "da",
  "di",
  "du",
  "la",
  "le",
  "van",
  "von",
  "der",
  "den",
  "ter",
]);

function lettersOnly(value: string): string {
  return value.replace(/[^\p{L}]/gu, "");
}

function capitalizeGrapheme(value: string): string {
  const graphemes = Array.from(value);
  if (graphemes.length === 0) return value;
  return graphemes[0].toLocaleUpperCase("fr-CA") + graphemes.slice(1).join("").toLocaleLowerCase("fr-CA");
}

function isUniformCasing(value: string): boolean {
  const letters = lettersOnly(value);
  if (!letters) return false;
  return letters === letters.toLocaleUpperCase("fr-CA") || letters === letters.toLocaleLowerCase("fr-CA");
}

function formatNameToken(token: string, index: number): string {
  const trimmed = token.trim();
  if (!trimmed) return trimmed;

  if (/^[A-Za-zÀ-ÿ]\.$/u.test(trimmed)) {
    return `${trimmed[0].toLocaleUpperCase("fr-CA")}.`;
  }

  const apostrophe = trimmed.match(/^([\p{L}]+)(['’])([\p{L}].*)$/u);
  if (apostrophe) {
    return `${formatNameToken(apostrophe[1], index)}${apostrophe[2]}${formatNameToken(apostrophe[3], 1)}`;
  }

  if (trimmed.includes("-")) {
    return trimmed
      .split("-")
      .map((part, partIndex) => formatNameToken(part, index + partIndex))
      .join("-");
  }

  const folded = trimmed.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (index > 0 && NAME_PARTICLE_KEYS.has(folded)) {
    return trimmed.toLocaleLowerCase("fr-CA");
  }

  if (!isUniformCasing(trimmed)) return trimmed;
  return capitalizeGrapheme(trimmed);
}

/**
 * Display-only public teacher name. Masks to first name + last initial,
 * then repairs obvious ALL-CAPS / all-lowercase casing without mutating
 * stored teacher records or unmasking last names.
 */
export function formatPublicTeacherDisplayName(name: string | null | undefined): string {
  const masked = publicFirstNameWithInitial(name);
  if (!masked) return "";
  return masked
    .split(" ")
    .map((token, index) => formatNameToken(token, index))
    .join(" ");
}
