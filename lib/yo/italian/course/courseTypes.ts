import type { ItalianActivity, ItalianChoiceActivity, ItalianTypeActivity, LocaleText } from "../italianModuleTypes";

export type { LocaleText } from "../italianModuleTypes";
export type CourseSkill = "reading" | "listening" | "interaction" | "writing" | "language";
export interface CoursePhrase { it: string; meaning: LocaleText; note?: LocaleText }
export interface CourseLesson {
  id: string;
  title: LocaleText;
  goal: LocaleText;
  vocabulary: CoursePhrase[];
  grammar: { title: LocaleText; body: LocaleText; examples: CoursePhrase[] };
  pronunciation: { body: LocaleText; practice: string[] };
  reading: CoursePhrase;
  readingActivityId?: string;
  activities: ItalianActivity[];
  speaking: { prompt: LocaleText; checklist: LocaleText[] };
}
export interface CoursePhoto {
  src: string;
  width: number;
  height: number;
  alt: LocaleText;
  caption: LocaleText;
  author: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
}
export interface CourseCultureStop {
  title: LocaleText;
  body: LocaleText;
  observation: LocaleText;
  phrase: CoursePhrase;
  photo: CoursePhoto;
  source: CourseSource;
}
export type CourseQuestion = (ItalianChoiceActivity | ItalianTypeActivity) & {
  photo?: CoursePhoto;
  taughtInUnitId?: string;
};
export interface CourseMissionScene {
  title: LocaleText;
  character: LocaleText;
  setting: LocaleText;
  success: LocaleText;
  recovery: LocaleText;
}
export interface CourseMission {
  title: LocaleText;
  briefing: LocaleText;
  success: LocaleText;
  retry: LocaleText;
  assisted: LocaleText;
  scenes: Record<string, CourseMissionScene>;
}
export interface CourseAssessment {
  id: string;
  title: LocaleText;
  description: LocaleText;
  unitIds: string[];
  questions: CourseQuestion[];
  passPercent: 80;
  theme?: "culture";
  purpose?: "midpoint";
  mission?: CourseMission;
}
export interface CourseProduction {
  id: string;
  title: LocaleText;
  prompt: LocaleText;
  model: string;
  rubric: LocaleText[];
}
export interface CourseUnit {
  id: string;
  number: number;
  title: LocaleText;
  subtitle: LocaleText;
  objectives: LocaleText[];
  lessons: CourseLesson[];
  quiz: CourseAssessment;
  midpoint?: CourseAssessment;
  production: CourseProduction;
  culture: { title: LocaleText; body: LocaleText; sourceIds: string[] };
  cultureStop?: CourseCultureStop;
}
export interface CourseSource { id: string; title: string; publisher: string; url: string; supports: LocaleText }
export interface CourseUnitSummary {
  id: string; number: number; title: LocaleText; subtitle: LocaleText; objectives: LocaleText[];
  lessons: { id: string; title: LocaleText; activityIds: string[] }[];
  activityIds: string[]; quizId: string; productionId: string; phraseCount: number;
  midpointId?: string;
  photo?: CoursePhoto;
}
export interface CourseCatalog {
  units: CourseUnitSummary[];
  assessments: { id: string; title: LocaleText; unitIds: string[]; questionCount: number; passPercent: 80; theme?: "culture"; purpose?: "midpoint" }[];
}
