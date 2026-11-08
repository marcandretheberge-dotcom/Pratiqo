/** Review the real routes in a backend-free shell; never duplicate the player implementation. */
import { mkdir, writeFile, symlink } from "node:fs/promises";
import { join } from "node:path";
import { introCourses } from "../lib/yo/shared/course";
import { introAudioPaths } from "../lib/yo/shared/audio.server";
import { courseSteps } from "../lib/yo/shared/steps";
async function main() {
 const root=process.cwd(), dir=join(root,".qa-guided"), out=process.env.YO_QA_DIR??"/tmp/yo-shared-review";
 const files:Record<string,string>={
  "app/page.tsx":"import { redirect } from 'next/navigation'; export default function Page(){redirect('/yo/langues');}",
  "app/yo/langues/page.tsx":"import {YoLanguageQuickStart} from '@/components/yo/YoLanguageQuickStart'; import {getYoLocale} from '@/lib/yo/localize'; export default async function Page({searchParams}:{searchParams:Promise<{lang?:string}>}){return <main className='mx-auto max-w-5xl p-5'><YoLanguageQuickStart locale={getYoLocale((await searchParams).lang)}/></main>}",
  "app/layout.tsx":"import './globals.css'; export default function Layout({children}:{children:React.ReactNode}){return <html lang='en'><body>{children}</body></html>}",
  "app/globals.css":"@import '../../app/globals.css';\n@source '../../components';\n@source '../../lib';\nbody{font-family:Arial,sans-serif;margin:0}",
  "next.config.mjs":"export default {images:{unoptimized:true},allowedDevOrigins:['127.0.0.1','localhost'],experimental:{externalDir:true},devIndicators:false};",
  "postcss.config.mjs":"export default {plugins:{'@tailwindcss/postcss':{}}};",
  "package.json":JSON.stringify({name:"yo-shared-review",private:true}),
  "tsconfig.json":JSON.stringify({compilerOptions:{target:"ES2017",lib:["dom","dom.iterable","esnext"],skipLibCheck:true,strict:true,noEmit:true,esModuleInterop:true,module:"esnext",moduleResolution:"bundler",resolveJsonModule:true,isolatedModules:true,jsx:"react-jsx",paths:{"@/*":["../*"]},plugins:[{name:"next"}]},include:["**/*.ts","**/*.tsx",".next/types/**/*.ts"],exclude:["node_modules"]}),
 };
 for(const path of ["yo/langues/[language]/demarrer/page","yo/langues/[language]/demarrer/vocabulaire/page","yo/langues/italien/parcours/page"])
  files[`app/${path}.tsx`]=`export {default} from '@/app/${path}';`;
 for(const [name,text]of Object.entries(files)){const target=join(dir,name);await mkdir(join(target,".."),{recursive:true});await writeFile(target,text);}
 try{await symlink(join(root,"public"),join(dir,"public"),"dir");}catch(e){if((e as NodeJS.ErrnoException).code!=="EEXIST")throw e;}
 await mkdir(out,{recursive:true});
 await writeFile(join(out,"courses.json"),JSON.stringify(introCourses.map(course=>({course,steps:courseSteps(course)}))));
 await writeFile(join(out,"audio-inventory.json"),JSON.stringify(introCourses.map(c=>({language:c.language,phrases:c.phrases.length,existingPaths:Object.keys(introAudioPaths(c)).length,missing:c.phrases.filter(p=>!introAudioPaths(c)[p.text]).map(p=>p.text)})),null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
