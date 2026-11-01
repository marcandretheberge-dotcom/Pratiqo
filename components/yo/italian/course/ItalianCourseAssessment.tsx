"use client";
import type { CourseAssessment, CourseCatalog } from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";
import { ItalianAudioProvider } from "../ItalianAudioProvider";
import { useItalianCourseProgress } from "./useItalianCourseProgress";
import { CourseAssessmentPlayer } from "./CourseAssessmentPlayer";
import { AudioPreparationNotice, C, CourseHeader } from "./CourseShared";
export function ItalianCourseAssessment({locale,catalog,assessment,audioPaths}:{locale:YoLocale;catalog:CourseCatalog;assessment:CourseAssessment;audioPaths:Record<string,string>}){
 const {recordAssessment,storageAvailable,ready,progress}=useItalianCourseProgress(catalog);
 return <ItalianAudioProvider paths={audioPaths}><div lang={locale} className="min-h-screen bg-[#f6f2e8] pb-36 text-[#302f27]"><CourseHeader locale={locale} assessmentId={assessment.id}/><main className="mx-auto max-w-4xl space-y-6 px-5 py-8 sm:px-8"><div><p className="text-xs font-bold uppercase tracking-widest text-[#ad6040]">Italiano · {C[locale].unitsScope} 1–{assessment.unitIds.length}</p><h1 className="mt-3 font-serif text-4xl">{assessment.title[locale]}</h1><p role="status" className="mt-3 text-xs text-[#776a55]">{ready&&!storageAvailable?C[locale].blocked:C[locale].local}</p></div>{assessment.theme!=="culture"?<AudioPreparationNotice locale={locale}/>:null}<CourseAssessmentPlayer key={`${assessment.id}-${progress.resetAt}`} assessment={assessment} locale={locale} onComplete={recordAssessment}/></main></div></ItalianAudioProvider>;
}
