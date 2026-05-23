/**
 * Public teacher bio sanitizer.
 *
 * Marketplace rule: a public teacher profile is rendered to anyone with the
 * URL (anon users, search engines, OpenGraph previews). The stored bio is
 * free-form text that a teacher can edit in onboarding. To prevent off-
 * platform leakage before the first completed lesson, this helper rewrites
 * personal-contact substrings at *render time* with a localized placeholder.
 *
 * Design choices:
 *   - The stored `teachers.bio` row is never mutated. Sanitization is purely
 *     a presentation concern; existing teachers do not need to re-edit.
 *   - We mask only the matched substring, not the whole paragraph, so a
 *     legitimate bio like "Je suis professeure de piano à Montréal — visitez
 *     mon site Insta pour exemples" keeps everything except the "Insta"
 *     keyword and any handle that follows it.
 *   - We deliberately preserve `pratiqo.ca` URLs (and subdomains like
 *     `www.pratiqo.ca`) so internal cross-links remain functional. Every
 *     other URL is treated as an off-platform link and masked.
 *   - Patterns reuse the same intent as the messaging sanitizer
 *     (lib/messaging/sanitizeContactInfo.ts) but live in a separate module
 *     so changing one does not silently change the other.
 */

export type SanitizePublicBioReason =
  | "email"
  | "phone_na"
  | "phone_intl"
  | "channel_keyword"
  | "social_handle"
  | "external_url";

export type SanitizePublicBioLocale = "fr" | "en" | "es";

export type SanitizePublicBioResult = {
  /** Final content suitable for public render. Identical to input iff `masked === false`. */
  content: string;
  /** True iff at least one mask substitution was applied. */
  masked: boolean;
  /** Distinct reasons in insertion order; useful for QA + tests. */
  reasons: SanitizePublicBioReason[];
};

const PLACEHOLDER_BY_LOCALE: Record<SanitizePublicBioLocale, string> = {
  fr: "[coordonnées masquées]",
  en: "[contact details hidden]",
  es: "[datos de contacto ocultos]",
};

// ---------------------------------------------------------------------------
// Patterns. Order matters — most specific first. URLs run before keywords
// because "instagram.com/marie" should be tagged as `external_url`, not
// `channel_keyword`. Emails run before social handles because "@example.com"
// inside an email local-part shouldn't double-flag.
// ---------------------------------------------------------------------------

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

// North-American Numbering Plan: optional +1, area code (parens or bare),
// then 3-3-4 digits with various separators.
const NANP_PHONE_RE = /\b(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

// International numbers starting with `+CC`. Leading `+`, 8–20 total digits
// with internal whitespace/dot/dash separators. Tight enough that "+1.2" or
// version strings like "v1.2.3" don't match. NANP catches `+1 …` first.
const PHONE_INTL_RE = /\+\d[\d\s.-]{7,18}\d/g;

// External URL pattern. Matches:
//   http://example.com
//   https://example.com/path
//   www.example.com/page
//   example.com/foo
// Reserved Pratiqo domains are exempted in the replacer below — we cannot
// easily express "any URL EXCEPT pratiqo.ca" in a single regex.
const URL_RE =
  /\b(?:https?:\/\/|www\.)[A-Z0-9.-]+\.[A-Z]{2,}(?:\/[^\s<>]*)?|\b[A-Z0-9-]+\.(?:com|net|org|ca|fr|es|mx|uy|io|app|me|co|info|biz|tv|link|page|site|to|gg|ly|sh)(?:\/[^\s<>]*)?/gi;

const PRATIQO_DOMAIN_RE = /\bpratiqo\.ca\b/i;

// Off-platform contact channel keywords. `\b` guards against partial-word
// hits like "snap-on" (a brand) or surnames. `whats\s*app` covers the common
// "whats app" / "whatsapp" variants; `e[-\s]?transfer` matches the QC-style
// "etransfer" / "e-transfer" / "e transfer". `virement` is the FR-CA term
// for Interac e-transfer.
const CHANNEL_KEYWORD_RE =
  /\b(?:interac|e[-\s]?transfer|virement|whatsapp|whats\s*app|telegram|signal|facetime|messenger|instagram|snapchat|snap|insta|tiktok|tik\s*tok|discord|skype|viber|wechat|kakao|line)\b/gi;

// Social handles like "@marie.dance". Lookbehind for start-of-string or
// whitespace prevents matching email locals. `{3,30}` filters short tokens
// like "@5pm" that are more likely to be times/notes than handles.
const SOCIAL_HANDLE_RE = /(?<=^|\s)@[A-Za-z0-9_.]{3,30}\b/g;

function applyPattern(
  input: string,
  pattern: RegExp,
  placeholder: string,
  reason: SanitizePublicBioReason,
  reasons: SanitizePublicBioReason[],
): string {
  let hit = false;
  const next = input.replace(pattern, () => {
    hit = true;
    return placeholder;
  });
  if (hit && !reasons.includes(reason)) reasons.push(reason);
  return next;
}

function applyUrlPattern(
  input: string,
  placeholder: string,
  reasons: SanitizePublicBioReason[],
): string {
  let hit = false;
  const next = input.replace(URL_RE, (match) => {
    // Preserve any URL that points at the Pratiqo marketing domain.
    if (PRATIQO_DOMAIN_RE.test(match)) return match;
    hit = true;
    return placeholder;
  });
  if (hit && !reasons.includes("external_url")) reasons.push("external_url");
  return next;
}

/**
 * Mask personal contact info in a teacher's public bio.
 *
 * Pure function — no I/O, no Date.now(), safe to call during SSR / SSG / RSC
 * render. The stored `teachers.bio` field is never touched; this only
 * affects what reaches the rendered DOM / HTML / JSON-LD.
 *
 * @param content - Raw bio string from `teachers.bio`. Null/undefined returns "".
 * @param locale  - UI locale for the placeholder string. Defaults to fr.
 */
export function sanitizePublicTeacherBio(
  content: string | null | undefined,
  locale: SanitizePublicBioLocale = "fr",
): SanitizePublicBioResult {
  if (typeof content !== "string" || content.length === 0) {
    return { content: "", masked: false, reasons: [] };
  }

  const placeholder = PLACEHOLDER_BY_LOCALE[locale] ?? PLACEHOLDER_BY_LOCALE.fr;
  const reasons: SanitizePublicBioReason[] = [];
  let working = content;

  working = applyPattern(working, EMAIL_RE, placeholder, "email", reasons);
  working = applyPattern(working, NANP_PHONE_RE, placeholder, "phone_na", reasons);
  working = applyPattern(working, PHONE_INTL_RE, placeholder, "phone_intl", reasons);
  working = applyUrlPattern(working, placeholder, reasons);
  working = applyPattern(working, CHANNEL_KEYWORD_RE, placeholder, "channel_keyword", reasons);
  working = applyPattern(working, SOCIAL_HANDLE_RE, placeholder, "social_handle", reasons);

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
  URL_RE,
  PRATIQO_DOMAIN_RE,
  CHANNEL_KEYWORD_RE,
  SOCIAL_HANDLE_RE,
};
