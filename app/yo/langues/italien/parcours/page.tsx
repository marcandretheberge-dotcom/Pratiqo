import type { Metadata } from "next";
import { GuidedItalianCourse } from "@/components/yo/italian/guided/GuidedItalianCourse";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { unitSpeech } from "@/lib/yo/italian/course/courseSpeech";
import { italianCourseCatalog, italianCourseUnits } from "@/lib/yo/italian/course/courseData";
import { getYoLocale } from "@/lib/yo/localize";
type Query={lang?:string|string[]};
export async function generateMetadata({searchParams}:{searchParams:Promise<Query>}):Promise<Metadata>{
 const locale=getYoLocale((await searchParams).lang);
 return {title:{fr:"Italien 1 · La vie en italien · YoPratiqo",en:"Italian 1 · Life in Italian · YoPratiqo",es:"Italiano 1 · La vida en italiano · YoPratiqo"}[locale],description:{fr:"Un cours progressif d’italien débutant : douze unités, jeux, lectures, bilans et projets avec Yoppo.",en:"A progressive beginner Italian course: twelve units, games, readings, checkpoints and projects with Yoppo.",es:"Un curso progresivo de italiano inicial: doce unidades, juegos, lecturas, balances y proyectos con Yoppo."}[locale],robots:{index:false,follow:false}};
}
export default async function ItalianCoursePage({searchParams}:{searchParams:Promise<Query>}){const unit=italianCourseUnits[0];return <GuidedItalianCourse locale={getYoLocale((await searchParams).lang)} unit={unit} catalog={italianCourseCatalog} audioPaths={courseAudioPaths(unitSpeech(unit))}/>;}
