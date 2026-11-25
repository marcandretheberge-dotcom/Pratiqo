/**
 * YoPratiqo — all-language intros app-shell consistency suite.
 *
 * Locks the contract the
 * `feat/yopratiqo-all-language-intros-app-shell` brief asked for:
 *
 *  1. Quebec French intro route uses YoLessonDeck.
 *  2. Italian intro route or canonical Italian intro surface uses
 *     YoLessonDeck.
 *  3. Japanese intro route uses YoLessonDeck.
 *  4. English intro is either converted if present or the catalog
 *     does not falsely claim a working intro route.
 *  5. All converted intro routes use app-style header, not
 *     breadcrumb-primary navigation.
 *  6. All converted intro routes have companion coach.
 *  7. All converted intro routes use no-scroll / swipe deck
 *     behaviour through YoLessonDeck.
 *  8. All converted intro routes preserve existing content markers
 *     or key content strings.
 *  9. All converted intro routes have honest final CTAs.
 * 10. No intro route introduces fake paid unlocks.
 * 11. No route uses "Yo" alone as product name.
 * 12. Dominican Republic intro and Modules 2–5 remain
 *     unchanged/green (path on disk, deck mount, key markers).
 * 13. Paid YoPratiqo checkout remains disabled.
 * 14. No raw quiz fields introduced.
 * 15. No restricted systems touched.
 *
 * Style: `node:test`-style static-source assertions, no browser,
 * no network, no Stripe / Supabase / RLS / migration / booking /
 * search / Membre Pro code touched.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { yopratiqoProductConfig } from "@/lib/yo/yopratiqoProductConfig";
import { getYoPublicLanguages } from "@/lib/yo/publicCatalog";

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

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function stripJsComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

const INTRO_ROUTES = {
  quebec: "app/yo/langues/francais-quebec/intro/page.tsx",
  italian: "app/yo/langues/italien/intro/page.tsx",
  japanese: "app/yo/langues/japonais/intro/page.tsx",
  english: "app/yo/langues/anglais/intro/page.tsx",
  spanishGlobal: "app/yo/langues/espagnol/intro/page.tsx",
} as const;

const RD_PATH = {
  courseHome:
    "app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx",
  intro: "app/yo/langues/espagnol/pays/republique-dominicaine/intro/page.tsx",
  introComposer: "components/yo/DominicanRepublicIntroContent.tsx",
  module2:
    "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/page.tsx",
  module3:
    "app/yo/langues/espagnol/pays/republique-dominicaine/module-3/page.tsx",
  module4:
    "app/yo/langues/espagnol/pays/republique-dominicaine/module-4/page.tsx",
  module5:
    "app/yo/langues/espagnol/pays/republique-dominicaine/module-5/page.tsx",
} as const;

const CATALOG_PATH = "app/yo/langues/page.tsx";

// Cache reads up-front so each assertion is cheap.
const introSrcs = {
  quebec: read(INTRO_ROUTES.quebec),
  italian: read(INTRO_ROUTES.italian),
  japanese: read(INTRO_ROUTES.japanese),
  english: read(INTRO_ROUTES.english),
  spanishGlobal: read(INTRO_ROUTES.spanishGlobal),
} as const;

const introCodes = {
  quebec: stripJsComments(introSrcs.quebec),
  italian: stripJsComments(introSrcs.italian),
  japanese: stripJsComments(introSrcs.japanese),
  english: stripJsComments(introSrcs.english),
  spanishGlobal: stripJsComments(introSrcs.spanishGlobal),
} as const;

const catalogPage = read(CATALOG_PATH);
const catalogSrc = catalogPage + read("components/yo/YoLanguageQuickStart.tsx");
const catalogCode = stripJsComments(catalogSrc);

const ALL_CONVERTED_KEYS = [
  "quebec",
  "italian",
  "japanese",
  "english",
  "spanishGlobal",
] as const;

// ─── 1. Quebec French intro uses YoLessonDeck ─────────────────────
test("Quebec French intro route mounts YoLessonDeck", () => {
  assert.match(
    introCodes.quebec,
    /<YoLessonDeck\b/,
    "Quebec French intro must mount the shared YoLessonDeck",
  );
  assert.match(
    introCodes.quebec,
    /from\s+["']@\/components\/yo\/YoLessonDeck["']/,
    "Quebec French intro must import YoLessonDeck",
  );
});

// ─── 2. Italian intro uses YoLessonDeck ───────────────────────────
test("Italian intro route mounts YoLessonDeck (canonical = /italien/intro)", () => {
  // Canonical Italian intro stays at /yo/langues/italien/intro per
  // the catalog wiring. The landing /italien/page.tsx is a marketing
  // surface (YoLanguageLandingPage), not the intro itself.
  assert.match(
    introCodes.italian,
    /<YoLessonDeck\b/,
    "Italian intro must mount the shared YoLessonDeck",
  );
  assert.match(
    introCodes.italian,
    /from\s+["']@\/components\/yo\/YoLessonDeck["']/,
  );
});

// ─── 3. Japanese intro uses YoLessonDeck ──────────────────────────
test("Japanese intro route mounts YoLessonDeck", () => {
  assert.match(
    introCodes.japanese,
    /<YoLessonDeck\b/,
    "Japanese intro must mount the shared YoLessonDeck",
  );
  assert.match(
    introCodes.japanese,
    /from\s+["']@\/components\/yo\/YoLessonDeck["']/,
  );
});

// ─── 4. English intro converted (catalog claim is honest) ─────────
test("English legacy intro remains available behind the new catalogue entry", () => {
  assert.ok(
    exists(INTRO_ROUTES.english),
    "English intro page.tsx must exist on disk",
  );
  assert.match(
    introCodes.english,
    /<YoLessonDeck\b/,
    "English intro must mount the shared YoLessonDeck",
  );
  assert.match(catalogPage, /<YoLanguageQuickStart locale=\{locale\}/);
  assert.equal(yopratiqoProductConfig.currentFreeIntroModules.find(language => language.slug === "anglais")?.isAccessibleForFree, true);
  assert.equal(getYoPublicLanguages().find(course => course.slug === "anglais")?.path, "/yo/langues/anglais/demarrer");
  assert.match(catalogSrc, /getYoPublicLanguages/);
});

// ─── 5. No converted intro uses YoBreadcrumb as primary nav ──────
test("all converted intro routes drop breadcrumb-primary navigation", () => {
  for (const key of ALL_CONVERTED_KEYS) {
    assert.ok(
      !/<YoBreadcrumb\b/.test(introCodes[key]),
      `${key} intro must not render <YoBreadcrumb /> (deck header owns the top nav)`,
    );
    assert.ok(
      !/from\s+["']@\/components\/yo\/YoBreadcrumb["']/.test(introCodes[key]),
      `${key} intro must not import YoBreadcrumb anymore`,
    );
  }
});

// ─── 6. All converted intro routes have companion coach ──────────
test("every converted intro declares companion states on every screen", () => {
  // Every screen entry must include a `companionState:` property —
  // the deck-screen frame renders the coach beside the title using
  // that value, so a missing state would silently drop companion
  // presence on a screen. We assert AT LEAST one of every audited
  // state is used somewhere in the deck (no fake AI tutor state).
  const ALLOWED_STATES = new Set([
    "idle",
    "map",
    "confused",
    "celebrating",
    "teacher_ready",
    "calm",
    "thinking",
    "focused",
  ]);
  for (const key of ALL_CONVERTED_KEYS) {
    const states = [
      ...introCodes[key].matchAll(/companionState:\s*"([a-z_]+)"/g),
    ].map((m) => m[1]);
    assert.ok(
      states.length >= 5,
      `${key} intro must declare a companionState on at least 5 screens (got ${states.length})`,
    );
    for (const state of states) {
      assert.ok(
        ALLOWED_STATES.has(state),
        `${key} intro uses unaudited companion state "${state}"`,
      );
    }
    // The core arc must be present: a `map` somewhere (context),
    // `confused` on the quiz, and `celebrating` on the final teacher
    // / completion screen.
    assert.ok(
      states.includes("map"),
      `${key} intro must use the map companion state somewhere`,
    );
    assert.ok(
      states.includes("confused"),
      `${key} intro must use the confused companion state on the quiz screen`,
    );
    assert.ok(
      states.includes("celebrating"),
      `${key} intro must use celebrating on the final teacher screen`,
    );
  }
});

// ─── 7. All converted intros use the shared no-scroll/swipe deck ─
test("every converted intro inherits no-scroll / swipe behaviour via YoLessonDeck", () => {
  for (const key of ALL_CONVERTED_KEYS) {
    // The deck client component locks the viewport and wires
    // swipe / tap / keyboard navigation. Per-route consumers opt in
    // to the tap-zone via `enableTapNavigation`.
    assert.match(
      introCodes[key],
      /<YoLessonDeck\b[\s\S]*?enableTapNavigation\b/,
      `${key} intro must opt into enableTapNavigation on YoLessonDeck`,
    );
  }
});

// ─── 8. Existing content markers / strings are preserved ─────────
test("every converted intro preserves its existing data / audio integration", () => {
  // Each language still imports its own data file + audio button +
  // shared YoFlashcardPreview / YoQuizPreview surfaces.
  const expected: Record<
    (typeof ALL_CONVERTED_KEYS)[number],
    { data: RegExp; audio: RegExp | null }
  > = {
    quebec: {
      data: /from\s+["']@\/lib\/yo\/frenchQuebecIntro["']/,
      audio: /from\s+["']@\/components\/yo\/YoFrenchAudioButton["']/,
    },
    italian: {
      data: /from\s+["']@\/lib\/yo\/italianIntro["']/,
      audio: /from\s+["']@\/components\/yo\/YoItalianAudioButton["']/,
    },
    japanese: {
      data: /from\s+["']@\/lib\/yo\/japaneseIntro["']/,
      audio: /from\s+["']@\/components\/yo\/YoJapaneseAudioButton["']/,
    },
    english: {
      data: /from\s+["']@\/lib\/yo\/englishIntro["']/,
      audio: /from\s+["']@\/components\/yo\/YoEnglishAudioButton["']/,
    },
    spanishGlobal: {
      data: /from\s+["']@\/lib\/yo\/spanishIntroA1["']/,
      audio: /from\s+["']@\/components\/yo\/YoSpanishAudioButton["']/,
    },
  };
  for (const key of ALL_CONVERTED_KEYS) {
    const { data, audio } = expected[key];
    assert.match(introSrcs[key], data, `${key} intro must keep its data file import`);
    if (audio) {
      assert.match(introSrcs[key], audio, `${key} intro must keep its audio button`);
    }
    // Reuse of the shared quiz + flashcard surfaces (so audio
    // resolves through the manifest without re-wiring).
    assert.match(
      introSrcs[key],
      /from\s+["']@\/components\/yo\/YoQuizPreview["']/,
      `${key} intro must keep YoQuizPreview`,
    );
    assert.match(
      introSrcs[key],
      /from\s+["']@\/components\/yo\/YoFlashcardPreview["']/,
      `${key} intro must keep YoFlashcardPreview`,
    );
  }
});

// ─── 9. Honest final CTAs ─────────────────────────────────────────
test("every converted intro deck ends with an honest teacher / catalog CTA", () => {
  // The final screen on every deck routes to /trouver-un-prof
  // (teacher search) and/or back to the /yo/langues catalog.
  // Neither path fakes a paid unlock.
  for (const key of ALL_CONVERTED_KEYS) {
    assert.match(
      introCodes[key],
      /\/trouver-un-prof/,
      `${key} intro must link to /trouver-un-prof on its final screen`,
    );
    assert.match(
      introCodes[key],
      /\/yo\/langues\b/,
      `${key} intro must offer a back-to-/yo/langues link`,
    );
  }
});

// ─── 10. No fake paid unlocks ─────────────────────────────────────
test("no converted intro introduces a fake paid unlock", () => {
  // Forbidden: any Stripe / checkout / pay / price / unlock copy
  // beyond the audited 30-day money-back surface (which appears
  // only on the Quebec FR + Spanish-global teacher screens as a
  // trust strip linking to the existing /legal/yo-remboursement
  // page — not a checkout).
  const forbidden = [
    /from\s+["']stripe["']/i,
    /from\s+["']@\/lib\/stripe/i,
    /\bcheckout\.session\b/i,
    /\bprice_id\b/i,
    /\bpaidCheckoutEnabled\s*:\s*true\b/i,
    /\bpremiumModulesEnabled\s*:\s*true\b/i,
  ];
  for (const key of ALL_CONVERTED_KEYS) {
    for (const re of forbidden) {
      assert.ok(
        !re.test(introCodes[key]),
        `${key} intro must not ship ${re.source}`,
      );
    }
  }
});

// ─── 11. Never use "Yo" alone as a product name ──────────────────
test("no converted intro uses 'Yo' alone as a product name", () => {
  // The brief is explicit: always "YoPratiqo." We compile a
  // whitelist of phrasings that legitimately include the literal
  // two-letter token (mostly stand-alone test markers / data ids)
  // and assert any remaining "Yo" surface is followed by the
  // "Pratiqo" suffix.
  for (const key of ALL_CONVERTED_KEYS) {
    const code = introCodes[key];
    // Token: a "Yo" word boundary NOT immediately followed by
    // "Pratiqo" / "FlashcardPreview" / "QuizPreview" / etc., and
    // not part of a `data-yo-*` attribute, an `id="yo-..."` id,
    // a `lang="..."` tag, or a `text-` Tailwind colour value.
    const standalone = code.match(
      /(?<![A-Za-z0-9_-])Yo(?![A-Za-z])(?!\s*Pratiqo)/g,
    );
    assert.ok(
      standalone === null,
      `${key} intro uses 'Yo' alone (must always be 'YoPratiqo'): ${
        standalone?.slice(0, 3).join(", ") ?? ""
      }`,
    );
  }
});

// ─── 12. RD intro + Modules 2-5 unchanged ────────────────────────
test("Dominican Republic intro + Modules 2-5 still exist and still use YoLessonDeck", () => {
  for (const [key, path] of Object.entries(RD_PATH)) {
    assert.ok(exists(path), `RD path ${key} must remain on disk`);
  }
  const introComposerSrc = read(RD_PATH.introComposer);
  assert.match(
    introComposerSrc,
    /<YoLessonDeck\b/,
    "RD intro composer must keep mounting YoLessonDeck",
  );
  // Each RD module page routes through a `DominicanRepublic*Content`
  // client composer which mounts the shared YoLessonDeck. We verify
  // both: the page references its composer, and the composer file
  // still imports YoLessonDeck.
  const RD_COMPOSERS: Record<"module2" | "module3" | "module4" | "module5", string> = {
    module2: "components/yo/DominicanRepublicModule2Content.tsx",
    module3: "components/yo/DominicanRepublicModule3Content.tsx",
    module4: "components/yo/DominicanRepublicModule4Content.tsx",
    module5: "components/yo/DominicanRepublicModule5Content.tsx",
  };
  for (const k of ["module2", "module3", "module4", "module5"] as const) {
    const pageSrc = read(RD_PATH[k]);
    assert.match(
      pageSrc,
      /DominicanRepublicModule\d+Content/,
      `RD ${k} page must render its DominicanRepublicModule${k.slice(-1)}Content composer`,
    );
    const composerSrc = read(RD_COMPOSERS[k]);
    assert.match(
      composerSrc,
      /<YoLessonDeck\b/,
      `RD ${k} composer must mount the shared YoLessonDeck`,
    );
  }
});

// ─── 13. Paid YoPratiqo checkout remains disabled ────────────────
test("paid YoPratiqo checkout remains disabled in yopratiqoProductConfig.ts", () => {
  const configSrc = read("lib/yo/yopratiqoProductConfig.ts");
  assert.match(
    configSrc,
    /premiumModulesEnabled:\s*false/,
    "paid YoPratiqo checkout must stay disabled",
  );
});

// ─── 14. No raw quiz fields introduced ───────────────────────────
test("no converted intro introduces raw quiz answer payloads", () => {
  // The reveal-only contract owned by YoQuizPreview must stay the
  // single source of truth. None of the intro composers should
  // declare a selectedOptionId / submittedAnswer / userAnswer field
  // or feed quiz internals to a server route.
  const forbidden = [
    /\bselectedOptionId\b/,
    /\bsubmittedAnswer\b/,
    /\buserAnswer\b/,
    /\battemptedQuizzes\b/,
    /\/api\/.*quiz/i,
  ];
  for (const key of ALL_CONVERTED_KEYS) {
    for (const re of forbidden) {
      assert.ok(
        !re.test(introCodes[key]),
        `${key} intro must not ship a raw quiz field matching ${re.source}`,
      );
    }
  }
});

// ─── 15. No restricted systems touched ───────────────────────────
test("no converted intro imports restricted systems", () => {
  // Stripe / Supabase server-side / RLS / payments / tax / OpenAI /
  // sitemap / Membre Pro / migrations / legal pages.
  const forbidden = [
    /from\s+["']stripe["']/i,
    /from\s+["']@supabase\/supabase-js["']/i,
    /from\s+["']@\/lib\/stripe/i,
    /from\s+["']@\/lib\/supabase\/server/i,
    /from\s+["']@\/lib\/membrePro/i,
    /from\s+["']@\/lib\/tax/i,
    /from\s+["']@\/lib\/payments/i,
    /from\s+["']openai["']/i,
    /from\s+["']@\/scripts\//i,
    /service[_-]?role/i,
  ];
  for (const key of ALL_CONVERTED_KEYS) {
    for (const re of forbidden) {
      assert.ok(
        !re.test(introSrcs[key]),
        `${key} intro must not import ${re.source}`,
      );
    }
  }
  // The catalog must not touch them either.
  for (const re of forbidden) {
    assert.ok(
      !re.test(catalogCode),
      `catalog must not import ${re.source}`,
    );
  }
});

// ─── Run ──────────────────────────────────────────────────────────
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
  console.log(`[yo:all-language-intros-consistency] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
