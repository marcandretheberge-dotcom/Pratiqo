export type TeacherSetupSectionId =
  | "profile"
  | "disciplines"
  | "pricing"
  | "availability"
  | "zone";

export type TeacherSetupChecklistItem = {
  id: TeacherSetupSectionId;
  labelKey:
    | "teacherSetupItemProfile"
    | "teacherSetupItemDisciplines"
    | "teacherSetupItemPricing"
    | "teacherSetupItemAvailability"
    | "teacherSetupItemZone";
  done: boolean;
};

type TeacherSetupInput = {
  name?: string | null;
  bio?: string | null;
  disciplineCount?: number;
  pricePerLesson?: number;
  availabilityCount?: number;
  city?: string | null;
  region?: string | null;
  teachingMode?: string | null;
};

export function buildTeacherSetupChecklist(input: TeacherSetupInput): TeacherSetupChecklistItem[] {
  const hasProfile =
    Boolean(input.name?.trim()) && Boolean(input.bio?.trim()) && (input.bio?.trim().length ?? 0) >= 20;
  const hasDisciplines = (input.disciplineCount ?? 0) > 0;
  const hasPricing = (input.pricePerLesson ?? 0) > 0;
  const hasAvailability = (input.availabilityCount ?? 0) > 0;
  const hasZone = Boolean(input.city?.trim()) && Boolean(input.region?.trim());

  return [
    { id: "profile", labelKey: "teacherSetupItemProfile", done: hasProfile },
    { id: "disciplines", labelKey: "teacherSetupItemDisciplines", done: hasDisciplines },
    { id: "pricing", labelKey: "teacherSetupItemPricing", done: hasPricing },
    { id: "availability", labelKey: "teacherSetupItemAvailability", done: hasAvailability },
    { id: "zone", labelKey: "teacherSetupItemZone", done: hasZone },
  ];
}

export function firstIncompleteTeacherSetupSection(
  items: TeacherSetupChecklistItem[],
): TeacherSetupSectionId | null {
  return items.find((item) => !item.done)?.id ?? null;
}

export function teacherSetupProgressPercent(items: TeacherSetupChecklistItem[]): number {
  if (items.length === 0) return 0;
  const done = items.filter((item) => item.done).length;
  return Math.round((done / items.length) * 100);
}
