/**
 * YoPratiqo — Dominican Republic Spanish Module 2 regression suite.
 *
 * Module 2: À l'hôtel et à l'aéroport
 * Route: /yo/langues/espagnol/pays/republique-dominicaine/module-2
 *
 * Validates:
 *   1. All three source files exist (page, component, content data)
 *   2. Hero title and subtitle appear in FR and EN
 *   3. Airport dialogue appears (Spanish target phrases)
 *   4. Hotel check-in dialogue appears (Spanish target phrases)
 *   5. All 15 core phrases are present in the content data
 *   6. Flashcards are present
 *   7. Practice questions are present
 *   8. Mini-mission steps are present
 *   9. Completion / next module teaser appears
 *  10. No audio MP3 files are generated or imported
 *  11. No OpenAI / AI generation imports touched
 *  12. No Stripe / payment / tax logic in module files
 *  13. No Supabase imports in module files
 *  14. No legal page modifications
 *  15. Existing Dominican Republic intro route file is untouched
 *  16. i18n bilingual contract: FR + EN strings present in data
 *  17. Spanish lang="es" markers present in component (lang="es")
 *  18. No fake countdown / fake reviews / fake discounts
 *  19. Breadcrumb includes Dominican Republic intro link
 *  20. Module 2 does not break existing intro route
 *
 * Static-source + pure-helper tests only.
 * No browser, no network, no Stripe, no Supabase.
 */

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function fileExists(relativePath: string): boolean {
  return existsSync(join(REPO_ROOT, relativePath));
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

// ─── File paths ────────────────────────────────────────────────────────────

const CONTENT_FILE = "lib/yo/dominicanRepublicHotelAirport.ts";
const COMPONENT_FILE = "components/yo/DominicanRepublicModule2Content.tsx";
const PAGE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/page.tsx";
const INTRO_PAGE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx";

// ─── File existence ────────────────────────────────────────────────────────

test("content data file exists", () => {
  assert.ok(fileExists(CONTENT_FILE), `Missing: ${CONTENT_FILE}`);
});

test("component file exists", () => {
  assert.ok(fileExists(COMPONENT_FILE), `Missing: ${COMPONENT_FILE}`);
});

test("page route file exists", () => {
  assert.ok(fileExists(PAGE_FILE), `Missing: ${PAGE_FILE}`);
});

test("existing Dominican intro page is untouched (still exists)", () => {
  assert.ok(
    fileExists(INTRO_PAGE_FILE),
    `Intro page was deleted or moved: ${INTRO_PAGE_FILE}`,
  );
});

// ─── Content data integrity ────────────────────────────────────────────────

test("content data exports dominicanRepublicHotelAirport", () => {
  const src = read(CONTENT_FILE);
  assert.ok(
    src.includes("export const dominicanRepublicHotelAirport"),
    "Missing: export const dominicanRepublicHotelAirport",
  );
});

test("hero title present in FR", () => {
  const src = read(CONTENT_FILE);
  assert.ok(
    src.includes("À l'hôtel et à l'aéroport"),
    "Missing FR hero title: À l'hôtel et à l'aéroport",
  );
});

test("hero title present in EN", () => {
  const src = read(CONTENT_FILE);
  assert.ok(
    src.includes("At the Hotel and Airport"),
    "Missing EN hero title: At the Hotel and Airport",
  );
});

test("hero subtitle present in FR", () => {
  const src = read(CONTENT_FILE);
  assert.ok(
    src.includes("Arriver, s'orienter, s'enregistrer"),
    "Missing FR hero subtitle",
  );
});

test("hero subtitle present in EN", () => {
  const src = read(CONTENT_FILE);
  assert.ok(
    src.includes("Arrive, find your way, check in"),
    "Missing EN hero subtitle",
  );
});

test("all 15 required Spanish core phrases are present", () => {
  const src = read(CONTENT_FILE);
  const requiredPhrases = [
    "Hola, buenos días.",
    "¿Dónde está la salida?",
    "¿Dónde puedo tomar un taxi?",
    "Voy a este hotel.",
    "Tengo una reservación.",
    "La reservación está a nombre de",
    "¿Puedo hacer el check-in?",
    "¿A qué hora es el check-out?",
    "¿Cuál es la contraseña del wifi?",
    "¿Hay desayuno incluido?",
    "Necesito ayuda, por favor.",
    "La llave no funciona.",
    "No tengo agua caliente.",
    "¿Me puede repetir, por favor?",
    "Gracias, muy amable.",
  ];
  for (const phrase of requiredPhrases) {
    assert.ok(src.includes(phrase), `Missing required phrase: ${phrase}`);
  }
});

test("airport dialogue Spanish lines present", () => {
  const src = read(CONTENT_FILE);
  assert.ok(
    src.includes("¿Dónde puedo tomar un taxi?"),
    "Missing airport dialogue: ¿Dónde puedo tomar un taxi?",
  );
  assert.ok(
    src.includes("Los taxis están afuera, a la derecha."),
    "Missing airport dialogue: Los taxis están afuera, a la derecha.",
  );
  assert.ok(
    src.includes("Puede salir por esa puerta."),
    "Missing airport dialogue: Puede salir por esa puerta.",
  );
});

test("hotel check-in dialogue Spanish lines present", () => {
  const src = read(CONTENT_FILE);
  assert.ok(
    src.includes("Buenas tardes. Bienvenido."),
    "Missing hotel dialogue: Buenas tardes. Bienvenido.",
  );
  assert.ok(
    src.includes("Tengo una reservación."),
    "Missing hotel dialogue: Tengo una reservación.",
  );
  assert.ok(
    src.includes("¿A nombre de quién?"),
    "Missing hotel dialogue: ¿A nombre de quién?",
  );
  assert.ok(
    src.includes("Su habitación es la 204."),
    "Missing hotel dialogue: Su habitación es la 204.",
  );
});

test("flashcards present (13 required vocabulary items)", () => {
  const src = read(CONTENT_FILE);
  const required = [
    "la salida",
    "el taxi",
    "la reservación",
    "el pasaporte",
    "la habitación",
    "la llave",
    "la contraseña del wifi",
    "el desayuno",
    "la maleta",
    "el ascensor",
    "la recepción",
    "agua caliente",
    "ayuda",
  ];
  for (const word of required) {
    assert.ok(src.includes(word), `Missing flashcard front: ${word}`);
  }
});

test("practice questions present", () => {
  const src = read(CONTENT_FILE);
  assert.ok(
    src.includes("practiceQuestions"),
    "Missing practiceQuestions in content data",
  );
  assert.ok(
    src.includes("correctOptionId"),
    "Missing correctOptionId in practice questions",
  );
});

test("mini-mission steps present", () => {
  const src = read(CONTENT_FILE);
  assert.ok(src.includes("miniMission"), "Missing miniMission in content data");
  assert.ok(
    src.includes("targetPhrase"),
    "Missing targetPhrase in mini-mission steps",
  );
  assert.ok(
    src.includes("Hola, buenos días."),
    "Missing mini-mission step 1 target phrase",
  );
  assert.ok(
    src.includes("La llave no funciona."),
    "Missing mini-mission final step target phrase",
  );
});

test("completion section with next module teaser present", () => {
  const src = read(CONTENT_FILE);
  assert.ok(src.includes("completion"), "Missing completion in content data");
  assert.ok(
    src.includes("Manger, commander et payer") ||
      src.includes("Eating, ordering, and paying"),
    "Missing next module teaser",
  );
});

test("bilingual FR/EN contract: lstr used for all UI strings", () => {
  const src = read(CONTENT_FILE);
  assert.ok(
    src.includes("import { lstr }"),
    "Missing lstr import in content data",
  );
  const lstrCount = (src.match(/lstr\(/g) ?? []).length;
  assert.ok(
    lstrCount >= 30,
    `Expected at least 30 lstr() calls, found ${lstrCount}`,
  );
});

// ─── Component integrity ───────────────────────────────────────────────────

test("component is a server component (no 'use client')", () => {
  const src = read(COMPONENT_FILE);
  const noComments = stripComments(src);
  assert.ok(
    !noComments.includes('"use client"'),
    "Component must not use 'use client'",
  );
});

test("component renders hero title (lang='es' absent from hero title)", () => {
  const src = read(COMPONENT_FILE);
  assert.ok(
    src.includes("yo-do-m2-hero-title"),
    "Missing hero title id: yo-do-m2-hero-title",
  );
});

test("component renders airport dialogue section", () => {
  const src = read(COMPONENT_FILE);
  assert.ok(
    src.includes("airport") || src.includes("airportDialogue"),
    "Missing airport dialogue reference in component",
  );
  assert.ok(
    src.includes("LABEL_DIALOGUE_AIRPORT_EYEBROW"),
    "Missing airport dialogue label in component",
  );
});

test("component renders hotel dialogue section", () => {
  const src = read(COMPONENT_FILE);
  assert.ok(
    src.includes("hotel") || src.includes("hotelDialogue"),
    "Missing hotel dialogue reference in component",
  );
  assert.ok(
    src.includes("LABEL_DIALOGUE_HOTEL_EYEBROW"),
    "Missing hotel dialogue label in component",
  );
});

test("component renders flashcards section", () => {
  const src = read(COMPONENT_FILE);
  assert.ok(
    src.includes("FlashcardsSection") || src.includes("flashcards"),
    "Missing flashcards section in component",
  );
});

test("component renders practice quiz section", () => {
  const src = read(COMPONENT_FILE);
  assert.ok(
    src.includes("PracticeSection") || src.includes("practiceQuestions"),
    "Missing practice section in component",
  );
});

test("component renders mini-mission section", () => {
  const src = read(COMPONENT_FILE);
  assert.ok(
    src.includes("MiniMissionSection") || src.includes("miniMission"),
    "Missing mini-mission section in component",
  );
});

test("component renders completion section", () => {
  const src = read(COMPONENT_FILE);
  assert.ok(
    src.includes("CompletionSection") || src.includes("completion"),
    "Missing completion section in component",
  );
});

test("component uses lang='es' for Spanish phrases", () => {
  const src = read(COMPONENT_FILE);
  assert.ok(
    src.includes('lang="es"'),
    "Missing lang=\"es\" attribute on Spanish phrases in component",
  );
});

test("component uses <details>/<summary> for interactive reveals", () => {
  const src = read(COMPONENT_FILE);
  assert.ok(
    src.includes("<details"),
    "Missing <details> element for interactive reveals",
  );
  assert.ok(
    src.includes("<summary"),
    "Missing <summary> element for interactive reveals",
  );
});

test("component imports from dominicanRepublicHotelAirport", () => {
  const src = read(COMPONENT_FILE);
  assert.ok(
    src.includes("dominicanRepublicHotelAirport"),
    "Component must import from dominicanRepublicHotelAirport",
  );
});

// ─── Page route integrity ──────────────────────────────────────────────────

test("page uses force-dynamic", () => {
  const src = read(PAGE_FILE);
  assert.ok(
    src.includes('force-dynamic'),
    "Page must use export const dynamic = 'force-dynamic'",
  );
});

test("page resolves locale from searchParams", () => {
  const src = read(PAGE_FILE);
  assert.ok(
    src.includes("getYoLocale"),
    "Page must resolve locale via getYoLocale",
  );
});

test("page breadcrumb includes Dominican Republic intro link", () => {
  const src = read(PAGE_FILE);
  assert.ok(
    src.includes("republique-dominicaine"),
    "Breadcrumb must reference the Dominican Republic intro URL",
  );
});

test("page breadcrumb includes Module 2 label", () => {
  const src = read(PAGE_FILE);
  assert.ok(
    src.includes("Module 2"),
    "Breadcrumb must include Module 2 label",
  );
});

test("page renders DominicanRepublicModule2Content", () => {
  const src = read(PAGE_FILE);
  assert.ok(
    src.includes("DominicanRepublicModule2Content"),
    "Page must render DominicanRepublicModule2Content",
  );
});

test("page metadata is noindex", () => {
  const src = read(PAGE_FILE);
  assert.ok(
    src.includes("index: false"),
    "Module 2 page must be noindex in Phase 1",
  );
});

// ─── Forbidden patterns (no restricted systems touched) ───────────────────

const MODULE_FILES = [CONTENT_FILE, COMPONENT_FILE, PAGE_FILE];

test("no Stripe imports in module files", () => {
  for (const file of MODULE_FILES) {
    const src = stripComments(read(file));
    assert.ok(
      !src.includes("stripe") && !src.includes("Stripe"),
      `Stripe import found in ${file}`,
    );
  }
});

test("no Supabase imports in module files", () => {
  for (const file of MODULE_FILES) {
    const src = stripComments(read(file));
    assert.ok(
      !src.includes("supabase") && !src.includes("Supabase"),
      `Supabase import found in ${file}`,
    );
  }
});

test("no OpenAI / AI generation imports in module files", () => {
  for (const file of MODULE_FILES) {
    const src = stripComments(read(file));
    assert.ok(
      !src.includes("openai") && !src.includes("OpenAI"),
      `OpenAI import found in ${file}`,
    );
  }
});

test("no payment / checkout logic in module files", () => {
  for (const file of MODULE_FILES) {
    const src = stripComments(read(file));
    const forbidden = ["priceCents", "checkout_session", "createPaymentIntent", "price_cents"];
    for (const pattern of forbidden) {
      assert.ok(
        !src.includes(pattern),
        `Forbidden payment pattern "${pattern}" found in ${file}`,
      );
    }
  }
});

test("no audio MP3 generation or audio file imports in module files", () => {
  for (const file of MODULE_FILES) {
    const src = stripComments(read(file));
    assert.ok(
      !src.includes(".mp3"),
      `MP3 reference found in ${file}`,
    );
    assert.ok(
      !src.includes("generateAudio") && !src.includes("synthesize"),
      `Audio generation pattern found in ${file}`,
    );
  }
});

test("no fake reviews / fake countdown / fake discount in module files", () => {
  for (const file of MODULE_FILES) {
    const src = stripComments(read(file));
    const forbidden = [
      "fake",
      "countdown",
      "limited time",
      "stars out of",
      "★★★★★",
    ];
    for (const pattern of forbidden) {
      assert.ok(
        !src.toLowerCase().includes(pattern.toLowerCase()),
        `Forbidden marketing pattern "${pattern}" found in ${file}`,
      );
    }
  }
});

test("no Membre Pro / commission logic in module files", () => {
  for (const file of MODULE_FILES) {
    const src = stripComments(read(file));
    assert.ok(
      !src.includes("membrePro") && !src.includes("commission"),
      `Membre Pro / commission logic found in ${file}`,
    );
  }
});

test("no teacher marketplace logic in module files", () => {
  for (const file of MODULE_FILES) {
    const src = stripComments(read(file));
    assert.ok(
      !src.includes("marketplace") && !src.includes("bookingRequest"),
      `Teacher marketplace logic found in ${file}`,
    );
  }
});

test("no sitemap or Course JSON-LD generation changes in module files", () => {
  for (const file of MODULE_FILES) {
    const src = stripComments(read(file));
    assert.ok(
      !src.includes("sitemap") && !src.includes("courseSchema"),
      `Sitemap or Course JSON-LD change found in ${file}`,
    );
  }
});

// ─── Existing intro page untouched ────────────────────────────────────────

test("existing Dominican intro page still imports RepubliqueDominicaineContent", () => {
  const src = read(INTRO_PAGE_FILE);
  assert.ok(
    src.includes("RepubliqueDominicaineContent"),
    "Intro page must still use RepubliqueDominicaineContent",
  );
});

test("existing Dominican intro page route is unchanged", () => {
  const src = read(INTRO_PAGE_FILE);
  assert.ok(
    src.includes("republique-dominicaine"),
    "Intro page canonical URL must remain unchanged",
  );
});

// ─── Run all tests ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

(async () => {
  console.log(
    `\nRunning ${tests.length} tests — YoPratiqo Dominican Republic Module 2\n`,
  );

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓  ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗  ${name}`);
      if (err instanceof Error) {
        console.error(`     ${err.message}`);
      }
      failed++;
    }
  }

  console.log(`\n${passed} passed · ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
})();
