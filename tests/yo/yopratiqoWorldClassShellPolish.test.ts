/**
 * tests/yo/yopratiqoWorldClassShellPolish.test.ts
 *
 * Static contract test for the world-class learning shell pass.
 * Locks in:
 *
 *   1. No mojibake (UTF-8-saved-as-Windows-1252 corruption) remains
 *      anywhere under components/yo/** or lib/yo/** — guards against
 *      the Module 2/3/4 regression this PR repaired, for every
 *      future YoPratiqo content file too.
 *   2. The desktop workspace (`/yo/langues`, the RD Course Home) no
 *      longer ships the independent-scroll rail pattern
 *      (`overflow-y-auto` per pane + `h-full` on the grid) that
 *      produced "multiple scrollbars" on desktop.
 *   3. The desktop landing hero (`/yo`) no longer forces the narrow
 *      phone-screen column onto `lg+` viewports.
 *   4. The lesson deck (Intro + Modules 2-5) drops its viewport lock
 *      on `lg+` via the shared visual contract.
 *   5. The Intro deck's key-phrase and vocabulary surfaces expose an
 *      audio control (the floating mute pill is a sound-effect
 *      toggle, not phrase narration — narration must live beside
 *      the phrase itself).
 *
 * All assertions are static (file system + string reads). No
 * runtime server, no Supabase, no browser.
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

function listFilesRecursive(rel: string, extensions: string[]): string[] {
  const out: string[] = [];
  const abs = join(REPO_ROOT, rel);
  let entries: string[];
  try {
    entries = readdirSync(abs);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const childAbs = join(abs, entry);
    const childRel = `${rel}/${entry}`;
    let stat;
    try {
      stat = statSync(childAbs);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) {
        continue;
      }
      out.push(...listFilesRecursive(childRel, extensions));
    } else if (extensions.some((ext) => entry.endsWith(ext))) {
      out.push(childRel);
    }
  }
  return out;
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

// ─────────────────────────────────────────────────────────────────────────
// 1. No mojibake anywhere under components/yo/** or lib/yo/**
// ─────────────────────────────────────────────────────────────────────────

test("no mojibake (UTF-8-as-Windows-1252 corruption) remains under components/yo/** or lib/yo/**", () => {
  // The same lead+continuation run pattern the repair script used:
  // a UTF-8 lead-byte artifact (Â/Ã/â/ã) immediately followed by 1+
  // chars from the Latin-1-supplement / cp1252-special-punctuation
  // continuation range. Genuine correctly-encoded text never
  // produces this run (a real "é" sits alone, never glued to a
  // second supplement-range character).
  const MOJIBAKE_RUN = /[ÂÃâã][-¿€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/u;
  const files = [
    ...listFilesRecursive("components/yo", [".tsx", ".ts"]),
    ...listFilesRecursive("lib/yo", [".tsx", ".ts"]),
  ];
  const offenders: string[] = [];
  for (const file of files) {
    const src = read(file);
    if (MOJIBAKE_RUN.test(src)) {
      offenders.push(file);
    }
  }
  assert.deepStrictEqual(
    offenders,
    [],
    `mojibake detected in:\n${offenders.join("\n")}`,
  );
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Desktop workspace no longer ships independent-scroll rails
// ─────────────────────────────────────────────────────────────────────────

test("YoDesktopAppWorkspace panes no longer declare their own overflow-y-auto / h-full scroll lock", () => {
  const src = read("components/yo/YoDesktopAppWorkspace.tsx");
  assert.ok(
    !/overflow-y-auto/.test(src),
    "YoDesktopAppWorkspace must not scope overflow-y-auto to any rail/center pane (that produced independent per-pane scrollbars on desktop)",
  );
  assert.ok(
    !/grid\s+h-full/.test(src) && !/h-full\s+w-full\s+max-w-6xl/.test(src),
    "YoDesktopAppWorkspace's grid wrapper must not lock to h-full anymore (the page scrolls naturally instead)",
  );
});

test("YoDesktopLearningWorkspace no longer wraps desktop content in the viewport-locked YoAppShell", () => {
  const src = read("components/yo/YoDesktopLearningWorkspace.tsx");
  assert.ok(
    !/from\s+["']@\/components\/yo\/YoAppShell["']/.test(src),
    "YoDesktopLearningWorkspace must not import YoAppShell — desktop scrolls the page naturally instead of locking the viewport",
  );
  assert.match(
    src,
    /sticky top-0/,
    "YoDesktopLearningWorkspace must keep its header sticky while the page scrolls",
  );
});

// ─────────────────────────────────────────────────────────────────────────
// 3. /yo desktop hero is a real two-column band, not a forced phone column
// ─────────────────────────────────────────────────────────────────────────

test("YoAppLandingShell widens to a two-column desktop hero on lg+ instead of forcing the phone column", () => {
  const src = read("components/yo/YoAppLandingShell.tsx");
  assert.match(
    src,
    /lg:grid-cols-\[1\.05fr_0\.95fr\]/,
    "YoAppLandingShell must lay the hero + visual slot out in two columns on lg+",
  );
  assert.ok(
    !/lg:max-w-xl(?!\w)/.test(src),
    "YoAppLandingShell must no longer cap the desktop hero at the old phone-rhythm max-w-xl",
  );
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Lesson deck drops its viewport lock on lg+
// ─────────────────────────────────────────────────────────────────────────

test("the shared lesson-deck visual contract drops the viewport lock on lg+ (desktop scrolls naturally)", () => {
  const contractSrc = read("lib/yo/lessonDeckVisualContract.ts");
  for (const [name, expected] of [
    ["DECK_ROOT_CLASSES", /lg:h-auto/],
    ["DECK_HEADER_CLASSES", /lg:sticky lg:top-0/],
    ["DECK_STAGE_CLASSES", /lg:flex-none/],
    ["DECK_SCREEN_HOST_CLASSES", /lg:relative[\s\S]{0,40}lg:overflow-visible/],
    ["DECK_NAV_CLASSES", /lg:sticky lg:bottom-0/],
  ] as const) {
    assert.match(
      contractSrc,
      expected,
      `${name} must declare a desktop (lg:) override that drops the viewport lock`,
    );
  }
  assert.match(
    contractSrc,
    /export const DECK_CONTENT_MAX_WIDTH_LG_CLASS\s*=\s*["']lg:max-w-\[960px\]["']/,
    "the contract must export a desktop content-width override widening the deck past the audited 640px mobile width",
  );
  const deckSrc = read("components/yo/YoLessonDeck.tsx");
  assert.match(
    deckSrc,
    /DECK_CONTENT_MAX_WIDTH_LG_CLASS/,
    "YoLessonDeck must consume the desktop content-width override",
  );
  // The Intro deck's separate "reference" theme render branch must
  // get the same desktop treatment.
  assert.match(
    deckSrc,
    /h-\[100dvh\][\s\S]{0,120}lg:h-auto[\s\S]{0,120}lg:overflow-visible/,
    "the reference-theme deck branch (used by the Intro route) must also drop its viewport lock on lg+",
  );
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Intro key-phrase + vocabulary surfaces expose audio
// ─────────────────────────────────────────────────────────────────────────

test("Intro deck's key-phrase focus card and vocabulary chips render YoSpanishAudioButton", () => {
  const src = read("components/yo/DominicanRepublicIntroContent.tsx");
  const phraseFocusFn = src.slice(
    src.indexOf("function PhraseFocusPage"),
    src.indexOf("function PhraseList"),
  );
  assert.match(
    phraseFocusFn,
    /<YoSpanishAudioButton\b/,
    "PhraseFocusPage (the big key-phrase card) must render an audio control beside the phrase",
  );
  const vocabChipFn = src.slice(
    src.indexOf("function VocabChip"),
    src.indexOf("function InfoRow"),
  );
  assert.match(
    vocabChipFn,
    /<YoSpanishAudioButton\b/,
    "VocabChip (used by the Useful Phrases list) must render an audio control beside the vocabulary item",
  );
});

// ─────────────────────────────────────────────────────────────────────────
// 6. Floating audio toggle never floats off-screen
// ─────────────────────────────────────────────────────────────────────────

test("YoAudioFeedbackProvider's floating mute toggle is viewport-fixed, not absolutely positioned against an arbitrary header height", () => {
  const src = read("components/yo/YoAudioFeedbackProvider.tsx");
  assert.ok(
    !/absolute right-4 top-\[/.test(src),
    "the mute toggle must not use `absolute` with a hardcoded top offset (drifts off-screen / collides with chrome depending on header height)",
  );
  assert.match(
    src,
    /\bfixed\b[\s\S]{0,20}bottom-/,
    "the mute toggle must be `fixed` and anchored to the viewport bottom corner instead",
  );
});

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
  console.log(`[yo:world-class-shell-polish] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
