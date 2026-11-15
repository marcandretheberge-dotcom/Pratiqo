import type { Metadata } from "next";
import { ItalianLearningEntry } from "@/components/yo/personalized/ItalianLearningEntry";
import { personalizedItalianUnits, personalizedItalianCatalog, moduleBank, moduleVisuals, placementChecks } from "@/lib/yo/personalized/courseData";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { unitSpeech, activitySpeech } from "@/lib/yo/italian/course/courseSpeech";
import { getYoLocale } from "@/lib/yo/localize";
import { FLORENCE_DISCOVERY_PHRASES } from "@/lib/yo/italian/travel/journey";
export const metadata:Metadata={title:"Italiano · Ton parcours avec Yoppo · YoPratiqo",robots:{index:false,follow:false}};
export default async function ItalianCoursePage({searchParams}:{searchParams:Promise<{lang?:string|string[]}>}){const unit=personalizedItalianUnits[0];return <ItalianLearningEntry entryHome locale={getYoLocale((await searchParams).lang)} unit={unit} travelFlorence={personalizedItalianUnits[5]} catalog={personalizedItalianCatalog} audioPaths={courseAudioPaths([...unitSpeech(unit),...moduleBank(unit).map(word=>word.it),...FLORENCE_DISCOVERY_PHRASES])} wordBank={moduleBank(unit)} visualWords={moduleVisuals(unit)} checks={placementChecks} placementAudio={courseAudioPaths(placementChecks.flatMap(c=>activitySpeech(c.activity)))}/>;}
