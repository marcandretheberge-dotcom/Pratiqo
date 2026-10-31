import type { YoLocale } from "../../types";
export const ITALIAN_COURSE_PATH = "/yo/langues/italien/parcours";
export function italianCourseHref(locale:YoLocale, unitId?:string, lessonId?:string, activityId?:string) {
  const params=new URLSearchParams();
  if(locale!=="fr") params.set("lang",locale);
  if(lessonId) params.set("lecon",lessonId);
  if(activityId) params.set("activite",activityId);
  const query=params.toString();
  return `${ITALIAN_COURSE_PATH}${unitId?`/${encodeURIComponent(unitId)}`:""}${query?`?${query}`:""}`;
}
export function italianAssessmentHref(locale:YoLocale,id:string){return `${ITALIAN_COURSE_PATH}/bilans/${encodeURIComponent(id)}${locale!=="fr"?`?lang=${locale}`:""}`;}
