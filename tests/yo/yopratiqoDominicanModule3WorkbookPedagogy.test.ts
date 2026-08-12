import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildRdM3WorkbookAnswerGroups,
  countRdM3WorkbookItemsByActivityKind,
  countRdM3WorkbookOpenProductionTasks,
  countRdM3WorkbookResponseOpportunities,
  dominicanRepublicModule3Workbook as workbook,
  listRdM3WorkbookMechanics,
  rdM3CurriculumInventory,
  validateRdM3Workbook,
} from "../../lib/yo/dominicanRepublicModule3Workbook";

const ROOT = process.cwd();
const DATA_FILE = "lib/yo/dominicanRepublicModule3Workbook.ts";
const COMPONENT_FILE = "components/yo/DominicanRepublicModule3Workbook.tsx";
const REVIEW_FILE = "docs/yopratiqo/MODULE_3_WORKBOOK_REVIEW.md";
const CULTURE_REVIEW_FILE = "docs/yopratiqo/RD_FOOD_CULTURE_REVIEW.md";

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
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
const reviewDoc = read(REVIEW_FILE);
const cultureDoc = read(CULTURE_REVIEW_FILE);
const learnerCorpus = collectStrings(workbook).join("\n");

assert.deepEqual(validateRdM3Workbook(), [], "answer refs and self/model/objective items validate");
assert.ok(buildRdM3WorkbookAnswerGroups("objective").length > 0, "objective key is derived");
assert.ok(buildRdM3WorkbookAnswerGroups("model").length > 0, "model responses are derived");

const requiredCore = [
  "¿Qué me recomienda?",
  "Quiero probar algo típico.",
  "¿Tiene mangú?",
  "¿Qué viene con",
  "¿Qué trae este plato?",
  "¿Es picante?",
  "Sin picante, por favor.",
  "Un poco picante está bien.",
  "¿Tiene jugo natural?",
  "¿Qué sabores tiene?",
  "Quiero un jugo de chinola.",
  "Un café, por favor.",
  "Sin azúcar, por favor.",
  "Con hielo, por favor.",
  "Para comer aquí.",
  "Para llevar, por favor.",
  "¿Me trae la cuenta, por favor?",
  "¿Cuánto cuesta?",
  "¿Acepta tarjeta?",
  "¿Puedo pagar en efectivo?",
  "¿Está incluido el servicio?",
  "¿Me puede dar un recibo?",
  "Gracias, muy amable.",
  "¿Me puede repetir, por favor?",
  "Más despacio, por favor.",
  "No entendí la última parte.",
  "¿Cómo se dice eso?",
  "Soy alérgico/alérgica a",
  "No como carne.",
  "¿Tiene una opción vegetariana?",
];
for (const phrase of requiredCore) {
  assert.match(learnerCorpus, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `core phrase appears: ${phrase}`);
}

const priorities = new Set(rdM3CurriculumInventory.map((entry) => entry.priority));
for (const priority of [
  "CORE PERFORMANCE",
  "SUPPORTING LANGUAGE",
  "CULTURAL RECOGNITION",
  "ENRICHMENT",
] as const) {
  assert.ok(priorities.has(priority), `inventory includes ${priority}`);
}
assert.ok(
  rdM3CurriculumInventory.length >= 50,
  `inventory covers the real Module 3 surface, got ${rdM3CurriculumInventory.length}`,
);
assert.match(reviewDoc, /\| Target \| Existing source \| Priority \| Workbook evidence \|/);

const mechanics = listRdM3WorkbookMechanics();
assert.ok(mechanics.length >= 12, "practice mechanics are varied");
const total = countRdM3WorkbookResponseOpportunities();
const byKind = countRdM3WorkbookItemsByActivityKind();
assert.ok(countRdM3WorkbookOpenProductionTasks() >= 25, "open/self production is substantial");
assert.ok((byKind.choice ?? 0) / total <= 0.25, "simple multiple-choice does not dominate");
assert.ok((byKind["fill-blank"] ?? 0) / total <= 0.25, "fill blanks do not dominate");

const listeningPage = workbook.pages.find((page) => page.kind === "listening-bridge");
assert.ok(listeningPage, "listening bridge page exists");
for (const mechanic of ["digital-listening", "gist", "detail", "dictation", "shadowing"]) {
  assert.ok(listeningPage?.mechanics.includes(mechanic as never), `listening page includes ${mechanic}`);
}
assert.ok(
  listeningPage?.activities.some((activity) => activity.digitalPath?.includes("/module-3")),
  "listening bridge points to the existing digital Module 3",
);
assert.doesNotMatch(
  dataSrc,
  /\.mp3|generate-yopratiqo-audio|OPENAI_API_KEY|from\s+["']openai["']|speechSynthesis/i,
  "no new audio infrastructure is added",
);

const paymentPage = workbook.pages.find((page) => page.kind === "payment-lab");
assert.ok(paymentPage, "payment lab exists");
assert.match(learnerCorpus, /Tous les menus, montants et reçus de ce cahier sont fictifs/);
assert.match(learnerCorpus, /RD\$ 620/);
assert.doesNotMatch(learnerCorpus, /service est toujours|tip is always|tax is always|propina siempre/i);

assert.match(learnerCorpus, /Si une allergie est possible/);
assert.match(learnerCorpus, /confirm with staff/);
assert.doesNotMatch(learnerCorpus, /safe for every allergy|allergy guaranteed|garanti.*allerg/i);

for (const source of [
  "godominicanrepublic.com/travel/faqs",
  "asale.org/damer/chinola",
  "ich.unesco.org/en/RL/music-and-dance-of-the-merengue",
  "ich.unesco.org/en/RL/music-and-dance-of-dominican-bachata",
  "whc.unesco.org/en/list/526",
]) {
  assert.match(cultureDoc, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `culture review records source: ${source}`);
}
assert.match(cultureDoc, /Native Dominican editorial review: pending/);
assert.doesNotMatch(learnerCorpus, /all Dominicans|Dominicans always|todos los dominicanos|dominicanos siempre|national dish|plat national/i);

assert.match(componentSrc, /data-yo-rd-m3-workbook-answer-key/);
assert.match(componentSrc, /print:rounded-none/);
assert.match(componentSrc, /data-yo-rd-m3-workbook-spanish-target/);
assert.doesNotMatch(componentSrc, /<details\b/i, "no answers adjacent to exercises");

console.log("[yo:dominican-m3-workbook-pedagogy] assertions passed");
