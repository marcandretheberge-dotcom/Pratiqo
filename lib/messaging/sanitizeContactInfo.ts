/**
 * Anti-circumvention sanitizer for internal Pratiqo messaging.
 *
 * Marketplace rule: before the first completed lesson between a student
 * and a teacher, we strip personal contact info from messages so the pair
 * cannot trivially move the relationship off-platform. After the first
 * completed lesson, normal logistical messaging is allowed unchanged.
 *
 * Design choices:
 *   - We never store the unmasked content. Once `gateOpen === false`, the
 *     placeholder replaces the raw match in the persisted `messages.content`
 *     column. There is no "shadow" raw column the receiver could read.
 *   - We mask the *matched substring* only, not the entire message, so
 *     legitimate text ("we already booked a lesson") still flows through.
 *     This is also why the soft-notice flag is returned separately — it
 *     lets the UI explain *why* small chunks of the message were rewritten.
 *   - All patterns are intentionally conservative. False positives on a
 *     marketplace where teachers and students chat about real-world
 *     logistics (addresses, civic numbers, postal codes) cost trust;
 *     false negatives just cost a couple of dollars of GMV per pair.
 */

import type { Locale } from "@/lib/i18n/types";

export type SanitizeReason =
  | "email"
  | "phone_na"
  | "phone_intl"
  | "channel_keyword"
  | "social_handle";

export type SanitizeResult = {
  /** Final content to persist. Identical to input iff `masked === false`. */
  content: string;
  /** True iff at least one mask substitution was applied. */
  masked: boolean;
  /** Distinct reasons; useful for moderation logging/QA. Order is insertion order. */
  reasons: SanitizeReason[];
};

const PLACEHOLDER_BY_LOCALE: Record<Locale, string> = {
  fr: "[masqué — info de contact]",
  en: "[hidden — contact info]",
  es: "[oculto — datos de contacto]",
};

/**
 * Order matters: most specific patterns first. Each regex's matches are
 * replaced with the localized placeholder; later patterns then run on the
 * already-replaced string, which is why `EMAIL` runs before `SOCIAL_HANDLE`
 * (otherwise `@example.com` would also be flagged as a social handle).
 *
 * `NANP` runs before `PHONE_INTL` because a North-American number with a
 * leading `+1` is matched by both — NANP first lets us tag it as `phone_na`.
 */
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const NANP_PHONE_RE = /\b(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

// International `+CC` phone numbers in many real-world groupings:
//   +33 6 12 34 56 78   (FR mobile, 2-digit groups)
//   +52 55 1234 5678    (MX, 4-digit groups)
//   +447911123456       (UK, no spaces)
// Strategy: explicit leading `+`, at least 8 total digits between separators,
// no more than 18 total chars after the `+`. That's loose enough for the
// patterns above and tight enough to reject things like "+1.2" or version
// strings. NANP `+1 …` numbers are caught earlier by NANP_PHONE_RE.
const PHONE_INTL_RE = /\+\d[\d\s.-]{7,18}\d/g;

// Channel keywords. `\b` guards against partial-word hits like "snap-on" or
// the surname "Snap"; `whats\s*app` covers the common "whats app" variant.
// `e[-\s]?transfer` matches "etransfer" / "e-transfer" / "e transfer".
const CHANNEL_KEYWORD_RE =
  /\b(?:interac|e[-\s]?transfer|virement|whatsapp|whats\s*app|telegram|signal|facetime|messenger|instagram|snapchat|snap|insta)\b/gi;

// Social handles like "@elena.dance". Lookbehind for start-of-string or
// whitespace prevents matching email locals (which were already replaced
// at this point, but the guard remains a defense-in-depth precaution).
// `{3,30}` filters short noise tokens like "@5pm" or "@team".
const SOCIAL_HANDLE_RE = /(?<=^|\s)@[A-Za-z0-9_.]{3,30}\b/g;

function applyPattern(
  input: string,
  pattern: RegExp,
  placeholder: string,
  reason: SanitizeReason,
  reasons: SanitizeReason[],
): { content: string; hit: boolean } {
  let hit = false;
  const next = input.replace(pattern, () => {
    hit = true;
    return placeholder;
  });
  if (hit && !reasons.includes(reason)) reasons.push(reason);
  return { content: next, hit };
}

/**
 * Mask personal contact info in user-composed message content.
 *
 * @param content - Raw message body from the sender. Trimmed by the caller.
 * @param locale  - UI locale of the sender. Drives the placeholder string.
 * @param gateOpen - True iff the sender/receiver pair already has at least
 *                   one completed lesson together. When `true`, the
 *                   function is a no-op and returns the input unchanged.
 */
export function sanitizeContactInfo(
  content: string,
  locale: Locale,
  gateOpen: boolean,
): SanitizeResult {
  if (gateOpen) {
    return { content, masked: false, reasons: [] };
  }

  const placeholder = PLACEHOLDER_BY_LOCALE[locale] ?? PLACEHOLDER_BY_LOCALE.fr;
  const reasons: SanitizeReason[] = [];
  let working = content;

  ({ content: working } = applyPattern(working, EMAIL_RE, placeholder, "email", reasons));
  ({ content: working } = applyPattern(working, NANP_PHONE_RE, placeholder, "phone_na", reasons));
  ({ content: working } = applyPattern(working, PHONE_INTL_RE, placeholder, "phone_intl", reasons));
  ({ content: working } = applyPattern(
    working,
    CHANNEL_KEYWORD_RE,
    placeholder,
    "channel_keyword",
    reasons,
  ));
  ({ content: working } = applyPattern(working, SOCIAL_HANDLE_RE, placeholder, "social_handle", reasons));

  return {
    content: working,
    masked: reasons.length > 0,
    reasons,
  };
}

/** Exposed for tests; do not import in production code. */
export const __INTERNAL_PATTERNS = {
  EMAIL_RE,
  NANP_PHONE_RE,
  PHONE_INTL_RE,
  CHANNEL_KEYWORD_RE,
  SOCIAL_HANDLE_RE,
};
