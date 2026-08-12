import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { dominicanRepublicModule2Workbook } from "../../lib/yo/dominicanRepublicModule2Workbook";

const ROOT = process.cwd();
const DATA_FILE = "lib/yo/dominicanRepublicModule2Workbook.ts";
const COMPONENT_FILE = "components/yo/DominicanRepublicModule2Workbook.tsx";
const ROUTE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/ressources/kit-arrivee/page.tsx";

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
const learnerStrings = collectStrings(dominicanRepublicModule2Workbook);
const learnerCorpus = learnerStrings.join("\n");
const codeCorpus = stripComments(dataSrc);

assert.match(dataSrc, /Original YoPratiqo instructional content/);
assert.match(dataSrc, /No commercial textbook text, exercises, layouts, dialogues/);

for (const [label, pattern] of [
  ["TODO", /\bTODO\b/],
  ["lorem", /\blorem\b/i],
  ["placeholder", /\bplaceholder\b/i],
  ["developer", /\bdeveloper\b/i],
  ["internal", /\binternal\b/i],
  ["fixture", /\bfixture\b/i],
  ["mock", /\bmock\b/i],
  ["sample-text", /\bsample-text\b/i],
] as const) {
  assert.doesNotMatch(learnerCorpus, pattern, `learner-facing workbook text must not contain ${label}`);
}

for (const oldDialogueLine of [
  "Hola, buenos días. ¿Dónde puedo tomar un taxi?",
  "Los taxis están afuera, a la derecha.",
  "Perfecto, gracias. Voy a este hotel.",
  "Muy bien. Puede salir por esa puerta.",
  "Buenas tardes. Tengo una reservación.",
  "Gracias. ¿Cuál es la contraseña del wifi?",
]) {
  assert.ok(
    !learnerStrings.includes(oldDialogueLine),
    `new workbook must not copy old digital dialogue line verbatim: ${oldDialogueLine}`,
  );
}

const exactPhraseCounts = new Map<string, number>();
for (const phrase of learnerStrings.filter((text) => text.length > 18 && /\s/.test(text))) {
  exactPhraseCounts.set(phrase, (exactPhraseCounts.get(phrase) ?? 0) + 1);
}
const suspiciousRepeats = Array.from(exactPhraseCounts.entries()).filter(
  ([phrase, count]) =>
    count > 4 &&
    !phrase.startsWith("¿") &&
    !phrase.includes("Écris ou répète") &&
    !phrase.includes("Write or repeat") &&
    !phrase.includes("Escribe o repite") &&
    !phrase.includes("YoPratiqo") &&
    !phrase.includes("Pratiqo"),
);
assert.deepEqual(suspiciousRepeats, [], "workbook should not rely on broad repeated copy blocks");

const targetPhraseCount = learnerStrings.filter((text) => /[¿¡áéíóúñ]/i.test(text)).length;
assert.ok(targetPhraseCount >= 70, "Spanish target/reference text is prominent");

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

const componentSrc = read(COMPONENT_FILE);
assert.doesNotMatch(componentSrc, /<details\b/i, "renderer must not expose per-exercise answer reveal controls");
assert.match(componentSrc, /breakAfter:\s*isLast\s*\?\s*"auto"\s*:\s*"page"/, "renderer gives workbook pages print breaks");
assert.match(componentSrc, /data-yo-rd-m2-workbook-spanish-target/);

const routeSrc = read(ROUTE_FILE);
assert.doesNotMatch(routeSrc, /DominicanModulePrintables|module2PrintablePack/);
assert.doesNotMatch(routeSrc, /href=.*\.pdf|download=/i);

assert.doesNotMatch(codeCorpus, /from\s+["']stripe["']|supabase|openai|OPENAI_API_KEY|\.mp3/i);

console.log("[yo:dominican-m2-workbook-originality] assertions passed");
