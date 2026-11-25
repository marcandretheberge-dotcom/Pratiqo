/** Preserve meaningful apostrophes and negation; spelling alternatives are authored per task. */
export function normalizeEnglishAnswer(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("en-CA")
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?;:“”"]/g, "")
    .replace(/\s+/g, " ").trim();
}

export function matchesEnglishAnswer(value: string, accepted: readonly string[]): boolean {
  const answer = normalizeEnglishAnswer(value);
  return answer.length > 0 && accepted.some((candidate) => normalizeEnglishAnswer(candidate) === answer);
}

export const ENGLISH_PROGRESS_KEY = "yopratiqo:english-foundations:v1";
export const englishCourseHref = (locale: string, unit = "") =>
  `/yo/langues/anglais/parcours${unit ? `/${encodeURIComponent(unit)}` : ""}?lang=${locale === "en" || locale === "es" ? locale : "fr"}`;
