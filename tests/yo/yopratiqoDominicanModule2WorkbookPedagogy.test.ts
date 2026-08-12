/**
 * Module 2 workbook — pedagogical and mechanical integrity.
 *
 * The V1 workbook passed its tests while 77 of 101 answer references
 * resolved to nothing, three pages showed French-only options to
 * English and Spanish learners, and the declared response total was 70%
 * higher than the real item count. These assertions exist so none of
 * those can come back quietly.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildRdM2WorkbookAnswerGroups,
  countRdM2WorkbookObjectiveItems,
  countRdM2WorkbookOpenProductionTasks,
  countRdM2WorkbookPageResponses,
  countRdM2WorkbookResponseOpportunities,
  dominicanRepublicModule2Workbook as workbook,
  isRdM2LocalizedChoice,
  resolveRdM2WorkbookChoice,
  validateRdM2Workbook,
  type RdM2WorkbookActivity,
  type RdM2WorkbookItem,
  type RdM2WorkbookPage,
} from "../../lib/yo/dominicanRepublicModule2Workbook";
import type { YoLocalizedString } from "../../lib/yo/types";

const ROOT = process.cwd();
const DATA_FILE = "lib/yo/dominicanRepublicModule2Workbook.ts";
const COMPONENT_FILE = "components/yo/DominicanRepublicModule2Workbook.tsx";

const dataSrc = readFileSync(join(ROOT, DATA_FILE), "utf8");
const componentSrc = readFileSync(join(ROOT, COMPONENT_FILE), "utf8");

const page = (pageNumber: number): RdM2WorkbookPage => {
  const found = workbook.pages.find((candidate) => candidate.pageNumber === pageNumber);
  assert.ok(found, `page ${pageNumber} exists`);
  return found;
};

const allActivities = (target: RdM2WorkbookPage): readonly RdM2WorkbookActivity[] =>
  target.activities;

const allItems = (target: RdM2WorkbookPage): RdM2WorkbookItem[] =>
  target.activities.flatMap((activity) => [...(activity.items ?? [])]);

/** Every localized string the learner can read on a page, in all three locales. */
const scaffoldText = (target: RdM2WorkbookPage): string[] => {
  const out: string[] = [];
  const push = (value?: YoLocalizedString) => {
    if (!value) return;
    out.push(value.fr, value.en, value.es ?? value.fr);
  };
  push(target.title);
  push(target.purpose);
  for (const activity of target.activities) {
    push(activity.title);
    push(activity.instructions);
    push(activity.inputTitle);
    for (const note of activity.notes ?? []) push(note);
    for (const step of activity.steps ?? []) push(step);
    for (const item of activity.items ?? []) {
      push(item.prompt);
      push(item.answerNote);
      for (const choice of item.choices ?? []) {
        if (isRdM2LocalizedChoice(choice)) push(choice);
      }
    }
  }
  return out;
};

// ─── 1. Answer-key integrity, mechanically ─────────────────────────

assert.deepEqual(
  validateRdM2Workbook(),
  [],
  "workbook answer/response integrity validator must report no problems",
);

const objectiveGroups = buildRdM2WorkbookAnswerGroups("objective");
const modelGroups = buildRdM2WorkbookAnswerGroups("model");
const objectiveRefs = objectiveGroups.flatMap((group) => group.entries.map((entry) => entry.ref));
const modelRefs = modelGroups.flatMap((group) => group.entries.map((entry) => entry.ref));
const resolvedRefs = new Set([...objectiveRefs, ...modelRefs]);

assert.equal(
  new Set(objectiveRefs).size,
  objectiveRefs.length,
  "objective answer key contains no duplicate references",
);
assert.equal(
  new Set(modelRefs).size,
  modelRefs.length,
  "model answer key contains no duplicate references",
);
assert.equal(
  new Set([...objectiveRefs, ...modelRefs]).size,
  objectiveRefs.length + modelRefs.length,
  "no reference is printed in both the objective key and the model key",
);

const usedRefs: string[] = [];
const dangling: string[] = [];
const unclassified: string[] = [];
for (const workbookPage of workbook.pages) {
  for (const item of allItems(workbookPage)) {
    if (item.answerRef) {
      usedRefs.push(item.answerRef);
      if (!resolvedRefs.has(item.answerRef)) dangling.push(`${item.id}:${item.answerRef}`);
    }
    if ((item.responseLines ?? 1) >= 1 && !item.answerKind) unclassified.push(item.id);
  }
}

assert.deepEqual(dangling, [], "no answer reference may point at a missing answer");
assert.deepEqual(
  unclassified,
  [],
  "every item that reserves writing space declares objective / model / self",
);
assert.equal(
  new Set(usedRefs).size,
  usedRefs.length,
  "no answer reference is claimed by two different items",
);
assert.equal(
  usedRefs.length,
  resolvedRefs.size,
  "every printed answer belongs to exactly one exercise",
);
assert.ok(objectiveRefs.length >= 80, `expected a substantial objective key, got ${objectiveRefs.length}`);
assert.ok(modelRefs.length >= 35, `expected a substantial model key, got ${modelRefs.length}`);

// Self-assessed items are explicitly marked and never given a fake answer.
const selfItems = workbook.pages.flatMap((workbookPage) =>
  allItems(workbookPage).filter((item) => item.answerKind === "self"),
);
assert.ok(selfItems.length >= 15, "personal / self-rated work is explicitly classified");
for (const item of selfItems) {
  assert.equal(item.answerRef, undefined, `${item.id} is self-assessed and needs no key reference`);
  assert.equal(item.answer, undefined, `${item.id} is self-assessed and must carry no fixed answer`);
}

// ─── 2. Response counts describe real work ─────────────────────────

assert.doesNotMatch(
  dataSrc,
  /responseCount:\s*\d+/,
  "page response counts must be derived from items, never hand-declared",
);
assert.match(
  componentSrc,
  /countRdM2WorkbookPageResponses\(page\)/,
  "the renderer publishes the derived per-page response count",
);

const derivedTotal = countRdM2WorkbookResponseOpportunities();
const perPageTotal = workbook.pages.reduce(
  (total, workbookPage) => total + countRdM2WorkbookPageResponses(workbookPage),
  0,
);
assert.equal(derivedTotal, perPageTotal, "workbook total equals the sum of its pages");
assert.equal(
  derivedTotal,
  countRdM2WorkbookObjectiveItems() + countRdM2WorkbookOpenProductionTasks(),
  "every counted response is either objective, open production, or self-rated",
);

// Reading a Can-Do outcome or ticking a self-check is not a response.
const zeroLineItems = workbook.pages.flatMap((workbookPage) =>
  allItems(workbookPage).filter((item) => (item.responseLines ?? 1) === 0),
);
assert.ok(zeroLineItems.length >= 10, "recognition and checklist rows exist");
for (const item of zeroLineItems) {
  assert.equal(item.answerKind, undefined, `${item.id} has no writing space and needs no answer`);
}

// ─── 3. Localized choices, in all three locales ────────────────────

/** Characters that exist in French orthography but not in Spanish. */
const FRENCH_ONLY_CHARS = /[àâçèêëîïôùûœ]/i;
/** French words with no Spanish homograph, used to spot untranslated glosses. */
const FRENCH_ONLY_WORDS =
  /\b(lieu|heure|clé|sortie|passeport|chambre|déjeuner|lentement|vite|dehors|demain|maintenant|le|les|une|des|du|avec|pour|sans|très|par là)\b/i;

let scaffoldChoiceCount = 0;
let spanishChoiceCount = 0;

for (const workbookPage of workbook.pages) {
  for (const activity of allActivities(workbookPage)) {
    for (const item of activity.items ?? []) {
      for (const choice of item.choices ?? []) {
        if (isRdM2LocalizedChoice(choice)) {
          scaffoldChoiceCount += 1;
          assert.ok(choice.fr.length > 0, `${item.id}: scaffold choice has FR text`);
          assert.ok(choice.en.length > 0, `${item.id}: scaffold choice has EN text`);
          assert.ok(
            typeof choice.es === "string" && choice.es.length > 0,
            `${item.id}: scaffold choice has ES text`,
          );

          const looksFrench =
            FRENCH_ONLY_CHARS.test(choice.fr) || FRENCH_ONLY_WORDS.test(choice.fr);
          if (looksFrench) {
            assert.notEqual(choice.en, choice.fr, `${item.id}: EN choice must not reuse the FR gloss`);
            assert.notEqual(choice.es, choice.fr, `${item.id}: ES choice must not reuse the FR gloss`);
          }

          for (const locale of ["en", "es"] as const) {
            const resolved = resolveRdM2WorkbookChoice(choice, locale);
            assert.equal(resolved.isSpanishTarget, false, `${item.id}: scaffold choice is not a Spanish target`);
            assert.doesNotMatch(
              resolved.text,
              FRENCH_ONLY_CHARS,
              `${item.id}: ${locale} learner must not see French-only characters in an option`,
            );
          }
        } else {
          spanishChoiceCount += 1;
          assert.doesNotMatch(
            choice,
            FRENCH_ONLY_CHARS,
            `${item.id}: a bare string choice is a Spanish alternative, not a French gloss`,
          );
          assert.equal(
            activity.targetLanguage,
            "es",
            `${item.id}: Spanish alternatives only belong to Spanish-target activities`,
          );
          for (const locale of ["fr", "en", "es"] as const) {
            const resolved = resolveRdM2WorkbookChoice(choice, locale);
            assert.equal(resolved.isSpanishTarget, true, `${item.id}: Spanish alternative stays Spanish`);
            assert.equal(resolved.text, choice, `${item.id}: Spanish alternative is not translated`);
          }
        }
      }
    }
  }
}

assert.ok(scaffoldChoiceCount >= 30, `expected localized scaffold choices, got ${scaffoldChoiceCount}`);
assert.ok(spanishChoiceCount >= 15, `expected Spanish target alternatives, got ${spanishChoiceCount}`);
assert.match(
  componentSrc,
  /resolveRdM2WorkbookChoice/,
  "the renderer resolves choices through the localized helper",
);
assert.match(
  componentSrc,
  /resolved\.isSpanishTarget \? "es" : undefined/,
  "only Spanish alternatives are rendered lang=es",
);

// The exact French-only option strings shipped in V1 must be gone.
const V1_FRENCH_OPTIONS = [
  "lieu",
  "heure",
  "avoir quelque chose",
  "chercher un lieu",
  "dire merci",
  "demande polie",
  "ordre direct",
  "salutation",
  "sortie",
  "clé",
  "passeport",
  "mot de passe",
  "chambre",
  "déjeuner",
  "lentement",
  "dehors",
  "très vite",
  "très loin",
  "très cher",
  "par là",
  "demain",
  "maintenant",
];
const bareChoices = new Set(
  workbook.pages.flatMap((workbookPage) =>
    allItems(workbookPage).flatMap((item) =>
      (item.choices ?? []).filter((choice): choice is string => !isRdM2LocalizedChoice(choice)),
    ),
  ),
);
for (const frenchOption of V1_FRENCH_OPTIONS) {
  assert.equal(
    bareChoices.has(frenchOption),
    false,
    `French-only option "${frenchOption}" must not ship as an unlocalized choice`,
  );
}

// ─── 4. Page 1 states the real Can-Do outcomes ─────────────────────

const coverPage = page(1);
const canDoActivity = allActivities(coverPage).find((activity) => activity.kind === "can-do");
assert.ok(canDoActivity, "page 1 states the Module 2 outcomes");
assert.ok(
  (canDoActivity?.items?.length ?? 0) >= 8,
  "page 1 lists at least eight Can-Do outcomes",
);
for (const item of canDoActivity?.items ?? []) {
  assert.equal(item.responseLines, 0, `${item.id}: reading a Can-Do is not a learner response`);
}
assert.ok(
  countRdM2WorkbookPageResponses(coverPage) <= 3,
  "page 1 counts only the reflection prompts as responses",
);

// ─── 5. Capability descriptors, used twice for a before/after ──────

const diagnosticPage = page(2);
const reflectionPage = page(20);
const SCALE_MARKER = /0 = /;
const scaleNoteOn = (target: RdM2WorkbookPage) =>
  allActivities(target).flatMap((activity) => activity.notes ?? []).filter((note) => SCALE_MARKER.test(note.fr));

assert.ok(scaleNoteOn(diagnosticPage).length >= 1, "page 2 explains a 0-3 capability scale");
assert.ok(scaleNoteOn(reflectionPage).length >= 1, "page 20 reuses the same capability scale");
assert.deepEqual(
  scaleNoteOn(diagnosticPage)[0],
  scaleNoteOn(reflectionPage)[0],
  "before/after comparison requires an identical scale on pages 2 and 20",
);
for (const label of ["de 1 à 5", "from 1 to 5", "de 1 a 5"]) {
  assert.ok(!dataSrc.includes(label), `unexplained numeric confidence scale "${label}" is gone`);
}

const beforeIds = allItems(diagnosticPage)
  .filter((item) => item.id.startsWith("before-"))
  .map((item) => item.id.replace("before-", ""));
const afterIds = allItems(reflectionPage)
  .filter((item) => item.id.startsWith("after-"))
  .map((item) => item.id.replace("after-", ""));
assert.ok(beforeIds.length >= 8, "page 2 rates every outcome");
assert.deepEqual(beforeIds, afterIds, "pages 2 and 20 rate exactly the same outcomes");

// ─── 6. Listening lab points at the digital module, not a human ─────

const listeningPage = page(12);
const bridgeActivity = allActivities(listeningPage).find((activity) => activity.digitalPath);
assert.ok(bridgeActivity, "the listening lab links back to the digital module");
assert.match(
  bridgeActivity?.digitalPath ?? "",
  /republique-dominicaine\/module-2$/,
  "the printed path reaches the Module 2 digital experience",
);
assert.ok((bridgeActivity?.steps?.length ?? 0) >= 4, "the digital bridge gives step-by-step navigation");

const PARTNER_READ = /demande à quelqu'un|ask someone|pide a alguien/i;
assert.doesNotMatch(
  bridgeActivity?.instructions.fr ?? "",
  PARTNER_READ,
  "asking another person must not be the primary listening method",
);
assert.ok(
  (bridgeActivity?.notes ?? []).some((note) => PARTNER_READ.test(note.fr)),
  "a partner-read fallback is still offered, as a fallback",
);
assert.ok(
  (bridgeActivity?.notes ?? []).some((note) => /repli|fallback|respaldo/i.test(note.fr + note.en + (note.es ?? ""))),
  "the partner-read option is labelled as a fallback",
);

const listeningKinds = new Set(allActivities(listeningPage).map((activity) => activity.id));
assert.ok(listeningKinds.has("listening-dictation"), "the listening lab includes a short dictation");
assert.ok(listeningKinds.has("listening-shadow"), "the listening lab includes shadowing");
assert.ok(
  listeningPage.mechanics.includes("digital-listening"),
  "the listening lab declares the digital bridge mechanic",
);

// ─── 7. Dominican awareness: recognition first, safe production ─────

const awarenessPage = page(13);
const awarenessActivities = allActivities(awarenessPage);
assert.ok(awarenessActivities.length >= 3, "page 13 separates general, local, and safe-to-say");

const sectionTitles = awarenessActivities.map((activity) => activity.title.es ?? activity.title.fr);
assert.ok(
  sectionTitles.some((title) => /Español general/i.test(title)),
  "section A separates general Spanish",
);
assert.ok(
  sectionTitles.some((title) => /puedes oír|puedes oir/i.test(title)),
  "section B is what the learner may hear",
);
assert.ok(
  sectionTitles.some((title) => /puedes decir/i.test(title)),
  "section C is what a beginner can safely say",
);

const recognitionActivity = awarenessActivities.find((activity) => activity.id === "rd-may-hear");
assert.ok(recognitionActivity, "page 13 has a recognition-only section");
const recognitionCount = recognitionActivity?.items?.length ?? 0;
assert.ok(recognitionCount >= 5, `expected at least 5 recognition items, got ${recognitionCount}`);
assert.ok(recognitionCount <= 8, `slang overload: ${recognitionCount} recognition items`);

const recognitionNotes = (recognitionActivity?.notes ?? []).map(
  (note) => `${note.fr} ${note.en} ${note.es ?? ""}`,
);
assert.ok(
  recognitionNotes.some((note) => /comprendre|understanding|entender/i.test(note)),
  "the recognition-only warning is explicit",
);
assert.ok(
  recognitionNotes.some((note) => /uniforme|uniformly/i.test(note)),
  "page 13 must not claim every Dominican speaker uses the same forms",
);

const safeActivity = awarenessActivities.find((activity) => activity.id === "rd-safe-production");
assert.ok(safeActivity, "page 13 tells the learner what is safe to produce");
assert.ok((safeActivity?.items?.length ?? 0) >= 3, "at least three safe-production situations");
for (const item of safeActivity?.items ?? []) {
  assert.ok(item.choices?.length, `${item.id} offers Spanish alternatives to choose from`);
  for (const choice of item.choices ?? []) {
    assert.equal(
      isRdM2LocalizedChoice(choice),
      false,
      `${item.id}: safe-production options are Spanish, not glosses`,
    );
  }
}
// Regional vocabulary must be recognition only, never a required production answer.
for (const regional of ["guagua", "colmado", "motoconcho", "pa'"]) {
  const producedAsAnswer = workbook.pages
    .flatMap((workbookPage) => allItems(workbookPage))
    .filter((item) => item.answerKind !== "self" && (item.answer ?? "").includes(regional));
  assert.deepEqual(
    producedAsAnswer.map((item) => item.id),
    [],
    `"${regional}" must not be required beginner production`,
  );
}

// ─── 8. Page 14 is a real-world artifact with layered tasks ────────

const readingPage = page(14);
const artifact = allActivities(readingPage).find(
  (activity) => (activity.inputLines?.length ?? 0) >= 6,
);
assert.ok(artifact, "page 14 carries a substantial original artifact");
const artifactText = (artifact?.inputLines ?? []).join(" ");
assert.match(artifactText, /Buenas tardes/, "the artifact opens like a real message");
assert.match(artifactText, /conductor/, "the artifact contains a pickup instruction");
assert.match(artifactText, /habitación/, "the artifact contains check-in information");
assert.match(artifactText, /escriba a este número/, "the artifact contains a contact instruction");
assert.doesNotMatch(
  artifactText,
  /Hotel Coral Azul|marque 0 desde la habitación/,
  "the thin V1 hotel notice is replaced, not reused",
);

const readingKinds = new Set(allActivities(readingPage).map((activity) => activity.kind));
assert.ok(readingKinds.has("sequence"), "page 14 asks the learner to order the arrival");
assert.ok(readingKinds.has("writing"), "page 14 ends in production, not just lookup");
assert.ok(readingKinds.has("notice"), "page 14 asks the learner to infer vocabulary");
assert.ok(
  countRdM2WorkbookPageResponses(readingPage) >= 10,
  "page 14 progresses through several comprehension mechanics",
);

// ─── 9. Page 15 is a staged writing workshop ───────────────────────

const writingPage = page(15);
const writingIds = allActivities(writingPage).map((activity) => activity.id);
for (const stage of ["write-stage-1", "write-stage-2", "write-stage-3", "write-checklist"]) {
  assert.ok(writingIds.includes(stage), `page 15 includes ${stage}`);
}
const stageOne = allActivities(writingPage).find((activity) => activity.id === "write-stage-1");
assert.ok((stageOne?.inputLines?.length ?? 0) >= 4, "stage 1 gives a partially structured message");
assert.ok(
  (stageOne?.items ?? []).every((item) => item.answerKind === "objective"),
  "stage 1 blanks are objectively correctable",
);
const stageTwo = allActivities(writingPage).find((activity) => activity.id === "write-stage-2");
assert.ok((stageTwo?.items?.length ?? 0) >= 3, "stage 2 manipulates name, problem, and action");
const stageThree = allActivities(writingPage).find((activity) => activity.id === "write-stage-3");
assert.ok(
  (stageThree?.items ?? []).some((item) => (item.responseLines ?? 0) >= 5),
  "stage 3 gives room for an independent message",
);
const checklist = allActivities(writingPage).find((activity) => activity.id === "write-checklist");
assert.ok((checklist?.items?.length ?? 0) >= 5, "page 15 gives the learner a checklist");
for (const item of checklist?.items ?? []) {
  assert.equal(item.responseLines, 0, `${item.id}: a checklist tick is not a written response`);
}
assert.match(
  checklist?.instructions.fr ?? "",
  /page 20/,
  "the model stays hidden until page 20",
);

// ─── 10. Page 16 is transfer, not a fourth hotel check-in ──────────

const speakingPage = page(16);
const missionText = scaffoldText(speakingPage).join(" ");
assert.match(missionText, /batterie|battery|batería/i, "the mission uses the dying-battery pressure");
assert.match(missionText, /chauffeur|driver|conductor/i, "the mission is a driver-cannot-find-you call");
assert.doesNotMatch(
  speakingPage.title.fr + speakingPage.purpose.fr,
  /check-in/i,
  "page 16 is not another hotel check-in",
);
const brief = allActivities(speakingPage).find((activity) => activity.id === "mission-brief");
assert.ok((brief?.steps?.length ?? 0) >= 7, "the mission names all seven communicative moves");
assert.equal(brief?.items, undefined, "the mission brief gives no script to copy");

const plan = allActivities(speakingPage).find((activity) => activity.id === "mission-plan");
assert.ok((plan?.items?.length ?? 0) >= 7, "the learner plans keywords, opening, location, and closing");
for (const item of plan?.items ?? []) {
  assert.ok(
    (item.responseLines ?? 1) <= 1,
    `${item.id}: planning fields stay one line so they cannot become a script`,
  );
}
const perform = allActivities(speakingPage).find((activity) => activity.id === "mission-perform");
assert.match(
  perform?.instructions.fr ?? "",
  /sans lire/i,
  "the learner performs without reading",
);
assert.ok(
  (perform?.notes ?? []).some((note) => /1 = .*2 = .*3 = /.test(note.en)),
  "the self-rating uses the 1-3 notes/keywords/independent descriptors",
);
assert.ok(
  speakingPage.mechanics.includes("transfer-task"),
  "page 16 declares itself a transfer task",
);

// ─── 11. Page 17 is mixed cumulative retrieval ─────────────────────

const cumulativePage = page(17);
const cumulativeItems = allItems(cumulativePage);
assert.ok(
  cumulativeItems.length >= 20,
  `expected 20-24 cumulative items, got ${cumulativeItems.length}`,
);
assert.ok(
  cumulativeItems.length <= 26,
  `page 17 should stay a single page of work, got ${cumulativeItems.length} items`,
);

const cumulativeKinds = new Set(allActivities(cumulativePage).map((activity) => activity.kind));
for (const kind of ["translation", "match", "error-correction", "choice", "reading", "writing", "notice"]) {
  assert.ok(cumulativeKinds.has(kind as RdM2WorkbookActivity["kind"]), `page 17 uses the ${kind} mechanic`);
}
assert.ok(cumulativeKinds.size >= 6, "page 17 mixes at least six mechanics");

const translationOnly = allActivities(cumulativePage)
  .filter((activity) => activity.kind === "translation")
  .flatMap((activity) => activity.items ?? []).length;
assert.ok(
  translationOnly < cumulativeItems.length / 2,
  "page 17 must not be mostly translation of isolated words",
);
assert.ok(
  allActivities(cumulativePage).some((activity) => (activity.inputLines?.length ?? 0) >= 2),
  "page 17 includes a tiny reading",
);
assert.ok(
  cumulativePage.mechanics.includes("sociolinguistic-awareness"),
  "page 17 recycles one Dominican-awareness recognition item",
);

// ─── 12. Page 18 is a four-domain performance check ────────────────

const assessmentPage = page(18);
const assessmentTitles = allActivities(assessmentPage).map(
  (activity) => activity.title.es ?? activity.title.fr,
);
for (const domain of ["COMPRENDO", "RECUERDO", "PRODUZCO", "RESUELVO"]) {
  assert.ok(
    assessmentTitles.some((title) => title.includes(domain)),
    `page 18 contains the ${domain} domain`,
  );
}

const comprendo = allActivities(assessmentPage).find((activity) => activity.id === "assess-comprendo");
assert.ok((comprendo?.inputLines?.length ?? 0) >= 4, "COMPRENDO supplies new input");
assert.ok((comprendo?.items?.length ?? 0) >= 4, "COMPRENDO asks 4-5 comprehension items");

// The assessment input must be genuinely new, not recycled from earlier pages.
const earlierInput = workbook.pages
  .filter((workbookPage) => workbookPage.pageNumber < 18)
  .flatMap((workbookPage) => allActivities(workbookPage).flatMap((activity) => [...(activity.inputLines ?? [])]));
for (const line of comprendo?.inputLines ?? []) {
  assert.equal(
    earlierInput.includes(line),
    false,
    `COMPRENDO input must be unseen: "${line}"`,
  );
}

const recuerdo = allActivities(assessmentPage).find((activity) => activity.id === "assess-recuerdo");
assert.ok((recuerdo?.items?.length ?? 0) >= 6, "RECUERDO asks 6-8 recall prompts");
for (const item of recuerdo?.items ?? []) {
  assert.equal(item.choices, undefined, `${item.id}: RECUERDO offers no word bank`);
}
assert.doesNotMatch(
  recuerdo?.instructions.fr ?? "",
  /banque de mots\s*:/i,
  "RECUERDO gives no word bank",
);

const produzco = allActivities(assessmentPage).find((activity) => activity.id === "assess-produzco");
assert.equal((produzco?.items ?? []).length, 3, "PRODUZCO has exactly three production tasks");

const resuelvo = allActivities(assessmentPage).find((activity) => activity.id === "assess-resuelvo");
assert.ok((resuelvo?.items?.length ?? 0) >= 4, "RESUELVO integrates a full sequence");
const resuelvoText = (resuelvo?.items ?? []).map((item) => item.prompt.en).join(" ");
for (const stage of [/Airport/i, /transport/i, /Hotel/i, /problem/i]) {
  assert.match(resuelvoText, stage, "RESUELVO covers airport, transport, hotel, and a problem");
}

const review = allActivities(assessmentPage).find((activity) => activity.id === "assess-review");
const reviewNotes = (review?.notes ?? []).map((note) => `${note.fr} ${note.en} ${note.es ?? ""}`).join(" ");
assert.match(reviewNotes, /10\s*(à|-|a)\s*12/, "the rubric gives a concrete strong band");
assert.match(reviewNotes, /solide|solid|sólido/i, "the rubric names a strong band");
assert.match(reviewNotes, /progrès|developing|progreso/i, "the rubric names a developing band");
assert.match(reviewNotes, /renforcer|reinforcement|reforzar/i, "the rubric names a reinforcement band");
assert.match(
  reviewNotes,
  /aucune certification|does not issue any official|ninguna certificación/i,
  "the workbook must not imply it certifies a CEFR level",
);
assert.doesNotMatch(
  reviewNotes,
  /\bA1\b/,
  "the performance check must not claim to certify A1",
);

// ─── 13. Difficulty curve ──────────────────────────────────────────

for (const pageNumber of [1, 2, 3]) {
  assert.equal(page(pageNumber).supportLevel, "guided", `page ${pageNumber} is guided orientation`);
}
for (const pageNumber of [15, 16, 17, 18]) {
  assert.equal(
    page(pageNumber).supportLevel,
    "independent",
    `page ${pageNumber} is independent work`,
  );
}
for (const pageNumber of [19, 20]) {
  assert.equal(page(pageNumber).supportLevel, "solutions", `page ${pageNumber} is solutions`);
}
for (const workbookPage of workbook.pages) {
  if (workbookPage.pageNumber > 14 && workbookPage.pageNumber < 19) {
    assert.notEqual(
      workbookPage.supportLevel,
      "guided",
      `page ${workbookPage.pageNumber} must not fall back to guided support before the assessment`,
    );
  }
}

// ─── 14. Adult tone in learner-facing scaffolding ──────────────────

const CHILDISH = /\b(magique|magic|mágico|bravo|super\s*star|yay|hourra|hooray|oups)\b/i;
for (const workbookPage of workbook.pages) {
  for (const text of scaffoldText(workbookPage)) {
    assert.doesNotMatch(text, CHILDISH, `page ${workbookPage.pageNumber} keeps an adult register: "${text}"`);
    assert.ok(
      (text.match(/!/g) ?? []).length === 0,
      `page ${workbookPage.pageNumber} avoids exclamation marks in instructions: "${text}"`,
    );
  }
}

// ─── 15. Reinforcement without pointless repetition ────────────────

// Repeating a phrase is reinforcement when the cognitive demand changes
// (recognize, then recall, then manipulate, then transfer) and mere copying
// when it does not. So the audit is on demand, not on text frequency.
type PhraseUse = { pageNumber: number; activityKind: string };
const spanishUses = new Map<string, PhraseUse[]>();
const noteUse = (phrase: string, use: PhraseUse) => {
  spanishUses.set(phrase, [...(spanishUses.get(phrase) ?? []), use]);
};
for (const workbookPage of workbook.pages) {
  for (const activity of allActivities(workbookPage)) {
    const use = { pageNumber: workbookPage.pageNumber, activityKind: activity.kind };
    for (const line of activity.inputLines ?? []) noteUse(line, use);
    for (const item of activity.items ?? []) {
      for (const value of [item.target, item.answer]) {
        if (value) noteUse(value, use);
      }
    }
  }
}

const repetitionProblems: string[] = [];
for (const [phrase, uses] of spanishUses) {
  if (uses.length <= 3) continue;
  if (uses.length > 6) {
    repetitionProblems.push(`${phrase} appears ${uses.length}x, which is copying rather than recycling`);
    continue;
  }
  const distinctKinds = new Set(uses.map((use) => use.activityKind)).size;
  if (distinctKinds < 3) {
    repetitionProblems.push(
      `${phrase} appears ${uses.length}x across only ${distinctKinds} activity kind(s): the demand never changes`,
    );
  }
}
assert.deepEqual(repetitionProblems, [], "repeated phrases must carry changing cognitive demand");

console.log(
  `[yo:dominican-m2-workbook-pedagogy] assertions passed — ${derivedTotal} responses, ` +
    `${objectiveRefs.length} objective + ${modelRefs.length} model answers, ` +
    `${selfItems.length} self-assessed, 0 dangling refs`,
);
