/**
 * Presentation helpers for sanitized public teacher bios.
 *
 * Always run `sanitizePublicTeacherBio` first, then pass `sanitizedBio.content`
 * into these helpers. They never unmask contact info and never mutate stored
 * `teachers.bio`.
 */

function asText(content: string | null | undefined): string {
  return typeof content === "string" ? content : "";
}

/**
 * Split a sanitized bio into paragraphs for the public profile.
 * Paragraphs are blank-line separated (two or more line breaks).
 * Single line breaks inside a paragraph collapse to a space.
 */
export function splitPublicBioParagraphs(content: string | null | undefined): string[] {
  const raw = asText(content);
  if (!raw.trim()) return [];

  return raw
    .split(/\n(?:[ \t]*\n)+/)
    .map((paragraph) =>
      paragraph
        .replace(/[ \t]*\n[ \t]*/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((paragraph) => paragraph.length > 0);
}

/**
 * Collapse a sanitized bio into one plain-text line for card snippets.
 * Use with `line-clamp-2` — never with whitespace-pre-line / pre-wrap.
 */
export function collapsePublicBioSnippet(content: string | null | undefined): string {
  return asText(content).replace(/\s+/g, " ").trim();
}

const LINE_LIST_MARKER = /^(?:[-–—*•·]+|\d+[.)]|#{1,6})\s*/u;
/** List markers after a sentence end (`français. -Ayant`), not hyphens in names. */
const SENTENCE_LIST_MARKER = /([.!?…])\s*[-–—*•·]+\s*/gu;

function stripLeadingListMarker(line: string): string {
  let next = line.trim();
  for (let i = 0; i < 3 && next; i += 1) {
    const stripped = next.replace(LINE_LIST_MARKER, "").trim();
    if (stripped === next) break;
    next = stripped;
  }
  return next;
}

/**
 * Card-only bio snippet. Cleans each original line, then flattens.
 * Does not mutate stored `teachers.bio`. Profile paragraphs use
 * `splitPublicBioParagraphs` instead.
 */
export function formatTeacherCardBioSnippet(content: string | null | undefined): string {
  const raw = asText(content);
  if (!raw.trim()) return "";

  const joined = raw
    .split(/\r?\n/)
    .map((line) => stripLeadingListMarker(line))
    .filter((line) => line.length > 0)
    .join(" ")
    .replace(SENTENCE_LIST_MARKER, "$1 ")
    .replace(/\s+/g, " ")
    .trim();

  return joined;
}
