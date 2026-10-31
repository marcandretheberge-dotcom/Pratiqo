import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ItalianCourseUnit } from "@/components/yo/italian/course/ItalianCourseUnit";
import { italianCourseUnits, italianCourseCatalog, courseSources, getItalianCourseUnit } from "@/lib/yo/italian/course/courseData";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { unitSpeech } from "@/lib/yo/italian/course/courseSpeech";
import { getYoLocale } from "@/lib/yo/localize";
type Props={params:Promise<{unitId:string}>;searchParams:Promise<{lang?:string|string[];lecon?:string|string[];activite?:string|string[]}>};
export function generateStaticParams(){return italianCourseUnits.map(unit=>({unitId:unit.id}));}
export async function generateMetadata({params,searchParams}:Props):Promise<Metadata>{const unit=getItalianCourseUnit((await params).unitId);if(!unit)notFound();const locale=getYoLocale((await searchParams).lang);return{title:`${unit.title[locale]} · Italiano 1 · YoPratiqo`,description:unit.subtitle[locale],robots:{index:false,follow:false}};}
export default async function ItalianUnitPage({params,searchParams}:Props){
 const [{unitId},query]=await Promise.all([params,searchParams]);const unit=getItalianCourseUnit(unitId);if(!unit)notFound();
 const lessonId=typeof query.lecon==="string"?query.lecon:undefined,activityId=typeof query.activite==="string"?query.activite:undefined;
 return <ItalianCourseUnit key={unit.id} unit={unit} locale={getYoLocale(query.lang)} catalog={italianCourseCatalog} sources={courseSources} audioPaths={courseAudioPaths(unitSpeech(unit))} initialLessonId={lessonId} initialActivityId={activityId}/>;
}
