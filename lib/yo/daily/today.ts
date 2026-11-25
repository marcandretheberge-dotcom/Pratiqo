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
