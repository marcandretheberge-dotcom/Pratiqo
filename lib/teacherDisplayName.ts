import type { Teacher } from "@/types";

/**
 * Card / list label: given name(s) + first grapheme of last name + period
 * (layout + light privacy). Example: "Marc-André Théberge" → "Marc-André T."
 */
export function formatTeacherCardShortName(fullName: string): string {
  const normalized = fullName.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const parts = normalized.split(" ");
  if (parts.length === 1) return parts[0]!;

  const lastRaw = parts[parts.length - 1]!;
  const given = parts.slice(0, -1).join(" ");
  const firstGrapheme = Array.from(lastRaw)[0];
  if (!firstGrapheme) return given;

  return `${given} ${firstGrapheme}.`;
}

/** City / region string for marketplace cards when distance is unknown. */
export function teacherCardLocationPlace(teacher: Pick<Teacher, "city" | "region">): string | null {
  const city = typeof teacher.city === "string" ? teacher.city.trim() : "";
  const region = typeof teacher.region === "string" ? teacher.region.trim() : "";
  if (city && region && city.toLowerCase() !== region.toLowerCase()) {
    return `${city}, ${region}`;
  }
  return city || region || null;
}
