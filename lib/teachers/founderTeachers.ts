const FOUNDER_TEACHER_IDS = new Set<string>([
  // TODO: replace this visual allowlist with a teacher_promotions table
  // when the founder commission waiver is implemented.
]);

export function isFounderTeacher(teacherId: string | null | undefined): boolean {
  const normalized = String(teacherId ?? "").trim();
  return normalized.length > 0 && FOUNDER_TEACHER_IDS.has(normalized);
}
