/**
 * YoPratiqo · Dominican Republic — flashcards + printables normalization.
 *
 * Verifies that all three RD modules (intro / Module 1, Module 2,
 * Module 3) share the same canonical premium flashcard system and
 * each surface real reinforcement printable exercises (vocabulary
 * match, fill-in-the-blank, scenario multiple choice, production)
 * — not "print the page" content dumps.
 *
 * The launch-critical scope guards (no Stripe / Supabase / payment /
 * audio MP3 / OpenAI / sitemap / Course schema) are exercised by
 * the existing tests/teacherLaunch + tests/teacherProfile suites; we
 * keep this file focused on the pedagogical contract.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function exists(relativePath: string): boolean {
  return existsSync(join(REPO_ROOT, relativePath));
}

function changedFiles(): string[] {
  const commands = [
    "git diff --name-only main...HEAD",
    "git diff --name-only",
    "git diff --name-only --cached",
  ];
  return Array.from(
    new Set(
      commands
        .flatMap((command) =>
          execSync(command, { cwd: REPO_ROOT, encoding: "utf8" })
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean),
        )
        .sort(),
    ),
  );
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

// Files under audit ────────────────────────────────────────────────────

const RD_INTRO_CONTENT = "components/yo/RepubliqueDominicaineContent.tsx";
const M2_CONTENT = "components/yo/DominicanRepublicModule2Content.tsx";
const M3_CONTENT = "components/yo/DominicanRepublicModule3Content.tsx";
const FLASHCARD_PREVIEW = "components/yo/YoFlashcardPreview.tsx";
const PRINTABLES_COMPONENT = "components/yo/DominicanModulePrintables.tsx";
const PRINTABLES_DATA = "lib/yo/dominicanRepublicPrintables.ts";
const FC_ADAPTERS = "lib/yo/dominicanRepublicFlashcardAdapters.ts";

// ─── 1. New shared modules exist ────────────────────────────────────────

test("shared printable component and data files exist", () => {
  assert.ok(exists(PRINTABLES_COMPONENT), `${PRINTABLES_COMPONENT} missing`);
  assert.ok(exists(PRINTABLES_DATA), `${PRINTABLES_DATA} missing`);
  assert.ok(exists(FC_ADAPTERS), `${FC_ADAPTERS} missing`);
});

// ─── 2. Flashcard system is unified ─────────────────────────────────────

test("YoFlashcardPreview accepts an audioRenderer override (RD intro untouched)", () => {
  const src = read(FLASHCARD_PREVIEW);
  // Backward-compatible: default still uses YoSpanishAudioButton.
  assert.match(
    src,
    /<YoSpanishAudioButton/,
    "default flashcard audio button must still be YoSpanishAudioButton",
  );
  // New optional slot exists.
  assert.match(
    src,
    /audioRenderer\?:/,
    "YoFlashcardPreview must expose an optional audioRenderer prop",
  );
  assert.match(
    src,
    /audioRenderer\(card\)/,
    "audioRenderer must receive the YoFlashcard (not just the text)",
  );
});

test("Module 2 mounts the canonical YoFlashcardPreview carousel", () => {
  const src = read(M2_CONTENT);
  assert.match(
    src,
    /import\s*\{\s*YoFlashcardPreview\s*\}\s*from\s*["']@\/components\/yo\/YoFlashcardPreview["']/,
    "Module 2 must import YoFlashcardPreview",
  );
  assert.match(
    src,
    /<YoFlashcardPreview\b/,
    "Module 2 flashcard surface must mount YoFlashcardPreview",
  );
  // Pedagogical: Spanish target text still surfaced via the existing
  // YoSpeechButton pipeline (no MP3, no manifest, no OpenAI).
  assert.ok(
    src.includes("<YoSpeechButton text={card.front}"),
    "Module 2 must keep browser-only speech audio for flashcards",
  );
  // Spanish-first speech locale.
  assert.match(src, /speechLang\s*=\s*["']es-DO["']/);
});

test("Module 3 mounts the canonical YoFlashcardPreview carousel", () => {
  const src = read(M3_CONTENT);
  assert.match(
    src,
    /import\s*\{\s*YoFlashcardPreview\s*\}\s*from\s*["']@\/components\/yo\/YoFlashcardPreview["']/,
    "Module 3 must import YoFlashcardPreview",
  );
  assert.match(src, /<YoFlashcardPreview\b/);
  assert.ok(src.includes("<YoSpeechButton text={card.front}"));
  assert.match(src, /speechLang\s*=\s*["']es-DO["']/);
});

test("Modules 2 and 3 no longer render the legacy <details> flashcard grid", () => {
  // The pre-redesign UX rendered each card as a static <details>
  // grid item gated by `LABEL_BACK` / `LABELS.answer` open-summary
  // copy. Once the canonical carousel is mounted, those exact copy
  // tokens must no longer appear in the flashcard area.
  const m2 = read(M2_CONTENT);
  const m3 = read(M3_CONTENT);
  assert.ok(
    !/<details[^>]*>\s*<summary[^>]*>[\s\S]*?card\.front/i.test(m2),
    "Module 2 should not render `card.front` inside a <details><summary> grid anymore",
  );
  assert.ok(
    !/<details[^>]*>\s*<summary[^>]*>[\s\S]*?card\.front/i.test(m3),
    "Module 3 should not render `card.front` inside a <details><summary> grid anymore",
  );
});

test("flashcard adapters convert Dom2/Dom3 cards into YoFlashcard shape", () => {
  const src = read(FC_ADAPTERS);
  assert.match(src, /export function module2FlashcardsToYo/);
  assert.match(src, /export function module3FlashcardsToYo/);
  // Same visual hint as the RD intro deck — premium consistency.
  assert.match(src, /tropical-flashcard/);
});

// ─── 3. RD intro (Module 1) gains real printables ───────────────────────

test("RD intro page mounts DominicanModulePrintables with module 1 pack", () => {
  const src = read(RD_INTRO_CONTENT);
  assert.match(src, /import\s*\{\s*DominicanModulePrintables\s*\}/);
  assert.match(src, /import\s*\{\s*module1PrintablePack\s*\}/);
  assert.match(src, /<DominicanModulePrintables\s+pack=\{module1PrintablePack\}/);
});

// ─── 4. Module 2 surfaces the new structured exercises ──────────────────

test("Module 2 PrintableWorksheetsSection mounts the shared printables", () => {
  const src = read(M2_CONTENT);
  assert.match(src, /import\s*\{\s*DominicanModulePrintables\s*\}/);
  assert.match(src, /import\s*\{\s*module2PrintablePack\s*\}/);
  assert.match(src, /<DominicanModulePrintables\s+pack=\{module2PrintablePack\}/);
  // Existing premium markers are preserved (existing test contract).
  assert.ok(src.includes("data-yo-module2-printable-worksheets"));
  assert.ok(src.includes("itinerary"));
  assert.ok(src.includes("worksheet"));
  assert.ok(src.includes("print:break-inside-avoid"));
});

// ─── 5. Module 3 surfaces the new structured exercises ──────────────────

test("Module 3 mounts the shared printables next to its legacy sheets", () => {
  const src = read(M3_CONTENT);
  assert.match(src, /import\s*\{\s*DominicanModulePrintables\s*\}/);
  assert.match(src, /import\s*\{\s*module3PrintablePack\s*\}/);
  assert.match(src, /<DominicanModulePrintables\s+pack=\{module3PrintablePack\}/);
});

// ─── 6. Each module pack carries the required exercise mix ──────────────

test("each module printable pack is a real reinforcement worksheet (not page-dump)", async () => {
  const mod = await import(
    "../../lib/yo/dominicanRepublicPrintables"
  );
  const packs = [
    {
      name: "module-1",
      pack: mod.module1PrintablePack,
      requireKinds: ["match", "fill_blank", "production"] as const,
    },
    {
      name: "module-2",
      pack: mod.module2PrintablePack,
      requireKinds: [
        "match",
        "fill_blank",
        "multiple_choice",
        "production",
      ] as const,
    },
    {
      name: "module-3",
      pack: mod.module3PrintablePack,
      requireKinds: [
        "match",
        "fill_blank",
        "multiple_choice",
        "verb_form",
        "production",
      ] as const,
    },
  ];

  for (const { name, pack, requireKinds } of packs) {
    assert.ok(pack, `${name} pack must be exported`);
    assert.equal(pack.moduleId, name);

    const kinds = pack.exercises.map((ex: { kind: string }) => ex.kind);
    for (const required of requireKinds) {
      assert.ok(
        kinds.includes(required),
        `${name} must include a ${required} exercise`,
      );
    }

    // FR + EN + ES coverage on every section-level label.
    for (const key of ["sectionEyebrow", "sectionTitle", "sectionBlurb"] as const) {
      assert.ok(pack[key].fr, `${name}.${key}.fr missing`);
      assert.ok(pack[key].en, `${name}.${key}.en missing`);
      assert.ok(pack[key].es, `${name}.${key}.es missing`);
    }

    // Every exercise must contain enough items to actually practise.
    for (const ex of pack.exercises) {
      const items =
        "pairs" in ex
          ? (ex as { pairs: unknown[] }).pairs
          : "items" in ex
            ? (ex as { items: unknown[] }).items
            : [];
      assert.ok(
        items.length >= 3,
        `${name}.${ex.id} must include >=3 items (got ${items.length})`,
      );
    }
  }
});

test("Module 1 printables target greetings, reception, and arrival production", async () => {
  const { module1PrintablePack } = await import(
    "../../lib/yo/dominicanRepublicPrintables"
  );
  const ids = module1PrintablePack.exercises.map((e: { id: string }) => e.id);
  assert.ok(ids.includes("m1-match-greetings"));
  assert.ok(ids.includes("m1-fill-reception"));
  assert.ok(ids.includes("m1-production-arrival"));
});

test("Module 2 printables target travel vocab + arrival fill-in + dialogue repair + roleplay", async () => {
  const { module2PrintablePack } = await import(
    "../../lib/yo/dominicanRepublicPrintables"
  );
  const ids = module2PrintablePack.exercises.map((e: { id: string }) => e.id);
  assert.ok(ids.includes("m2-match-travel-vocab"));
  assert.ok(ids.includes("m2-fill-arrival"));
  assert.ok(ids.includes("m2-mc-dialogue-repair"));
  assert.ok(ids.includes("m2-production-mini-roleplay"));
});

test("Module 3 printables include vocab + menu fill-in + restaurant scenarios + verb practice + production", async () => {
  const { module3PrintablePack } = await import(
    "../../lib/yo/dominicanRepublicPrintables"
  );
  const ids = module3PrintablePack.exercises.map((e: { id: string }) => e.id);
  assert.ok(ids.includes("m3-match-food-vocab"));
  assert.ok(ids.includes("m3-fill-menu"));
  assert.ok(ids.includes("m3-mc-restaurant-scenarios"));
  assert.ok(ids.includes("m3-verb-yo-usted"));
  assert.ok(ids.includes("m3-production-restaurant"));

  // Verb practice must stay simple-singular and travel-oriented.
  const verbExercise = module3PrintablePack.exercises.find(
    (e: { kind: string }) => e.kind === "verb_form",
  );
  assert.ok(verbExercise);
  for (const item of verbExercise.items as Array<{ person: string }>) {
    assert.ok(
      item.person === "yo" || item.person === "usted",
      "verb practice must stay on yo / usted forms only",
    );
  }
});

// ─── 7. Spanish stays the target language ───────────────────────────────

test("printable exercises keep Spanish prominent (lang='es' on target text)", () => {
  const src = read(PRINTABLES_COMPONENT);
  // At least three lang="es" anchors in the rendered worksheet body.
  const langEsCount = (src.match(/lang="es"/g) ?? []).length;
  assert.ok(
    langEsCount >= 5,
    `expected several Spanish target anchors via lang="es", got ${langEsCount}`,
  );
});

test("printable exercises ship a collapsible answer key per worksheet", () => {
  const src = read(PRINTABLES_COMPONENT);
  assert.ok(src.includes("Answer key"));
  assert.ok(src.includes("Soluciones"));
  assert.ok(src.includes("Solutions"));
  // <details>/<summary> answer-key wrapper.
  assert.match(src, /<details[^>]*>\s*<summary/);
});

// ─── 8. Strict non-goals ────────────────────────────────────────────────

test("no restricted systems are touched by the flashcards/printables work", () => {
  const forbiddenPrefixes = [
    "app/api/",
    "supabase/",
    "content/legal/",
    "app/(app)/legal/",
    "app/(app)/booking/",
    "app/(app)/upgrade/",
    "lib/payments/",
    "lib/config/membrePro",
    "lib/commissions/",
    "lib/seo/",
    "scripts/",
    "public/audio/",
  ];
  for (const file of changedFiles()) {
    for (const prefix of forbiddenPrefixes) {
      assert.ok(!file.startsWith(prefix), `Restricted file touched: ${file}`);
    }
    assert.ok(!file.endsWith(".mp3"), `MP3 changed: ${file}`);
    assert.ok(!file.endsWith(".wav"), `WAV changed: ${file}`);
    assert.ok(!file.endsWith(".m4a"), `M4A changed: ${file}`);
  }
});

test("printable data file does not import or call restricted systems", () => {
  const src = read(PRINTABLES_DATA);
  // Strip non-goals comment block so banned-keyword checks only
  // run against actual code, not the docstring that explicitly
  // names what the file must avoid.
  const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const banned of [
    "stripe.",
    "Stripe(",
    "openai",
    "OpenAI(",
    "createClient",
    "@/lib/payments",
    "@/lib/commissions",
    "@/lib/stripe",
    "@/lib/supabase",
    "audioUrl",
    "storagePath",
    ".mp3",
    ".wav",
  ]) {
    assert.ok(
      !codeOnly.includes(banned),
      `lib/yo/dominicanRepublicPrintables.ts must not reference ${banned}`,
    );
  }
});

test("printables component does not import or call restricted systems", () => {
  const src = read(PRINTABLES_COMPONENT);
  const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const banned of [
    "stripe.",
    "Stripe(",
    "openai",
    "OpenAI(",
    "createClient",
    "@/lib/payments",
    "@/lib/commissions",
    "@/lib/stripe",
    "@/lib/supabase",
    ".mp3",
    "<audio",
  ]) {
    assert.ok(
      !codeOnly.includes(banned),
      `components/yo/DominicanModulePrintables.tsx must not reference ${banned}`,
    );
  }
});

// Tiny manual runner so the suite stays parallel to neighbouring files.

let passed = 0;
let failed = 0;

(async () => {
  console.log(
    `\nRunning ${tests.length} tests - YoPratiqo Dominican flashcards + printables\n`,
  );

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ok  ${name}`);
      passed++;
    } catch (err) {
      const msg = err instanceof Error ? err.stack ?? err.message : String(err);
      console.log(`  FAIL  ${name}\n      ${msg}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed - ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
})();
