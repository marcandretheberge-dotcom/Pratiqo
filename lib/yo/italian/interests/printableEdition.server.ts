import "server-only";
import type { CourseCatalog, CourseUnit, CourseUnitSummary } from "../course/courseTypes";
import { italianInterestAllUnits, italianInterestLessons } from "./unitOne";
import { firstMeetingUnit } from "../../personalized/firstMeeting";
import { italianCourseUnits } from "../course/courseData";

/** Printed material carries the exact authored edition, independent of later preferences. */
export function printableItalianEdition(unit: CourseUnit, edition: string | string[] | undefined): CourseUnit | null {
  if (edition === undefined) return unit;
  if (unit.id !== "u01" || typeof edition !== "string" || edition.length > 500) return null;
  const ids = edition.split(",");
  if (ids.length !== 3 || new Set(ids).size !== 3) return null;
  const legacy = [firstMeetingUnit, italianCourseUnits[0]].find(item => item.lessons.every((lesson, index) => lesson.id === ids[index]));
  if (legacy) return legacy;
  const lessons = ids.map((id, index) => italianInterestLessons.find(lesson => lesson.id === id && id.endsWith(`-l${index + 1}`)));
  if (lessons.some(lesson => !lesson)) return null;
  const template = italianInterestAllUnits.find(item => item.lessons.some(lesson => lesson.id === ids[0]))!;
  const mixed = new Set(lessons.map(lesson => lesson?.discovery?.interest)).size > 1;
  return {
    ...template, lessons: lessons as CourseUnit["lessons"],
    objectives: lessons.map(lesson => lesson!.goal),
    ...(mixed ? { title: { fr: "Premières découvertes en italien", en: "First discoveries in Italian", es: "Primeros descubrimientos en italiano" } } : {}),
  };
}

export function printableItalianCatalog(catalog: CourseCatalog, unit: CourseUnit): CourseCatalog {
  const summary: CourseUnitSummary = {
    id: unit.id, number: unit.number, title: unit.title, subtitle: unit.subtitle, objectives: unit.objectives,
    lessons: unit.lessons.map(lesson => ({ id: lesson.id, title: lesson.title, activityIds: lesson.activities.map(item => item.id) })),
    activityIds: unit.lessons.flatMap(lesson => lesson.activities.map(item => item.id)),
    quizId: unit.quiz.id, productionId: unit.production.id, phraseCount: unit.lessons.reduce((total, lesson) => total + lesson.vocabulary.length, 0),
  };
  return {
    ...catalog,
    units: catalog.units.map(item => item.id === unit.id ? summary : item),
    assessments: [...catalog.assessments.filter(item => !item.unitIds.includes(unit.id)), {
      id: unit.quiz.id, title: unit.quiz.title, unitIds: [unit.id], questionCount: unit.quiz.questions.length, passPercent: unit.quiz.passPercent,
    }],
  };
}
