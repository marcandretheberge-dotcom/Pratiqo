/** Preserve accents: avó/avô and e/é are not interchangeable. */
export function normalizePortugueseAnswer(value: string): string {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("pt-BR")
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?;:“”\"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function matchesPortugueseAnswer(
  value: string,
  accepted: readonly string[],
): boolean {
  const normalized = normalizePortugueseAnswer(value);
  return (
    !!normalized &&
    accepted.some((item) => normalizePortugueseAnswer(item) === normalized)
  );
}
export const PORTUGUESE_PROGRESS_KEY =
  "yopratiqo:portuguese-br-course:beginner:v1";
export const portugueseCourseHref = (locale: string, unit = "") =>
  `/yo/langues/portugais-bresil/parcours${unit ? `/${encodeURIComponent(unit)}` : ""}?lang=${locale === "en" || locale === "es" ? locale : "fr"}`;
