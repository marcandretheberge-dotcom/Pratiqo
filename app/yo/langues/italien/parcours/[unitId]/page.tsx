import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ItalianLearningEntry } from "@/components/yo/personalized/ItalianLearningEntry";
import { personalizedItalianUnits, personalizedItalianCatalog, personalizedUnit, moduleBank, moduleVisuals, placementChecks } from "@/lib/yo/personalized/courseData";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { unitSpeech, activitySpeech } from "@/lib/yo/italian/course/courseSpeech";
import { getYoLocale } from "@/lib/yo/localize";
type Props={params:Promise<{unitId:string}>;searchParams:Promise<{lang?:string|string[];lecon?:string|string[];activite?:string|string[];mission?:string|string[]}>};
export function generateStaticParams(){return personalizedItalianUnits.map(u=>({unitId:u.id}));}
export async function generateMetadata({params,searchParams}:Props):Promise<Metadata>{const unit=personalizedUnit((await params).unitId);if(!unit)notFound();const locale=getYoLocale((await searchParams).lang);return {title:`${unit.title[locale]} · Italiano · YoPratiqo`,description:unit.subtitle[locale],robots:{index:false,follow:false}};}
export default async function ItalianUnitPage({params,searchParams}:Props){const [p,q]=await Promise.all([params,searchParams]),unit=personalizedUnit(p.unitId);if(!unit)notFound();return <ItalianLearningEntry key={unit.id} unit={unit} locale={getYoLocale(q.lang)} catalog={personalizedItalianCatalog} audioPaths={courseAudioPaths([...unitSpeech(unit),...moduleBank(unit).map(word=>word.it)])} wordBank={moduleBank(unit)} visualWords={moduleVisuals(unit)} checks={placementChecks} placementAudio={courseAudioPaths(placementChecks.flatMap(c=>activitySpeech(c.activity)))} initialLessonId={typeof q.lecon==="string"?q.lecon:undefined} initialActivityId={typeof q.activite==="string"?q.activite:undefined} resumeMission={q.mission==="continue"}/>;}
