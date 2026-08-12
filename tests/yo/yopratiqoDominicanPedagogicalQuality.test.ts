/**
 * YoPratiqo Dominican Republic pedagogical quality guard.
 *
 * This test keeps the RD series focused on useful active language practice
 * while preserving cultural knowledge as context, readings, and culture cards.
 * It does not touch audio generation, OpenAI, payments, marketplace, legal, or
 * database systems.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { dominicanRepublicA1 } from "@/lib/yo/dominicanRepublicA1";
import { dominicanRepublicA2Capstone } from "@/lib/yo/dominicanRepublicA2Capstone";
import { dominicanRepublicExplore } from "@/lib/yo/dominicanRepublicExplore";
import { dominicanRepublicFoodCulture } from "@/lib/yo/dominicanRepublicFoodCulture";
import { dominicanRepublicHotelAirport } from "@/lib/yo/dominicanRepublicHotelAirport";
import {
  module1PrintablePack,
  module2PrintablePack,
  module3PrintablePack,
} from "@/lib/yo/dominicanRepublicPrintables";

const REPO_ROOT = process.cwd();

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function exists(relativePath: string): boolean {
  return existsSync(join(REPO_ROOT, relativePath));
}

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function runGit(args: string[]): string[] {
  try {
    return execFileSync("git", args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function changedFiles(): string[] {
  return Array.from(
    new Set([
      ...runGit(["diff", "--name-only"]),
      ...runGit(["diff", "--cached", "--name-only"]),
      ...runGit(["diff", "--name-only", "origin/main...HEAD"]),
    ]),
  ).sort();
}

const IGNORED_STRING_KEYS = new Set([
  "ariaLabel",
  "categoryKey",
  "dataAttribute",
  "headingId",
  "heroImagePath",
  "id",
  "imagePath",
  "kind",
  "moduleId",
  "storagePath",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLocalizedString(value: unknown): value is { fr: string; en: string; es?: string } {
  return (
    isRecord(value) &&
    typeof value.fr === "string" &&
    typeof value.en === "string" &&
    (value.es === undefined || typeof value.es === "string")
  );
}

function collectLearnerStrings(
  value: unknown,
  path: string[] = [],
  acc: Array<{ path: string; value: string }> = [],
): Array<{ path: string; value: string }> {
  const key = path[path.length - 1] ?? "";
  if (typeof value === "string") {
    if (!IGNORED_STRING_KEYS.has(key)) {
      acc.push({ path: path.join("."), value });
    }
    return acc;
  }

  if (isLocalizedString(value)) {
    for (const locale of ["fr", "en", "es"] as const) {
      const localeValue = value[locale];
      if (localeValue) acc.push({ path: [...path, locale].join("."), value: localeValue });
    }
    return acc;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectLearnerStrings(item, [...path, String(index)], acc));
    return acc;
  }

  if (isRecord(value)) {
    for (const [childKey, childValue] of Object.entries(value)) {
      collectLearnerStrings(childValue, [...path, childKey], acc);
    }
  }

  return acc;
}

const RD_DATASETS = [
  { name: "intro", data: dominicanRepublicA1 },
  { name: "module2", data: dominicanRepublicHotelAirport },
  { name: "module3", data: dominicanRepublicFoodCulture },
  { name: "module4", data: dominicanRepublicExplore },
  { name: "module5", data: dominicanRepublicA2Capstone },
  { name: "module1Printables", data: module1PrintablePack },
  { name: "module2Printables", data: module2PrintablePack },
  { name: "module3Printables", data: module3PrintablePack },
] as const;

function allLearnerStrings(): Array<{ source: string; path: string; value: string }> {
  return RD_DATASETS.flatMap(({ name, data }) =>
    collectLearnerStrings(data).map((entry) => ({ source: name, ...entry })),
  );
}

function flashcardById<T extends { id: string }>(cards: T[], id: string): T {
  const card = cards.find((item) => item.id === id);
  assert.ok(card, `missing flashcard ${id}`);
  return card;
}

function assertNoSimpleTranslationPrompt(source: string): void {
  const simpleTranslationPatterns = [
    /translate\s+(mang[úu]|cacao|hotel|taxi)/i,
    /tradu(?:is|ce|cir|zca|isez)[^.\n]*(mang[úu]|cacao|hotel|taxi)/i,
    /what does\s+(mang[úu]|cacao|hotel|taxi)\s+mean/i,
    /que signifie[^.\n]*(mang[úu]|cacao|hotel|taxi)/i,
    /qué significa[^.\n]*(mang[úu]|cacao|hotel|taxi)/i,
  ];
  for (const pattern of simpleTranslationPatterns) {
    assert.ok(!pattern.test(source), `simple translation prompt found: ${pattern}`);
  }
}

test("RD intro and Modules 2-5 routes remain intact", () => {
  const routes = [
    "app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx",
    "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/page.tsx",
    "app/yo/langues/espagnol/pays/republique-dominicaine/module-3/page.tsx",
    "app/yo/langues/espagnol/pays/republique-dominicaine/module-4/page.tsx",
    "app/yo/langues/espagnol/pays/republique-dominicaine/module-5/page.tsx",
  ];
  for (const route of routes) {
    assert.ok(exists(route), `${route} was removed`);
  }
});

test("learner-facing RD copy avoids vague printable prompts and English jargon", () => {
  const banned = [
    /Que signifie ce mot \?/,
    /What does this word mean\?/,
    /¿Qué significa esta palabra\?/,
    /classe-le mentalement/i,
    /mentally sort/i,
    /\bchunks?\b/i,
  ];

  for (const entry of allLearnerStrings()) {
    for (const pattern of banned) {
      assert.ok(
        !pattern.test(entry.value),
        `${entry.source}.${entry.path} contains banned learner copy: ${entry.value}`,
      );
    }
  }
});

test("Module 3 culture flashcards explain culture instead of acting as literal translation cards", () => {
  const cards = dominicanRepublicFoodCulture.flashcards;
  const mangu = flashcardById(cards, "food-mangu");
  const sancocho = flashcardById(cards, "food-sancocho");
  const cacao = flashcardById(cards, "drink-cacao");
  const larimar = flashcardById(cards, "culture-larimar");
  const haitises = flashcardById(cards, "place-haitises");

  assert.match(mangu.back.en, /Mashed plantains/i);
  assert.notEqual(mangu.back.fr.toLowerCase(), "le mangú");
  assert.match(sancocho.back.en, /family|gatherings|stew/i);
  assert.match(cacao.back.en, /agricultural|culture/i);
  assert.notEqual(cacao.back.en.toLowerCase(), "cacao");
  assert.match(larimar.back.en, /Dominican blue stone/i);
  assert.match(haitises.back.en, /national park|mangroves|caves/i);
});

test("Module 5 cultural flashbacks keep cacao and cafe as context, not active translation drills", () => {
  const cacao = flashcardById(dominicanRepublicA2Capstone.flashcards, "fc-cacao");
  const cafe = flashcardById(dominicanRepublicA2Capstone.flashcards, "fc-cafe");
  const larimar = flashcardById(dominicanRepublicA2Capstone.flashcards, "fc-larimar");

  assert.match(cacao.back.en, /culture context/i);
  assert.notEqual(cacao.back.en.toLowerCase(), "cocoa / cacao");
  assert.match(cafe.back.en, /local product|social pause/i);
  assert.match(larimar.back.en, /souvenir/i);
});

test("cultural anchors remain present across culture cards, readings, and flashcards", () => {
  const haystack = allLearnerStrings()
    .map((entry) => entry.value)
    .join("\n")
    .toLowerCase();

  for (const anchor of [
    "mangú",
    "la bandera dominicana",
    "sancocho",
    "merengue",
    "bachata",
    "larimar",
    "cacao",
    "zona colonial",
    "los haitises",
    "taíno",
  ]) {
    assert.ok(haystack.includes(anchor.toLowerCase()), `missing cultural anchor: ${anchor}`);
  }
});

test("quizzes do not use cultural or near-identical words as simple translation prompts", () => {
  for (const data of [
    dominicanRepublicA1,
    dominicanRepublicHotelAirport,
    dominicanRepublicFoodCulture,
    dominicanRepublicExplore,
    dominicanRepublicA2Capstone,
  ]) {
    const quizText = collectLearnerStrings((data as { quizQuestions?: unknown }).quizQuestions)
      .map((entry) => entry.value)
      .join("\n");
    assertNoSimpleTranslationPrompt(quizText);
  }
});

test("printables include real workbook-style exercise formats through Module 5", () => {
  const module5Sheets = dominicanRepublicA2Capstone.printableSheets;
  const module5Kinds = new Set(module5Sheets.map((sheet) => sheet.kind));
  for (const kind of [
    "connectors",
    "fill_blank",
    "past_tense",
    "reading",
    "vocabulary",
    "writing",
  ]) {
    assert.ok(module5Kinds.has(kind), `Module 5 missing printable kind: ${kind}`);
  }

  const module5Vocab = module5Sheets.find((sheet) => sheet.id === "ws-vocabulary");
  assert.ok(module5Vocab, "Module 5 vocabulary sheet missing");
  assert.match(module5Vocab.instructions.fr, /Traduis en français/);
  assert.match(module5Vocab.instructions.fr, /colonne/);
  assert.ok(
    module5Vocab.items.every((item) => /Écris la colonne/.test(item.prompt.fr)),
    "Module 5 vocabulary items must ask for a written category column",
  );

  const module4Vocab = dominicanRepublicExplore.printableSheets.find((sheet) => sheet.id === "ws-vocab");
  assert.ok(module4Vocab, "Module 4 vocabulary sheet missing");
  assert.match(module4Vocab.instructions.fr, /écris sa colonne/i);
});

test("module files keep restricted systems out of this pedagogical patch", () => {
  const files = changedFiles();
  const pedagogicalTouched = files.some((file) => {
    const normalized = file.replace(/\\/g, "/");
    return (
      normalized.startsWith("lib/yo/") ||
      normalized.startsWith("components/yo/") ||
      normalized.startsWith("app/yo/")
    );
  });
  // Sibling non-Yo PRs (admin/payments/auth) share the merge window; skip the
  // scope guard unless this patch actually touches YoPratiqo pedagogical files.
  if (!pedagogicalTouched) return;

  const forbidden = [
    /^app\/api\//,
    /^app\/\(app\)\/legal\//,
    /^content\/legal\//,
    /^lib\/payments\//,
    /^lib\/stripe/i,
    /^lib\/supabase/i,
    /^supabase\//,
    /^scripts\/generate-yopratiqo-audio/i,
    /^public\/.*\.(mp3|wav|m4a)$/i,
    /^app\/sitemap\.ts$/,
    /^lib\/seo\//,
    /^lib\/config\/membrePro\.ts$/,
  ];
  for (const file of files) {
    const normalized = file.replace(/\\/g, "/");
    assert.ok(
      !forbidden.some((pattern) => pattern.test(normalized)),
      `restricted file changed by pedagogical patch: ${file}`,
    );
  }
});

test("audited source files do not import Stripe, Supabase, OpenAI, or audio generators", () => {
  const files = [
    "lib/yo/dominicanRepublicA1.ts",
    "lib/yo/dominicanRepublicHotelAirport.ts",
    "lib/yo/dominicanRepublicFoodCulture.ts",
    "lib/yo/dominicanRepublicExplore.ts",
    "lib/yo/dominicanRepublicA2Capstone.ts",
    "lib/yo/dominicanRepublicPrintables.ts",
    "lib/yo/dominicanRepublicFlashcardAdapters.ts",
    "components/yo/RepubliqueDominicaineContent.tsx",
    "components/yo/DominicanRepublicModule2Content.tsx",
    "components/yo/DominicanRepublicModule3Content.tsx",
    "components/yo/DominicanRepublicModule4Content.tsx",
    "components/yo/DominicanRepublicModule5Content.tsx",
    "components/yo/DominicanModulePrintables.tsx",
  ];
  const bannedImports = [
    /from\s+["']stripe["']/,
    /from\s+["']@\/lib\/stripe/,
    /from\s+["']@supabase\/supabase-js["']/,
    /from\s+["']@\/lib\/supabase/,
    /from\s+["']openai["']/,
    /generate-yopratiqo-audio/,
  ];

  for (const file of files) {
    const src = read(file);
    for (const pattern of bannedImports) {
      assert.ok(!pattern.test(src), `${file} imports restricted system: ${pattern}`);
    }
  }
});

(async () => {
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ok  ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`  FAIL ${name}`);
      console.error((error as Error).message);
    }
  }
  console.log(`\n${tests.length - failed} / ${tests.length} passed`);
  if (failed > 0) process.exitCode = 1;
})();
