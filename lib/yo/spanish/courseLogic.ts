/** Accents and ñ carry meaning: sí/si, está/esta and año/ano are not interchangeable. */
export function normalizeSpanishAnswer(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("es-419")
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?¿¡;:«»“”\"]/g, "")
    .replace(/\s+/g, " ").trim();
}

export function matchesSpanishAnswer(value: string, accepted: readonly string[]): boolean {
  const answer = normalizeSpanishAnswer(value);
  return answer.length > 0 && accepted.some((item) => normalizeSpanishAnswer(item) === answer);
}

export const SPANISH_PROGRESS_KEY = "yopratiqo:spanish-foundations:v1";
export const spanishCourseHref = (locale: string, unit = "") =>
  `/yo/langues/espagnol/parcours${unit ? `/${encodeURIComponent(unit)}` : ""}?lang=${locale === "en" || locale === "es" ? locale : "fr"}`;
