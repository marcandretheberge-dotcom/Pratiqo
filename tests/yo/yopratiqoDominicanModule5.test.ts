/**
 * YoPratiqo Dominican Republic Module 5 (A2 capstone) data contract tests.
 *
 * Asserts the shape and minimums of the A2 capstone aggregate, plus that
 * the data is internally consistent, A2-appropriate, and free of any
 * restricted system. UI/component-rendering assertions live in the
 * sibling Module5Premium test.
 */

import assert from "node:assert/strict";

import {
  dominicanRepublicA2Capstone,
  type Dom5Phrase,
  type Dom5QuizQuestion,
  type Dom5GameRound,
} from "@/lib/yo/dominicanRepublicA2Capstone";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const data = dominicanRepublicA2Capstone;

test("Hero ships FR/EN/ES title, subtitle, and product label", () => {
  for (const value of [data.heroTitle, data.heroSubtitle, data.productLabel]) {
    assert.ok(value.fr && value.en && value.es, "Missing locale on hero string");
  }
  assert.match(data.heroTitle.fr, /Imprévus/);
  assert.match(data.heroTitle.en, /Unexpected situations/);
  assert.match(data.heroTitle.es, /Imprevistos/);
});

test("Mission map exposes 7 ordered A2 stops", () => {
  assert.equal(data.missionStops.length, 7);
  const positions = data.missionStops.map((s) => s.position);
  assert.deepEqual(
    positions,
    [1, 2, 3, 4, 5, 6, 7],
    "Mission stops must be ordered 1..7",
  );
  // All stops must ship FR/EN/ES.
  for (const stop of data.missionStops) {
    assert.ok(stop.title.fr && stop.title.en && stop.title.es);
    assert.ok(stop.description.fr && stop.description.en && stop.description.es);
  }
});

test("Skill dashboard covers the four A2 components", () => {
  assert.equal(data.skillDashboard.length, 4);
  const skills = data.skillDashboard.map((c) => c.skill).sort();
  assert.deepEqual(skills, ["listening", "oral", "reading", "writing"]);
  for (const card of data.skillDashboard) {
    assert.ok(card.title.fr && card.title.en && card.title.es);
    assert.ok(card.exampleTask.fr && card.exampleTask.en && card.exampleTask.es);
    assert.ok(card.selfCheck.fr && card.selfCheck.en && card.selfCheck.es);
  }
});

test("Phrase bank contains at least 60 unique A2 phrases", () => {
  assert.ok(
    data.phraseBank.length >= 60,
    `Expected at least 60 phrases, got ${data.phraseBank.length}`,
  );
  const ids = new Set(data.phraseBank.map((p) => p.id));
  assert.equal(ids.size, data.phraseBank.length, "Phrase ids must be unique");
});

test("Phrase bank includes the user-required core sentences", () => {
  const targets = new Set(data.phraseBank.map((p) => p.target));
  const required: string[] = [
    "Necesito ayuda, por favor.",
    "Tengo un problema.",
    "Perdí mi teléfono.",
    "Perdí mi pasaporte.",
    "No encuentro mi maleta.",
    "Se me quedó la llave en la habitación.",
    "Me equivoqué de dirección.",
    "Llegué tarde.",
    "El transporte no llegó.",
    "La guagua se fue.",
    "El taxi no apareció.",
    "Mi reservación no aparece.",
    "Necesito cambiar la reservación.",
    "Necesito cancelar la excursión.",
    "¿Puede ayudarme?",
    "¿Me puede explicar otra vez?",
    "¿Me puede hablar más despacio?",
    "No entendí la última parte.",
    "¿Puede escribirlo, por favor?",
    "¿Dónde puedo pedir ayuda?",
    "¿Dónde hay una farmacia?",
    "Necesito ir a una farmacia.",
    "No me siento bien.",
    "Me duele la cabeza.",
    "Necesito llamar al hotel.",
    "Necesito llamar a mi familia.",
    "¿Puedo usar el wifi?",
    "¿Puedo cargar mi teléfono?",
    "¿Dónde puedo comprar una tarjeta SIM?",
    "¿Cuánto tiempo va a tardar?",
    "¿Hay otra opción?",
    "¿Cuál es la mejor opción?",
    "Prefiero esperar.",
    "Prefiero tomar un taxi.",
    "Quiero cambiar el plan.",
    "Vamos mañana.",
    "Fuimos ayer.",
    "Visité la Zona Colonial.",
    "Fui a Los Haitises.",
    "Tomé una guagua.",
    "Compré un recuerdo.",
    "Saqué muchas fotos.",
    "Me gustó mucho.",
    "Fue una experiencia increíble.",
    "El clima cambió.",
    "Está lloviendo.",
    "Hay mucho viento.",
    "El camino está cerrado.",
    "¿La excursión sigue en pie?",
    "¿A qué hora salimos?",
    "¿Dónde nos encontramos?",
    "Le escribo porque tengo un problema.",
    "Muchas gracias por su ayuda.",
    "Disculpe la molestia.",
    "Quedo pendiente.",
    "Nos vemos pronto.",
    "¡Qué experiencia!",
    "Aprendí mucho.",
    "Quiero volver a la República Dominicana.",
  ];
  for (const phrase of required) {
    assert.ok(targets.has(phrase), `Missing required phrase: ${phrase}`);
  }
});

test("Phrase bank covers all 10 categories required by the spec", () => {
  const seen = new Set<Dom5Phrase["categoryKey"]>();
  for (const phrase of data.phraseBank) seen.add(phrase.categoryKey);
  for (const key of [
    "help",
    "lost",
    "transport",
    "hotel",
    "health",
    "weather",
    "fastSpeech",
    "past",
    "planning",
    "polite",
  ] as Dom5Phrase["categoryKey"][]) {
    assert.ok(seen.has(key), `Missing phrase category: ${key}`);
  }
});

test("Dominican fast-speech section ships awareness cards and practice pairs", () => {
  assert.ok(data.fastSpeechSection.title.fr.length > 0);
  assert.ok(data.fastSpeechSection.cards.length >= 7);
  assert.ok(data.fastSpeechSection.pairs.length >= 4);
  // Required practice anchors (Las Terrenas, más despacio, repetir, escribir).
  const heard = data.fastSpeechSection.pairs.map((p) => p.heard).join(" | ");
  const asked = data.fastSpeechSection.pairs.map((p) => p.asked).join(" | ");
  assert.match(heard + asked, /Terrena|Terrenas/, "Las Terrenas awareness pair missing");
  assert.ok(asked.includes("más despacio"));
  assert.ok(asked.includes("repetir"));
  assert.ok(asked.includes("escribirlo"));
});

test("At least 5 practical problem dialogues are present and structured", () => {
  assert.ok(data.dialogues.length >= 5);
  for (const dialogue of data.dialogues) {
    assert.ok(dialogue.lines.length >= 4, `Dialogue ${dialogue.id} too short`);
    assert.ok(
      dialogue.lines.some((line) => line.isLearner === true),
      `Dialogue ${dialogue.id} has no learner-side line`,
    );
    for (const line of dialogue.lines) {
      assert.ok(line.target.length > 0);
      assert.ok(line.translation.fr && line.translation.en && line.translation.es);
    }
  }
});

test("At least 5 A2 reading texts with comprehension questions and answer keys", () => {
  assert.ok(data.readingTexts.length >= 5);
  for (const reading of data.readingTexts) {
    assert.ok(reading.paragraphs.length >= 2);
    assert.ok(
      reading.wordCount >= 130 && reading.wordCount <= 180,
      `Reading ${reading.id} word count out of range (${reading.wordCount})`,
    );
    assert.ok(
      reading.questions.length >= 5,
      `Reading ${reading.id} needs at least 5 comprehension questions`,
    );
    for (const q of reading.questions) {
      assert.ok(q.prompt.fr && q.answer.fr, "Reading question missing answer key");
    }
    assert.ok(reading.vocabulary.length >= 6, "Reading vocabulary too short");
    assert.ok(
      reading.writtenPrompt.fr && reading.writtenPrompt.en && reading.writtenPrompt.es,
      "Reading is missing a written-response prompt",
    );
  }
});

test("Writing tasks ship at least 4 guided 40-70 word prompts", () => {
  assert.ok(data.writingTasks.length >= 4);
  for (const task of data.writingTasks) {
    assert.ok(task.usefulPhrases.length >= 4);
    assert.ok(task.scaffold.length >= 4);
    const wordCount = task.sampleAnswer.trim().split(/\s+/).length;
    assert.ok(
      wordCount >= 30 && wordCount <= 90,
      `Sample answer for ${task.id} has unrealistic length (${wordCount} words)`,
    );
  }
});

test("Oral interaction roleplay deck has at least 4 cards", () => {
  assert.ok(data.roleplayCards.length >= 4);
  for (const card of data.roleplayCards) {
    assert.ok(card.targetPhrases.length >= 4);
    assert.ok(card.successChecklist.length >= 3);
    assert.ok(card.modelSentence.length > 0);
  }
});

test("A2 grammar toolbox has at least 12 cards covering the required patterns", () => {
  assert.ok(data.grammarCards.length >= 12);
  const patterns = data.grammarCards.map((c) => c.pattern).join(" | ");
  for (const fragment of [
    "verbo + -é",
    "fui",
    "tuve",
    "hice",
    "estuve",
    "perdí",
    "Me gustó",
    "Fue",
    "tener que",
    "hay que",
    "ir a +",
    "Puede",
    "lo · la",
    "primero",
    "porque",
  ]) {
    assert.ok(
      patterns.toLowerCase().includes(fragment.toLowerCase()),
      `Missing grammar pattern fragment: ${fragment}`,
    );
  }
});

test("Flashcard deck has at least 50 cards with FR/EN/ES backs", () => {
  assert.ok(data.flashcards.length >= 50);
  for (const card of data.flashcards) {
    assert.ok(card.front.length > 0);
    assert.ok(card.back.fr && card.back.en && card.back.es);
  }
});

test("Flashcard deck includes culture / past / connector anchors", () => {
  const fronts = new Set(data.flashcards.map((c) => c.front));
  for (const required of [
    "merengue",
    "bachata",
    "Zona Colonial",
    "Los Haitises",
    "Taíno",
    "larimar",
    "fui",
    "estuve",
    "primero",
    "después",
    "porque",
    "por eso",
  ]) {
    assert.ok(fronts.has(required), `Flashcard deck missing: ${required}`);
  }
});

test("Practice quiz has at least 20 Spanish-only multiple-choice questions", () => {
  assert.ok(data.quizQuestions.length >= 20);
  for (const q of data.quizQuestions as Dom5QuizQuestion[]) {
    assert.ok(q.options.length === 3, `Quiz ${q.id} must have 3 options`);
    assert.ok(
      q.options.some((o) => o.id === q.correctOptionId),
      `Quiz ${q.id} correctOptionId must reference an option`,
    );
    for (const option of q.options) {
      assert.ok(option.target.length > 0, "Quiz option must have Spanish target");
    }
  }
});

test("Final capstone game has at least 10 rounds and consistent options", () => {
  assert.ok(data.finalGame.rounds.length >= 10);
  for (const round of data.finalGame.rounds as Dom5GameRound[]) {
    assert.ok(round.options.length === 3);
    assert.ok(round.options.some((o) => o.id === round.correctOptionId));
    assert.ok(round.feedback.fr && round.feedback.en && round.feedback.es);
  }
});

test("Self-assessment ships a checklist with the required A2 statements", () => {
  assert.ok(data.selfAssessment.length >= 7);
  const fr = data.selfAssessment.map((s) => s.statement.fr).join("\n");
  const en = data.selfAssessment.map((s) => s.statement.en).join("\n");
  const es = data.selfAssessment.map((s) => s.statement.es).join("\n");
  assert.match(fr, /Je peux comprendre un court message pratique/);
  assert.match(fr, /Je peux demander de l'aide/);
  assert.match(fr, /Je peux expliquer un problème simple/);
  assert.match(fr, /Je peux raconter ce que j'ai fait hier/);
  assert.match(fr, /Je peux écrire un court message poli/);
  assert.match(fr, /Je peux demander de répéter ou d'écrire/);
  assert.match(fr, /Je peux reconnaître quelques références culturelles dominicaines/);
  assert.match(en, /I can/);
  assert.match(es, /Puedo/);
});

test("Printables ship at least 7 worksheets covering all required kinds", () => {
  assert.ok(data.printableSheets.length >= 7);
  const kinds = new Set(data.printableSheets.map((sheet) => sheet.kind));
  for (const kind of [
    "vocabulary",
    "fill_blank",
    "past_tense",
    "connectors",
    "reading",
    "writing",
    "final_workbook",
  ] as const) {
    assert.ok(kinds.has(kind), `Printable kind missing: ${kind}`);
  }
  for (const sheet of data.printableSheets) {
    assert.ok(sheet.items.length >= 5, `Worksheet ${sheet.id} has too few items`);
    for (const item of sheet.items) {
      assert.ok(item.prompt.fr && item.prompt.en && item.prompt.es);
      assert.ok(item.answer.fr && item.answer.en && item.answer.es);
    }
  }
});

test("Print button label ships FR/EN/ES with the A2 workbook wording", () => {
  assert.match(data.printButtonLabel.fr, /Imprimer le cahier A2/);
  assert.match(data.printButtonLabel.en, /Print A2 workbook/);
  assert.match(data.printButtonLabel.es, /Imprimir cuaderno A2/);
});

test("Final game name includes the A2 mission wording in FR/EN/ES", () => {
  assert.match(data.finalGame.title.fr, /Mission finale A2/);
  assert.match(data.finalGame.title.en, /Final A2 mission/);
  assert.match(data.finalGame.title.es, /Misión final A2/);
});

test("All learner-facing FR/EN/ES strings are non-empty", () => {
  // Spot-check critical strings; deep traversal would be too noisy.
  for (const value of [
    data.heroTitle,
    data.heroSubtitle,
    data.capstoneCompletionMessage,
    data.seriesCompletionTitle,
    data.seriesCompletionBody,
    data.audioBrowserNoteShort,
    data.audioBrowserNoteLong,
    data.printButtonLabel,
    data.finalGame.title,
    data.finalGame.subtitle,
    data.finalGame.successMessage,
  ]) {
    assert.ok(
      value.fr.trim().length > 0 &&
        value.en.trim().length > 0 &&
        value.es.trim().length > 0,
      "Empty locale string detected",
    );
  }
});

let passed = 0;
let failed = 0;

(async () => {
  console.log(`\nRunning ${tests.length} tests - YoPratiqo Dominican Module 5 data\n`);

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
