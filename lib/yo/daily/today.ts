import { getDueActivityIds, type CourseProgress } from "../italian/course/courseProgress";
import { italianCourseHref, italianMissionHref } from "../italian/course/courseLinks";
import type { CourseCatalog } from "../italian/course/courseTypes";
import type { YoLocale } from "../types";

export const DAILY_EXERCISE_TARGET = 5;
const TENANT_DEFAULT_ZONE = "America/Toronto";

export function learningDayKey(instant: number, timezone = TENANT_DEFAULT_ZONE) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(instant));
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

// Integer civil-date ordinals, never elapsed time between local midnights.
const ordinal = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86_400_000;
const monday = (day: number) => day - (((day + 3) % 7) + 7) % 7;

export function dailyStreak(activeDays: string[], today: string) {
  const currentDay = ordinal(today);
  const days = [...new Set(activeDays.map(ordinal))].filter(d => d <= currentDay).sort((a, b) => a - b);
  let current = 0;
  let previous = -Infinity;
  const freezeWeeks = new Set<number>();
  for (const day of days) {
    const week = monday(day - 1);
    if (day === previous + 1) current++;
    else if (day === previous + 2 && !freezeWeeks.has(week)) {
      freezeWeeks.add(week);
      current++;
    } else current = 1;
    previous = day;
  }
  const age = currentDay - previous;
  if (age > 2 || (age === 2 && freezeWeeks.has(monday(currentDay - 1)))) return 0;
  return current;
}

export function italianTodayNavigation(
  catalog: CourseCatalog, progress: CourseProgress, locale: YoLocale, startUnitId: string, now: number,
) {
  const current = progress.resume;
  const unitId = current?.unitId ?? startUnitId;
  const continueHref = current?.lessonId
    ? italianCourseHref(locale, unitId, current.lessonId, current.activityId)
    : italianMissionHref(locale, unitId);
  const due = getDueActivityIds(progress, catalog, now);
  const firstDue = new Set(due.slice(0, 1));
  let reviewHref: string | null = null;
  for (const unit of catalog.units) {
    const lesson = unit.lessons.find(l => l.activityIds.some(id => firstDue.has(id)));
    if (lesson) {
      reviewHref = italianCourseHref(locale, unit.id, lesson.id, due[0]);
      break;
    }
  }
  return { continueHref, reviewHref, due: due.length };
}
