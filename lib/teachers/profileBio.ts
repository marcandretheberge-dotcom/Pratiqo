/**
 * Display-only profile bio blocks. Always sanitize first, then parse
 * `sanitizedBio.content`. Never mutates stored `teachers.bio`.
 *
 * User text is returned as plain strings for React children — never as HTML.
 */

export type TeacherProfileBioParagraphBlock = {
  type: "paragraph";
  text: string;
};

export type TeacherProfileBioListBlock = {
  type: "list";
  items: string[];
};

export type TeacherProfileBioBlock =
  | TeacherProfileBioParagraphBlock
  | TeacherProfileBioListBlock;

const LIST_MARKER_RE = /^([-–—*•·]+)(?:\s+|(?=\S))(.*)$/u;

function asText(content: string | null | undefined): string {
  return typeof content === "string" ? content : "";
}

function collapseInlineWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function parseTeacherProfileBioListItem(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const match = trimmed.match(LIST_MARKER_RE);
  if (!match) return null;
  const item = collapseInlineWhitespace(match[2] ?? "");
  return item.length > 0 ? item : null;
}

function flushParagraph(
  lines: string[],
  blocks: TeacherProfileBioBlock[],
): void {
  const text = collapseInlineWhitespace(lines.join(" "));
  lines.length = 0;
  if (text) blocks.push({ type: "paragraph", text });
}

function flushList(items: string[], blocks: TeacherProfileBioBlock[]): void {
  if (items.length === 0) return;
  blocks.push({ type: "list", items: [...items] });
  items.length = 0;
}

/**
 * Convert sanitized teacher bio text into paragraph and list blocks.
 * Consecutive list-marker lines become one list, including when blank lines
 * sit between items. Blank lines still separate normal paragraphs.
 */
export function parseTeacherProfileBio(
  content: string | null | undefined,
): TeacherProfileBioBlock[] {
  const raw = asText(content);
  if (!raw.trim()) return [];

  const blocks: TeacherProfileBioBlock[] = [];
  const paragraphLines: string[] = [];
  const listItems: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph(paragraphLines, blocks);
      continue;
    }

    const listItem = parseTeacherProfileBioListItem(trimmed);
    if (listItem) {
      flushParagraph(paragraphLines, blocks);
      listItems.push(listItem);
      continue;
    }

    flushList(listItems, blocks);
    paragraphLines.push(trimmed);
  }

  flushParagraph(paragraphLines, blocks);
  flushList(listItems, blocks);
  return blocks;
}

/** Alias kept for callers that prefer a “format blocks” name. */
export const formatTeacherProfileBioBlocks = parseTeacherProfileBio;
