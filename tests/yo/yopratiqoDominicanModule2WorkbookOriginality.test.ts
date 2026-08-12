import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { dominicanRepublicModule2Workbook } from "../../lib/yo/dominicanRepublicModule2Workbook";

const ROOT = process.cwd();
const DATA_FILE = "lib/yo/dominicanRepublicModule2Workbook.ts";
const COMPONENT_FILE = "components/yo/DominicanRepublicModule2Workbook.tsx";
const ROUTE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/ressources/kit-arrivee/page.tsx";
const RD_LANGUAGE_REVIEW_FILE = "docs/yopratiqo/RD_LANGUAGE_REVIEW.md";

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
const rdLanguageReview = read(RD_LANGUAGE_REVIEW_FILE);

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

// The workbook must not pass the existing digital dialogue off as new
// authored practice content. The one legitimate exception is the page 12
// listening lab, whose dictation answers are by definition transcriptions
// of that same Module 2 audio — so those lines are allowed there, and
// only there.
const DIGITAL_DIALOGUE_LINES = [
  "Hola, buenos días. ¿Dónde puedo tomar un taxi?",
  "Los taxis están afuera, a la derecha.",
  "Perfecto, gracias. Voy a este hotel.",
  "Muy bien. Puede salir por esa puerta.",
  "Buenas tardes. Tengo una reservación.",
  "Gracias. ¿Cuál es la contraseña del wifi?",
];

for (const page of dominicanRepublicModule2Workbook.pages) {
  const isListeningLab = page.kind === "listening-lab";
  for (const activity of page.activities) {
    for (const line of activity.inputLines ?? []) {
      assert.ok(
        !DIGITAL_DIALOGUE_LINES.includes(line),
        `page ${page.pageNumber} reuses a digital dialogue line as workbook input: ${line}`,
      );
    }
    for (const item of activity.items ?? []) {
      for (const value of [item.target, item.prompt.fr, item.prompt.en, item.prompt.es]) {
        assert.ok(
          !value || !DIGITAL_DIALOGUE_LINES.includes(value),
          `page ${page.pageNumber} reuses a digital dialogue line as a prompt: ${value}`,
        );
      }
      if (item.answer && DIGITAL_DIALOGUE_LINES.includes(item.answer)) {
        assert.ok(
          isListeningLab,
          `only the listening lab may transcribe digital audio; ${item.id} on page ${page.pageNumber} may not`,
        );
      }
    }
  }
}

// A multiple-choice item stores its correct answer twice by design: once as
// the answer and once as the option the learner circles. That is one
// authored phrase, not a repeat, so it is counted once here. Whether a
// legitimately recycled phrase carries changing cognitive demand is audited
// separately in yopratiqoDominicanModule2WorkbookPedagogy.test.ts.
const selfReferentialAnswers: string[] = [];
for (const page of dominicanRepublicModule2Workbook.pages) {
  for (const activity of page.activities) {
    for (const item of activity.items ?? []) {
      if (item.answer && (item.choices ?? []).some((choice) => choice === item.answer)) {
        selfReferentialAnswers.push(item.answer);
      }
    }
  }
}

const exactPhraseCounts = new Map<string, number>();
for (const phrase of learnerStrings.filter((text) => text.length > 18 && /\s/.test(text))) {
  exactPhraseCounts.set(phrase, (exactPhraseCounts.get(phrase) ?? 0) + 1);
}
for (const phrase of selfReferentialAnswers) {
  const current = exactPhraseCounts.get(phrase);
  if (current !== undefined) exactPhraseCounts.set(phrase, current - 1);
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

assert.match(learnerCorpus, /dos cafés/, "the final-s awareness item keeps normal Spanish spelling visible");
assert.doesNotMatch(
  learnerCorpus,
  /do'\s*café'?/i,
  "the workbook must not teach faux apostrophe spelling as normal written Spanish",
);
assert.doesNotMatch(
  learnerCorpus,
  /del suelo del aeropuerto|airport floor|du sol de l'aéroport/i,
  "Page 18 assessment sequence must not use awkward airport-floor wording",
);

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

for (const source of [
  "Academia Dominicana de la Lengua",
  "Diccionario del español dominicano",
  "ASALE",
  "Instituto Cervantes",
]) {
  assert.match(rdLanguageReview, new RegExp(source), `language review records source: ${source}`);
}
for (const claim of ["pa'", "Final /s/", "guagua", "colmado", "motoconcho", "ahorita"]) {
  assert.match(rdLanguageReview, new RegExp(claim, "i"), `language review records claim: ${claim}`);
}
assert.match(
  rdLanguageReview,
  /Native Dominican editorial review: pending/,
  "source verification must not pretend to replace native Dominican editorial review",
);

console.log("[yo:dominican-m2-workbook-originality] assertions passed");
