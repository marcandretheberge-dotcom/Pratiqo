/**
 * YoPratiqo — Quebec French / Premium Module 1 · Lesson 2 audio
 * coverage regression suite.
 *
 * Style: `node:test`-style ad-hoc runner with `assert`. Mirrors the
 * Lesson 1 audio test layout — mixes runtime manifest inspection
 * (every Lesson 2 audio target string resolves through the
 * contextual lookup helper) with static-source sniffs of the
 * modified shell + button + manifest data so we cover both data
 * and frontend wiring.
 *
 * Hard safety contract enforced here:
 *
 *   - Pre-generated audio ONLY. The new manifest data file + the
 *     modified shell never import the openai SDK, never call OpenAI
 *     at runtime, never read server-only secrets, and never reach
 *     for `MediaRecorder` / `getUserMedia` / `navigator.mediaDevices`.
 *   - NO checkout / payment / Stripe / Supabase schema / RLS /
 *     migrations / booking / Membre Pro / commission / teacher-
 *     dashboard / live legal pages in any modified file.
 *   - The Lesson 1 manifest stays BYTE-IDENTICAL — length pinned at
 *     25 items, plus two representative item ids / paths.
 *   - English / Spanish glosses NEVER receive a `YoFrenchAudioButton`
 *     — only Quebec French target text does. The new manifest data
 *     contains no entry whose `text` matches a known Lesson 2 EN/ES
 *     gloss field.
 *   - No MP3 binary files are added by this PR (only the manifest
 *     metadata; the offline generator script materialises the audio).
 *   - The MP3 generation script remains server-only and is never
 *     imported by manifest data or tests.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  YOPRATIQO_AUDIO_MANIFEST,
  YOPRATIQO_AUDIO_ROOT_PREFIX,
  findAudioItemForContext,
} from "@/lib/yo/audio/audioManifest";
import { frQuebecPremiumLessonOneAudio } from "@/lib/yo/audio/frQuebecPremiumLessonOneAudio";
import { frQuebecPremiumLessonTwoAudio } from "@/lib/yo/audio/frQuebecPremiumLessonTwoAudio";
import { frQuebecWorkplaceSurvivalModule } from "@/lib/yo/frQuebecWorkplaceSurvivalModule";
import type { FrQuebecLessonTwoContent } from "@/lib/yo/frQuebecWorkplaceSurvivalModule";

// ─── Test runner ──────────────────────────────────────────────────

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

/**
 * Strip JS comments before scanning code for forbidden patterns —
 * mirrors the helper used by the Lesson 1 audio suite. A doc comment
 * that explicitly names a forbidden concept (e.g. "no MediaRecorder")
 * must never falsely trip a regex meant to detect real code.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const SHELL_PATH = "components/yo/YoPremiumModuleShell.tsx";
const BUTTON_PATH = "components/yo/YoFrenchAudioButton.tsx";
const LESSON_ONE_DATA_PATH = "lib/yo/audio/frQuebecPremiumLessonOneAudio.ts";
const LESSON_TWO_DATA_PATH = "lib/yo/audio/frQuebecPremiumLessonTwoAudio.ts";
const SCRIPT_PATH = "scripts/generate-yopratiqo-audio.ts";

const shellSrc = read(SHELL_PATH);
const shellNoComments = stripComments(shellSrc);
const buttonSrc = read(BUTTON_PATH);
const buttonNoComments = stripComments(buttonSrc);
const lessonTwoDataSrc = read(LESSON_TWO_DATA_PATH);
const lessonTwoDataNoComments = stripComments(lessonTwoDataSrc);

// ─── Canonical context ────────────────────────────────────────────

const ACCENT_PROFILE_ID = "quebec_french" as const;
const MODULE_ID = "fr-quebec-workplace-survival-1" as const;
const LESSON_ID = "comprendre-consignes-simples" as const;

// ─── Target audio strings (these are the manifest's own catalogue,
// not the lesson-content strings — they must be addressable via the
// contextual lookup helper). ──────────────────────────────────────

const ORAL_MARKER_TARGETS: readonly string[] = [
  "Pis",
  "Tiens.",
  "Tenez.",
  "Tiens / Tenez",
  "Là.",
  "Tantôt.",
];

const IMPERATIVE_TARGETS: readonly string[] = [
  "Mets.",
  "Mettez.",
  "Prends.",
  "Prenez.",
  "Apporte.",
  "Apportez.",
  "Range.",
  "Rangez.",
  "Ouvre.",
  "Ouvrez.",
  "Ferme.",
  "Fermez.",
  "Signe.",
  "Signez.",
  "Remplis.",
  "Remplissez.",
  "Vérifie.",
  "Vérifiez.",
  "Envoie.",
  "Envoyez.",
  "Imprime.",
  "Imprimez.",
  "Appelle.",
  "Appelez.",
];

const CONFIRMATION_TARGETS: readonly string[] = [
  "Parfait.",
  "OK, c\u2019est bon.",
  "D\u2019accord, je m\u2019en occupe.",
  "Pas de problème.",
  "Compris.",
  "Oui, parfait.",
  "Oui, c\u2019est bon.",
  "Oui, je m\u2019en occupe.",
];

const REFORMULATION_TARGETS: readonly string[] = [
  "Excuse-moi, t\u2019as dit quoi pour [X] ?",
  "Pardon, peux-tu redire la dernière partie ?",
  "Attends — la boîte sur l\u2019étagère, c\u2019est ça ?",
  "Je veux juste m\u2019assurer — c\u2019est avant ou après la pause ?",
  "Désolé, je veux être sûr de bien faire — peux-tu reprendre depuis le début ?",
];

const MINI_SCENARIO_TARGETS: readonly string[] = [
  "OK, là tu prends la boîte rouge dans l\u2019entrepôt, tu la mets sur l\u2019étagère 3, pis tu signes le formulaire dans le bureau de Sophie avant midi.",
  "Attends — l\u2019étagère 3, c\u2019est en haut ou en bas ?",
  "En haut, sur la tablette du milieu.",
  "Parfait, c\u2019est bon. La boîte rouge sur l\u2019étagère 3 du haut, et je signe le formulaire chez Sophie avant midi.",
  "Exactement.",
];

const ALL_LESSON_TWO_TARGETS: readonly string[] = [
  ...ORAL_MARKER_TARGETS,
  ...IMPERATIVE_TARGETS,
  ...CONFIRMATION_TARGETS,
  ...REFORMULATION_TARGETS,
  ...MINI_SCENARIO_TARGETS,
];

// ─── 1. Manifest exposes Lesson 2 audio entries with the right shape ─

test("Lesson 2 audio manifest exports a non-empty list with the expected shape", () => {
  assert.ok(
    Array.isArray(frQuebecPremiumLessonTwoAudio),
    "frQuebecPremiumLessonTwoAudio must be an array",
  );
  assert.ok(
    frQuebecPremiumLessonTwoAudio.length > 0,
    "Lesson 2 audio manifest must contain at least one entry",
  );
  // Group A (6) + Group B (24) + Group C (3) + Group D (8) +
  // Group E (5) + Group F (5) = 51 items.
  assert.equal(
    frQuebecPremiumLessonTwoAudio.length,
    51,
    `expected 51 Lesson 2 audio items (A:6 + B:24 + C:3 + D:8 + E:5 + F:5), got ${frQuebecPremiumLessonTwoAudio.length}`,
  );
});

// ─── 2. Every Lesson 2 entry declares the canonical triple ──────

test("every Lesson 2 audio entry declares moduleId / lessonId / accentProfile / targetLanguage", () => {
  for (const item of frQuebecPremiumLessonTwoAudio) {
    assert.equal(
      item.moduleId,
      MODULE_ID,
      `entry ${item.id} must declare moduleId="${MODULE_ID}"`,
    );
    assert.equal(
      item.lessonId,
      LESSON_ID,
      `entry ${item.id} must declare lessonId="${LESSON_ID}"`,
    );
    assert.equal(
      item.accentProfile,
      ACCENT_PROFILE_ID,
      `entry ${item.id} must declare accentProfile="${ACCENT_PROFILE_ID}"`,
    );
    assert.equal(
      item.targetLanguage,
      "fr",
      `entry ${item.id} must declare targetLanguage="fr"`,
    );
    assert.match(
      item.id,
      /^fr-fqp-m1l2-(?:phrase|sentence)-[a-z0-9-]+$/,
      `id ${item.id} must follow fr-fqp-m1l2-<type>-<slug>`,
    );
  }
});

// ─── 3. Every Quebec oral marker target resolves ────────────────

test("every Quebec oral marker (Pis / Tiens. / Tenez. / Tiens / Tenez / Là. / Tantôt.) resolves via findAudioItemForContext", () => {
  for (const text of ORAL_MARKER_TARGETS) {
    const item = findAudioItemForContext({
      text,
      moduleId: MODULE_ID,
      lessonId: LESSON_ID,
      accentProfile: ACCENT_PROFILE_ID,
    });
    assert.ok(
      item,
      `manifest must resolve a Quebec French entry for oral marker "${text}"`,
    );
  }
});

// ─── 4. Every imperative form resolves (24 strings) ─────────────

test("every key-verb imperative (24 strings: tu + vous for each of 12 verbs) resolves via findAudioItemForContext", () => {
  for (const text of IMPERATIVE_TARGETS) {
    const item = findAudioItemForContext({
      text,
      moduleId: MODULE_ID,
      lessonId: LESSON_ID,
      accentProfile: ACCENT_PROFILE_ID,
    });
    assert.ok(
      item,
      `manifest must resolve a Quebec French entry for imperative "${text}"`,
    );
  }
});

// ─── 5. Every confirmation formula resolves (8 strings) ─────────

test("every confirmation formula (8 strings) resolves via findAudioItemForContext", () => {
  for (const text of CONFIRMATION_TARGETS) {
    const item = findAudioItemForContext({
      text,
      moduleId: MODULE_ID,
      lessonId: LESSON_ID,
      accentProfile: ACCENT_PROFILE_ID,
    });
    assert.ok(
      item,
      `manifest must resolve a Quebec French entry for confirmation formula "${text}"`,
    );
  }
});

// ─── 6. Every reformulation formula resolves (5 strings) ────────

test("every reformulation formula (5 strings) resolves via findAudioItemForContext", () => {
  for (const text of REFORMULATION_TARGETS) {
    const item = findAudioItemForContext({
      text,
      moduleId: MODULE_ID,
      lessonId: LESSON_ID,
      accentProfile: ACCENT_PROFILE_ID,
    });
    assert.ok(
      item,
      `manifest must resolve a Quebec French entry for reformulation formula "${text}"`,
    );
  }
});

// ─── 7. Every mini-scenario line resolves (5 strings) ───────────

test("every mini-scenario line (5 strings) resolves via findAudioItemForContext", () => {
  for (const text of MINI_SCENARIO_TARGETS) {
    const item = findAudioItemForContext({
      text,
      moduleId: MODULE_ID,
      lessonId: LESSON_ID,
      accentProfile: ACCENT_PROFILE_ID,
    });
    assert.ok(
      item,
      `manifest must resolve a Quebec French entry for mini-scenario line "${text}"`,
    );
  }
});

// ─── 8. Storage paths are deterministic + ASCII-safe ───────────

test("Lesson 2 manifest items use deterministic, ASCII-safe storage paths inside the yo/ prefix", () => {
  const expectedPrefix = `${YOPRATIQO_AUDIO_ROOT_PREFIX}/fr/${MODULE_ID}/${LESSON_ID}/quebec-french/`;
  for (const item of frQuebecPremiumLessonTwoAudio) {
    assert.ok(
      item.storagePath.startsWith(expectedPrefix),
      `storagePath "${item.storagePath}" must start with "${expectedPrefix}"`,
    );
    assert.ok(
      item.storagePath.endsWith(".mp3"),
      `storagePath "${item.storagePath}" must end in .mp3`,
    );
    assert.equal(
      item.storagePath,
      item.storagePath.toLowerCase(),
      `storagePath "${item.storagePath}" must be lowercase`,
    );
    assert.ok(
      !item.storagePath.startsWith("/"),
      `storagePath "${item.storagePath}" must not start with a leading slash`,
    );
    assert.ok(
      !/\s/.test(item.storagePath),
      `storagePath "${item.storagePath}" must not contain whitespace`,
    );
    // ASCII-only — catches diacritics, curly apostrophes, underscores
    // and any other character that would break Supabase Storage paths.
    assert.ok(
      /^[a-z0-9/.\-]+$/.test(item.storagePath),
      `storagePath "${item.storagePath}" must be ASCII-safe (a-z, 0-9, /, ., -)`,
    );
  }
});

// ─── 9. No duplicate ids / paths suite-wide ─────────────────────

test("the entire manifest has no duplicate ids or storage paths after wiring Lesson 2", () => {
  const seenIds = new Set<string>();
  const seenPaths = new Set<string>();
  for (const item of YOPRATIQO_AUDIO_MANIFEST) {
    assert.ok(
      !seenIds.has(item.id),
      `duplicate manifest id "${item.id}" (must be unique suite-wide)`,
    );
    seenIds.add(item.id);
    assert.ok(
      !seenPaths.has(item.storagePath),
      `duplicate manifest storagePath "${item.storagePath}" (must be unique suite-wide)`,
    );
    seenPaths.add(item.storagePath);
  }
});

// ─── 10. Lesson 1 manifest stays BYTE-IDENTICAL ────────────────

test("Lesson 1 audio manifest stays unchanged (count + representative anchors)", () => {
  assert.equal(
    frQuebecPremiumLessonOneAudio.length,
    25,
    `Lesson 1 audio must remain exactly 25 items (14 core + 11 unique dialogue lines); got ${frQuebecPremiumLessonOneAudio.length}`,
  );
  // Two representative anchors — one core phrase, one dialogue line —
  // detect any accidental edit to the Lesson 1 data file.
  const salutCaVa = frQuebecPremiumLessonOneAudio.find(
    (item) => item.id === "fr-fqp-m1l1-phrase-salut-ca-va",
  );
  assert.ok(
    salutCaVa,
    `Lesson 1 must still ship "fr-fqp-m1l1-phrase-salut-ca-va"`,
  );
  assert.equal(
    salutCaVa!.storagePath,
    "yo/fr/fr-quebec-workplace-survival-1/arriver-saluer/quebec-french/phrase/salut-ca-va.mp3",
    "Lesson 1 storage path for « Salut, ça va ? » must remain byte-identical",
  );
  const dResponsableL1 = frQuebecPremiumLessonOneAudio.find(
    (item) =>
      item.id ===
      "fr-fqp-m1l1-sentence-d-responsable-l1-je-suis-marie-la-responsable",
  );
  assert.ok(
    dResponsableL1,
    `Lesson 1 must still ship the d-responsable line 1 anchor`,
  );
  assert.equal(
    dResponsableL1!.storagePath,
    "yo/fr/fr-quebec-workplace-survival-1/arriver-saluer/quebec-french/sentence/d-responsable-l1-je-suis-marie-la-responsable.mp3",
    "Lesson 1 storage path for the d-responsable line 1 must remain byte-identical",
  );
});

// ─── 11. No EN / ES gloss strings appear as audio target text ───

test("no Lesson 2 audio entry's text equals a known EN / ES gloss from the lesson content", () => {
  const lesson = frQuebecWorkplaceSurvivalModule.lessons[1];
  assert.ok(lesson?.content, "Lesson 2 must carry content (sanity check)");
  assert.equal(lesson!.content!.kind, "lesson2");
  const content = lesson!.content as FrQuebecLessonTwoContent;

  // Collect every EN / ES gloss-shaped string from Lesson 2 content.
  const glossStrings = new Set<string>();
  const add = (s: string | undefined) => {
    if (s && s.length > 0) glossStrings.add(s);
  };
  add(content.beforeYouStartEn);
  add(content.beforeYouStartEs);
  for (const skill of content.microSkills) {
    add(skill.labelEn);
    add(skill.labelEs);
    add(skill.hintEn);
    add(skill.hintEs);
  }
  for (const verb of content.keyVerbs) {
    add(verb.glossEn);
    add(verb.glossEs);
    add(verb.exampleGlossEn);
    add(verb.exampleGlossEs);
  }
  for (const marker of content.oralMarkers) {
    add(marker.meaningEn);
    add(marker.meaningEs);
    add(marker.exampleGlossEn);
    add(marker.exampleGlossEs);
  }
  for (const formula of content.confirmationFormulas) {
    add(formula.glossEn);
    add(formula.glossEs);
  }
  for (const formula of content.reformulationFormulas) {
    add(formula.glossEn);
    add(formula.glossEs);
  }
  for (const line of content.miniScenario.lines) {
    add(line.english);
    add(line.spanish);
  }
  for (const question of content.quizQuestions) {
    add(question.promptEn);
    add(question.promptEs);
    add(question.explanationEn);
    add(question.explanationEs);
    for (const option of question.options) {
      if (option.glossEn) add(option.glossEn);
      if (option.glossEs) add(option.glossEs);
    }
  }
  for (const card of content.flashcards) {
    add(card.backEn);
    add(card.backEs);
  }
  add(content.teacherCta.promptEn);
  add(content.teacherCta.promptEs);
  add(content.nextLessonTeaser.teaserEn);
  add(content.nextLessonTeaser.teaserEs);

  for (const item of frQuebecPremiumLessonTwoAudio) {
    assert.ok(
      !glossStrings.has(item.text),
      `Lesson 2 audio entry "${item.id}" text "${item.text}" must NOT match any Lesson 2 EN/ES gloss`,
    );
  }
});

// ─── 12. No runtime TTS / mic / OpenAI in new manifest data or shell ─

test("new manifest data file + modified shell never reference openai SDK / OPENAI_API_KEY / MediaRecorder / getUserMedia / navigator.mediaDevices", () => {
  const forbidden: ReadonlyArray<[RegExp, string]> = [
    [/from\s+["']openai["']/, "openai SDK import"],
    [/require\(['"]openai['"]\)/, "openai require()"],
    [/process\.env\.OPENAI_API_KEY/, "OPENAI_API_KEY runtime read"],
    [/MediaRecorder/, "MediaRecorder"],
    [/getUserMedia/, "getUserMedia"],
    [/navigator\.mediaDevices/, "navigator.mediaDevices"],
    [/api\.openai\.com/, "api.openai.com endpoint"],
  ];
  for (const [label, src] of [
    ["YoPremiumModuleShell", shellNoComments],
    ["YoFrenchAudioButton", buttonNoComments],
    ["Lesson 2 audio data", lessonTwoDataNoComments],
  ] as const) {
    for (const [re, ruleLabel] of forbidden) {
      assert.ok(
        !re.test(src),
        `${label} must NOT reference ${ruleLabel} (${re})`,
      );
    }
  }
});

// ─── 13. Modified files never import payments / Stripe / Supabase / RLS /
//         booking / Membre Pro / commission / live legal pages.

test("modified files never import payment / Stripe / Supabase / RLS / migrations / booking / Membre Pro / commission / live-legal-page code", () => {
  const forbidden: ReadonlyArray<[RegExp, string]> = [
    [/\bstripe\b/i, "Stripe"],
    [/@\/lib\/payments/, "payments lib"],
    [/getSupabaseClient|getSupabaseAdmin|@\/lib\/supabase/, "Supabase client"],
    [/supabase\/migrations/, "Supabase migrations"],
    [/\bRLS\b/, "RLS reference"],
    [/@\/components\/BookingModal|@\/lib\/booking/, "Booking modal/lib"],
    [/\bmembrePro\b|\bMembrePro\b|\bmembre_pro\b/, "Membre Pro config"],
    [/\bcommission\b/i, "commission math"],
    [/\bcheckout\b/i, "checkout"],
    [/\bpaywall\b/i, "paywall"],
    [/\bpaid_module\b/i, "paid_module identifier"],
    [/@\/app\/(?:conditions|cookies|confidentialite)/, "live legal pages"],
  ];
  for (const file of [SHELL_PATH, BUTTON_PATH, LESSON_TWO_DATA_PATH]) {
    const src = stripComments(read(file));
    for (const [re, label] of forbidden) {
      assert.ok(
        !re.test(src),
        `${file} must NOT reference ${label} (${re}) — out of scope for this PR`,
      );
    }
  }
});

// ─── 14. Shell renders YoFrenchAudioButton inside LessonTwoPreview ──

test("YoPremiumModuleShell renders YoFrenchAudioButton inside its LessonTwoPreview function", () => {
  assert.match(
    shellSrc,
    /import\s*\{\s*YoFrenchAudioButton\s*\}\s*from\s*"@\/components\/yo\/YoFrenchAudioButton"/,
    "shell must import YoFrenchAudioButton",
  );
  // Locate the LessonTwoPreview function body — non-greedy capture
  // up to the closing brace at column 0.
  const lessonTwoBlock = shellSrc.match(
    /function\s+LessonTwoPreview\s*\([\s\S]*?\n\}\n/,
  );
  assert.ok(
    lessonTwoBlock,
    "shell must define a LessonTwoPreview function",
  );
  assert.match(
    lessonTwoBlock![0]!,
    /<YoFrenchAudioButton\b/,
    "LessonTwoPreview must render at least one <YoFrenchAudioButton ... />",
  );
  // The button props must wire the canonical Lesson 2 audio context
  // via the shared constants.
  assert.match(
    lessonTwoBlock![0]!,
    /moduleId=\{LESSON_TWO_AUDIO_MODULE_ID\}/,
    "LessonTwoPreview YoFrenchAudioButton must wire moduleId={LESSON_TWO_AUDIO_MODULE_ID}",
  );
  assert.match(
    lessonTwoBlock![0]!,
    /lessonId=\{LESSON_TWO_AUDIO_LESSON_ID\}/,
    "LessonTwoPreview YoFrenchAudioButton must wire lessonId={LESSON_TWO_AUDIO_LESSON_ID}",
  );
  assert.match(
    lessonTwoBlock![0]!,
    /accentProfile=\{LESSON_TWO_AUDIO_ACCENT_PROFILE\}/,
    "LessonTwoPreview YoFrenchAudioButton must wire accentProfile={LESSON_TWO_AUDIO_ACCENT_PROFILE}",
  );
});

// ─── 15. YoFrenchAudioButton is never bound to EN / ES gloss text in
//         the modified shell.

test("YoFrenchAudioButton is never bound to EN / ES gloss accessors in the shell", () => {
  // Same approach as the Lesson 1 audio suite — comments stripped
  // first so a doc-comment that mentions the forbidden binding does
  // not falsely match.
  const forbiddenBindings: ReadonlyArray<[RegExp, string]> = [
    [
      /<YoFrenchAudioButton[\s\S]{0,200}?text=\{[^}]*\.glossEn[^}]*\}/,
      "glossEn accessor",
    ],
    [
      /<YoFrenchAudioButton[\s\S]{0,200}?text=\{[^}]*\.glossEs[^}]*\}/,
      "glossEs accessor",
    ],
    [
      /<YoFrenchAudioButton[\s\S]{0,200}?text=\{[^}]*option\.glossEn[^}]*\}/,
      "option.glossEn accessor",
    ],
    [
      /<YoFrenchAudioButton[\s\S]{0,200}?text=\{[^}]*option\.glossEs[^}]*\}/,
      "option.glossEs accessor",
    ],
    [
      /<YoFrenchAudioButton[\s\S]{0,200}?text=\{[^}]*\.english[^}]*\}/,
      "line.english accessor",
    ],
    [
      /<YoFrenchAudioButton[\s\S]{0,200}?text=\{[^}]*\.spanish[^}]*\}/,
      "line.spanish accessor",
    ],
    [
      /<YoFrenchAudioButton[\s\S]{0,200}?text=\{[^}]*\.backEn[^}]*\}/,
      "flashcard backEn accessor",
    ],
    [
      /<YoFrenchAudioButton[\s\S]{0,200}?text=\{[^}]*\.backEs[^}]*\}/,
      "flashcard backEs accessor",
    ],
    [
      /<YoFrenchAudioButton[\s\S]{0,200}?text=\{[^}]*\.promptEn[^}]*\}/,
      "promptEn accessor",
    ],
    [
      /<YoFrenchAudioButton[\s\S]{0,200}?text=\{[^}]*\.promptEs[^}]*\}/,
      "promptEs accessor",
    ],
    [
      /<YoFrenchAudioButton[\s\S]{0,200}?text=\{[^}]*\.meaningEn[^}]*\}/,
      "meaningEn accessor",
    ],
    [
      /<YoFrenchAudioButton[\s\S]{0,200}?text=\{[^}]*\.meaningEs[^}]*\}/,
      "meaningEs accessor",
    ],
  ];
  for (const [re, label] of forbiddenBindings) {
    assert.ok(
      !re.test(shellNoComments),
      `shell must NOT render <YoFrenchAudioButton> bound to ${label}`,
    );
  }
});

// ─── 16. No MP3 binary files added to the new manifest data file ───

test("the new Lesson 2 manifest data file ships zero MP3 binaries and references no .mp3 outside the storagePath builder output", () => {
  // The data file contains only path STRINGS that end in `.mp3` — it
  // never imports / requires / references a local .mp3 binary. Catch
  // any accidental `require("./foo.mp3")` or `import "./foo.mp3"`
  // pattern.
  assert.ok(
    !/from\s+["'][^"']+\.mp3["']/.test(lessonTwoDataNoComments),
    "Lesson 2 audio data file must not import an .mp3 binary",
  );
  assert.ok(
    !/require\(\s*['"][^'"]+\.mp3['"]\s*\)/.test(lessonTwoDataNoComments),
    "Lesson 2 audio data file must not require() an .mp3 binary",
  );
  // The only `.mp3` mentions allowed are the dynamic storage paths
  // produced by `buildStoragePath` at item-construction time —
  // verified by checking every materialised storagePath ends in
  // `.mp3` (covered in assertion 8) and that the data file itself
  // contains no static `.mp3` literal.
  assert.ok(
    !/["'][^"']*\.mp3["']/.test(lessonTwoDataNoComments),
    "Lesson 2 audio data file must not contain a static .mp3 literal — paths come from buildStoragePath",
  );
});

// ─── 17. The MP3 generation script is server-only and not imported ─

test("the audio generation script remains server-only and is not imported by the manifest data file or test suite", () => {
  // (a) The new manifest data file must NOT import the generator.
  assert.ok(
    !/@\/scripts\/generate-yopratiqo-audio/.test(lessonTwoDataSrc),
    "Lesson 2 audio data file must not import @/scripts/generate-yopratiqo-audio",
  );
  assert.ok(
    !/scripts\/generate-yopratiqo-audio/.test(lessonTwoDataSrc),
    "Lesson 2 audio data file must not reference scripts/generate-yopratiqo-audio",
  );
  // (b) This test file does NOT import the generator (verified by
  // inspecting our own imports — they're all manifest / lesson / fs
  // helpers).
  const selfSrc = read("tests/yo/yopratiqoFrQuebecLesson2Audio.test.ts");
  const selfNoComments = stripComments(selfSrc);
  assert.ok(
    !/from\s+["'][^"']*generate-yopratiqo-audio["']/.test(selfNoComments),
    "this test suite must not import the audio generation script",
  );
  // (c) The generator script itself must still exist on disk and
  // still target the documented OpenAI TTS endpoint — fingerprint
  // that detects a regression where the script gets accidentally
  // deleted or re-wired to a different surface.
  const scriptSrc = read(SCRIPT_PATH);
  assert.ok(
    scriptSrc.length > 0,
    "generate-yopratiqo-audio.ts must still exist",
  );
  assert.match(
    scriptSrc,
    /https:\/\/api\.openai\.com\/v1\/audio\/speech/,
    "the audio generation script must still target the documented OpenAI TTS endpoint (do not modify in this PR)",
  );
  assert.match(
    scriptSrc,
    /env:\s*Readonly<Record<string, string \| undefined>>\s*=\s*process\.env/,
    "the generator must default its injectable server environment to process.env",
  );
  assert.match(
    scriptSrc,
    /const openAiApiKey = env\.OPENAI_API_KEY\?\.trim\(\) \?\? ""/,
    "the generator must read the server-only OPENAI_API_KEY from that environment",
  );
  assert.doesNotMatch(
    stripComments(scriptSrc),
    /NEXT_PUBLIC_OPENAI_API_KEY|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/,
    "server secrets must never fall back to browser-exposed variables",
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
    `\n[yo:fr-quebec-lesson-2-audio] ${passed} Lesson 2 audio assertions passed.`,
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
