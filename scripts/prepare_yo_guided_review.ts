/** Create a backend-free browser shell importing the actual guided course and assets. */
import { mkdir, writeFile, symlink } from "node:fs/promises";
import { join } from "node:path";
import { italianCourseUnits } from "../lib/yo/italian/course/courseData";
import { guidedSteps } from "../lib/yo/italian/course/guidedItalian";
const root = process.cwd(), out = process.env.YO_QA_DIR ?? "/tmp/yo-guided-qa";
const files: Record<string, string> = {
  "app/page.tsx": "import { GuidedItalianCourse } from '@/components/yo/italian/guided/GuidedItalianCourse';\nimport { italianCourseUnits,italianCourseCatalog } from '@/lib/yo/italian/course/courseData';\nimport { courseAudioPaths } from '@/lib/yo/italian/course/courseAudio.server';\nimport { unitSpeech } from '@/lib/yo/italian/course/courseSpeech';\nexport default async function Page({searchParams}:{searchParams:Promise<{lang?:string,lecon?:string,activite?:string}>}){const q=await searchParams;const unit=italianCourseUnits[0];return <GuidedItalianCourse unit={unit} catalog={italianCourseCatalog} locale={q.lang==='en'?'en':q.lang==='es'?'es':'fr'} audioPaths={courseAudioPaths(unitSpeech(unit))} initialLessonId={q.lecon} initialActivityId={q.activite}/>;}\n",
  "app/layout.tsx": "import './globals.css';\nexport default function Layout({children}:{children:React.ReactNode}){return <html lang=\"fr\"><body>{children}</body></html>}\n",
  "app/globals.css": "@import \"tailwindcss\";\n@source \"../../components\";\n@source \"../../lib\";\nbody { font-family: Arial, sans-serif; margin: 0; }\n",
  "next.config.mjs": "export default { images: { unoptimized: true }, experimental: { externalDir: true }, devIndicators: false };\n",
  "tsconfig.json": "{\n  \"compilerOptions\": {\n    \"target\": \"ES2017\",\n    \"lib\": [\n      \"dom\",\n      \"dom.iterable\",\n      \"esnext\"\n    ],\n    \"skipLibCheck\": true,\n    \"strict\": true,\n    \"noEmit\": true,\n    \"esModuleInterop\": true,\n    \"module\": \"esnext\",\n    \"moduleResolution\": \"bundler\",\n    \"resolveJsonModule\": true,\n    \"isolatedModules\": true,\n    \"jsx\": \"react-jsx\",\n    \"paths\": {\n      \"@/*\": [\n        \"../*\"\n      ]\n    },\n    \"allowJs\": true,\n    \"incremental\": true,\n    \"plugins\": [\n      {\n        \"name\": \"next\"\n      }\n    ]\n  },\n  \"include\": [\n    \"**/*.ts\",\n    \"**/*.tsx\",\n    \".next/types/**/*.ts\",\n    \".next/dev/types/**/*.ts\"\n  ],\n  \"exclude\": [\n    \"node_modules\"\n  ]\n}\n",
  "package.json": "{\"name\":\"guided-italian-local-review\",\"private\":true,\"scripts\":{\"dev\":\"next dev --webpack -p 3129\"}}\n",
  "postcss.config.mjs": "const config = {\n  plugins: {\n    \"@tailwindcss/postcss\": {},\n  },\n};\n\nexport default config;\n"
};
async function main() {
  for (const [name, text] of Object.entries(files)) {
    const target = join(root, ".qa-guided", name);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, text);
  }
  try { await symlink(join(root, "public"), join(root, ".qa-guided/public"), "dir"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  await mkdir(out, { recursive: true });
  const unit = italianCourseUnits[0];
  await writeFile(join(out, "unit.json"), JSON.stringify({ unit, steps: guidedSteps(unit) }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
