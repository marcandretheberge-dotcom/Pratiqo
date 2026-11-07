/** Isolated shell uses the actual route components, never a second implementation. */
import { mkdir, writeFile, symlink } from "node:fs/promises";
import { join } from "node:path";
import { personalizedItalianUnits, personalizedItalianCatalog, placementChecks, moduleVisuals } from "../lib/yo/personalized/courseData";
import { guidedSteps } from "../lib/yo/italian/course/guidedItalian";
async function main(){const root=process.cwd(),dir=join(root,".qa-guided"),out=process.env.YO_QA_DIR??"/tmp/yo-personalized-qa";
 const pages=["yo/langues/italien/parcours/page.tsx","yo/langues/italien/parcours/[unitId]/page.tsx","yo/langues/italien/parcours/[unitId]/vocabulaire/page.tsx"];
 const files:Record<string,string>={
  "app/page.tsx":"import { redirect } from 'next/navigation'; export default function Page(){redirect('/yo/langues/italien/parcours?lang=en');}",
  "app/layout.tsx":"import './globals.css'; export default function Layout({children}:{children:React.ReactNode}){return <html lang='en'><body>{children}</body></html>}",
  "app/globals.css":"@import 'tailwindcss';\n@source '../../components';\n@source '../../lib';\nbody{font-family:Arial,sans-serif;margin:0}",
  "next.config.mjs":"export default { images:{unoptimized:true},allowedDevOrigins:['127.0.0.1','localhost'],experimental:{externalDir:true},devIndicators:false};",
  "postcss.config.mjs":"export default {plugins:{'@tailwindcss/postcss':{}}};",
  "tsconfig.json":JSON.stringify({compilerOptions:{target:"ES2017",lib:["dom","dom.iterable","esnext"],skipLibCheck:true,strict:true,noEmit:true,esModuleInterop:true,module:"esnext",moduleResolution:"bundler",resolveJsonModule:true,isolatedModules:true,jsx:"react-jsx",paths:{"@/*":["../*"]},plugins:[{name:"next"}]},include:["**/*.ts","**/*.tsx",".next/types/**/*.ts"],exclude:["node_modules"]}),
  "package.json":JSON.stringify({name:"yo-personalized-review",private:true}),
 };
 for(const page of pages)files[`app/${page}`]=`export { default } from '@/app/${page.replace(/\.tsx$/,"")}';`;
 for(const [name,text]of Object.entries(files)){const target=join(dir,name);await mkdir(join(target,".."),{recursive:true});await writeFile(target,text);}
 try{await symlink(join(root,"public"),join(dir,"public"),"dir");}catch(e){if((e as NodeJS.ErrnoException).code!=="EEXIST")throw e;}
 await mkdir(out,{recursive:true});const unit=personalizedItalianUnits[0];await writeFile(join(out,"personalized-data.json"),JSON.stringify({unit,catalog:personalizedItalianCatalog,checks:placementChecks,visuals:moduleVisuals(unit),steps:guidedSteps(unit,Object.keys(moduleVisuals(unit)))}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
