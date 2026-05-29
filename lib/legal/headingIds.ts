export function slugifyLegalHeadingText(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^\s*(?:\d+|[a-z]+|[ivxlcdm]+)(?:bis|ter|quater|a)?[.)]?\s+/i, "")
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "section";
}

export function normalizeLegalHeadingId(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createLegalHeadingIdRegistry() {
  const seen = new Map<string, number>();

  return function nextLegalHeadingId(text: string, preferredId?: string | null): string {
    const preferred = normalizeLegalHeadingId(preferredId);
    const base = preferred || slugifyLegalHeadingText(text);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);

    return count === 1 ? base : `${base}-${count}`;
  };
}
