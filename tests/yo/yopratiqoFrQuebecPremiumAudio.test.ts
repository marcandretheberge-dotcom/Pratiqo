/**
 * YoPratiqo — Quebec French / Premium Module 1 · Lesson 1 audio
 * coverage regression suite.
 *
 * Style: `node:test`-style ad-hoc runner with `assert`. Mixes runtime
 * manifest inspection (every Lesson 1 frQuebec target string resolves
 * to a manifest entry under the canonical context triple) with
 * static-source sniffs of the shell + page + button so we cover both
 * the data layer and the frontend wiring.
 *
 * Hard safety contract enforced here:
 *
 *   - Pre-generated audio ONLY. The shell + page + button never
 *     import the openai SDK, never call OpenAI at runtime, never
 *     read server-only secrets, and never wire a Web-Speech-only
 *     button when manifest coverage exists.
 *   - NO microphone, NO MediaRecorder, NO getUserMedia, NO voice
 *     recording in any modified file.
 *   - NO automatic teacher routing, NO learner-data sharing with
 *     teachers (the shell file is also covered by the existing
 *     `yopratiqoFrQuebecPremiumShell.test.ts`; we re-anchor the
 *     audio-specific subset here so a Lesson 1 audio regression
 *     fails this suite first).
 *   - NO checkout / payment / Stripe / Supabase schema / RLS /
 *     migrations / booking / Membre Pro / commission code in any
 *     modified file (mirrors the forbidden list from the existing
 *     premium-shell suite).
 *   - English / Spanish glosses NEVER receive a `YoFrenchAudioButton`
 *     — only the Quebec French target text does.
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
import { frQuebecWorkplaceSurvivalModule } from "@/lib/yo/frQuebecWorkplaceSurvivalModule";

// ─── Test runner (mirror of the FR Quebec intro suite) ────────────

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
 * Strip JS comments before scanning code for forbidden patterns.
 * Mirrors the helper used by `yopratiqoFrQuebecPremiumShell.test.ts`
 * — a doc comment that explicitly names a forbidden concept (e.g.
 * "no MediaRecorder") must never falsely trip a regex meant to
 * detect real code.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const SHELL_PATH = "components/yo/YoPremiumModuleShell.tsx";
const PAGE_PATH = "app/yo/langues/francais-quebec/module-1/page.tsx";
const BUTTON_PATH = "components/yo/YoFrenchAudioButton.tsx";
const DATA_PATH = "lib/yo/audio/frQuebecPremiumLessonOneAudio.ts";

const shellSrc = read(SHELL_PATH);
const shellNoComments = stripComments(shellSrc);
const pageSrc = read(PAGE_PATH);
const pageNoComments = stripComments(pageSrc);
const buttonSrc = read(BUTTON_PATH);
const buttonNoComments = stripComments(buttonSrc);
const dataSrc = read(DATA_PATH);

// ─── Canonical context ────────────────────────────────────────────

const ACCENT_PROFILE_ID = "quebec_french" as const;
const MODULE_ID = "fr-quebec-workplace-survival-1" as const;
const LESSON_ID = "arriver-saluer" as const;

// ─── Lesson 1 target strings (pulled DIRECTLY from the lesson data
// so any drift between the rendered text and the manifest fails this
// suite first). ────────────────────────────────────────────────────

const lessonOne = frQuebecWorkplaceSurvivalModule.lessons[0];
assert.equal(
  lessonOne?.id,
  LESSON_ID,
  "Lesson 1 must be the first entry of the module",
);
const lessonOneContent = lessonOne!.content;
assert.ok(
  lessonOneContent,
  "Lesson 1 must carry a populated content body — required for audio coverage",
);

const corePhraseTargets: readonly string[] = lessonOneContent.corePhrases.map(
  (phrase) => phrase.frQuebec,
);

const dialogueLineTargets: readonly string[] =
  lessonOneContent.miniDialogues.flatMap((dialogue) =>
    dialogue.lines.map((line) => line.frQuebec),
  );

// ─── 1. Every core phrase resolves to a manifest entry ────────────

test("every Lesson 1 core phrase resolves to a manifest entry under the canonical Quebec French context", () => {
  for (const text of corePhraseTargets) {
    const item = findAudioItemForContext({
      text,
      moduleId: MODULE_ID,
      lessonId: LESSON_ID,
      accentProfile: ACCENT_PROFILE_ID,
    });
    assert.ok(
      item,
      `manifest must resolve a Quebec French entry for core phrase "${text}"`,
    );
  }
});

// ─── 2. Every mini-dialogue line resolves under the same context ──

test("every Lesson 1 mini-dialogue line resolves to a manifest entry under the same context", () => {
  for (const text of dialogueLineTargets) {
    const item = findAudioItemForContext({
      text,
      moduleId: MODULE_ID,
      lessonId: LESSON_ID,
      accentProfile: ACCENT_PROFILE_ID,
    });
    assert.ok(
      item,
      `manifest must resolve a Quebec French entry for dialogue line "${text}"`,
    );
  }
});

// ─── 3-5. Resolved entries declare the canonical context triple ───

test("resolved manifest entries declare accentProfile=quebec_french, moduleId, lessonId, and targetLanguage=fr", () => {
  for (const text of [...corePhraseTargets, ...dialogueLineTargets]) {
    const item = findAudioItemForContext({
      text,
      moduleId: MODULE_ID,
      lessonId: LESSON_ID,
      accentProfile: ACCENT_PROFILE_ID,
    });
    assert.ok(item, `expected a manifest entry for "${text}"`);
    assert.equal(
      item!.accentProfile,
      ACCENT_PROFILE_ID,
      `entry for "${text}" must declare accentProfile="${ACCENT_PROFILE_ID}"`,
    );
    assert.equal(
      item!.moduleId,
      MODULE_ID,
      `entry for "${text}" must declare moduleId="${MODULE_ID}"`,
    );
    assert.equal(
      item!.lessonId,
      LESSON_ID,
      `entry for "${text}" must declare lessonId="${LESSON_ID}"`,
    );
    assert.equal(
      item!.targetLanguage,
      "fr",
      `entry for "${text}" must declare targetLanguage="fr"`,
    );
  }
});

// ─── 6. Storage paths are deterministic, ASCII-safe, .mp3-suffixed ─

test("Lesson 1 manifest items use deterministic, ASCII-safe storage paths inside the yo/ prefix", () => {
  const expectedPrefix = `${YOPRATIQO_AUDIO_ROOT_PREFIX}/fr/${MODULE_ID}/${LESSON_ID}/quebec-french/`;
  for (const item of frQuebecPremiumLessonOneAudio) {
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
    // Catches accents, underscores, and any other character that
    // would break Supabase Storage paths.
    assert.ok(
      /^[a-z0-9/.\-]+$/.test(item.storagePath),
      `storagePath "${item.storagePath}" must be ASCII-safe (a-z, 0-9, /, ., -)`,
    );
  }
});

// ─── 7. No duplicate ids or paths across the WHOLE manifest ───────

test("the entire manifest has no duplicate ids or storage paths", () => {
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

// ─── 8. Shell renders YoFrenchAudioButton in the core-phrases scope ─

test("YoPremiumModuleShell renders YoFrenchAudioButton inside the core-phrases section of LessonOnePreview", () => {
  // Static-source check: the button must be rendered inside the
  // `corePhrases.map(...)` block, bound to `phrase.frQuebec`.
  assert.match(
    shellSrc,
    /import\s*\{\s*YoFrenchAudioButton\s*\}\s*from\s*"@\/components\/yo\/YoFrenchAudioButton"/,
    "shell must import YoFrenchAudioButton",
  );
  // The corePhrases.map(...) body must contain a YoFrenchAudioButton
  // bound to phrase.frQuebec (allow whitespace + JSX between).
  const corePhrasesMatch = shellSrc.match(
    /content\.corePhrases\.map\(\(phrase\)\s*=>\s*\(([\s\S]*?)\)\)/,
  );
  assert.ok(
    corePhrasesMatch,
    "shell must iterate content.corePhrases via .map((phrase) => (...))",
  );
  assert.match(
    corePhrasesMatch![1]!,
    /<YoFrenchAudioButton[\s\S]*?text=\{phrase\.frQuebec\}[\s\S]*?\/>/,
    "core-phrases section must render <YoFrenchAudioButton text={phrase.frQuebec} ... />",
  );
  // And the button props must declare the canonical Lesson 1 audio
  // context (via the named constants exported above the renderer).
  assert.match(
    corePhrasesMatch![1]!,
    /<YoFrenchAudioButton[\s\S]*?moduleId=\{LESSON_ONE_AUDIO_MODULE_ID\}[\s\S]*?lessonId=\{LESSON_ONE_AUDIO_LESSON_ID\}[\s\S]*?accentProfile=\{LESSON_ONE_AUDIO_ACCENT_PROFILE\}[\s\S]*?\/>/,
    "core-phrases YoFrenchAudioButton must wire moduleId / lessonId / accentProfile via the shared Lesson 1 constants",
  );
});

// ─── 9. Shell renders YoFrenchAudioButton in the dialogues scope ──

test("YoPremiumModuleShell renders YoFrenchAudioButton inside each mini-dialogue line of LessonOnePreview", () => {
  const dialogueLinesMatch = shellSrc.match(
    /dialogue\.lines\.map\(\(line,\s*lineIndex\)\s*=>\s*\(([\s\S]*?)\)\)/,
  );
  assert.ok(
    dialogueLinesMatch,
    "shell must iterate dialogue.lines via .map((line, lineIndex) => (...))",
  );
  assert.match(
    dialogueLinesMatch![1]!,
    /<YoFrenchAudioButton[\s\S]*?text=\{line\.frQuebec\}[\s\S]*?\/>/,
    "dialogue-lines section must render <YoFrenchAudioButton text={line.frQuebec} ... />",
  );
  assert.match(
    dialogueLinesMatch![1]!,
    /<YoFrenchAudioButton[\s\S]*?moduleId=\{LESSON_ONE_AUDIO_MODULE_ID\}[\s\S]*?lessonId=\{LESSON_ONE_AUDIO_LESSON_ID\}[\s\S]*?accentProfile=\{LESSON_ONE_AUDIO_ACCENT_PROFILE\}[\s\S]*?\/>/,
    "dialogue-line YoFrenchAudioButton must wire moduleId / lessonId / accentProfile via the shared Lesson 1 constants",
  );
});

// ─── 10. Audio buttons are NOT bound to English / Spanish gloss ───

test("YoFrenchAudioButton is never bound to English or Spanish gloss inside LessonOnePreview", () => {
  // The shell uses curly-brace JSX bindings — match each forbidden
  // accessor. Comments are stripped first so a doc comment that
  // mentions the forbidden binding does not falsely trip the regex.
  const forbidden: ReadonlyArray<[RegExp, string]> = [
    [
      /<YoFrenchAudioButton[\s\S]*?text=\{phrase\.english\}/,
      "phrase.english (English gloss)",
    ],
    [
      /<YoFrenchAudioButton[\s\S]*?text=\{phrase\.spanish\}/,
      "phrase.spanish (Spanish gloss)",
    ],
    [
      /<YoFrenchAudioButton[\s\S]*?text=\{line\.english\}/,
      "line.english (English gloss)",
    ],
    [
      /<YoFrenchAudioButton[\s\S]*?text=\{line\.spanish\}/,
      "line.spanish (Spanish gloss)",
    ],
  ];
  for (const [re, label] of forbidden) {
    assert.ok(
      !re.test(shellNoComments),
      `shell must NOT render <YoFrenchAudioButton> bound to ${label}`,
    );
  }
});

// ─── 11. No runtime OpenAI / TTS imports in any modified file ─────

test("shell, page, and button source never import the openai SDK or call api.openai.com at runtime", () => {
  for (const [label, src] of [
    ["YoPremiumModuleShell", shellNoComments],
    ["module-1 page", pageNoComments],
    ["YoFrenchAudioButton", buttonNoComments],
  ] as const) {
    assert.ok(
      !/from\s+["']openai["']/.test(src),
      `${label} must not import from "openai"`,
    );
    assert.ok(
      !/require\(['"]openai['"]\)/.test(src),
      `${label} must not require("openai")`,
    );
    assert.ok(
      !/api\.openai\.com/.test(src),
      `${label} must not reference api.openai.com`,
    );
    // Manifest data files MAY mention `tts` / `Web Speech` in
    // documentation; the comment-stripped check guards real code.
    assert.ok(
      !/openai\s*\.(?:audio|chat|completions)/.test(src),
      `${label} must not call any openai.* runtime method`,
    );
  }
});

// ─── 12. No server-only secret reads in client code ───────────────

test("shell, page, and button source never read server-only secrets via process.env", () => {
  const forbidden: ReadonlyArray<[RegExp, string]> = [
    [/process\.env\.OPENAI_API_KEY/, "OPENAI_API_KEY"],
    [
      /process\.env\.SUPABASE_SERVICE_ROLE_KEY/,
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
    [
      /process\.env\.SUPABASE_SERVICE_KEY/,
      "SUPABASE_SERVICE_KEY",
    ],
    [
      /process\.env\.STRIPE_SECRET_KEY/,
      "STRIPE_SECRET_KEY",
    ],
    [
      /process\.env\.STRIPE_RESTRICTED_KEY/,
      "STRIPE_RESTRICTED_KEY",
    ],
    [
      /process\.env\.RESEND_API_KEY/,
      "RESEND_API_KEY",
    ],
  ];
  for (const file of [SHELL_PATH, PAGE_PATH, BUTTON_PATH]) {
    const src = stripComments(read(file));
    for (const [re, label] of forbidden) {
      assert.ok(
        !re.test(src),
        `${file} must not read ${label} at runtime`,
      );
    }
  }
});

// ─── 13. No microphone / MediaRecorder / getUserMedia anywhere ────

test("no modified file references microphone / MediaRecorder / getUserMedia / navigator.mediaDevices", () => {
  const forbidden: ReadonlyArray<[RegExp, string]> = [
    [/MediaRecorder/, "MediaRecorder"],
    [/getUserMedia/, "getUserMedia"],
    [/navigator\.mediaDevices/, "navigator.mediaDevices"],
    [/microphone/i, "microphone"],
    [/voice\s+recording/i, "voice recording"],
    [/enregistrement\s+vocal/i, "enregistrement vocal"],
  ];
  for (const file of [SHELL_PATH, PAGE_PATH, BUTTON_PATH, DATA_PATH]) {
    const src = stripComments(read(file));
    for (const [re, label] of forbidden) {
      assert.ok(
        !re.test(src),
        `${file} must not reference "${label}" (matched ${re})`,
      );
    }
  }
});

// ─── 14. Modified files never import payments / Supabase / RLS / ──
//        booking / Membre Pro / commission / Stripe / migrations.

test("no modified file imports Stripe / payments / Supabase / RLS / migrations / booking / Membre Pro / commission code", () => {
  // Mirrors the forbidden list from
  // `tests/yo/yopratiqoFrQuebecPremiumShell.test.ts`. We
  // intentionally OMIT the audio-manifest restriction because this
  // PR's purpose is wiring audio — the data file legitimately
  // belongs to the audio module, the shell uses a UI wrapper, and
  // the page itself does NOT import the manifest.
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
  ];
  for (const file of [SHELL_PATH, PAGE_PATH, BUTTON_PATH, DATA_PATH]) {
    const src = stripComments(read(file));
    for (const [re, label] of forbidden) {
      assert.ok(
        !re.test(src),
        `${file} must not reference ${label} (${re}) — out of scope for this PR`,
      );
    }
  }
});

// ─── Extra anchor: the new audio data file ships at the documented
// size (14 core phrases + 11 unique dialogue lines = 25 items). One
// dialogue line ("Merci, c’est apprécié.") is intentionally NOT
// duplicated because it already lives in the core-phrase set.
// ─────────────────────────────────────────────────────────────────

test("Lesson 1 premium audio data file ships exactly 25 items (14 core phrases + 11 unique dialogue lines)", () => {
  assert.equal(
    frQuebecPremiumLessonOneAudio.length,
    25,
    `expected 25 Lesson 1 premium audio items (14 core + 11 unique dialogue lines), got ${frQuebecPremiumLessonOneAudio.length}`,
  );
  for (const item of frQuebecPremiumLessonOneAudio) {
    assert.match(
      item.id,
      /^fr-fqp-m1l1-(?:phrase|sentence)-[a-z0-9-]+$/,
      `Lesson 1 premium audio id ${item.id} must follow fr-fqp-m1l1-<type>-<slug>`,
    );
    assert.equal(item.accentProfile, ACCENT_PROFILE_ID);
    assert.equal(item.moduleId, MODULE_ID);
    assert.equal(item.lessonId, LESSON_ID);
    assert.equal(item.targetLanguage, "fr");
  }
});

test("the new manifest items are purely additive (existing FR Quebec intro coverage stays at 19+ items)", () => {
  const introItems = YOPRATIQO_AUDIO_MANIFEST.filter(
    (item) =>
      item.accentProfile === ACCENT_PROFILE_ID &&
      item.moduleId === "francais-quebec-intro",
  );
  assert.ok(
    introItems.length >= 19,
    `FR Quebec intro coverage must remain ≥ 19 items (got ${introItems.length})`,
  );
});

test("audio data file does NOT import server-only modules or runtime SDKs", () => {
  // The data file may import path / type helpers from
  // `@/lib/yo/audio/audioManifest.types-internal` and the accent
  // profile registry — both are pure data. Anything else is a
  // regression.
  const forbidden: ReadonlyArray<[RegExp, string]> = [
    [/from\s+["']openai["']/, "openai SDK"],
    [/from\s+["']@\/lib\/supabase/, "@/lib/supabase*"],
    [/from\s+["']stripe["']/i, "stripe SDK"],
    [/from\s+["']@\/lib\/payments/, "@/lib/payments"],
    [/from\s+["']@\/lib\/booking/, "@/lib/booking"],
  ];
  const src = stripComments(dataSrc);
  for (const [re, label] of forbidden) {
    assert.ok(
      !re.test(src),
      `Lesson 1 audio data file must not import ${label}`,
    );
  }
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
    `\n[yo:fr-quebec-premium-audio] ${passed} assertions passed.`,
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
