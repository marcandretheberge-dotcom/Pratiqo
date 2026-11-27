import type { Metadata } from "next";
import { ItalianLearningEntry } from "@/components/yo/personalized/ItalianLearningEntry";
import { personalizedItalianUnits, personalizedItalianCatalog, personalizedItalianLegacyUnits, moduleBank, moduleVisuals, placementChecks } from "@/lib/yo/personalized/courseData";
import { italianInterestAllUnits } from "@/lib/yo/italian/interests/unitOne";
import { italianInterestAudioPaths } from "@/lib/yo/audio/italianInterestPublished";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { unitSpeech, activitySpeech } from "@/lib/yo/italian/course/courseSpeech";
import { getYoLocale } from "@/lib/yo/localize";
import { FLORENCE_DISCOVERY_PHRASES } from "@/lib/yo/italian/travel/journey";
export const metadata:Metadata={title:"Italiano · Ton parcours avec Yoppo · YoPratiqo",robots:{index:false,follow:false}};
export default async function ItalianCoursePage({searchParams}:{searchParams:Promise<{lang?:string|string[];today?:string|string[]}>}){const [query, unit] = [await searchParams, personalizedItalianUnits[0]];const todayEnabled=(process.env.VERCEL_ENV==="preview"||process.env.NODE_ENV==="development")&&query.today==="preview";return <ItalianLearningEntry entryHome todayEnabled={todayEnabled} locale={getYoLocale(query.lang)} unit={unit} interestUnits={italianInterestAllUnits} legacyUnits={personalizedItalianLegacyUnits} travelFlorence={personalizedItalianUnits[5]} catalog={personalizedItalianCatalog} audioPaths={{...courseAudioPaths([...unitSpeech(unit),...italianInterestAllUnits.flatMap(unitSpeech),...personalizedItalianLegacyUnits.flatMap(unitSpeech),...moduleBank(unit).map(word=>word.it),...FLORENCE_DISCOVERY_PHRASES]),...italianInterestAudioPaths()}} wordBank={moduleBank(unit)} visualWords={moduleVisuals(unit)} checks={placementChecks} placementAudio={courseAudioPaths(placementChecks.flatMap(c=>activitySpeech(c.activity)))}/>;}
