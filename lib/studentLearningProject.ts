import { resolveDisciplineId } from "@/lib/taxonomy/disciplines";
import {
  CANADIAN_PLACES,
  normalizePlaceQuery,
} from "@/lib/search/canadianPlaces";

export type LearningFormat = "in_person" | "online" | "both";
export type LearningAudience = "self" | "child";
export type LearningProjectInput = {
  subject: string;
  audience: LearningAudience;
  format: LearningFormat;
  city: string;
};
export type LearningProject = LearningProjectInput & {
  completed_at: string | null;
  dismissed_at: string | null;
  updated_at: string;
};
export type LearningProjectResponse = {
  project: LearningProject | null;
  searchHref: string | null;
};
export const EMPTY_LEARNING_PROJECT: LearningProjectInput = {
  subject: "",
  audience: "self",
  format: "in_person",
  city: "",
};
export const LEARNING_PROJECT_COLUMNS =
  "subject,audience,format,city,completed_at,dismissed_at,updated_at";

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text.length <= 120 ? text : null;
}

export function parseLearningProject(
  value: unknown,
): LearningProjectInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const subject = clean(row.subject);
  const city = row.format === "online" ? "" : clean(row.city);
  if (!subject || city === null || (row.format !== "online" && !city))
    return null;
  if (row.audience !== "self" && row.audience !== "child") return null;
  if (
    row.format !== "in_person" &&
    row.format !== "online" &&
    row.format !== "both"
  )
    return null;
  return { subject, city, audience: row.audience, format: row.format };
}

export function resolveLearningProjectCity(city: string) {
  const query = normalizePlaceQuery(city);
  if (!query) return null;
  const matches = CANADIAN_PLACES.filter(
    (place) =>
      normalizePlaceQuery(place.name) === query ||
      normalizePlaceQuery(`${place.name}, ${place.provinceCode}`) === query,
  );
  // Ambiguous place names must be clarified, never silently assigned a province.
  return matches.length === 1 ? matches[0] : null;
}

export function learningProjectSearchHref(
  project: LearningProjectInput,
): string | null {
  const subject = resolveDisciplineId(project.subject);
  const city = resolveLearningProjectCity(project.city);
  if (!subject || (project.format !== "online" && !city)) return null;
  const params = new URLSearchParams({
    q: subject,
    source: "learning_project",
  });
  if (project.format === "online") params.set("format", "online");
  else {
    params.set("city", `${city!.name}, ${city!.provinceCode}`);
    // Existing local matching remains authoritative; online alternatives have
    // their own explicit link rather than broadening a local search silently.
    params.set("format", "in_person");
  }
  return `/student/search?${params}`;
}

export function learningProjectDraftKey(userId: string): string {
  return `pratiqo:learning-project:v1:${userId}`;
}

export function readLearningProjectDraft(
  raw: string | null,
): { values: LearningProjectInput; step: 1 | 2; savedAt: number } | null {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw);
    if (
      typeof draft.savedAt !== "number" ||
      Date.now() - draft.savedAt > 86_400_000
    )
      return null;
    const values = draft.values;
    if (
      !values ||
      clean(values.subject) === null ||
      clean(values.city) === null
    )
      return null;
    if (
      !["self", "child"].includes(values.audience) ||
      !["in_person", "online", "both"].includes(values.format)
    )
      return null;
    return {
      values,
      step: draft.step === 2 && values.subject.trim() ? 2 : 1,
      savedAt: draft.savedAt,
    };
  } catch {
    return null;
  }
}
