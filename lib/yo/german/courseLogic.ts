/** Umlauts carry meaning: schon != schön, wurde != würde. No accent folding. */
export function normalizeGermanAnswer(value: string): string {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("de-DE")
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?;:„“”"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function matchesGermanAnswer(
  value: string,
  accepted: readonly string[],
): boolean {
  const answer = normalizeGermanAnswer(value);
  return (
    answer.length > 0 &&
    accepted.some((item) => normalizeGermanAnswer(item) === answer)
  );
}
export const GERMAN_PROGRESS_KEY = "yopratiqo:german-course:beginner:v1";
export const germanCourseHref = (locale: string, unit = "") =>
  `/yo/langues/allemand/parcours${unit ? `/${encodeURIComponent(unit)}` : ""}?lang=${locale === "en" || locale === "es" ? locale : "fr"}`;
