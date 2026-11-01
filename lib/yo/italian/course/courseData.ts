import { units01to06 } from "./units01to06";
import { units07to12 } from "./units07to12";
import { courseAssessments } from "./courseAssessments";
import { italianCultureStops } from "./courseCulture";
import { t } from "./courseAuthoring";
import type { CourseCatalog, CourseSource, CourseUnit } from "./courseTypes";

/** Imported by Server Components and offline tooling; clients receive one unit at a time. */
export const italianCourseUnits: CourseUnit[] = [...units01to06, ...units07to12].map(unit => ({ ...unit, cultureStop: italianCultureStops[unit.id] }));
export { courseAssessments };
export const courseSources: CourseSource[] = [
  ...Object.values(italianCultureStops).map(stop => stop.source),
  { id:"cefr", title:"CEFR: action-oriented learning and language activities", publisher:"Council of Europe", url:"https://www.coe.int/en/web/common-european-framework-reference-languages", supports:t("Référence pour distinguer réception, production et interaction. Les activités YoPratiqo sont originales.","Reference for distinguishing reception, production and interaction. YoPratiqo activities are original.","Referencia para distinguir recepción, producción e interacción. Las actividades de YoPratiqo son originales.") },
  { id:"udine-a1", title:"Programma livello A1", publisher:"Università degli Studi di Udine · CLA", url:"https://www.cla.uniud.it/contatti/lettori-e-collaboratori-ed-esperti-linguistici/lingua-italiana/porgramma-livello-a1", supports:t("Repère de périmètre pour la progression grammaticale et communicative débutante ; aucune affiliation universitaire.","Scope reference for beginner grammar and communication; no university affiliation.","Referencia de alcance para gramática y comunicación iniciales; sin afiliación universitaria.") },
  { id:"rai-bar", title:"Bar", publisher:"Rai Scuola · Italiano per stranieri", url:"https://www.raiscuola.rai.it/italianoperstranieri/articoli/2021/06/Bar-0e41ac52-3d39-4a29-86d7-9346cd6a139e.html", supports:t("Repère sur le bar italien, le comptoir et les tables.","Background on Italian bars, counters and tables.","Contexto sobre el bar italiano, la barra y las mesas.") },
  { id:"bologna-market", title:"L’antico mercato nel Quadrilatero", publisher:"Bologna Welcome", url:"https://www.bolognawelcome.com/it/luoghi/luoghi-di-shopping/lantico-mercato-nel-quadrilatero", supports:t("Le Quadrilatero comme quartier historique de commerce à Bologne.","The Quadrilatero as a historic commercial district of Bologna.","El Quadrilatero como barrio comercial histórico de Bolonia.") },
];

export const italianCourseCatalog: CourseCatalog = {
  units: italianCourseUnits.map(unit => ({ id:unit.id, number:unit.number, title:unit.title, subtitle:unit.subtitle, objectives:unit.objectives,
    lessons:unit.lessons.map(lesson => ({ id:lesson.id, title:lesson.title, activityIds:lesson.activities.map(activity=>activity.id) })),
    activityIds:unit.lessons.flatMap(lesson=>lesson.activities.map(activity=>activity.id)), quizId:unit.quiz.id, productionId:unit.production.id,
    photo:unit.cultureStop?.photo,
    phraseCount:unit.lessons.reduce((sum, lesson)=>sum+lesson.vocabulary.length,0),
  })),
  assessments:[...italianCourseUnits.map(unit=>unit.quiz), ...courseAssessments].map(assessment=>({id:assessment.id,title:assessment.title,unitIds:assessment.unitIds,questionCount:assessment.questions.length,passPercent:assessment.passPercent,theme:assessment.theme})),
};

export function getItalianCourseUnit(id: string) { return italianCourseUnits.find(unit=>unit.id===id); }
