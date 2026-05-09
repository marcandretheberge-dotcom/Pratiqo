/** Remove trailing FAQ markdown section when FAQ is rendered as structured UI. */
export function stripEmbeddedFaqMarkdown(markdown: string): string {
  return markdown.replace(/\n## FAQ\s*[\s\S]*$/m, "").trim();
}

/**
 * For FR source article "tuteur-en-ligne-ou-a-domicile", remove comparison sections
 * when visual comparison cards are shown instead.
 */
export function stripTutorFormatComparisonFromFr(markdown: string): string {
  return markdown
    .replace(/\n## Les cours en ligne\s*[\s\S]*?\n## La bonne nouvelle\s*\n/, "\n\n## La bonne nouvelle\n")
    .trim();
}
