import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ItalianCourseAssessment } from "@/components/yo/italian/course/ItalianCourseAssessment";
import { italianCourseCatalog, courseAssessments } from "@/lib/yo/italian/course/courseData";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { assessmentSpeech } from "@/lib/yo/italian/course/courseSpeech";
import { getYoLocale } from "@/lib/yo/localize";
type Props={params:Promise<{assessmentId:string}>;searchParams:Promise<{lang?:string|string[]}>};
export function generateStaticParams(){return courseAssessments.map(assessment=>({assessmentId:assessment.id}));}
export async function generateMetadata({params,searchParams}:Props):Promise<Metadata>{const {assessmentId}=await params;const assessment=courseAssessments.find(item=>item.id===assessmentId);if(!assessment)notFound();const locale=getYoLocale((await searchParams).lang);return{title:`${assessment.title[locale]} · Italiano 1 · YoPratiqo`,robots:{index:false,follow:false}};}
export default async function ItalianAssessmentPage({params,searchParams}:Props){const [{assessmentId},query]=await Promise.all([params,searchParams]);const assessment=courseAssessments.find(item=>item.id===assessmentId);if(!assessment)notFound();return <ItalianCourseAssessment key={assessment.id} locale={getYoLocale(query.lang)} catalog={italianCourseCatalog} assessment={assessment} audioPaths={courseAudioPaths(assessmentSpeech(assessment))}/>;}
