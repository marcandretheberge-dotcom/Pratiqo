export function lessonLocationLabel(
  teachingMode?: string | null,
  meetingUrl?: string | null,
): string {
  const mode = String(teachingMode ?? "").toLowerCase();
  if (mode === "online") {
    const url = typeof meetingUrl === "string" ? meetingUrl.trim() : "";
    return url ? `En ligne — ${url}` : "En ligne";
  }
  if (mode === "domicile" || mode === "home") return "À domicile";
  if (mode === "person" || mode === "in_person" || mode === "studio") return "En studio";
  return mode ? mode : "À confirmer";
}
