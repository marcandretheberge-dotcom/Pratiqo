import type { Teacher } from "@/types";
import { resolveDisciplineId } from "@/lib/taxonomy/disciplines";
import { foldLearnerDemandText, matchLearnerDemand } from "@/lib/learnerDemand";
import {
  resolveLearningProjectCity,
  type LearningAudience,
  type LearningFormat,
} from "@/lib/studentLearningProject";

export type DemandGroup = {
  subject: string;
  city: string;
  audience: LearningAudience;
  format: LearningFormat;
  account_count: number;
  updated_at: string;
};
export type DemandSupply =
  | "local"
  | "online"
  | "none"
  | "unclassified"
  | "unavailable";
export type ClassifiedDemandGroup = DemandGroup & {
  supply: DemandSupply;
  matchingTeachers: number | null;
};
export type LearningProjectOverview = {
  totalAccounts: number;
  declaredAccounts: number;
  deferredAccounts: number;
  unansweredAccounts: number;
  groups: ClassifiedDemandGroup[];
};

/** Aggregate synonyms without duplicating accounts (one current project/account). */
export function mergeDemandGroups(rows: DemandGroup[]): DemandGroup[] {
  const groups = new Map<string, DemandGroup>();
  for (const row of rows) {
    const city = resolveLearningProjectCity(row.city);
    const key = JSON.stringify([
      resolveDisciplineId(row.subject) ?? foldLearnerDemandText(row.subject),
      row.format === "online"
        ? ""
        : city
          ? `${city.name}|${city.provinceCode}`
          : foldLearnerDemandText(row.city),
      row.audience,
      row.format,
    ]);
    const previous = groups.get(key);
    groups.set(
      key,
      previous
        ? {
            ...previous,
            account_count: previous.account_count + row.account_count,
            updated_at:
              previous.updated_at > row.updated_at
                ? previous.updated_at
                : row.updated_at,
          }
        : {
            ...row,
            city:
              row.format === "online"
                ? ""
                : city
                  ? `${city.name}, ${city.provinceCode}`
                  : row.city,
          },
    );
  }
  return [...groups.values()].sort(
    (a, b) =>
      b.account_count - a.account_count ||
      b.updated_at.localeCompare(a.updated_at),
  );
}

export function classifyDemandGroup(
  row: DemandGroup,
  teachers: Teacher[] | null,
): ClassifiedDemandGroup {
  // A failed read, an unrecognised subject and an unmapped town are not proof
  // of absent supply. Online-only needs do not require a city.
  if (
    !resolveDisciplineId(row.subject) ||
    (row.format !== "online" && !resolveLearningProjectCity(row.city))
  ) {
    return { ...row, supply: "unclassified", matchingTeachers: null };
  }
  if (teachers === null)
    return { ...row, supply: "unavailable", matchingTeachers: null };
  const match = matchLearnerDemand(teachers, {
    subject: row.subject,
    city: row.city,
    requestedFormat: row.format === "online" ? "online" : "in_person",
    acceptsOnline: row.format !== "in_person",
    availabilityPreference: "any",
  });
  return {
    ...row,
    supply:
      match.outcome === "local_match"
        ? "local"
        : match.outcome === "online_match"
          ? "online"
          : "none",
    matchingTeachers: match.matchCount,
  };
}
