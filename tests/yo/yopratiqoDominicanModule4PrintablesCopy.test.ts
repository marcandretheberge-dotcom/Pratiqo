/**
 * YoPratiqo · Dominican Republic Module 4 — printable copy guard.
 *
 * The printable worksheets used to mix English jargon ("chunk",
 * "1re personne du singulier") into French/EN/ES learner-facing copy,
 * which gave the page an academic, off-brand feel and was
 * pedagogically confusing (e.g. "1re personne du singulier" is not
 * fully accurate for items like `me gustó` and `fue`).
 *
 * This test pins the new wording — premium, practical, learner-
 * friendly — so future edits cannot regress to the old academic
 * jargon. Worksheet 3 is the focal point, but the guard sweeps every
 * Module 4 surface (data file, server content, SEO description) plus
 * the Module 3 teaser that points to Module 4, because we want zero
 * "chunk" / "chunks" in any learner-visible string anywhere along the
 * RD Module 4 reading path.
 *
 * Restricted-system contract: this file does not import or touch
 * Stripe, Supabase, RLS, payments, sitemap, Course schema, MP3
 * generation, OpenAI calls, the audio manifest, the Membre Pro layer,
 * or the marketplace booking layer. It only reads `.tsx` / `.ts`
 * source files and the runtime worksheet data via dynamic import.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

/**
 * Strip TS/JS comments. Used before scanning source for learner-
 * facing copy, so `chunk` mentions inside JSDoc / inline notes do not
 * trigger the guard. Order matters: block comments before line
 * comments.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * Extract every double-quoted string literal from a TS/TSX source.
 * We only care about double quotes because all `lstr()` and
 * server-component locale ternaries in this codebase use them.
 *
 * Skips identifier-shaped strings (kebab-case / snake-case /
 * lowercase) so internal kind discriminators ("verb_chunks") and
 * stable ids ("ws-verb-chunks", "g-action-chunks") are never confused
 * for learner-facing copy.
 */
function extractLearnerFacingLiterals(src: string): string[] {
  const stripped = stripComments(src);
  const matches = stripped.match(/"((?:\\.|[^"\\])*)"/g) ?? [];
  return matches
    .map((raw) => raw.slice(1, -1))
    .filter((value) => {
      if (value.length === 0) return false;
      // Identifier-shaped: kebab/snake/lowercase letters/digits only.
      // Examples: "verb_chunks", "ws-verb-chunks", "g-action-chunks",
      // "fill_blank", "vocabulary".
      if (/^[a-z0-9][a-z0-9_-]*$/.test(value)) return false;
      return true;
    });
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

// ─── Files under audit ──────────────────────────────────────────────────

const M4_DATA = "lib/yo/dominicanRepublicExplore.ts";
const M4_CONTENT = "components/yo/DominicanRepublicModule4Content.tsx";
const M4_PAGE = "app/yo/langues/espagnol/pays/republique-dominicaine/module-4/page.tsx";
const M3_CONTENT = "components/yo/DominicanRepublicModule3Content.tsx";

const SCANNED_FILES = [M4_DATA, M4_CONTENT, M4_PAGE, M3_CONTENT] as const;

// ─── 1. Files exist ─────────────────────────────────────────────────────

test("Module 4 audited source files exist", () => {
  for (const path of SCANNED_FILES) {
    assert.ok(exists(path), `${path} missing`);
  }
});

// ─── 2. No learner-facing "chunk" / "chunks" anywhere on the M4 path ────

test("no learner-facing copy contains 'chunk' or 'chunks' (FR / EN / ES)", () => {
  for (const path of SCANNED_FILES) {
    const literals = extractLearnerFacingLiterals(read(path));
    for (const literal of literals) {
      assert.ok(
        !/\bchunks?\b/i.test(literal),
        `${path} contains learner-facing 'chunk' / 'chunks': ${JSON.stringify(literal)}`,
      );
    }
  }
});

// ─── 3. Worksheet 3 — exact French wording ──────────────────────────────

test("worksheet 3 uses 'Feuille 3 · Formes utiles au passé' in French", () => {
  const src = read(M4_DATA);
  assert.ok(
    src.includes('"Feuille 3 · Formes utiles au passé"'),
    "FR title must be 'Feuille 3 · Formes utiles au passé'",
  );
});

test("worksheet 3 kind is verb_chunks and uses learner-friendly printable instructions", async () => {
  const mod = await import("../../lib/yo/dominicanRepublicExplore");
  const explore =
    (mod as { dominicanRepublicExplore?: unknown }).dominicanRepublicExplore ??
    mod;
  const sheets =
    (explore as { printableSheets?: Array<{ kind: string; instructions: { fr: string; en: string; es: string } }> })
      .printableSheets ?? [];
  const sheet = sheets.find((s) => s.kind === "verb_chunks");
  assert.ok(sheet, "worksheet 3 (kind: 'verb_chunks') must exist");
  for (const locale of ["fr", "en", "es"] as const) {
    const text = sheet!.instructions[locale];
    assert.ok(
      !/\bchunks?\b/i.test(text),
      `worksheet 3 ${locale} instructions must not use internal 'chunk' jargon`,
    );
    assert.ok(
      /pass[ée]|past|pasado/i.test(text),
      `worksheet 3 ${locale} instructions must describe past-tense practice`,
    );
  }
});

test("worksheet 3 instructions read 'Complète les phrases avec la bonne forme au passé'", () => {
  const src = read(M4_DATA);
  assert.ok(
    /Complète les phrases avec la bonne forme au passé\s*:/.test(src),
    "FR instructions must start with 'Complète les phrases avec la bonne forme au passé:'",
  );
  // The full sentence still lists the 8 target past forms so the
  // learner sees their answer bank inline.
  assert.ok(
    /Complète les phrases avec la bonne forme au passé\s*: fui, visité, tomé, caminé, compré, saqué, me gustó, fue\./.test(
      src,
    ),
    "FR instructions must list all 8 past-tense forms",
  );
});

// ─── 4. Worksheet 3 — preferred EN + ES wording ─────────────────────────

test("worksheet 3 uses 'Worksheet 3 · Useful past-tense travel phrases' in English", () => {
  const src = read(M4_DATA);
  assert.ok(
    src.includes('"Worksheet 3 · Useful past-tense travel phrases"'),
    "EN title must be 'Worksheet 3 · Useful past-tense travel phrases'",
  );
});

test("worksheet 3 EN instructions read 'Complete the sentences with the correct past-tense form'", () => {
  const src = read(M4_DATA);
  assert.ok(
    /Complete the sentences with the correct past-tense form: fui, visité, tomé, caminé, compré, saqué, me gustó, fue\./.test(
      src,
    ),
    "EN instructions must list all 8 past-tense forms",
  );
});


test("worksheet 3 uses 'Hoja 3 · Formas útiles en pasado' in Spanish", () => {
  const src = read(M4_DATA);
  assert.ok(
    src.includes('"Hoja 3 · Formas útiles en pasado"'),
    "ES title must be 'Hoja 3 · Formas útiles en pasado'",
  );
});

test("worksheet 3 ES instructions read 'Completa las frases con la forma correcta en pasado'", () => {
  const src = read(M4_DATA);
  assert.ok(
    /Completa las frases con la forma correcta en pasado: fui, visité, tomé, caminé, compré, saqué, me gustó, fue\./.test(
      src,
    ),
    "ES instructions must list all 8 past-tense forms",
  );
});


// ─── 5. Friendly per-item helper labels (FR) ────────────────────────────

test("worksheet 3 item helpers use the friendly 'Pour dire : ...' pattern in French", () => {
  const src = read(M4_DATA);
  const expectedHelpers = [
    "Pour dire : je suis allé(e).",
    "Pour dire : j'ai visité.",
    "Pour dire : j'ai pris.",
    "Pour dire : j'ai marché.",
    "Pour dire : j'ai acheté.",
    "Pour dire : j'ai pris des photos.",
    "Pour dire : ça m'a beaucoup plu.",
    "Pour dire : c'était très beau.",
  ];
  for (const helper of expectedHelpers) {
    assert.ok(
      src.includes(`"${helper}"`),
      `Worksheet 3 must include FR helper: "${helper}"`,
    );
  }
});

// ─── 6. The "Voir le corrigé" typo fix ──────────────────────────────────

test("answer key label says 'Voir le corrigé' (typo fixed)", () => {
  const src = read(M4_CONTENT);
  assert.ok(
    src.includes('fr: "Voir le corrigé"'),
    "answer key FR label must be 'Voir le corrigé'",
  );
  assert.ok(
    !src.includes('"Voir la corrigé"'),
    "the typo 'Voir la corrigé' must not exist anywhere in M4 content",
  );
});

// ─── 7. The 8 past forms are still part of the worksheet items ──────────

test("worksheet 3 still ships all 8 past-tense forms across its 10 items", async () => {
  const mod = await import("../../lib/yo/dominicanRepublicExplore");
  const explore =
    (mod as { dominicanRepublicExplore?: unknown }).dominicanRepublicExplore ??
    mod;
  const sheets =
    (explore as { printableSheets?: Array<{ kind: string; items: Array<{ answer?: { fr: string; en: string; es: string } }> }> })
      .printableSheets ?? [];
  const sheet = sheets.find((s) => s.kind === "verb_chunks");
  assert.ok(sheet, "worksheet 3 (kind: 'verb_chunks') must exist");
  const merged = (sheet?.items ?? [])
    .map((it) => `${it.answer?.fr ?? ""} ${it.answer?.en ?? ""} ${it.answer?.es ?? ""}`)
    .join(" | ")
    .toLowerCase();
  for (const form of [
    "fui",
    "visité",
    "tomé",
    "caminé",
    "compré",
    "saqué",
    "me gustó",
    "fue",
  ]) {
    assert.ok(
      merged.includes(form.toLowerCase()),
      `worksheet 3 must surface past-tense form: ${form}`,
    );
  }
});

// ─── 8. The pedagogical contract — no academic over-reach ───────────────

test("worksheet 3 stays practical (no '1re personne du singulier' / 'pretérito perfecto simple')", () => {
  const src = read(M4_DATA);
  // The old worksheet 3 instructions claimed "(1re personne du
  // singulier)" but that is technically wrong for `me gustó` / `fue`,
  // and pedagogically heavy for an A1+ learner.
  assert.ok(
    !/Choisis le bon chunk au passé \(1re personne du singulier\)/.test(src),
    "old academic instructions must be gone",
  );
  // Defense against academic re-introduction.
  assert.ok(
    !/pretérito perfecto simple/i.test(src),
    "must not introduce 'pretérito perfecto simple' grammar theory",
  );
  assert.ok(
    !/passé simple/i.test(src),
    "must not introduce French 'passé simple' grammar theory",
  );
});

// ─── 9. Restricted-system contract ──────────────────────────────────────

const BANNED_IMPORT_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "Stripe", pattern: /from\s+["']stripe["']/ },
  { label: "Stripe lib", pattern: /from\s+["']@\/lib\/stripe/ },
  { label: "Supabase client", pattern: /from\s+["']@supabase\/supabase-js["']/ },
  { label: "Supabase lib", pattern: /from\s+["']@\/lib\/supabase/ },
  { label: "OpenAI", pattern: /from\s+["']openai["']/ },
  { label: "OpenAI lib", pattern: /from\s+["']@\/lib\/openai/ },
];

test("audited Module 4 files import no restricted systems", () => {
  for (const path of SCANNED_FILES) {
    const src = read(path);
    for (const { label, pattern } of BANNED_IMPORT_PATTERNS) {
      assert.ok(
        !pattern.test(src),
        `${path} must not import ${label}`,
      );
    }
  }
});

// ─── Runner ────────────────────────────────────────────────────────────

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
  if (failed > 0) {
    process.exitCode = 1;
  }
})();
