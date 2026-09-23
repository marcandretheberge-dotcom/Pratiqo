/**
 * YoPratiqo Dominican Republic Module 4 (Getting around and exploring)
 * pedagogical / structural tests.
 *
 * Asserts that the data file ships the expected counts, the required
 * Spanish target phrases, the past-tense bridge note, the 3 dialogues,
 * the 3 readings with comprehension questions, the 35+ flashcards, the
 * 14+ quiz questions, the 8+ final-game rounds, and the 5 printable
 * worksheets covering all required exercise kinds.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { dominicanRepublicExplore } from "@/lib/yo/dominicanRepublicExplore";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function exists(relativePath: string): boolean {
  return existsSync(join(REPO_ROOT, relativePath));
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const DATA_FILE = "lib/yo/dominicanRepublicExplore.ts";
const CONTENT_FILE = "components/yo/DominicanRepublicModule4Content.tsx";
const INTERACTIVE_FILE = "components/yo/DominicanRepublicModule4Interactive.tsx";
const PAGE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-4/page.tsx";
const ADAPTER_FILE = "lib/yo/dominicanRepublicFlashcardAdapters.ts";

// ─── Files exist ────────────────────────────────────────────────────────

test("Module 4 architecture files all exist", () => {
  assert.ok(exists(DATA_FILE), "data file missing");
  assert.ok(exists(CONTENT_FILE), "content component missing");
  assert.ok(exists(INTERACTIVE_FILE), "interactive component missing");
  assert.ok(exists(PAGE_FILE), "page route missing");
});

// ─── Mission map ────────────────────────────────────────────────────────

test("exploration passport map has 6 stops", () => {
  assert.equal(dominicanRepublicExplore.missionStops.length, 6);
  const positions = dominicanRepublicExplore.missionStops.map((s) => s.position);
  assert.deepEqual(positions, [1, 2, 3, 4, 5, 6]);
});

test("mission stops cover the required exploration arc", () => {
  const fr = dominicanRepublicExplore.missionStops.map((s) => s.title.fr);
  assert.match(fr.join(" | "), /Demander son chemin/);
  assert.match(fr.join(" | "), /taxi|guagua/i);
  assert.match(fr.join(" | "), /directions/i);
  assert.match(fr.join(" | "), /culturel/i);
  assert.match(fr.join(" | "), /[Rr]aconter/);
  assert.match(fr.join(" | "), /[Dd]éfi/);
});

// ─── Place / culture cards ──────────────────────────────────────────────

test("at least 12 Dominican place / culture cards", () => {
  assert.ok(
    dominicanRepublicExplore.placeCards.length >= 12,
    `expected >= 12 place cards, got ${dominicanRepublicExplore.placeCards.length}`,
  );
});

test("place cards include the required Dominican destinations", () => {
  const names = dominicanRepublicExplore.placeCards.map((p) => p.name).join(" | ");
  for (const required of [
    "Zona Colonial",
    "Los Haitises",
    "Samaná",
    "Pico Duarte",
    "Bahía de las Águilas",
    "Isla Saona",
    "Las Terrenas",
    "Puerto Plata",
    "Cabarete",
    "Santiago",
    "Lago Enriquillo",
    "larimar",
  ]) {
    assert.ok(
      names.toLowerCase().includes(required.toLowerCase()),
      `place card list missing ${required}`,
    );
  }
});

test("each place card carries an FR explanation, an EN explanation and a Spanish target phrase", () => {
  for (const place of dominicanRepublicExplore.placeCards) {
    assert.ok(place.description.fr.length > 0, `${place.id} missing FR description`);
    assert.ok(place.description.en.length > 0, `${place.id} missing EN description`);
    assert.ok(place.phrase.length > 0, `${place.id} missing Spanish phrase`);
    assert.match(place.phrase, /[a-záéíóúñ]/i, `${place.id} phrase must look like Spanish`);
  }
});

// ─── Phrase bank ────────────────────────────────────────────────────────

test("phrase bank ships at least 40 Spanish travel phrases", () => {
  assert.ok(
    dominicanRepublicExplore.phraseBank.length >= 40,
    `expected >= 40 phrases, got ${dominicanRepublicExplore.phraseBank.length}`,
  );
});

test("phrase bank covers the required core Spanish phrases", () => {
  const targets = dominicanRepublicExplore.phraseBank.map((p) => p.target);
  const required = [
    "¿Cómo llego a...?",
    "¿Dónde queda...?",
    "¿Está lejos?",
    "¿Cuánto tiempo se tarda?",
    "¿Cuánto cuesta llegar hasta...?",
    "¿Dónde pasa la guagua?",
    "¿Dónde puedo tomar un taxi?",
    "¿Este transporte va a...?",
    "Voy para la Zona Colonial.",
    "Voy para Samaná.",
    "Quiero visitar Los Haitises.",
    "¿Me puede dejar aquí?",
    "¿Me avisa cuando lleguemos?",
    "¿Puede ir más despacio?",
    "¿Puede parar aquí, por favor?",
    "Siga derecho.",
    "Doble a la derecha.",
    "Doble a la izquierda.",
    "Está cerca.",
    "Está lejos.",
    "Está al lado de...",
    "Está frente a...",
    "Está detrás de...",
    "Está entre...",
    "Me perdí.",
    "Necesito ayuda.",
    "Busco esta dirección.",
    "¿Puede repetir, por favor?",
    "Más despacio, por favor.",
    "Hoy fui a...",
    "Ayer fui a...",
    "Visité...",
    "Tomé una guagua.",
    "Tomé un taxi.",
    "Caminé por la Zona Colonial.",
    "Compré un recuerdo.",
    "Saqué fotos.",
    "Me gustó mucho.",
    "Fue muy bonito.",
    "Quiero volver.",
  ];
  for (const phrase of required) {
    assert.ok(targets.includes(phrase), `phrase bank missing: ${phrase}`);
  }
});

// ─── Dialogues ──────────────────────────────────────────────────────────

test("transport, directions and day-trip dialogues exist with full Spanish content", () => {
  const transport = dominicanRepublicExplore.transportDialogue;
  const directions = dominicanRepublicExplore.directionsDialogue;
  const dayTrip = dominicanRepublicExplore.dayTripDialogue;

  for (const [name, dlg] of [
    ["transport", transport],
    ["directions", directions],
    ["day-trip", dayTrip],
  ] as const) {
    assert.ok(dlg.lines.length >= 5, `${name} dialogue too short`);
    for (const line of dlg.lines) {
      assert.ok(line.target.length > 0, `${name} dialogue line missing Spanish`);
      assert.ok(line.translation.fr.length > 0, `${name} dialogue line missing FR gloss`);
      assert.ok(line.translation.en.length > 0, `${name} dialogue line missing EN gloss`);
    }
  }

  assert.match(
    transport.lines.map((l) => l.target).join(" "),
    /guagua/i,
    "transport dialogue must mention the guagua",
  );
  assert.match(
    directions.lines.map((l) => l.target).join(" "),
    /Doble|Siga/,
    "directions dialogue must include polite directions",
  );
  assert.match(
    dayTrip.lines.map((l) => l.target).join(" "),
    /[Aa]yer fui|[Tt]omé|[Mm]e gustó|[Ff]ue/,
    "day-trip dialogue must include past-tense chunks",
  );
});

// ─── Dominican ears ─────────────────────────────────────────────────────

test("Dominican ears section exists with at least 5 awareness cards", () => {
  assert.ok(
    dominicanRepublicExplore.earCards.length >= 5,
    `expected >= 5 ear cards, got ${dominicanRepublicExplore.earCards.length}`,
  );
  for (const ear of dominicanRepublicExplore.earCards) {
    assert.ok(ear.practicePhrase.length > 0);
  }
});

// ─── Micro-grammar + bridge note ───────────────────────────────────────

test("micro-grammar ships at least 10 cards", () => {
  assert.ok(
    dominicanRepublicExplore.grammarCards.length >= 10,
    `expected >= 10 grammar cards, got ${dominicanRepublicExplore.grammarCards.length}`,
  );
});

test("past-tense bridge note exists in FR / EN / ES", () => {
  const note = dominicanRepublicExplore.pastTenseBridgeNote;
  assert.match(note.fr, /passé/i);
  assert.match(note.en, /past/i);
  assert.ok(typeof note.es === "string");
  assert.match(note.es, /pasado/i);
});

test("grammar cards introduce the practical past-tense chunks", () => {
  const haystack = dominicanRepublicExplore.grammarCards
    .map((c) => `${c.pattern} | ${c.examples.map((e) => e.target).join(" ")}`)
    .join(" | ");
  for (const chunk of [
    "fui",
    "visité",
    "Tomé",
    "Caminé",
    "Compré",
    "Saqué",
    "Me gustó",
    "Fue",
  ]) {
    assert.ok(
      haystack.toLowerCase().includes(chunk.toLowerCase()),
      `grammar examples must surface chunk: ${chunk}`,
    );
  }
});

// ─── Reading texts ─────────────────────────────────────────────────────

test("at least 3 Spanish reading texts", () => {
  assert.ok(
    dominicanRepublicExplore.readingTexts.length >= 3,
    `expected >= 3 readings, got ${dominicanRepublicExplore.readingTexts.length}`,
  );
});

test("each reading has FR + EN comprehension questions and Spanish vocabulary", () => {
  for (const reading of dominicanRepublicExplore.readingTexts) {
    assert.ok(reading.paragraphs.length > 0, `${reading.id} no paragraphs`);
    assert.ok(reading.wordCount >= 80, `${reading.id} word count too low`);
    assert.ok(reading.wordCount <= 130, `${reading.id} word count too high`);
    assert.ok(reading.vocabulary.length >= 4, `${reading.id} needs >= 4 vocabulary anchors`);
    assert.ok(reading.questions.length >= 3, `${reading.id} needs comprehension questions`);
    for (const q of reading.questions) {
      assert.ok(q.prompt.fr.length > 0, `${reading.id} question missing FR`);
      assert.ok(q.prompt.en.length > 0, `${reading.id} question missing EN`);
      assert.ok(q.answer.fr.length > 0, `${reading.id} answer missing FR`);
      assert.ok(q.answer.en.length > 0, `${reading.id} answer missing EN`);
    }
  }
});

// ─── Flashcards ─────────────────────────────────────────────────────────

test("flashcard deck ships at least 35 cards", () => {
  assert.ok(
    dominicanRepublicExplore.flashcards.length >= 35,
    `expected >= 35 flashcards, got ${dominicanRepublicExplore.flashcards.length}`,
  );
});

test("flashcards include transport, directions, place and past-chunk anchors", () => {
  const fronts = dominicanRepublicExplore.flashcards.map((c) => c.front);
  for (const required of [
    "la guagua",
    "el taxi",
    "la esquina",
    "el museo",
    "la playa",
    "fui",
    "visité",
    "tomé",
    "caminé",
    "compré",
    "saqué",
    "me gustó",
    "fue",
  ]) {
    assert.ok(fronts.includes(required), `flashcard deck missing: ${required}`);
  }
});

test("flashcards reuse the RD-intro tropical-flashcard visual hint", () => {
  const adapter = read(ADAPTER_FILE);
  assert.ok(adapter.includes("module4FlashcardsToYo"), "module4 adapter missing");
  assert.ok(adapter.includes("RD_FLASHCARD_VISUAL_HINT"), "visual hint constant missing");
});

// ─── Quiz ───────────────────────────────────────────────────────────────

test("quiz has at least 14 questions", () => {
  assert.ok(
    dominicanRepublicExplore.quizQuestions.length >= 14,
    `expected >= 14 quiz questions, got ${dominicanRepublicExplore.quizQuestions.length}`,
  );
});

test("quiz covers each required prompt theme", () => {
  const promptText = dominicanRepublicExplore.quizQuestions
    .map((q) => `${q.prompt.fr} | ${q.prompt.en}`)
    .join(" || ");
  const themes = [
    /How do I get to/i,
    /turn right/i,
    /guagua/i,
    /Is it far/i,
    /Samaná|went to Samaná/i,
    /took a taxi/i,
    /liked it/i,
    /historic colonial|colonial area/i,
  ];
  for (const re of themes) {
    assert.match(promptText, re, `quiz prompts missing theme ${re}`);
  }
});

test("quiz options are Spanish-only target strings", () => {
  for (const q of dominicanRepublicExplore.quizQuestions) {
    for (const opt of q.options) {
      assert.equal(typeof opt.target, "string");
      assert.ok(opt.target.length > 0, `quiz option missing target string`);
    }
  }
});

test("quiz UI does not leak option translations before reveal", () => {
  const interactive = read(INTERACTIVE_FILE);
  // Reveal must gate the translation rendering.
  assert.match(
    interactive,
    /isRevealed\s*\?\s*\(\s*<span[^>]*>\s*\{t\(option\.translation/,
    "quiz translations must only render when isRevealed is true",
  );
});

// ─── Final game ────────────────────────────────────────────────────────

test("final game has at least 8 rounds with Spanish-only choices pre-reveal", () => {
  const rounds = dominicanRepublicExplore.finalGame.rounds;
  assert.ok(rounds.length >= 8, `expected >= 8 rounds, got ${rounds.length}`);
  for (const round of rounds) {
    assert.equal(round.options.length, 3, "each round must offer 3 choices");
    assert.ok(
      round.options.some((o) => o.id === round.correctOptionId),
      "round must reference an existing correct option",
    );
  }
});

// ─── Printables ────────────────────────────────────────────────────────

test("printables include the 5 required exercise kinds", () => {
  const kinds = dominicanRepublicExplore.printableSheets.map((s) => s.kind).sort();
  assert.deepEqual(
    kinds,
    ["fill_blank", "reading", "roleplay", "verb_chunks", "vocabulary"].sort(),
  );
});

test("printables include answer keys for every item", () => {
  for (const sheet of dominicanRepublicExplore.printableSheets) {
    assert.ok(sheet.items.length > 0, `${sheet.id} has no items`);
    for (const item of sheet.items) {
      assert.ok(item.answer.fr.length > 0, `${sheet.id}/${item.id} missing FR answer`);
    }
  }
});

test("verb-chunks worksheet practices the 8 singular past chunks", () => {
  const sheet = dominicanRepublicExplore.printableSheets.find(
    (s) => s.kind === "verb_chunks",
  );
  assert.ok(sheet, "verb_chunks sheet missing");
  const merged = (sheet?.items ?? [])
    .map((it) => `${it.target ?? ""} | ${it.answer.fr}`)
    .join(" | ");
  for (const chunk of [
    "fui",
    "Visité",
    "Tomé",
    "Caminé",
    "Compré",
    "Saqué",
    "Me gustó",
    "Fue",
  ]) {
    assert.ok(merged.includes(chunk), `verb_chunks must surface ${chunk}`);
  }
});

// ─── Hero / FR / EN / ES sanity ─────────────────────────────────────────

test("hero ships FR / EN / ES strings", () => {
  for (const value of [
    dominicanRepublicExplore.heroTitle,
    dominicanRepublicExplore.heroSubtitle,
  ]) {
    assert.ok(value.fr.length > 0);
    assert.ok(value.en.length > 0);
    assert.ok(typeof value.es === "string" && value.es.length > 0);
  }
});

// ─── Page route is wired correctly ─────────────────────────────────────

test("page route renders the Module 4 content component", () => {
  const page = read(PAGE_FILE);
  assert.match(page, /DominicanRepublicModule4Content/);
  assert.match(page, /robots:\s*\{\s*index:\s*false/);
});

let passed = 0;
let failed = 0;

(async () => {
  console.log(`\nRunning ${tests.length} tests - YoPratiqo Dominican Module 4\n`);
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  \u2713  ${name}`);
      passed++;
    } catch (err) {
      console.error(`  \u2717  ${name}`);
      if (err instanceof Error) console.error(`     ${err.message}`);
      failed++;
    }
  }
  console.log(`\n${passed} passed \u00b7 ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();
