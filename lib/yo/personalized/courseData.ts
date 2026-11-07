import { italianCourseUnits } from "../italian/course/courseData";
import { firstMeetingUnit, firstMeetingBank, firstMeetingVisuals } from "./firstMeeting";
import type { CourseCatalog, CourseUnit } from "../italian/course/courseTypes";
import type { WordBankEntry } from "./types";

/** Server-only curriculum projection; the legacy course and its stored identifiers stay intact. */
export const personalizedItalianUnits = [firstMeetingUnit, ...italianCourseUnits.slice(1)];
export const personalizedItalianCatalog: CourseCatalog = {
 units: personalizedItalianUnits.map(unit=>({id:unit.id,number:unit.number,title:unit.title,subtitle:unit.subtitle,objectives:unit.objectives,
  lessons:unit.lessons.map(l=>({id:l.id,title:l.title,activityIds:l.activities.map(a=>a.id)})),activityIds:unit.lessons.flatMap(l=>l.activities.map(a=>a.id)),
  quizId:unit.quiz.id,productionId:unit.production.id,phraseCount:unit.lessons.reduce((n,l)=>n+l.vocabulary.length,0),photo:unit.cultureStop?.photo})),
 assessments:personalizedItalianUnits.map(unit=>({id:unit.quiz.id,title:unit.quiz.title,unitIds:[unit.id],questionCount:unit.quiz.questions.length,passPercent:unit.quiz.passPercent})),
};
export const placementChecks = [
 {unitId:"u01",activity:firstMeetingUnit.quiz.questions[0]},
 {unitId:"u01",activity:firstMeetingUnit.quiz.questions[3]},
 {unitId:"u02",activity:italianCourseUnits[1].quiz.questions[2]},
 {unitId:"u03",activity:italianCourseUnits[2].quiz.questions[0]},
 {unitId:"u03",activity:italianCourseUnits[2].quiz.questions[2]},
 {unitId:"u04",activity:italianCourseUnits[3].quiz.questions[1]},
 {unitId:"u05",activity:italianCourseUnits[4].quiz.questions[0]},
 {unitId:"u06",activity:italianCourseUnits[5].quiz.questions[1]},
 {unitId:"u06",activity:italianCourseUnits[5].quiz.questions[3]},
];
export function personalizedUnit(id:string) { return personalizedItalianUnits.find(u=>u.id===id); }
export function moduleBank(unit:CourseUnit):WordBankEntry[] {
 if(unit.id==="u01") return firstMeetingBank;
 const phrases=unit.lessons.flatMap(l=>[...l.vocabulary,...l.grammar.examples]);
 return [...new Map(phrases.map(p=>[p.it,p])).values()].map(p=>({...p,group:"expressions" as const}));
}
export function moduleVisuals(unit:CourseUnit){return unit.id==="u01"?firstMeetingVisuals:{};}
