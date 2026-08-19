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

const LEADING_SNIPPET_MARKER = /^(?:[-–—*•·]+|\d+[.)]|#{1,6})\s*/u;

/**
 * Card-only bio snippet. Flattens whitespace and strips leading bullets /
 * dashes / markdown markers. Does not mutate stored `teachers.bio`.
 */
export function formatTeacherCardBioSnippet(content: string | null | undefined): string {
  let snippet = collapsePublicBioSnippet(content);
  for (let i = 0; i < 3 && snippet; i += 1) {
    const next = snippet.replace(LEADING_SNIPPET_MARKER, "").trim();
    if (next === snippet) break;
    snippet = next;
  }
  return snippet;
}
