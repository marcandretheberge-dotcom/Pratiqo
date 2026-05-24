import type { TranslationKey } from "@/lib/translations";

/** Allowed regular lesson durations (minutes), 15-minute steps from 30 to 180. */
export const LESSON_DURATION_OPTIONS = [30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180] as const;

export type LessonDurationMinutes = (typeof LESSON_DURATION_OPTIONS)[number];

export const DEFAULT_LESSON_DURATION_MINUTES = 60;

export function isValidLessonDurationMinutes(value: unknown): value is LessonDurationMinutes {
  const n = Number(value);
  if (!Number.isFinite(n)) return false;
  const rounded = Math.round(n);
  return (LESSON_DURATION_OPTIONS as readonly number[]).includes(rounded);
}

/** Clamp to 30–180, 15-minute increments; otherwise return default (60). */
export function normalizeLessonDurationMinutes(value: unknown, fallback = DEFAULT_LESSON_DURATION_MINUTES): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.round(n);
  if (rounded < 30 || rounded > 180 || rounded % 15 !== 0) return fallback;
  return rounded;
}

export function formatLessonDurationLabel(
  minutes: number,
  t: (key: TranslationKey) => string,
): string {
  const m = normalizeLessonDurationMinutes(minutes);
  if (m === 60) return t("lessonDurationOneHour");
  if (m % 60 === 0) {
    return t("lessonDurationHours").replace("{hours}", String(m / 60));
  }
  if (m > 60) {
    const hours = Math.floor(m / 60);
    const rem = m % 60;
    return t("lessonDurationHoursMinutes")
      .replace("{hours}", String(hours))
      .replace("{minutes}", String(rem));
  }
  return t("lessonDurationMinutesShort").replace("{minutes}", String(m));
}

export function lessonDurationSummaryText(
  minutes: number,
  t: (key: TranslationKey) => string,
): string {
  return t("lessonDurationSummary").replace("{duration}", formatLessonDurationLabel(minutes, t));
}
