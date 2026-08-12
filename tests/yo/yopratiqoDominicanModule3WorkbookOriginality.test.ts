import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { dominicanRepublicModule3Workbook } from "../../lib/yo/dominicanRepublicModule3Workbook";

const ROOT = process.cwd();
const DATA_FILE = "lib/yo/dominicanRepublicModule3Workbook.ts";
const COMPONENT_FILE = "components/yo/DominicanRepublicModule3Workbook.tsx";
const ROUTE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-3/ressources/fiches-pratique/page.tsx";

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
  return out;
}

const dataSrc = read(DATA_FILE);
const componentSrc = read(COMPONENT_FILE);
const routeSrc = read(ROUTE_FILE);
const learnerCorpus = collectStrings(dominicanRepublicModule3Workbook).join("\n");
const codeCorpus = stripComments(dataSrc);

assert.match(dataSrc, /Original YoPratiqo instructional content/);
assert.match(dataSrc, /Module 3 workbook: eating, ordering, and paying/);
assert.doesNotMatch(dataSrc, /dominicanRepublicModule2Workbook|rd-m2-arrival-kit/);
assert.doesNotMatch(routeSrc, /DominicanModulePrintables|module3PrintablePack|printableSheets/);

for (const [label, pattern] of [
  ["TODO", /\bTODO\b/],
  ["lorem", /\blorem\b/i],
  ["placeholder", /\bplaceholder\b/i],
  ["fixture", /\bfixture\b/i],
  ["mock", /\bmock\b/i],
  ["sample-text", /\bsample-text\b/i],
] as const) {
  assert.doesNotMatch(learnerCorpus, pattern, `learner-facing workbook text must not contain ${label}`);
}

assert.match(learnerCorpus, /Cahier YoPratiqo 03/);
assert.match(learnerCorpus, /Manger, commander et payer en République dominicaine/);
assert.doesNotMatch(learnerCorpus, /Cahier YoPratiqo 02|Arriver et se débrouiller/);

const sourceBrands = [
  "Duolingo",
  "Babbel",
  "Quizlet",
  "Khan Academy",
  "Rosetta Stone",
  "Busuu",
  "Memrise",
];
for (const brand of sourceBrands) {
  assert.doesNotMatch(learnerCorpus, new RegExp(brand, "i"), `learner-facing text must not mention ${brand}`);
}

assert.doesNotMatch(dataSrc, /responseCount:\s*\d+/, "response counts must be derived, never declared");
assert.doesNotMatch(routeSrc, /href=.*\.pdf|download=/i, "route must not fake a PDF download");
assert.doesNotMatch(componentSrc, /<details\b/i, "answers are not exposed beside exercises");
assert.match(componentSrc, /breakAfter:\s*isLast\s*\?\s*"auto"\s*:\s*"page"/, "renderer gives workbook pages print breaks");

assert.doesNotMatch(
  codeCorpus,
  /from\s+["']stripe["']|from\s+["']@stripe|supabase|openai|OPENAI_API_KEY|\.mp3/i,
  "workbook data must not touch restricted systems",
);
assert.doesNotMatch(
  `${dataSrc}\n${componentSrc}\n${routeSrc}`,
  /app\/api\/stripe|checkout|payment_intent|refund|commission|membrePro|sitemap|CourseJsonLd/i,
  "workbook implementation must not import restricted business systems",
);

console.log("[yo:dominican-m3-workbook-originality] assertions passed");
