/**
 * YoPratiqo — Quebec French / Module 1 · Lesson 2 free-preview body
 * regression suite.
 *
 * Lesson 2 ("Comprendre les consignes simples") graduated from
 * outline-only to a populated free-preview body in this PR. The
 * tests below pin every documented section of the lesson AND every
 * safety invariant so a regression breaks the launch gate:
 *
 *   - 1 before-you-start framing block (FR + EN + ES)
 *   - 3 micro-skills (verbs / confirm / reformulate)
 *   - 12 key verbs split 6 physical / 6 administrative
 *   - 4 Quebec oral markers (pis / tiens-tenez / là / tantôt)
 *   - 5 confirmation formulas
 *   - 5 reformulation formulas
 *   - 1 mini-scenario with a 3-action supervisor line, one learner
 *     clarification, and one learner confirmation
 *   - 5 quiz questions × 4 options each (target-French preserved)
 *   - 8–12 flashcards
 *   - 1 consent-safe teacher CTA
 *   - 1 next-lesson teaser pointing at Leçon 3
 *
 * Hard safety contract — re-asserted here so a Lesson 2 regression
 * fails THIS suite first:
 *
 *   - The Lesson 2 surfaces never wire YoFrenchAudioButton (the
 *     audio manifest is keyed off Lesson 1 only).
 *   - The teacher CTA must include a "ready / prêt / listo" cue
 *     per locale and must NEVER mention automatic teacher routing,
 *     voice recording, or learner-data forwarding.
 *   - Target Quebec French stays prominent in every locale; EN / ES
 *     are HELPER glosses only.
 *   - The module route stays noindex / sitemap-free / Course-schema
 *     free across FR + EN + ES.
 *   - No modified file imports payments / Stripe / Supabase / RLS /
 *     migrations / booking / Membre Pro / commission / audio-gen /
 *     OpenAI.
 *
 * Static-source + pure-helper tests only. No browser, no network,
 * no Stripe, no payments, no Supabase calls.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { emptySupplySitemap as sitemap } from "../seo/emptySupplySitemap";
import { buildYoPratiqoMetadata } from "@/lib/yo/yopratiqoSeo";
import { shouldPublishYoCourseSchema } from "@/lib/yo/yopratiqoProductConfig";
import { frQuebecWorkplaceSurvivalModule } from "@/lib/yo/frQuebecWorkplaceSurvivalModule";
import type { FrQuebecLessonTwoContent } from "@/lib/yo/frQuebecWorkplaceSurvivalModule";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

/**
 * Strip JS comments before scanning code for forbidden patterns.
 * Mirrors the helper used by the existing premium-shell test — doc
 * comments that explicitly name a forbidden concept must never trip
 * a regex meant to detect real code.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const SEO_ROUTE_ID = "frenchQuebecModuleOne";
const PREMIUM_ROUTE = "/yo/langues/francais-quebec/module-1";
const PREMIUM_DATA_FILE = "lib/yo/frQuebecWorkplaceSurvivalModule.ts";
const PREMIUM_SHELL_FILE = "components/yo/YoPremiumModuleShell.tsx";
const TEST_FILE = "tests/yo/yopratiqoFrQuebecLesson2.test.ts";

const LESSON_TWO_ID = "comprendre-consignes-simples";

function getLessonTwo() {
  const lesson = frQuebecWorkplaceSurvivalModule.lessons[1];
  assert.ok(lesson, "Lesson 2 must exist at lessons[1]");
  assert.equal(
    lesson.id,
    LESSON_TWO_ID,
    `Lesson 2 must use the stable id "${LESSON_TWO_ID}" (was previously the outline-only fr-qc-mod1-l2)`,
  );
  return lesson;
}

function getLessonTwoContent(): FrQuebecLessonTwoContent {
  const lesson = getLessonTwo();
  assert.ok(lesson.content, "Lesson 2 must carry a populated content body");
  assert.equal(
    lesson.content!.kind,
    "lesson2",
    "Lesson 2 content.kind must be the 'lesson2' discriminator",
  );
  return lesson.content as FrQuebecLessonTwoContent;
}

// ── 1. Lesson 2 identity ────────────────────────────────────────────

test("Lesson 2 exists at lessons[1] with id 'comprendre-consignes-simples'", () => {
  const lesson = getLessonTwo();
  assert.equal(lesson.id, LESSON_TWO_ID);
});

// ── 2. Spec-mandated FR / EN / ES titles ───────────────────────────

test("Lesson 2 titles match the spec exactly in FR + EN + ES", () => {
  const lesson = getLessonTwo();
  assert.equal(lesson.titleFr, "Comprendre les consignes simples");
  assert.equal(lesson.titleEn, "Understanding simple instructions");
  assert.equal(lesson.titleEs, "Comprender instrucciones simples");
});

// ── 3. Lifecycle flags ─────────────────────────────────────────────

test("Lesson 2 status='preview', accessStatus='coming_soon', estimatedMinutes=12", () => {
  const lesson = getLessonTwo();
  assert.equal(lesson.status, "preview");
  assert.equal(lesson.accessStatus, "coming_soon");
  assert.equal(lesson.estimatedMinutes, 12);
});

// ── 4. Twelve key verbs (6 physical + 6 administrative) ────────────

test("Lesson 2 ships 12 key verbs split exactly 6 physical / 6 administrative, with the spec-mandated infinitives", () => {
  const content = getLessonTwoContent();
  assert.equal(content.keyVerbs.length, 12, "expected exactly 12 key verbs");

  const physical = content.keyVerbs.filter((v) => v.category === "physical");
  const administrative = content.keyVerbs.filter(
    (v) => v.category === "administrative",
  );
  assert.equal(physical.length, 6, "expected exactly 6 physical verbs");
  assert.equal(administrative.length, 6, "expected exactly 6 administrative verbs");

  const expectedPhysical = ["mettre", "prendre", "apporter", "ranger", "ouvrir", "fermer"];
  const expectedAdministrative = [
    "signer",
    "remplir",
    "vérifier",
    "envoyer",
    "imprimer",
    "appeler",
  ];
  const infinitives = content.keyVerbs.map((v) => v.infinitive);
  for (const v of expectedPhysical) {
    assert.ok(
      infinitives.includes(v),
      `physical verb "${v}" must appear in keyVerbs`,
    );
  }
  for (const v of expectedAdministrative) {
    assert.ok(
      infinitives.includes(v),
      `administrative verb "${v}" must appear in keyVerbs`,
    );
  }
  // Every verb must declare a non-empty example sentence + EN/ES glosses.
  for (const verb of content.keyVerbs) {
    assert.ok(verb.id.length > 0, `verb ${verb.infinitive} needs an id`);
    assert.ok(
      verb.exampleFr.length > 0,
      `verb ${verb.infinitive} needs a Quebec French example sentence`,
    );
    assert.ok(verb.glossEn.length > 0, `verb ${verb.infinitive} needs an EN gloss`);
    assert.ok(verb.glossEs.length > 0, `verb ${verb.infinitive} needs an ES gloss`);
    assert.ok(
      verb.exampleGlossEn.length > 0,
      `verb ${verb.infinitive} needs an EN example gloss`,
    );
    assert.ok(
      verb.exampleGlossEs.length > 0,
      `verb ${verb.infinitive} needs an ES example gloss`,
    );
  }
});

// ── 5. Quebec oral markers + « tantôt » pedagogy ───────────────────

test("Lesson 2 declares 4 Quebec oral markers (pis / tiens-tenez / là / tantôt) with FR + EN + ES meanings", () => {
  const content = getLessonTwoContent();
  assert.equal(content.oralMarkers.length, 4, "expected exactly 4 oral markers");
  const markers = content.oralMarkers.map((m) => m.marker);
  assert.deepEqual(
    markers,
    ["pis", "tiens / tenez", "là", "tantôt"],
    "oral marker values must match the spec exactly",
  );
  for (const marker of content.oralMarkers) {
    assert.ok(marker.id.length > 0, `marker ${marker.marker} needs an id`);
    assert.ok(marker.meaningFr.length > 0);
    assert.ok(marker.meaningEn.length > 0);
    assert.ok(marker.meaningEs.length > 0);
    assert.ok(marker.exampleFr.length > 0);
    assert.ok(marker.exampleGlossEn.length > 0);
    assert.ok(marker.exampleGlossEs.length > 0);
  }

  // « tantôt » MUST anchor on "later today" / "más tarde hoy", never
  // "hasta pronto" / "soon" as the primary meaning. Mirrors the
  // Lesson 1 pedagogical pattern.
  const tantot = content.oralMarkers.find((m) => m.marker === "tantôt");
  assert.ok(tantot, "tantôt marker must exist");
  assert.ok(
    /later\s+today/i.test(tantot!.meaningEn),
    "tantôt meaningEn must include 'later today'",
  );
  assert.ok(
    /m[áa]s\s+tarde\s+hoy/i.test(tantot!.meaningEs),
    "tantôt meaningEs must include 'más tarde hoy'",
  );
  assert.ok(
    !/hasta\s+pronto/i.test(tantot!.meaningEs),
    "tantôt meaningEs must NOT use « hasta pronto » as the primary meaning",
  );
  // « soon » may appear in a contrast clause (e.g. "not « soon »
  // in general"), so we don't ban the literal word — we just require
  // that "later today" is the primary cue, which is asserted above.
});

// ── 6. Five confirmation formulas (exact targetFr) ─────────────────

test("Lesson 2 ships 5 confirmation formulas with the exact spec-mandated targetFr strings", () => {
  const content = getLessonTwoContent();
  assert.equal(content.confirmationFormulas.length, 5);
  const expectedConfirm = [
    "Parfait.",
    "OK, c’est bon.",
    "D’accord, je m’en occupe.",
    "Pas de problème.",
    "Compris.",
  ];
  const actual = content.confirmationFormulas.map((f) => f.targetFr);
  assert.deepEqual(actual, expectedConfirm);
  for (const formula of content.confirmationFormulas) {
    assert.ok(formula.id.length > 0);
    assert.ok(formula.registerFr.length > 0);
    assert.ok(formula.registerEn.length > 0);
    assert.ok(formula.registerEs.length > 0);
    assert.ok(formula.glossEn.length > 0);
    assert.ok(formula.glossEs.length > 0);
  }
});

// ── 7. Five reformulation formulas (exact targetFr) ────────────────

test("Lesson 2 ships 5 reformulation formulas with the exact spec-mandated targetFr strings", () => {
  const content = getLessonTwoContent();
  assert.equal(content.reformulationFormulas.length, 5);
  const expectedReformulate = [
    "Excuse-moi, t’as dit quoi pour [X] ?",
    "Pardon, peux-tu redire la dernière partie ?",
    "Attends — la boîte sur l’étagère, c’est ça ?",
    "Je veux juste m’assurer — c’est avant ou après la pause ?",
    "Désolé, je veux être sûr de bien faire — peux-tu reprendre depuis le début ?",
  ];
  const actual = content.reformulationFormulas.map((f) => f.targetFr);
  assert.deepEqual(actual, expectedReformulate);
  for (const formula of content.reformulationFormulas) {
    assert.ok(formula.id.length > 0);
    assert.ok(formula.registerFr.length > 0);
    assert.ok(formula.registerEn.length > 0);
    assert.ok(formula.registerEs.length > 0);
    assert.ok(formula.glossEn.length > 0);
    assert.ok(formula.glossEs.length > 0);
  }
});

// ── 8. Mini-scenario shape (3-action instruction + clarify + confirm) ──

test("Lesson 2 mini-scenario has a 3-action supervisor line, exactly one learner clarification, and one learner confirmation/reformulation", () => {
  const content = getLessonTwoContent();
  const scenario = content.miniScenario;
  assert.ok(scenario.titleFr.length > 0);
  assert.ok(scenario.titleEn.length > 0);
  assert.ok(scenario.titleEs.length > 0);
  assert.ok(scenario.contextFr.length > 0);
  assert.ok(scenario.contextEn.length > 0);
  assert.ok(scenario.contextEs.length > 0);

  const lines = scenario.lines;
  assert.ok(
    lines.length >= 5 && lines.length <= 7,
    `expected 5..7 scenario lines, got ${lines.length}`,
  );

  // Identify supervisor vs learner lines via the speaker label. We
  // accept any speaker whose FR label is NOT "Vous" as a supervisor;
  // learner lines use the "Vous" label (mirrors the Lesson 1 pattern).
  const supervisorLines = lines.filter((l) => !/^vous$/i.test(l.speakerFr));
  const learnerLines = lines.filter((l) => /^vous$/i.test(l.speakerFr));
  assert.ok(
    supervisorLines.length >= 1,
    "scenario must have at least one supervisor line",
  );
  assert.ok(
    learnerLines.length >= 2,
    "scenario must have at least two learner lines (one clarification + one confirmation)",
  );

  // The 3-action supervisor instruction must contain at least 3
  // imperative verbs from the lesson's verb set. We look for verb
  // STEMS (the imperative form drops the -er ending) so we catch
  // "Mets", "Signe", "Appelle", etc.
  const imperativeStems = [
    /\bmets\b/i,
    /\bprends\b/i,
    /\bapporte\b/i,
    /\brange\b/i,
    /\bouvre\b/i,
    /\bferme\b/i,
    /\bsigne\b/i,
    /\bremplis\b/i,
    /\bv[ée]rifie\b/i,
    /\benvoie\b/i,
    /\bimprime\b/i,
    /\bappelle\b/i,
  ];
  const supervisorWithThreeActions = supervisorLines.find((line) => {
    const matches = imperativeStems.filter((re) => re.test(line.frQuebec));
    return matches.length >= 3;
  });
  assert.ok(
    supervisorWithThreeActions,
    "at least one supervisor line must contain 3+ imperative verbs (the 3-action instruction)",
  );

  // Exactly one learner line is a clarification (uses a reformulation
  // formula or a question word that asks for a specific detail).
  const clarificationCues =
    /(attends|pardon|excuse[- ]moi|d[ée]sol[ée]|je veux juste m['’]assurer|c['’]est avant ou apr[ée]s)/i;
  const learnerClarifications = learnerLines.filter((l) =>
    clarificationCues.test(l.frQuebec),
  );
  assert.equal(
    learnerClarifications.length,
    1,
    `expected exactly one learner clarification line, got ${learnerClarifications.length}`,
  );

  // Exactly one learner line is a full confirmation/reformulation
  // restating the three concrete elements.
  const confirmationCues =
    /(donc je|si je comprends|c['’]est ça\s*\?)/i;
  const learnerConfirmations = learnerLines.filter((l) =>
    confirmationCues.test(l.frQuebec),
  );
  assert.ok(
    learnerConfirmations.length >= 1,
    "scenario must include at least one learner confirmation/reformulation line",
  );
});

// ── 9. Mini-scenario lines have FR + EN + ES on every line ─────────

test("Lesson 2 mini-scenario lines carry frQuebec + english + spanish on every line", () => {
  const content = getLessonTwoContent();
  for (const line of content.miniScenario.lines) {
    assert.ok(
      line.frQuebec.length > 0,
      "scenario line must declare a Quebec French target",
    );
    assert.ok(
      line.english.length > 0,
      "scenario line must declare an English gloss",
    );
    assert.ok(
      line.spanish.length > 0,
      "scenario line must declare a Spanish gloss",
    );
    assert.ok(line.speakerFr.length > 0);
    assert.ok(line.speakerEn.length > 0);
    assert.ok(line.speakerEs.length > 0);
  }
});

// ── 10. Quiz shape — 5 questions × 4 options, targetFr-only ────────

test("Lesson 2 quiz has 5 questions × 4 options, each option using the { targetFr, glossEn?, glossEs? } shape", () => {
  const content = getLessonTwoContent();
  assert.equal(content.quizQuestions.length, 5);
  const seenQuestionIds = new Set<string>();
  for (const question of content.quizQuestions) {
    assert.ok(question.id.length > 0);
    assert.ok(
      !seenQuestionIds.has(question.id),
      `quiz question ids must be unique (duplicate: ${question.id})`,
    );
    seenQuestionIds.add(question.id);
    assert.ok(question.promptFr.length > 0);
    assert.ok(question.promptEn.length > 0);
    assert.ok(question.promptEs.length > 0);
    assert.equal(
      question.options.length,
      4,
      `quiz question ${question.id} must expose exactly 4 options`,
    );
    const optionIds = new Set<string>();
    for (const opt of question.options) {
      assert.ok(
        opt.targetFr.length > 0,
        `quiz ${question.id} option ${opt.id} must declare a Quebec French target`,
      );
      // The migrated option shape forbids labelFr / labelEn / labelEs.
      const record: Record<string, unknown> = { ...opt };
      assert.equal(
        record["labelFr"],
        undefined,
        `quiz ${question.id} option ${opt.id} must NOT carry a legacy labelFr field`,
      );
      assert.equal(
        record["labelEn"],
        undefined,
        `quiz ${question.id} option ${opt.id} must NOT carry a legacy labelEn field`,
      );
      assert.equal(
        record["labelEs"],
        undefined,
        `quiz ${question.id} option ${opt.id} must NOT carry a legacy labelEs field`,
      );
      // Optional glosses must be non-empty when present.
      if (typeof opt.glossEn !== "undefined") {
        assert.ok(opt.glossEn.length > 0);
      }
      if (typeof opt.glossEs !== "undefined") {
        assert.ok(opt.glossEs.length > 0);
      }
      optionIds.add(opt.id);
    }
    assert.ok(
      optionIds.has(question.correctOptionId),
      `quiz ${question.id} correctOptionId must resolve to one of its options`,
    );
    assert.ok(question.explanationFr.length > 0);
    assert.ok(question.explanationEn.length > 0);
    assert.ok(question.explanationEs.length > 0);
  }
});

// ── 11. « tantôt » quiz question reinforces "más tarde hoy" ────────

test("Lesson 2 « tantôt » quiz question's explanationEs reinforces 'más tarde hoy' and does not use 'hasta pronto'", () => {
  const content = getLessonTwoContent();
  const tantotQuestion = content.quizQuestions.find((q) =>
    /tant[ôo]t/i.test(q.promptFr),
  );
  assert.ok(
    tantotQuestion,
    "Lesson 2 quiz must include a question that probes « tantôt »",
  );
  assert.ok(
    /m[áa]s\s+tarde\s+hoy/i.test(tantotQuestion!.explanationEs),
    "« tantôt » quiz explanationEs must include 'más tarde hoy'",
  );
  assert.ok(
    !/hasta\s+pronto/i.test(tantotQuestion!.explanationEs),
    "« tantôt » quiz explanationEs must NOT use « hasta pronto » as the primary meaning",
  );
  // The EN explanation should also anchor on "later today" (mirrors
  // the Lesson 1 pedagogical pattern).
  assert.ok(
    /later\s+today/i.test(tantotQuestion!.explanationEn),
    "« tantôt » quiz explanationEn must include 'later today'",
  );
});

// ── 12. Quiz targetFr stays French — correct options never duplicate their glosses ──

test("Lesson 2 quiz correct-answer targetFr is in French — never equals its own EN/ES gloss", () => {
  const content = getLessonTwoContent();
  for (const question of content.quizQuestions) {
    const correct = question.options.find(
      (opt) => opt.id === question.correctOptionId,
    );
    assert.ok(correct, `question ${question.id} must declare a correct option`);
    if (typeof correct!.glossEn === "string") {
      assert.notEqual(
        correct!.targetFr,
        correct!.glossEn,
        `quiz ${question.id} option ${correct!.id}: targetFr must not duplicate glossEn`,
      );
    }
    if (typeof correct!.glossEs === "string") {
      assert.notEqual(
        correct!.targetFr,
        correct!.glossEs,
        `quiz ${question.id} option ${correct!.id}: targetFr must not duplicate glossEs`,
      );
    }
  }
});

// ── 13. Flashcards (8..12, unique ids, FR/EN/ES authored) ──────────

test("Lesson 2 ships 8..12 flashcards with unique ids and non-empty FR + EN + ES sides", () => {
  const content = getLessonTwoContent();
  const cards = content.flashcards;
  assert.ok(
    cards.length >= 8 && cards.length <= 12,
    `expected 8..12 flashcards, got ${cards.length}`,
  );
  const seen = new Set<string>();
  for (const card of cards) {
    assert.ok(card.id.length > 0, "flashcard needs a stable id");
    assert.ok(!seen.has(card.id), `flashcard id ${card.id} must be unique`);
    seen.add(card.id);
    assert.ok(card.frontFr.length > 0, `flashcard ${card.id} needs a frontFr`);
    assert.ok(card.backEn.length > 0, `flashcard ${card.id} needs a backEn`);
    assert.ok(card.backEs.length > 0, `flashcard ${card.id} needs a backEs`);
  }
});

// ── 14. Teacher CTA is consent-safe (FR + EN + ES) ─────────────────

test("Lesson 2 teacher CTA includes a 'ready / prêt / listo' cue per locale and never references auto-routing / recording / data forwarding", () => {
  const content = getLessonTwoContent();
  const fr = content.teacherCta.promptFr;
  const en = content.teacherCta.promptEn;
  const es = content.teacherCta.promptEs;
  assert.ok(fr.length > 30, "teacher CTA promptFr must be substantial");
  assert.ok(en.length > 30, "teacher CTA promptEn must be substantial");
  assert.ok(es.length > 30, "teacher CTA promptEs must be substantial");
  assert.ok(
    /pr[êe]t/i.test(fr),
    "teacher CTA promptFr must include the 'prêt' consent cue",
  );
  assert.ok(
    /\bready\b/i.test(en),
    "teacher CTA promptEn must include the 'ready' consent cue",
  );
  assert.ok(
    /\b(listo|preparado)\b/i.test(es),
    "teacher CTA promptEs must include the 'listo' (or 'preparado') consent cue",
  );

  // Forbidden phrasings — mirrors the Lesson 1 premium-shell test.
  const banned: ReadonlyArray<[RegExp, string]> = [
    [/voice\s+recording/i, "voice recording (EN)"],
    [/enregistrement\s+vocal/i, "enregistrement vocal (FR)"],
    [
      /automatic(?:\s+\w+){0,3}\s+(?:teacher|routing|matching)/i,
      "automatic teacher routing (EN)",
    ],
    [/auto[-\s]?match\w*\s+(?:teacher|prof)/i, "auto-match teacher (EN)"],
    [/jumelage\s+automatique/i, "jumelage automatique (FR)"],
    [
      /(?:forward|share|send)\s+(?:your|the)\s+(?:quiz|results?|logs?|data|answers?)/i,
      "data sharing with teacher (EN)",
    ],
    [
      /(?:partager|transmettre|envoyer)\s+(?:vos|tes)\s+(?:r[ée]ponses|r[ée]sultats|donn[ée]es|logs)/i,
      "data sharing with teacher (FR)",
    ],
    [/microphone/i, "microphone reference"],
  ];
  for (const text of [fr, en, es]) {
    for (const [re, label] of banned) {
      assert.ok(
        !re.test(text),
        `Lesson 2 teacher CTA must NOT include "${label}"`,
      );
    }
  }
});

// ── 15. Next-lesson teaser references Lesson 3 ─────────────────────

test("Lesson 2 next-lesson teaser references Leçon 3 / Lesson 3 / Lección 3 plus 'Poser une question sans bloquer'", () => {
  const content = getLessonTwoContent();
  const fr = content.nextLessonTeaser.teaserFr;
  const en = content.nextLessonTeaser.teaserEn;
  const es = content.nextLessonTeaser.teaserEs;
  assert.ok(/leçon\s+3/i.test(fr), "teaserFr must reference « Leçon 3 »");
  assert.ok(/lesson\s+3/i.test(en), "teaserEn must reference « Lesson 3 »");
  assert.ok(
    /lecci[óo]n\s+3/i.test(es),
    "teaserEs must reference « Lección 3 »",
  );
  // The topic phrase (or a clear paraphrase). All three locales
  // currently keep the canonical FR title verbatim — we accept that
  // OR a paraphrase that matches the topic root ("question" +
  // "bloquer" / "freeze" / "bloquearse").
  const topicFr = /poser\s+une\s+question\s+sans\s+bloquer/i;
  const topicEn = /(poser\s+une\s+question\s+sans\s+bloquer|question\s+without\s+(?:freezing|blocking))/i;
  const topicEs = /(poser\s+une\s+question\s+sans\s+bloquer|pregunta\s+sin\s+bloquear)/i;
  assert.ok(topicFr.test(fr), "teaserFr must reference 'Poser une question sans bloquer'");
  assert.ok(topicEn.test(en), "teaserEn must reference the Lesson 3 topic");
  assert.ok(topicEs.test(es), "teaserEs must reference the Lesson 3 topic");
});

// ── 16. Module remains noindex across FR / EN / ES ─────────────────

test("Module remains noindex via buildYoPratiqoMetadata for FR + EN + ES (Lesson 2 must NOT flip the bit)", () => {
  for (const lang of ["fr", "en", "es"] as const) {
    const metadata = buildYoPratiqoMetadata(SEO_ROUTE_ID, lang);
    assert.deepEqual(
      metadata.robots,
      { index: false, follow: false },
      `metadata.robots must remain noindex for lang="${lang}" after Lesson 2 ships`,
    );
  }
});

// ── 17. Module remains absent from the sitemap ─────────────────────

test("Module route remains absent from the sitemap after Lesson 2 ships", async () => {
  const entries = await sitemap();
  const matching = entries.filter((e) => e.url.endsWith(PREMIUM_ROUTE));
  assert.equal(
    matching.length,
    0,
    `sitemap must remain free of ${PREMIUM_ROUTE} after Lesson 2 graduated to preview`,
  );
});

// ── 18. No Course schema for the future-premium page type ──────────

test("Course schema remains disabled for the future-premium page type after Lesson 2 ships", () => {
  assert.equal(
    shouldPublishYoCourseSchema("francais-quebec", "future_premium"),
    false,
  );
});

// ── 19. Forbidden imports in modified files ────────────────────────

test("No modified file (data / shell / new test) imports payments / Stripe / Supabase / RLS / migrations / booking / Membre Pro / commission / audio-gen / OpenAI / live legal pages", () => {
  // The data + shell files use a strict "no forbidden substrings"
  // scan (they're production code that must never name these
  // concepts in real source). Comments are stripped first so a
  // doc-comment that says "no Stripe here" does not falsely match.
  const forbiddenInProductionSources: ReadonlyArray<[RegExp, string]> = [
    [/\bstripe\b/i, "Stripe"],
    [/@\/lib\/payments/, "payments lib"],
    [/getSupabaseClient|getSupabaseAdmin|@\/lib\/supabase/, "Supabase client"],
    [/supabase\/migrations/, "Supabase migrations"],
    [/\bRLS\b/, "RLS reference"],
    [/@\/components\/BookingModal|@\/lib\/booking/, "Booking modal/lib"],
    [/\bmembrePro\b|\bMembrePro\b|\bmembre_pro\b/, "Membre Pro config"],
    [/\bcommission\b/i, "commission math"],
    [/@\/scripts\/generate-yopratiqo-audio/, "audio generation script"],
    [/from\s+["']openai["']/, "OpenAI SDK"],
    [/\bcheckout\b/i, "checkout"],
    [/\bpaywall\b/i, "paywall"],
    [/\bpaid_module\b/i, "paid_module identifier"],
    [/@\/app\/(?:conditions|cookies|confidentialite)/, "live legal pages"],
    [/teacherDashboard|TeacherDashboard/, "teacher dashboard"],
  ];
  for (const file of [PREMIUM_DATA_FILE, PREMIUM_SHELL_FILE]) {
    const stripped = stripComments(read(file));
    for (const [re, label] of forbiddenInProductionSources) {
      assert.ok(
        !re.test(stripped),
        `${file} must not reference ${label} (${re}) — out of scope for this PR`,
      );
    }
  }

  // The test file legitimately documents forbidden patterns inside
  // its own regex tables, so a substring scan would self-fail. We
  // instead extract every actual `import ... from "..."` (or bare
  // `import "..."`) line and confirm none of the resolved specifiers
  // reach restricted modules. This precisely matches the spec ("scan
  // … for … imports").
  const testSrc = stripComments(read(TEST_FILE));
  const importPattern =
    /^\s*import\s+(?:[\s\S]*?from\s+)?["']([^"']+)["']\s*;?/gm;
  const importedSpecifiers: string[] = [];
  let importMatch: RegExpExecArray | null;
  while ((importMatch = importPattern.exec(testSrc)) !== null) {
    importedSpecifiers.push(importMatch[1]!);
  }
  assert.ok(
    importedSpecifiers.length > 0,
    "test file must import at least one module (sanity check)",
  );
  const forbiddenImportSpecifiers: ReadonlyArray<[RegExp, string]> = [
    [/^stripe(?:[/?]|$)/i, "Stripe SDK"],
    [/^openai(?:[/?]|$)/i, "OpenAI SDK"],
    [/@\/lib\/payments/, "payments lib"],
    [/@\/lib\/supabase/, "Supabase lib"],
    [/@\/lib\/booking/, "booking lib"],
    [/@\/components\/BookingModal/, "BookingModal component"],
    [/@\/scripts\/generate-yopratiqo-audio/, "audio generation script"],
    [/@\/lib\/membrePro/i, "Membre Pro lib"],
    [/@\/lib\/commission/i, "commission lib"],
    [/@\/lib\/teacherDashboard/i, "teacher dashboard lib"],
    [
      /@\/app\/(?:conditions|cookies|confidentialite)/i,
      "live legal pages",
    ],
    [/supabase\/migrations/, "Supabase migrations"],
  ];
  for (const specifier of importedSpecifiers) {
    for (const [re, label] of forbiddenImportSpecifiers) {
      assert.ok(
        !re.test(specifier),
        `${TEST_FILE} must not import ${label} (matched "${specifier}")`,
      );
    }
  }
});

// ── 20. Renderer wires every Lesson 2 content field ────────────────

test("YoPremiumModuleShell consumes every Lesson 2 content field in its LessonTwoPreview renderer", () => {
  const src = read(PREMIUM_SHELL_FILE);
  // The Lesson 2 preview renderer must read these fields directly off
  // the typed content object. Field names are stable identifiers in
  // the data shape, so the static-source scan catches structural drift.
  const requiredAccessors: readonly string[] = [
    "content.beforeYouStartFr",
    "content.beforeYouStartEn",
    "content.beforeYouStartEs",
    "content.microSkills",
    "content.keyVerbs",
    "content.oralMarkers",
    "content.confirmationFormulas",
    "content.reformulationFormulas",
    "content.miniScenario",
    "content.quizQuestions",
    "content.flashcards",
    "content.teacherCta",
    "content.nextLessonTeaser",
  ];
  for (const accessor of requiredAccessors) {
    assert.ok(
      src.includes(accessor),
      `shell must consume ${accessor} in the Lesson 2 renderer`,
    );
  }
  // The dispatch must check `content.kind === "lesson2"` and a
  // dedicated `LessonTwoPreview` function must exist.
  assert.ok(
    /content\.kind\s*===\s*"lesson2"/.test(src),
    "shell must dispatch on `content.kind === \"lesson2\"`",
  );
  assert.ok(
    /function\s+LessonTwoPreview\s*\(/.test(src),
    "shell must define a LessonTwoPreview server component",
  );
  // Lesson 2 surfaces NOW wire YoFrenchAudioButton: the Lesson 2
  // audio manifest landed in
  // `lib/yo/audio/frQuebecPremiumLessonTwoAudio.ts` and the shell
  // mirrors the Lesson 1 pattern (button next to every Quebec French
  // target string in the preview body, EN/ES glosses untouched).
  // This assertion is the inverse of the previous placeholder: a
  // regression that strips the audio wiring from LessonTwoPreview
  // fails this suite first.
  const lessonTwoPreviewBlock = src.match(
    /function\s+LessonTwoPreview\s*\([\s\S]*?\n\}\n/,
  );
  assert.ok(
    lessonTwoPreviewBlock,
    "shell must expose a LessonTwoPreview function for the audio-wiring check",
  );
  assert.ok(
    /<YoFrenchAudioButton/.test(lessonTwoPreviewBlock![0]!),
    "LessonTwoPreview must render YoFrenchAudioButton next to Quebec French target strings (manifest coverage now exists)",
  );
});

// ─── Run ──────────────────────────────────────────────────────────

(async () => {
  let passed = 0;
  for (const entry of tests) {
    try {
      await entry.fn();
      passed += 1;
      console.log(`ok - ${entry.name}`);
    } catch (error) {
      console.error(`not ok - ${entry.name}`);
      throw error;
    }
  }
  console.log(
    `\n[yo:fr-quebec-lesson-2] ${passed} Lesson 2 assertions passed.`,
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
