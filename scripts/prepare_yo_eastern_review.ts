/** Real JA/ZH routes in an isolated shell; historical fixture grades are explicit. */
import assert from "node:assert/strict";
import { access, mkdir, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  japaneseCourseUnits, japaneseLegacyCourseUnits, japaneseFinalAssessment,
  japaneseExtendedFinalAssessment,
} from "../lib/yo/japaneseCourse";
import {
  emptyJapaneseProgress, JAPANESE_PROGRESS_KEY, japaneseUnitPracticeIds, recordJapaneseResult,
} from "../lib/yo/japaneseCourseProgress";
import { mandarinUnits, mandarinLegacyUnits, mandarinFinal, mandarinExtendedFinal } from "../lib/yo/mandarin/course";
import { emptyProgress, MANDARIN_PROGRESS_KEY } from "../lib/yo/mandarin/progress";

const fixtureLabel = "Seeded historical learner: eight original units and original final already passed";

function japaneseFixture() {
  assert.equal(japaneseLegacyCourseUnits.length, 8);
  assert.equal(japaneseCourseUnits.length, 12);
  const originalIds = [...japaneseLegacyCourseUnits.flatMap(japaneseUnitPracticeIds), ...japaneseFinalAssessment.map(item => item.id)];
  const progress = originalIds.reduce((state, id) => recordJapaneseResult(state, id, true, false), emptyJapaneseProgress());
  const oldTarget = japaneseFinalAssessment[3];
  progress.lastUnit = "bilan";
  progress.lastSteps.bilan = oldTarget.id;
  const unit = japaneseCourseUnits[8];
  const recalls = unit.activities.flatMap(activity => activity.kind === "reading" && activity.responseMode === "recall" ? [{
    id: activity.id, stepLabel: activity.title.en, prompt: activity.prompt.en, answer: activity.answer,
    hint: activity.hint.en,
  }] : []);
  assert.equal(recalls.length, 2);
  return {
    language: "ja", slug: "japonais", progressKey: JAPANESE_PROGRESS_KEY, fixtureLabel, progress, originalIds,
    module9: { slug: unit.slug, title: unit.title.en, recalls },
    legacyTarget: { id: oldTarget.id, prompt: oldTarget.prompt.en, title: oldTarget.title.en, bookmark: oldTarget.id },
    newIds: [...japaneseCourseUnits.slice(8).flatMap(japaneseUnitPracticeIds), ...japaneseExtendedFinalAssessment.map(item => item.id)],
    newFinalIds: japaneseExtendedFinalAssessment.map(item => item.id),
    inputLabel: "Your sentence from memory", hintLabel: "A hint from Yoppo", reviewField: "needsReview",
  };
}

function mandarinFixture() {
  assert.equal(mandarinLegacyUnits.length, 8);
  assert.equal(mandarinUnits.length, 12);
  const originalIds = [...mandarinLegacyUnits.flatMap(unit => unit.exercises.map(item => item.id)), ...mandarinFinal.exercises.map(item => item.id)];
  const progress = emptyProgress();
  for (const id of originalIds) progress.results[id] = { passed: true, independent: true, attempts: 1, review: false };
  const oldTarget = mandarinFinal.exercises[3];
  progress.unit = "bilan";
  progress.steps.bilan = 3;
  const unit = mandarinUnits[8];
  const recalls = unit.exercises.flatMap((exercise, index) => exercise.kind === "write" ? [{
    id: exercise.id, stepLabel: `Practice ${index + 1}`, prompt: exercise.prompt.en,
    answer: exercise.model.hanzi, hint: exercise.hint.en,
  }] : []).slice(0, 2);
  assert.equal(recalls.length, 2);
  return {
    language: "zh", slug: "mandarin", progressKey: MANDARIN_PROGRESS_KEY, fixtureLabel, progress, originalIds,
    module9: { slug: unit.id, title: unit.title.en, recalls },
    legacyTarget: { id: oldTarget.id, prompt: oldTarget.prompt.en, title: "Your turn", bookmark: 3 },
    newIds: [...mandarinUnits.slice(8).flatMap(unit => unit.exercises.map(item => item.id)), ...mandarinExtendedFinal.exercises.map(item => item.id)],
    newFinalIds: mandarinExtendedFinal.exercises.map(item => item.id),
    inputLabel: "Your answer", hintLabel: "A hint", reviewField: "review",
  };
}

async function main() {
  const root = process.cwd(), dir = join(root, ".qa-eastern");
  const out = process.env.YO_QA_DIR ?? "/tmp/yo-eastern-qa";
  const courses = [japaneseFixture(), mandarinFixture()];
  for (const course of courses) {
    assert.deepEqual(Object.keys(course.progress.results).sort(), [...course.originalIds].sort());
    assert.equal(course.newIds.some(id => id in course.progress.results), false, "no extension or new-final grades may be seeded");
    assert.equal(course.newFinalIds.length, 24);
    assert.equal(new Set([...course.originalIds, ...course.newIds]).size, course.originalIds.length + course.newIds.length);
  }
  const files: Record<string, string> = {
    // Generated build artifacts stay outside the tracked product and never replace its app.
    ".gitignore": "*\n",
    "app/page.tsx": "import {redirect} from 'next/navigation'; export default function Page(){redirect('/yo/langues/japonais/parcours');}\n",
    "app/layout.tsx": "import './globals.css'; export default function Layout({children}:{children:React.ReactNode}){return <html lang='en'><body>{children}</body></html>}\n",
    "app/globals.css": "@import '../../app/globals.css';\n@source '../../components';\n@source '../../lib';\nbody{font-family:Arial,sans-serif;margin:0}\n",
    "next.config.mjs": "export default {images:{unoptimized:true},experimental:{externalDir:true},devIndicators:false};\n",
    "postcss.config.mjs": "export default {plugins:{'@tailwindcss/postcss':{}}};\n",
    "package.json": JSON.stringify({ name: "yo-eastern-review", private: true }),
    "tsconfig.json": JSON.stringify({
      compilerOptions: { target: "ES2017", lib: ["dom", "dom.iterable", "esnext"], skipLibCheck: true,
        strict: true, noEmit: true, esModuleInterop: true, module: "esnext", moduleResolution: "bundler",
        resolveJsonModule: true, isolatedModules: true, jsx: "react-jsx", paths: { "@/*": ["../*"] },
        plugins: [{ name: "next" }] },
      include: ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"], exclude: ["node_modules"],
    }),
  };
  const realRoutes = [
    "yo/langues/layout", "yo/langues/japonais/parcours/page", "yo/langues/japonais/parcours/[unit]/page",
    "yo/langues/mandarin/parcours/page", "yo/langues/mandarin/parcours/[unit]/page",
  ];
  for (const route of realRoutes) {
    await access(join(root, "app", `${route}.tsx`));
    files[`app/${route}.tsx`] = `export {default} from '@/app/${route}';\n`;
  }
  await access(join(root, "app/api/yo/review/exercise/route.ts"));
  files["app/api/yo/review/exercise/route.ts"] = "export {GET} from '@/app/api/yo/review/exercise/route';\n";
  for (const [name, text] of Object.entries(files)) {
    const target = join(dir, name);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, text);
  }
  try { await symlink(join(root, "public"), join(dir, "public"), "dir"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  await mkdir(out, { recursive: true });
  await writeFile(join(out, "eastern-courses.json"), JSON.stringify({
    fixturePolicy: {
      label: fixtureLabel, historicalUnitsSeeded: 8, historicalFinalSeeded: true,
      historicalChecksEarnedThroughUI: 0, newResultsSeeded: 0,
      scope: "Two new module-nine written recalls through real controls; one aided, one unaided. This does not test earning all twelve modules or certify listening.",
    }, courses,
  }, null, 2));
  console.log("Prepared real Japanese/Mandarin routes and two explicitly seeded historical learner fixtures; zero new results seeded.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
