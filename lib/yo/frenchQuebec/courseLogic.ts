/** Preserve accents, word boundaries, apostrophes and negation; only typography varies. */
export function normalizeFrenchQuebecAnswer(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("fr-CA")
    .replace(/[’‘ʼ]/g, "'")
    // Spoken exercises do not dictate commas. Preserve decimal punctuation,
    // apostrophes and hyphens because removing them can change the answer.
    .replace(/[.,!?;:«»“”\"]/g, (mark: string, index: number, text: string) =>
      (mark === "." || mark === ",") && /\d/.test(text[index - 1] ?? "") && /\d/.test(text[index + 1] ?? "") ? mark : "")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesFrenchQuebecAnswer(value: string, accepted: readonly string[]): boolean {
  const answer = normalizeFrenchQuebecAnswer(value);
  return answer.length > 0 && accepted.some(item => normalizeFrenchQuebecAnswer(item) === answer);
}

export const FRENCH_QUEBEC_PROGRESS_KEY = "yopratiqo:french-quebec-foundations:v1";
export const frenchQuebecCourseHref = (locale: string, unit = "") =>
  `/yo/langues/francais-quebec/parcours${unit ? `/${encodeURIComponent(unit)}` : ""}?lang=${locale === "en" || locale === "es" ? locale : "fr"}`;
