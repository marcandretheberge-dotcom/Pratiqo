/**
 * YoPratiqo — Spanish lesson audio coverage regression suite.
 *
 * Companion to `tests/yo/yopratiqoAudio.test.ts`. Where that file
 * guards manifest hygiene + security boundaries, this one guards the
 * relationship between the manifest and the actual lesson data files
 * a learner sees on /yo/langues/espagnol/* :
 *
 *   - lib/yo/spanishIntroA1.ts        (intro / pan-Hispanic)
 *   - lib/yo/dominicanRepublicA1.ts   (Voyage · República Dominicana)
 *
 * Goals:
 *
 *  1. Every Spanish text item shown to a learner has either a
 *     pre-generated audio entry or an explicit, justified entry in
 *     the `INTENTIONALLY_EXCLUDED` set below. A test failure here
 *     surfaces lesson content that was added without considering
 *     audio coverage.
 *
 *  2. Accent profile policy:
 *       - General intro Spanish content uses `latin_american_neutral`.
 *       - Dominican Republic dictionary + dialogue use
 *         `dominican_republic`.
 *       - `puerto_rico` and `rioplatense_uruguay` exist as valid
 *         profile ids but are not yet broadly used (no Puerto Rico /
 *         Uruguay module is shipped yet).
 *       - `spain_neutral` exists for future comparison content.
 *
 *  3. The wrapper `YoSpanishAudioButton` is the entry point Spanish
 *     lesson UI uses today, and it falls back to
 *     `YoPronunciationButton` (Web Speech) when no MP3 matches.
 *
 *  4. Generator `instructions` plumbing is wired and dry-run logs
 *     report the chosen accent profile.
 *
 * Same conventions as the rest of the project: `node:test`-style
 * static-source assertions, no browser, no live network. No Stripe /
 * Supabase / RLS / migration / booking / search / Membre Pro /
 * teacher-dashboard logic touched.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  YOPRATIQO_AUDIO_MANIFEST,
  findAudioItemForContext,
} from "../../lib/yo/audio/audioManifest";
import {
  YO_AUDIO_ACCENT_PROFILES,
  type YoAudioAccentProfileId,
} from "../../lib/yo/audio/accentProfiles";
import { spanishIntroA1 } from "../../lib/yo/spanishIntroA1";
import { dominicanRepublicA1 } from "../../lib/yo/dominicanRepublicA1";

// ─────────────────────────────────────────────────────────────────────
// Tiny test harness (matches sibling test files)
// ─────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────
// Sources we audit statically (in addition to the runtime imports
// above, which give us live data)
// ─────────────────────────────────────────────────────────────────────
const generatorSrc = read("scripts/generate-yopratiqo-audio.ts");
const wrapperSrc = read("components/yo/YoSpanishAudioButton.tsx");
const introPageSrc = read("app/yo/langues/espagnol/intro/page.tsx");
const introExperienceSrc = read("components/yo/YoIntroExperience.tsx");
const dictionarySrc = read("components/yo/YoDominicanDictionary.tsx");
const dialogueSrc = read("components/yo/YoDialogueScenario.tsx");
const flashcardSrc = read("components/yo/YoFlashcardPreview.tsx");
const readingSrc = read("components/yo/YoReadingPreview.tsx");

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

interface TextProbe {
  text: string;
  accentProfile: YoAudioAccentProfileId;
  moduleId?: string;
  lessonId?: string;
  source: string;
  reason?: string;
}

function normaliseLookup(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[…\u2026]+$/g, "")
    .replace(/\.{3,}$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Normalised representations of items we deliberately do NOT cover
 * with pre-generated audio. Each entry must explain why so the
 * exclusion list does not become a graveyard for future regressions.
 */
const INTENTIONALLY_EXCLUDED = new Set<string>(
  [
    // Spelling alternates that share an MP3 with a sibling form.
    // The lookup helper folds trailing ellipses, so "Me llamo…" and
    // "Me llamo [ton prénom]" both resolve to the same audio item;
    // the *placeholder* form below carries a French bracket the TTS
    // engine should not read aloud.
    "Me llamo [ton prénom]",

    // UI shorthand: the universal-words list and quizzes render "Sí
    // / No" as a single chip for visual density, but the underlying
    // recordings are "Sí" and "No" as independent words. The wrapper
    // gracefully falls back to Web Speech when a learner taps the
    // combined chip; the canonical singletons remain covered.
    "Sí / No",

    // The mini-mission options below are dynamic prompt variants,
    // not lesson vocabulary. They reuse the "La cuenta, por favor"
    // / "Quiero …, por favor" patterns that *are* covered as their
    // canonical forms inside the food + dictionary lessons. We do
    // not want every drop-down option to trigger a separate MP3.
    "Quiero café, por favor.",
    "Quiero agua, por favor.",
    "La cuenta, por favor.",

    // Variation example surfaces. These are pedagogical comparison
    // strings rendered with `lang="es"` for sound only — the
    // surrounding UI explains the difference between accents. The
    // lessons themselves use the canonical forms ("¿Cómo estás?",
    // "la guagua") which ARE covered.
    "¿Cómo estás? · ¿Cómo está?",
    "la guagua",

    // Quiz answer labels. Quizzes never play audio for option text
    // (the goal is the learner reads + reasons, not memorises
    // pronunciation). Distractor options like "Buenas guaguas"
    // intentionally do not get an MP3.
    "Buenas guaguas",

    // Mixed-language data string in the food bullet group: the
    // displayed text is "pollo ou carne" (French connector "ou"
    // inside otherwise-Spanish copy). The TTS-friendly canonical
    // form "pollo o carne" IS covered in the manifest; the wrapper
    // falls back to Web Speech for the mixed string. Tracking the
    // exclusion so a future copy clean-up flips it to direct
    // coverage automatically.
    "pollo ou carne",
    // Hasta mañana / Hasta la próxima / Nos vemos / Adiós · Bien,
    // gracias · Todo bien live in the goodbye/how-are-you bullets and
    // already resolve to the universal-words manifest entries.
  ].map(normaliseLookup),
);

function probeOK(probe: TextProbe): boolean {
  if (INTENTIONALLY_EXCLUDED.has(normaliseLookup(probe.text))) return true;
  const item = findAudioItemForContext({
    text: probe.text,
    moduleId: probe.moduleId,
    lessonId: probe.lessonId,
    accentProfile: probe.accentProfile,
  });
  return Boolean(item);
}

// ─────────────────────────────────────────────────────────────────────
// 1. Manifest size + accent metadata
// ─────────────────────────────────────────────────────────────────────

test("manifest covers materially more content than Phase 1 (≥ 25 items)", () => {
  assert.ok(
    YOPRATIQO_AUDIO_MANIFEST.length >= 25,
    `manifest should cover ≥ 25 items after Phase 2 (got ${YOPRATIQO_AUDIO_MANIFEST.length})`,
  );
});

test("every manifest item declares a known accent profile id", () => {
  const known = new Set<YoAudioAccentProfileId>(
    YO_AUDIO_ACCENT_PROFILES.map((p) => p.id),
  );
  for (const item of YOPRATIQO_AUDIO_MANIFEST) {
    assert.ok(
      known.has(item.accentProfile),
      `manifest item ${item.id} references unknown accent profile "${item.accentProfile}"`,
    );
  }
});

test("intro-a1 module content uses latin_american_neutral", () => {
  const introItems = YOPRATIQO_AUDIO_MANIFEST.filter(
    (i) => i.moduleId === "intro-a1",
  );
  assert.ok(introItems.length > 0, "expected at least one intro-a1 audio item");
  for (const item of introItems) {
    assert.equal(
      item.accentProfile,
      "latin_american_neutral",
      `intro-a1 item ${item.id} should use latin_american_neutral, not ${item.accentProfile}`,
    );
  }
});

test("voyage / RD module content uses dominican_republic for accent-relevant items, latin_american_neutral for pan-Hispanic vocab", () => {
  // Policy:
  //   - Local Dominican expressions and dialogue lines (where the
  //     accent IS the lesson) → dominican_republic.
  //   - Pan-Hispanic A1 vocabulary that happens to appear inside the
  //     RD module (e.g. "el país", "la cuenta, por favor") →
  //     latin_american_neutral, so we record once and reuse across
  //     modules. The contextual lookup falls back to neutral when no
  //     dominican_republic variant exists.
  const rdItems = YOPRATIQO_AUDIO_MANIFEST.filter(
    (i) =>
      i.moduleId === "voyage" &&
      i.lessonId === "republique-dominicaine-a1-lesson-01",
  );
  assert.ok(
    rdItems.length > 0,
    "expected at least one Dominican Republic audio item",
  );
  // Only `dominican_republic` and `latin_american_neutral` are
  // permitted inside this lesson — Spain or Puerto Rico would be a
  // mistake.
  const allowed = new Set<YoAudioAccentProfileId>([
    "dominican_republic",
    "latin_american_neutral",
  ]);
  for (const item of rdItems) {
    assert.ok(
      allowed.has(item.accentProfile),
      `voyage RD item ${item.id} uses unexpected accent ${item.accentProfile} (allowed: dominican_republic | latin_american_neutral)`,
    );
  }
  // The Dominican-flavoured set must include ALL the dictionary
  // expressions + every hotel dialogue line. Sample a few.
  const dominicanIds = new Set(
    rdItems
      .filter((i) => i.accentProfile === "dominican_republic")
      .map((i) => i.id),
  );
  for (const expectedId of [
    "es-voyage-dialogue-que-lo-que",
    "es-voyage-rd-phrase-tato",
    "es-voyage-rd-phrase-la-guagua",
    "es-voyage-rd-dialogue-hotel-l1-host-buenas-tardes",
  ]) {
    assert.ok(
      dominicanIds.has(expectedId),
      `expected RD item ${expectedId} to be recorded with the dominican_republic accent`,
    );
  }
});

test("puerto_rico / rioplatense_uruguay profiles exist but are not used globally yet", () => {
  const seenProfiles = new Set(
    YOPRATIQO_AUDIO_MANIFEST.map((i) => i.accentProfile),
  );
  // Profiles must EXIST as available ids…
  const known = new Set<YoAudioAccentProfileId>(
    YO_AUDIO_ACCENT_PROFILES.map((p) => p.id),
  );
  assert.ok(known.has("puerto_rico"));
  assert.ok(known.has("rioplatense_uruguay"));
  // …but until we ship Puerto Rico / Uruguay modules, they MUST NOT
  // appear on any actual manifest item, otherwise we are silently
  // promising audio variants we do not have content for.
  assert.ok(
    !seenProfiles.has("puerto_rico"),
    "puerto_rico must not be assigned to any manifest item until a Puerto Rico module exists",
  );
  assert.ok(
    !seenProfiles.has("rioplatense_uruguay"),
    "rioplatense_uruguay must not be assigned to any manifest item until an Uruguay module exists",
  );
});

test("accent profile TTS instructions stay safe, beginner-friendly, and non-overpromising", () => {
  for (const profile of YO_AUDIO_ACCENT_PROFILES) {
    assert.ok(
      profile.ttsInstructions.length > 40,
      `profile ${profile.id} ttsInstructions must be a real instruction string`,
    );
    assert.ok(
      !/native speaker|guarantee|perfect accent/i.test(profile.ttsInstructions),
      `profile ${profile.id} must not over-promise native or guaranteed accent`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────
// 2. Coverage of intro Spanish lesson content
// ─────────────────────────────────────────────────────────────────────

test("every universal-words item has manifest coverage (latin_american_neutral)", () => {
  for (const word of spanishIntroA1.universalWords) {
    const probe: TextProbe = {
      text: word.target,
      accentProfile: "latin_american_neutral",
      moduleId: "intro-a1",
      lessonId: "universal-words",
      source: "spanishIntroA1.universalWords",
    };
    assert.ok(
      probeOK(probe),
      `universal word "${word.target}" must have audio (or be in INTENTIONALLY_EXCLUDED)`,
    );
  }
});

test("intro flashcards resolve to manifest audio (modulo intentional exclusions)", () => {
  for (const card of spanishIntroA1.flashcards) {
    const probe: TextProbe = {
      text: card.front,
      accentProfile: "latin_american_neutral",
      moduleId: "intro-a1",
      lessonId: "universal-words",
      source: "spanishIntroA1.flashcards",
    };
    assert.ok(
      probeOK(probe),
      `intro flashcard "${card.front}" must have audio coverage`,
    );
  }
});

test("guided reading vocabulary has manifest coverage", () => {
  for (const item of spanishIntroA1.readingSection.vocabulary) {
    const probe: TextProbe = {
      text: item.target,
      accentProfile: "latin_american_neutral",
      moduleId: "intro-a1",
      lessonId: "reading-first-text",
      source: "spanishIntroA1.readingSection.vocabulary",
    };
    assert.ok(
      probeOK(probe),
      `reading vocab "${item.target}" must have audio coverage`,
    );
  }
});

test("guided reading body lines have sentence-level audio coverage", () => {
  for (const line of spanishIntroA1.readingSection.bodyLines) {
    const probe: TextProbe = {
      text: line,
      accentProfile: "latin_american_neutral",
      moduleId: "intro-a1",
      lessonId: "reading-first-text",
      source: "spanishIntroA1.readingSection.bodyLines",
    };
    assert.ok(
      probeOK(probe),
      `reading paragraph "${line.slice(0, 40)}…" must have sentence-level audio`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────
// 3. Coverage of Dominican Republic lesson content
// ─────────────────────────────────────────────────────────────────────

test("Dominican dictionary entries each have audio (preferring dominican_republic, falling back to neutral)", () => {
  for (const entry of dominicanRepublicA1.dominicanDictionary) {
    const probe: TextProbe = {
      text: entry.target,
      accentProfile: "dominican_republic",
      moduleId: "voyage",
      lessonId: "republique-dominicaine-a1-lesson-01",
      source: "dominicanRepublicA1.dominicanDictionary",
    };
    assert.ok(
      probeOK(probe),
      `dictionary entry "${entry.target}" must have audio coverage`,
    );
  }
});

test("Dominican Republic flashcards resolve to manifest audio", () => {
  for (const card of dominicanRepublicA1.flashcardDeck) {
    const probe: TextProbe = {
      text: card.front,
      accentProfile: "dominican_republic",
      moduleId: "voyage",
      lessonId: "republique-dominicaine-a1-lesson-01",
      source: "dominicanRepublicA1.flashcardDeck",
    };
    assert.ok(
      probeOK(probe),
      `RD flashcard "${card.front}" must have audio coverage`,
    );
  }
});

test("Dominican Republic detailed sections expose audio for every Spanish surface", () => {
  for (const section of dominicanRepublicA1.detailedSections) {
    const surfaces: string[] = [];
    for (const phrase of section.practicalPhrases ?? []) {
      surfaces.push(phrase.target);
    }
    for (const item of section.vocabulary ?? []) {
      surfaces.push(item.target);
    }
    for (const group of section.bulletGroups ?? []) {
      for (const item of group.items) {
        surfaces.push(item.target);
      }
    }
    for (const line of section.dialogue?.lines ?? []) {
      surfaces.push(line.target);
    }
    for (const text of surfaces) {
      const probe: TextProbe = {
        text,
        accentProfile: "dominican_republic",
        moduleId: "voyage",
        lessonId: "republique-dominicaine-a1-lesson-01",
        source: `dominicanRepublicA1.detailedSection[${section.id}]`,
      };
      assert.ok(
        probeOK(probe),
        `RD lesson surface "${text}" (in section ${section.id}) must have audio coverage`,
      );
    }
  }
});

test("Dominican Republic intro card phrases have audio coverage", () => {
  for (const card of dominicanRepublicA1.module.lessons[0]?.cards ?? []) {
    if (card.kind !== "phrases") continue;
    for (const phrase of card.phrases ?? []) {
      const probe: TextProbe = {
        text: phrase.target,
        accentProfile: "dominican_republic",
        moduleId: "voyage",
        lessonId: "republique-dominicaine-a1-lesson-01",
        source: `dominicanRepublicA1.lessons[0].cards[${card.id}].phrases`,
      };
      assert.ok(
        probeOK(probe),
        `RD intro card phrase "${phrase.target}" must have audio coverage`,
      );
    }
  }
});

// ─────────────────────────────────────────────────────────────────────
// 4. Generator dry-run + instructions plumbing
// ─────────────────────────────────────────────────────────────────────

test("generator script dry-run logs the chosen accent profile", () => {
  // The dry-run line must include `accent=` so a contributor can spot
  // accent regressions while reviewing the planned generation.
  assert.match(generatorSrc, /accent=\$\{item\.accentProfile\}/);
  assert.match(generatorSrc, /storagePath/);
});

test("generator script forwards `instructions` for steerable TTS models", () => {
  // We pass the resolved instructions through the request body when
  // present and skip it otherwise. The static check ensures the
  // wiring is not silently dropped.
  assert.match(generatorSrc, /resolveItemPlan\(/);
  assert.match(generatorSrc, /modelSupportsInstructions/);
  assert.match(
    generatorSrc,
    /body\.instructions\s*=\s*plan\.instructions/,
  );
});

test("generator script reports `instructions=present|absent` in dry-run", () => {
  assert.match(generatorSrc, /instructions=present/);
  assert.match(generatorSrc, /instructions=absent/);
});

// ─────────────────────────────────────────────────────────────────────
// 5. Frontend wrapper + wiring
// ─────────────────────────────────────────────────────────────────────

test("YoSpanishAudioButton uses contextual lookup, not raw text-only lookup", () => {
  assert.match(wrapperSrc, /findAudioItemForContext/);
  assert.ok(
    !/findAudioItemByText\s*\(/.test(wrapperSrc),
    "wrapper must prefer contextual lookup; text-only lookup remains the back-compat path",
  );
});

test("YoSpanishAudioButton falls back to YoPronunciationButton when no manifest entry resolves", () => {
  assert.match(wrapperSrc, /<YoPronunciationButton/);
  assert.match(wrapperSrc, /<YoAudioPlayer/);
});

test("Spanish lesson surfaces use YoSpanishAudioButton (not raw YoPronunciationButton)", () => {
  // The wrapper is now the canonical entry point. Each lesson surface
  // must import it; raw `YoPronunciationButton` callsites are limited
  // to the wrapper itself.
  const surfaces: Array<{ label: string; src: string }> = [
    { label: "intro page", src: introPageSrc },
    { label: "YoIntroExperience", src: introExperienceSrc },
    { label: "YoDominicanDictionary", src: dictionarySrc },
    { label: "YoDialogueScenario", src: dialogueSrc },
    { label: "YoFlashcardPreview", src: flashcardSrc },
    { label: "YoReadingPreview", src: readingSrc },
  ];
  for (const { label, src } of surfaces) {
    if (label === "YoIntroExperience") {
      // YoIntroExperience does not own audio buttons directly — it
      // composes children. Just verify it forwards an audioContext
      // to those children rather than importing any pronunciation
      // surface itself.
      assert.match(
        src,
        /audioContext\s*=\s*\{\s*\{/,
        `${label} must forward an audioContext literal to its children`,
      );
      continue;
    }
    assert.match(
      src,
      /YoSpanishAudioButton/,
      `${label} must use the YoSpanishAudioButton wrapper`,
    );
    assert.ok(
      !/<YoPronunciationButton/.test(src),
      `${label} must not embed a raw YoPronunciationButton (use the wrapper instead)`,
    );
  }
});

test("YoReadingPreview no longer ships a section-level / full-text pronunciation button", () => {
  // UX fix: the global speaker that sat at the top-right of "Lecture
  // guidée / Mi primer texto en español" concatenated every body
  // line into one Web-Speech utterance. That pathway was slow, often
  // cut off mid-paragraph, and offered no value over the per-paragraph
  // buttons (which resolve to a fast pre-generated MP3 each). It must
  // not come back.
  assert.ok(
    !/\bfullText\b/.test(readingSrc),
    "YoReadingPreview must not derive a `fullText` join — that powered the removed section-level button",
  );
  assert.ok(
    !/section\.bodyLines\.join\s*\(/.test(readingSrc),
    "YoReadingPreview must not concatenate bodyLines for a global utterance",
  );
  // The audio button now appears only inside the body-line loop and
  // inside the vocabulary loop. There must be no third occurrence
  // outside a `.map(` call.
  const buttonOccurrences = (
    readingSrc.match(/<YoSpanishAudioButton\b/g) ?? []
  ).length;
  assert.equal(
    buttonOccurrences,
    2,
    `YoReadingPreview should render exactly two YoSpanishAudioButton callsites (per-paragraph + per-vocab); got ${buttonOccurrences}`,
  );
});

test("YoReadingPreview keeps contextual audio for body lines and vocabulary items", () => {
  // Per-paragraph: the audio button is bound to `text={line}` inside
  // the bodyLines map. The component must keep that pathway because
  // the manifest's reading sentences resolve from it.
  assert.match(
    readingSrc,
    /text=\{line\}[\s\S]*?lessonId="reading-first-text"[\s\S]*?type="sentence"/,
    "YoReadingPreview must keep the per-paragraph audio button (text={line})",
  );
  // Per-vocabulary: the audio button is bound to `text={item.target}`
  // inside the vocabulary map.
  assert.match(
    readingSrc,
    /text=\{item\.target\}[\s\S]*?lessonId="reading-first-text"[\s\S]*?type="word"/,
    "YoReadingPreview must keep the per-vocabulary audio button (text={item.target})",
  );
});

// ─────────────────────────────────────────────────────────────────────
// 6. Security boundary — no secrets in any of the wrappers
// ─────────────────────────────────────────────────────────────────────

const RUNTIME_OPENAI_READ = /process\.env\.OPENAI_API_KEY/;
const RUNTIME_SERVICE_ROLE_READ = /process\.env\.SUPABASE_SERVICE_ROLE_KEY/;

test("YoSpanishAudioButton wrapper never reads server-only secrets or imports the openai SDK", () => {
  assert.ok(!RUNTIME_OPENAI_READ.test(wrapperSrc));
  assert.ok(!RUNTIME_SERVICE_ROLE_READ.test(wrapperSrc));
  // Match RUNTIME imports / calls, not documentation comments. The
  // wrapper docs intentionally name the boundary ("never calls
  // OpenAI from browser") so contributors understand the contract.
  assert.ok(
    !/from\s+["']openai["']/.test(wrapperSrc) &&
      !/require\(['"]openai['"]\)/.test(wrapperSrc),
    "wrapper must never import the openai SDK at runtime",
  );
});

test("Spanish lesson UI components never read server-only secrets", () => {
  for (const src of [
    introExperienceSrc,
    dictionarySrc,
    dialogueSrc,
    flashcardSrc,
    readingSrc,
  ]) {
    assert.ok(!RUNTIME_OPENAI_READ.test(src));
    assert.ok(!RUNTIME_SERVICE_ROLE_READ.test(src));
  }
});

// ─────────────────────────────────────────────────────────────────────
// 7. Public-facing inventory snapshot — surfaces visible on launch day
// ─────────────────────────────────────────────────────────────────────

test("inventory: report manifest item totals by accent profile", () => {
  const counts = new Map<YoAudioAccentProfileId, number>();
  for (const item of YOPRATIQO_AUDIO_MANIFEST) {
    counts.set(item.accentProfile, (counts.get(item.accentProfile) ?? 0) + 1);
  }
  // Logged for the dry-run report — the assertion just makes sure both
  // primary profiles show up with at least a handful of items.
  console.log(
    `[yo:audio:coverage] manifest items by accent: ${JSON.stringify(
      Object.fromEntries(counts),
    )}`,
  );
  assert.ok((counts.get("latin_american_neutral") ?? 0) >= 5);
  assert.ok((counts.get("dominican_republic") ?? 0) >= 5);
});

// ─────────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────────
async function run() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (error) {
      console.error(`not ok - ${name}`);
      throw error;
    }
  }
  console.log(`[yo:audio:coverage] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
