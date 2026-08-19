/**
 * Store teacher-authored offer fields as safe plain text.
 *
 * This is write-time sanitization for teacher_offers title/body fields.
 * It is not the public-bio contact masker (lib/teacherProfile/sanitizePublicBio)
 * and it does not render HTML.
 */

const SCRIPT_OR_STYLE_RE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;
const EVENT_HANDLER_RE = /\bon[a-z]+\s*=/gi;
const JS_PROTOCOL_RE = /javascript\s*:/gi;
const VB_PROTOCOL_RE = /vbscript\s*:/gi;
const DATA_PROTOCOL_RE = /data\s*:/gi;
const NULL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (full, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) {
      const code = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    }
    if (lower.startsWith("#")) {
      const code = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    }
    return NAMED_ENTITIES[lower] ?? "";
  });
}

function stripUnsafeMarkup(value: string): string {
  let next = value.replace(SCRIPT_OR_STYLE_RE, " ");
  next = next.replace(HTML_TAG_RE, " ");
  next = next.replace(EVENT_HANDLER_RE, " ");
  next = next.replace(JS_PROTOCOL_RE, " ");
  next = next.replace(VB_PROTOCOL_RE, " ");
  next = next.replace(DATA_PROTOCOL_RE, " ");
  next = next.replace(NULL_CHARS_RE, "");
  return next;
}

function collapseHorizontalWhitespace(value: string): string {
  return value.replace(/[^\S\n\r]+/g, " ");
}

export function sanitizeTeacherOfferPlainText(
  value: string,
  options?: { singleLine?: boolean },
): string {
  let next = stripUnsafeMarkup(value);
  next = decodeHtmlEntities(next);
  // Encoded tags such as &lt;script&gt; become markup after decode — strip again.
  next = stripUnsafeMarkup(next);
  next = collapseHorizontalWhitespace(next);
  if (options?.singleLine) {
    next = next.replace(/[\n\r]+/g, " ");
  } else {
    next = next.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  }
  return next.trim();
}

export function sanitizeTeacherOfferTitle(value: string): string {
  return sanitizeTeacherOfferPlainText(value, { singleLine: true });
}

export function sanitizeTeacherOfferShortText(value: string): string {
  return sanitizeTeacherOfferPlainText(value, { singleLine: true });
}

export function sanitizeTeacherOfferDescription(value: string): string {
  return sanitizeTeacherOfferPlainText(value, { singleLine: false });
}
