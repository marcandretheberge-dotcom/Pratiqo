/**
 * YoPratiqo · Dominican Republic — module loading regression guard.
 *
 * Background: a previous PR introduced the canonical `YoFlashcardPreview`
 * client component on Module 2 / Module 3 / Module 4, but the call sites
 * passed a function literal as the `audioRenderer` prop:
 *
 *   audioRenderer={(card) => <YoSpeechButton text={card.front} ... />}
 *
 * Because `YoFlashcardPreview` is a Client Component (`"use client"`) and
 * the module content components are Server Components, that function
 * crossed the React Server Components boundary at request time and
 * Next.js 15 threw the canonical RSC error:
 *
 *   "Functions cannot be passed directly to Client Components unless
 *    you explicitly expose it by marking it with 'use server'."
 *
 * The page failed to render — Module 2, Module 3 and Module 4 all
 * stopped loading in production.
 *
 * This file holds the long-lived guards that prevent that class of
 * regression from coming back. It is intentionally STRUCTURE-LEVEL so
 * we can run it with `npx tsx` (no build, no dev server, no headless
 * browser required), which keeps it safe for `npm run test:launch-
 * critical`.
 *
 * Restricted-system contract: this test does not import or touch
 * Stripe, Supabase, RLS, payments, sitemap, Course schema, MP3
 * generation, OpenAI calls, the audio manifest, the Membre Pro layer,
 * or the marketplace booking layer. It only reads `.tsx` source files.
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

/**
 * Strip TypeScript / JS comments so structural regexes do not match
 * deprecation notes / migration breadcrumbs we keep in JSDoc on
 * purpose. Order matters: block comments first (multi-line), then
 * line comments.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function exists(relativePath: string): boolean {
  return existsSync(join(REPO_ROOT, relativePath));
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

// ─── Files under audit ──────────────────────────────────────────────────

const M2_PAGE = "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/page.tsx";
const M3_PAGE = "app/yo/langues/espagnol/pays/republique-dominicaine/module-3/page.tsx";
const M4_PAGE = "app/yo/langues/espagnol/pays/republique-dominicaine/module-4/page.tsx";

const M2_CONTENT = "components/yo/DominicanRepublicModule2Content.tsx";
const M3_CONTENT = "components/yo/DominicanRepublicModule3Content.tsx";
const M4_CONTENT = "components/yo/DominicanRepublicModule4Content.tsx";

const M3_INTERACTIVE = "components/yo/DominicanRepublicModule3Interactive.tsx";
const M4_INTERACTIVE = "components/yo/DominicanRepublicModule4Interactive.tsx";

const FLASHCARD_PREVIEW = "components/yo/YoFlashcardPreview.tsx";
const PRINTABLES = "components/yo/DominicanModulePrintables.tsx";

// ─── 1. Route source files exist ────────────────────────────────────────

test("Module 2 / 3 / 4 route source files exist", () => {
  assert.ok(exists(M2_PAGE), `${M2_PAGE} missing`);
  assert.ok(exists(M3_PAGE), `${M3_PAGE} missing`);
  assert.ok(exists(M4_PAGE), `${M4_PAGE} missing`);
});

test("Module 2 / 3 / 4 content components exist", () => {
  assert.ok(exists(M2_CONTENT), `${M2_CONTENT} missing`);
  assert.ok(exists(M3_CONTENT), `${M3_CONTENT} missing`);
  assert.ok(exists(M4_CONTENT), `${M4_CONTENT} missing`);
});

// ─── 2. Page exports are compile-safe ──────────────────────────────────

test("Module 2 page exports a default route component", () => {
  const src = read(M2_PAGE);
  assert.match(
    src,
    /export\s+default\s+(?:async\s+)?function\s+\w+/,
    "Module 2 page must export a default function",
  );
});

test("Module 3 page exports a default route component", () => {
  const src = read(M3_PAGE);
  assert.match(
    src,
    /export\s+default\s+(?:async\s+)?function\s+\w+/,
    "Module 3 page must export a default function",
  );
});

test("Module 4 page exports a default route component", () => {
  const src = read(M4_PAGE);
  assert.match(
    src,
    /export\s+default\s+(?:async\s+)?function\s+\w+/,
    "Module 4 page must export a default function",
  );
});

// ─── 3. RSC boundary: no non-serializable function props ───────────────
// This is the regression that took Module 2 / 3 down. Passing a function
// literal as a prop from a server component to a client component throws
// at runtime in Next.js 15.

test("YoFlashcardPreview is a Client Component", () => {
  const src = read(FLASHCARD_PREVIEW);
  // Must start with "use client" (with optional doc comment block).
  assert.ok(
    /^[\s\S]{0,2000}?["']use client["'];/.test(src),
    "YoFlashcardPreview must declare 'use client' at the top",
  );
});

test("YoFlashcardPreview exposes audioMode as a serializable string union", () => {
  const src = read(FLASHCARD_PREVIEW);
  assert.match(
    src,
    /audioMode\?:\s*"spanish-default"\s*\|\s*"browser-speech"/,
    "audioMode must be a string-literal union (serializable across RSC)",
  );
  // The legacy non-serializable function prop must not come back as
  // *real source* (deprecation breadcrumbs in JSDoc are fine).
  const code = stripComments(src);
  assert.ok(
    !/audioRenderer\?:/.test(code),
    "audioRenderer function prop must not be reintroduced (RSC unsafe)",
  );
});

const SERVER_CONTENT_FILES = [
  { label: "Module 2 content", path: M2_CONTENT },
  { label: "Module 3 content", path: M3_CONTENT },
  { label: "Module 4 content", path: M4_CONTENT },
] as const;

test("Server module content components do not declare 'use client'", () => {
  for (const { label, path } of SERVER_CONTENT_FILES) {
    const src = read(path);
    assert.ok(
      !/^["']use client["'];/m.test(src),
      `${label} must remain a Server Component (no 'use client' directive)`,
    );
  }
});

test("Server module content components never pass a function audioRenderer to YoFlashcardPreview", () => {
  for (const { label, path } of SERVER_CONTENT_FILES) {
    const src = read(path);
    // Catches any of:
    //   audioRenderer={(card) => ...}
    //   audioRenderer={function ...}
    //   audioRenderer={someIdentifier}
    assert.ok(
      !/audioRenderer\s*=\s*\{/.test(src),
      `${label} must not pass an audioRenderer function across the RSC boundary`,
    );
  }
});

test("Server module content components select audioMode='browser-speech' for flashcards", () => {
  for (const { label, path } of SERVER_CONTENT_FILES) {
    const src = read(path);
    assert.match(
      src,
      /<YoFlashcardPreview[\s\S]*?audioMode\s*=\s*["']browser-speech["']/,
      `${label} must wire flashcard audio via audioMode="browser-speech"`,
    );
  }
});

// Generic safety net: no inline arrow-function or function-expression
// props passed to YoFlashcardPreview from any server content file. Any
// such prop would cross the RSC boundary as a function and crash.
test("No inline function props are passed to YoFlashcardPreview from server content", () => {
  const FUNCTION_PROP = /<YoFlashcardPreview\b[\s\S]*?\b\w+\s*=\s*\{\s*(?:\(|function\b|async\s)/;
  for (const { label, path } of SERVER_CONTENT_FILES) {
    const src = read(path);
    assert.ok(
      !FUNCTION_PROP.test(src),
      `${label} must not pass an inline function/arrow prop to YoFlashcardPreview`,
    );
  }
});

// ─── 4. DominicanModulePrintables stays server-safe ────────────────────

test("DominicanModulePrintables is a server component (no browser-only APIs)", () => {
  const src = read(PRINTABLES);
  assert.ok(
    !/^["']use client["'];/m.test(src),
    "DominicanModulePrintables must remain a Server Component",
  );
  // Server components must not touch browser globals.
  assert.ok(
    !/\bwindow\./.test(src),
    "DominicanModulePrintables must not reference window",
  );
  assert.ok(
    !/\bdocument\./.test(src),
    "DominicanModulePrintables must not reference document",
  );
  // No client-side React hooks either.
  assert.ok(
    !/\buseState\b/.test(src),
    "DominicanModulePrintables must not use useState (server-only)",
  );
  assert.ok(
    !/\buseEffect\b/.test(src),
    "DominicanModulePrintables must not use useEffect (server-only)",
  );
  // No event handlers as props (those would imply functions crossing
  // the boundary if forwarded).
  assert.ok(
    !/\bonClick\s*=/.test(src),
    "DominicanModulePrintables must not attach onClick handlers (server-only)",
  );
});

// ─── 5. Print buttons (window.print) are isolated in Client Components ─

test("Module 3 Interactive (which calls window.print) is a Client Component", () => {
  const src = read(M3_INTERACTIVE);
  assert.match(
    src,
    /^["']use client["'];/m,
    "Module 3 Interactive must declare 'use client' (uses window.print)",
  );
  assert.ok(
    /window\.print\s*\(\s*\)/.test(src),
    "Module 3 Interactive print button must call window.print()",
  );
});

test("Module 4 Interactive (which calls window.print) is a Client Component", () => {
  const src = read(M4_INTERACTIVE);
  assert.match(
    src,
    /^["']use client["'];/m,
    "Module 4 Interactive must declare 'use client' (uses window.print)",
  );
  assert.ok(
    /window\.print\s*\(\s*\)/.test(src),
    "Module 4 Interactive print button must call window.print()",
  );
});

test("Server module content components never call window.print directly", () => {
  for (const { label, path } of SERVER_CONTENT_FILES) {
    const src = read(path);
    assert.ok(
      !/window\.print\s*\(/.test(src),
      `${label} must not call window.print() (must live in a Client Component)`,
    );
  }
});

// ─── 6. Modules still ship flashcards + real printables (no hiding) ────

test("Modules 2 / 3 / 4 still mount the canonical YoFlashcardPreview carousel", () => {
  for (const { label, path } of SERVER_CONTENT_FILES) {
    const src = read(path);
    assert.match(
      src,
      /import\s*\{\s*YoFlashcardPreview\s*\}\s*from\s*["']@\/components\/yo\/YoFlashcardPreview["']/,
      `${label} must import YoFlashcardPreview`,
    );
    assert.match(
      src,
      /<YoFlashcardPreview\b/,
      `${label} must mount <YoFlashcardPreview />`,
    );
  }
});

test("Modules 2 and 3 still mount the canonical DominicanModulePrintables pack", () => {
  // Module 2.
  const m2 = read(M2_CONTENT);
  assert.match(
    m2,
    /import\s*\{\s*DominicanModulePrintables\s*\}/,
    "Module 2 must import DominicanModulePrintables",
  );
  assert.match(
    m2,
    /<DominicanModulePrintables\s+pack=\{module2PrintablePack\}/,
    "Module 2 must mount the module-2 printable pack",
  );
  // Module 3.
  const m3 = read(M3_CONTENT);
  assert.match(
    m3,
    /import\s*\{\s*DominicanModulePrintables\s*\}/,
    "Module 3 must import DominicanModulePrintables",
  );
  assert.match(
    m3,
    /<DominicanModulePrintables\s+pack=\{module3PrintablePack\}/,
    "Module 3 must mount the module-3 printable pack",
  );
});

// ─── 7. Restricted-system guard ────────────────────────────────────────
// Sanity: this hotfix should not have touched any of the systems the
// user explicitly forbade. We assert the audited files do not import
// anything from those systems.

const BANNED_IMPORT_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "Stripe", pattern: /from\s+["']stripe["']/ },
  { label: "Stripe lib", pattern: /from\s+["']@\/lib\/stripe/ },
  { label: "Supabase client", pattern: /from\s+["']@supabase\/supabase-js["']/ },
  { label: "Supabase lib", pattern: /from\s+["']@\/lib\/supabase/ },
  { label: "OpenAI", pattern: /from\s+["']openai["']/ },
  { label: "OpenAI lib", pattern: /from\s+["']@\/lib\/openai/ },
];

test("Audited files do not import any restricted system", () => {
  const files = [
    M2_PAGE,
    M3_PAGE,
    M4_PAGE,
    M2_CONTENT,
    M3_CONTENT,
    M4_CONTENT,
    FLASHCARD_PREVIEW,
    PRINTABLES,
  ];
  for (const path of files) {
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
  console.log(
    `\n${tests.length - failed} / ${tests.length} passed`,
  );
  if (failed > 0) {
    process.exitCode = 1;
  }
})();
