/** Review the real routes in a backend-free shell; never duplicate the player implementation. */
import { mkdir, writeFile, symlink } from "node:fs/promises";
import { join } from "node:path";
import { introCourses } from "../lib/yo/shared/course";
import { introAudioPaths } from "../lib/yo/shared/audio.server";
import { courseSteps } from "../lib/yo/shared/steps";
import { foundationContent } from "../lib/yo/foundations/catalog.server";
import { foundationSettings } from "../lib/yo/foundations/experience";
import { foundationAudioPaths } from "../lib/yo/foundations/audio.server";
import { germanCourseUnits, germanExtendedFinal, germanFinal } from "../lib/yo/german/courseData";
import { portugueseCourseUnits, portugueseExtendedFinal, portugueseFinal } from "../lib/yo/portuguese/courseData";
import { GERMAN_PROGRESS_KEY } from "../lib/yo/german/courseLogic";
import { PORTUGUESE_PROGRESS_KEY } from "../lib/yo/portuguese/courseLogic";
async function main() {
 const root=process.cwd(), dir=join(root,".qa-guided"), out=process.env.YO_QA_DIR??"/tmp/yo-shared-review";
 const files:Record<string,string>={
  "app/page.tsx":"import { redirect } from 'next/navigation'; export default function Page(){redirect('/yo/langues');}",
  "app/yo/langues/page.tsx":"import {YoLanguageQuickStart} from '@/components/yo/YoLanguageQuickStart'; import {getYoLocale} from '@/lib/yo/localize'; export default async function Page({searchParams}:{searchParams:Promise<{lang?:string}>}){return <main className='mx-auto max-w-5xl p-5'><YoLanguageQuickStart locale={getYoLocale((await searchParams).lang)}/></main>}",
  "app/layout.tsx":"import './globals.css'; export default function Layout({children}:{children:React.ReactNode}){return <html lang='en'><body>{children}</body></html>}",
  "app/globals.css":"@import '../../app/globals.css';\n@source '../../components';\n@source '../../lib';\nbody{font-family:Arial,sans-serif;margin:0}",
  "app/api/yo/review/exercise/route.ts":"export {GET} from '@/app/api/yo/review/exercise/route';",
  "next.config.mjs":"export default {images:{unoptimized:true},allowedDevOrigins:['127.0.0.1','localhost'],experimental:{externalDir:true},devIndicators:false};",
  "postcss.config.mjs":"export default {plugins:{'@tailwindcss/postcss':{}}};",
  "package.json":JSON.stringify({name:"yo-shared-review",private:true}),
  "tsconfig.json":JSON.stringify({compilerOptions:{target:"ES2017",lib:["dom","dom.iterable","esnext"],skipLibCheck:true,strict:true,noEmit:true,esModuleInterop:true,module:"esnext",moduleResolution:"bundler",resolveJsonModule:true,isolatedModules:true,jsx:"react-jsx",paths:{"@/*":["../*"]},plugins:[{name:"next"}]},include:["**/*.ts","**/*.tsx",".next/types/**/*.ts"],exclude:["node_modules"]}),
 };
 // Keep route layouts too: the Italian layout owns the production course and map CSS.
 for(const path of ["yo/langues/layout","yo/langues/[language]/demarrer/page","yo/langues/[language]/demarrer/vocabulaire/page","yo/langues/italien/parcours/layout","yo/langues/italien/parcours/page","yo/langues/italien/parcours/[unitId]/page","yo/langues/espagnol/pays/republique-dominicaine/intro/page","yo/langues/francais-quebec/module-1/lecon-3/page"])
  files[`app/${path}.tsx`]=`export {default} from '@/app/${path}';`;
 for (const slug of ["anglais", "espagnol", "francais-quebec", "allemand", "portugais-bresil"]) for (const segment of ["layout", "page", "[unitId]/page"]) {
   if (slug === "allemand" && segment === "layout") continue; // German uses the existing parent layout.
   const path = `yo/langues/${slug}/parcours/${segment}`;
   files[`app/${path}.tsx`] = `export {default} from '@/app/${path}';`;
 }
 for(const [name,text]of Object.entries(files)){const target=join(dir,name);await mkdir(join(target,".."),{recursive:true});await writeFile(target,text);}
 try{await symlink(join(root,"public"),join(dir,"public"),"dir");}catch(e){if((e as NodeJS.ErrnoException).code!=="EEXIST")throw e;}
 await mkdir(out,{recursive:true});
 await writeFile(join(out,"foundation-courses.json"), JSON.stringify((["en", "es", "fr-CA"] as const).map(language => {
  const content = foundationContent(language), unit = content.units[0], lesson = unit.lessons[0];
  const paths = foundationAudioPaths(language, unit);
  const sample = (text: string) => ({ text, path: paths[text] });
  // These are real visible controls and exact published paths. In Québec, the
  // first dialogue starts with an existing Storage clip; use the next local one.
  const dialogue = unit.lessons.flatMap(item => item.activities.flatMap(activity =>
   activity.kind === "dialogue" && paths[activity.turns[0].line]?.startsWith("/audio/yo/premium/")
    ? [{ ...sample(activity.turns[0].line), lessonId: item.id, activityId: activity.id }] : []))[0];
  const audioSamples = {
   vocabulary: sample(lesson.vocabulary[0].it),
   grammar: sample(lesson.grammar.examples[1].it),
   reading: sample(lesson.reading.it),
   dialogue,
  };
  if (Object.values(audioSamples).some(item => !item?.path?.startsWith("/audio/yo/premium/"))) {
   throw new Error(`Missing published foundation playback sample for ${language}`);
  }
  return { language, ...foundationSettings[language], ...content, audioSamples };
 })));
 await writeFile(join(out,"depth-courses.json"), JSON.stringify([
  {language:"de",slug:"allemand",progressKey:GERMAN_PROGRESS_KEY,units:germanCourseUnits,final:germanExtendedFinal,legacyFinal:germanFinal},
  {language:"pt-BR",slug:"portugais-bresil",progressKey:PORTUGUESE_PROGRESS_KEY,units:portugueseCourseUnits,final:portugueseExtendedFinal,legacyFinal:portugueseFinal},
 ]));
 await writeFile(join(out,"courses.json"),JSON.stringify(introCourses.map(course=>({course,steps:courseSteps(course)}))));
 await writeFile(join(out,"audio-inventory.json"),JSON.stringify(introCourses.map(c=>({language:c.language,phrases:c.phrases.length,existingPaths:Object.keys(introAudioPaths(c)).length,missing:c.phrases.filter(p=>!introAudioPaths(c)[p.text]).map(p=>p.text)})),null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
