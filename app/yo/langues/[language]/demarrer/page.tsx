import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { findIntroCourse } from "@/lib/yo/shared/course";
import { introAudioPaths } from "@/lib/yo/shared/audio.server";
import { getYoLocale } from "@/lib/yo/localize";
import { SharedIntro } from "@/components/yo/shared/SharedIntro";
type Props={params:Promise<{language:string}>;searchParams:Promise<{lang?:string|string[]}>};
export const metadata:Metadata={title:"Premières rencontres · YoPratiqo",robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:Props){
 const [p,q]=await Promise.all([params,searchParams]),locale=getYoLocale(q.lang);
 // Italian already has the reviewed module; preserve its exact profile, drafts and achievements.
 if(p.language==='italien')redirect(`/yo/langues/italien/parcours?lang=${locale}`);
 const course=findIntroCourse(p.language);if(!course)notFound();
 return <SharedIntro key={course.language} course={course} locale={locale} audio={introAudioPaths(course)}/>;
}
