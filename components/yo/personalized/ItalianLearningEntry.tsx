"use client";
import { useEffect, useState, type ComponentProps } from "react";
import { GuidedItalianCourse } from "../italian/guided/GuidedItalianCourse";
import { ItalianOnboarding, type PlacementCheck } from "./ItalianOnboarding";
import { GUIDED_PROGRESS_KEY, parseProfile, profileKey, type LearningProfile } from "@/lib/yo/personalized/profile";
import { ITALIAN_COURSE_PROGRESS_KEY, parseCourseProgress, serializeCourseProgress } from "@/lib/yo/italian/course/courseProgress";
import { italianCourseHref } from "@/lib/yo/italian/course/courseLinks";
import { t } from "@/lib/yo/italian/course/courseAuthoring";
import { LearningFeedbackProvider } from "../feedback/LearningFeedback";
type Props=ComponentProps<typeof GuidedItalianCourse>&{checks:PlacementCheck[];placementAudio:Record<string,string>;entryHome?:boolean};
export function ItalianLearningEntry(props:Props){return <LearningFeedbackProvider><ItalianLearningEntryBody {...props}/></LearningFeedbackProvider>;}
function ItalianLearningEntryBody({checks,placementAudio,entryHome=false,...course}:Props){
 const [ready,setReady]=useState(false),[profile,setProfile]=useState<LearningProfile|null>(null),[editing,setEditing]=useState(false),[saved,setSaved]=useState(true);
 useEffect(()=>{const f=requestAnimationFrame(()=>{let p:LearningProfile|null=null;try{
  p=parseProfile(localStorage.getItem(profileKey("it")),"it",course.catalog.units.map(u=>u.id));
  // Copy only outcomes whose IDs still exist. The legacy value is never overwritten or removed.
  if(!localStorage.getItem(GUIDED_PROGRESS_KEY)){const legacy=localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY);if(legacy)localStorage.setItem(GUIDED_PROGRESS_KEY,serializeCourseProgress(parseCourseProgress(legacy,course.catalog)));}
  if(entryHome&&p){const progress=parseCourseProgress(localStorage.getItem(GUIDED_PROGRESS_KEY),course.catalog);const id=progress.resume?.unitId??p.startUnitId;if(id!==course.unit.id){window.location.replace(italianCourseHref(course.locale,id));return;}}
 }catch{setSaved(false);}setProfile(p);setReady(true);});return()=>cancelAnimationFrame(f);},[course.catalog,course.unit.id,course.locale,entryHome]);
 function complete(p:LearningProfile){try{localStorage.setItem(profileKey("it"),JSON.stringify(p));setSaved(true);}catch{setSaved(false);}setProfile(p);setEditing(false);if(p.startUnitId!==course.unit.id){window.location.assign(italianCourseHref(course.locale,p.startUnitId));}}
 if(!ready)return <main className="p-8" lang={course.locale}><p role="status">{t("Yoppo prépare ton parcours…","Yoppo is preparing your journey…","Yoppo prepara tu recorrido…")[course.locale]}</p></main>;
 if(!profile||editing)return <ItalianOnboarding locale={course.locale} catalog={course.catalog} checks={checks} audioPaths={placementAudio} initial={profile} onComplete={complete} onCancel={profile?()=>setEditing(false):undefined}/>;
 return <>{!saved?<p role="status" className="bg-amber-50 p-3 text-sm text-amber-900">{t("Tes préférences restent dans cette session seulement.","Your preferences last for this session only.","Tus preferencias duran solo esta sesión.")[course.locale]}</p>:null}<GuidedItalianCourse key={course.unit.id} {...course} profile={profile} onConfigure={()=>setEditing(true)} progressKey={GUIDED_PROGRESS_KEY}/></>;
}
