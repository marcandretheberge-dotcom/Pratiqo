/**
 * Shared public-marketplace display helpers for teacher cards, map popup,
 * and profile modal. Discipline rules match `lib/teacherMapper.ts`.
 */

import type { Teacher, TeacherDisciplineDisplay, TeachingMode } from "@/types";
import {
  formatTeacherCardDisciplines,
  getTeacherProfileDisciplineChips,
  isPlaceholderDisciplineLabel,
} from "@/lib/teacherMapper";

const LANGUAGE_CODE_LABELS: Record<string, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  ja: "日本語",
  zh: "中文",
  ar: "العربية",
  ko: "한국어",
};

export type TeacherPublicFormatId = "online" | "in_person" | "home" | "hybrid";

export type TeacherProfileSummaryCardId =
  | "disciplines"
  | "formats"
  | "availability"
  | "rate"
  | "discovery"
  | "languages"
  | "levels";

function foldKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getMeaningfulStringList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = String(raw ?? "").trim();
    if (isPlaceholderDisciplineLabel(value)) continue;
    const key = foldKey(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }
  return unique;
}

export function getTeacherDisciplineDisplayItems(teacher: Teacher): TeacherDisciplineDisplay[] {
  if (teacher.disciplineDisplay && teacher.disciplineDisplay.length > 0) {
    const items: TeacherDisciplineDisplay[] = [];
    const seen = new Set<string>();
    for (const row of teacher.disciplineDisplay) {
      if (isPlaceholderDisciplineLabel(row.label)) continue;
      const key = foldKey(row.label) || foldKey(row.disciplineId);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      items.push(row);
    }
    if (items.length > 0) return items;
  }

  return getTeacherProfileDisciplineChips(teacher).map((chip) => ({
    disciplineId: chip.disciplineId,
    label: chip.label,
    specialite: "",
  }));
}

export function getTeacherDisciplineSummary(teacher: Teacher, opts?: { limit?: number }): string {
  return formatTeacherCardDisciplines(teacher, opts?.limit ?? 3);
}

/** Shared clickable-card hover. No layout shift; respects reduced motion. */
export const PUBLIC_TEACHER_CARD_INTERACTIVE_CLASS =
  "cursor-pointer transition duration-200 ease-out hover:shadow-md motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40";

/** Subtle avatar ring used by public teacher cards. */
export const PUBLIC_TEACHER_CARD_AVATAR_RING_CLASS = "ring-1 ring-[#E8E6DF]";

/**
 * When teacher_offers launches, this value should come from the minimum
 * active published offer. Until then, fall back to the legacy hourly rate.
 */
export function getTeacherPrimaryPriceAmount(teacher: Teacher): number | null {
  const amount = Number(teacher.pricePerLesson);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

export function getTeacherPrimaryPriceLabel(
  teacher: Teacher,
  opts: { formattedPrice: string; fromTemplate: string },
): string | null {
  if (getTeacherPrimaryPriceAmount(teacher) == null) return null;
  const formatted = String(opts.formattedPrice ?? "").trim();
  if (!formatted || isPlaceholderDisciplineLabel(formatted)) return null;
  return opts.fromTemplate.replace("{price}", formatted);
}

function homeFormatEnabled(teacher: Teacher): boolean {
  return teacher.homeLessonEnabled === true || teacher.teachingMode === "home";
}

export function getTeacherPublicFormatIds(teacher: Teacher): Array<"online" | "in_person" | "home"> {
  const mode: TeachingMode = teacher.teachingMode;
  const ids: Array<"online" | "in_person" | "home"> = [];
  if (mode === "online" || mode === "both" || mode === "all") ids.push("online");
  if (mode === "person" || mode === "both" || mode === "all") ids.push("in_person");
  if (homeFormatEnabled(teacher) && !ids.includes("home")) ids.push("home");
  return ids;
}

export function getTeacherCompactFormatId(teacher: Teacher): TeacherPublicFormatId | null {
  const ids = getTeacherPublicFormatIds(teacher);
  if (ids.length === 0) return null;
  if (ids.length === 1) return ids[0];
  return "hybrid";
}

export function getTeacherPublicFormatLabels(
  teacher: Teacher,
  labels: { online: string; inPerson: string; home: string; hybrid?: string },
): string[] {
  const ids = getTeacherPublicFormatIds(teacher);
  const out: string[] = [];
  for (const id of ids) {
    if (id === "online") out.push(labels.online);
    if (id === "in_person") out.push(labels.inPerson);
    if (id === "home") out.push(labels.home);
  }
  return out.filter((label) => !isPlaceholderDisciplineLabel(label));
}

export function getTeacherCompactFormatLabel(
  teacher: Teacher,
  labels: { online: string; inPerson: string; home: string; hybrid: string },
): string | null {
  const id = getTeacherCompactFormatId(teacher);
  if (!id) return null;
  if (id === "online") return labels.online;
  if (id === "in_person") return labels.inPerson;
  if (id === "home") return labels.home;
  return labels.hybrid;
}

export function getTeacherSpokenLanguageLabels(teacher: Teacher): string[] {
  return getMeaningfulStringList(teacher.languages).map((value) => {
    const mapped = LANGUAGE_CODE_LABELS[value.toLowerCase()];
    return mapped ?? value;
  });
}

export function getTeacherLevelLabels(teacher: Teacher): string[] {
  return getMeaningfulStringList(teacher.levels);
}

export function getTeacherAvailabilitySummary(teacher: Teacher, maxVisible = 2): string | null {
  const values = getMeaningfulStringList(teacher.availability);
  if (values.length === 0) return null;
  const shown = values.slice(0, maxVisible);
  const extra = values.length - shown.length;
  return extra > 0 ? `${shown.join(" · ")} +${extra}` : shown.join(" · ");
}

export function getTeacherPublicAreaLabel(teacher: Teacher): string | null {
  const city = String(teacher.city ?? "").trim();
  if (city) return city;
  const neighborhood = String(teacher.location?.neighborhood ?? "").trim();
  return neighborhood || null;
}

export function teacherShowsDiscoveryLesson(teacher: Teacher): boolean {
  return teacher.introSessionEnabled === true;
}

export function getTeacherDiscoveryLessonLabel(teacher: Teacher): string | null {
  if (!teacherShowsDiscoveryLesson(teacher)) return null;
  const minutes = Number(teacher.introSessionDurationMinutes);
  if (Number.isFinite(minutes) && minutes > 0) return `${Math.round(minutes)} min`;
  return "45 min";
}

export function getTeacherPublicDistanceKm(
  teacher: Teacher,
  userLat?: number | null,
  userLng?: number | null,
): number | null {
  const stored = Number(teacher.distance);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const lat = teacher.location?.lat;
  const lng = teacher.location?.lng;
  if (
    typeof userLat !== "number" ||
    typeof userLng !== "number" ||
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(userLat) ||
    !Number.isFinite(userLng) ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat - userLat);
  const dLng = toRad(lng - userLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(userLat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getTeacherProfileSummaryCardIds(teacher: Teacher): TeacherProfileSummaryCardId[] {
  const cards: TeacherProfileSummaryCardId[] = [];
  if (getTeacherDisciplineDisplayItems(teacher).length > 0) cards.push("disciplines");
  if (getTeacherPublicFormatIds(teacher).length > 0) cards.push("formats");
  if (getTeacherAvailabilitySummary(teacher)) cards.push("availability");
  if (getTeacherPrimaryPriceAmount(teacher) != null) cards.push("rate");
  if (teacherShowsDiscoveryLesson(teacher)) cards.push("discovery");
  if (getTeacherSpokenLanguageLabels(teacher).length > 0) cards.push("languages");
  if (getTeacherLevelLabels(teacher).length > 0) cards.push("levels");
  return cards;
}
