/**
 * YoPratiqo — Quebec French / Francisation premium module shell
 * regression suite.
 *
 * The shell at /yo/langues/francais-quebec/module-1 is a future-ready
 * content surface ONLY. It must:
 *
 *   - stay noindex (robots index/follow both false)
 *   - never appear in the sitemap
 *   - never inject Course JSON-LD
 *   - never wire checkout / payments / Stripe / booking / Membre Pro
 *   - keep the global `premiumModulesEnabled` flag at false
 *   - keep per-module `publicLaunchEnabled` and `checkoutEnabled` at false
 *   - never advertise fluency / employment / immigration / TEF/TEFAQ
 *     guarantees, fake reviews, fake ratings, fake discounts, fake
 *     countdowns, or government accreditation
 *   - link back to the free Quebec French intro
 *   - link to /trouver-un-prof?q=francais
 *   - render the 7 planned lesson titles
 *   - carry the legal-safe disclaimer (educational preparation,
 *     marketplace bookings remain separate)
 *
 * Static-source + pure-helper tests only. No browser, no network, no
 * Stripe, no payments, no Supabase calls.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import sitemap from "@/app/sitemap";
import {
  getYoFuturePremiumModuleById,
  getYoFuturePremiumModuleByRoute,
  isYoPremiumModuleCheckoutEnabled,
  isYoPremiumModuleIndexable,
  isYoPremiumModulePubliclyAvailable,
  shouldPublishYoCourseSchema,
  yopratiqoProductConfig,
} from "@/lib/yo/yopratiqoProductConfig";
import {
  buildYoPratiqoMetadata,
  isYoPratiqoRouteIndexable,
  yopratiqoSeoEntries,
} from "@/lib/yo/yopratiqoSeo";
import { frQuebecWorkplaceSurvivalModule } from "@/lib/yo/frQuebecWorkplaceSurvivalModule";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

/**
 * Strip JS comments (block + line) before scanning code for forbidden
 * patterns. Mirrors the helper used by the controlled-indexation test
 * — a doc-comment that explicitly names the concept (e.g. "no fake
 * countdown") must never falsely trigger a regex meant to detect real
 * code.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const PREMIUM_MODULE_ID = "fr-quebec-workplace-survival-1";
const PREMIUM_ROUTE = "/yo/langues/francais-quebec/module-1";
const PREMIUM_PAGE_FILE =
  "app/yo/langues/francais-quebec/module-1/page.tsx";
const PREMIUM_SHELL_FILE = "components/yo/YoPremiumModuleShell.tsx";
const PREMIUM_DATA_FILE = "lib/yo/frQuebecWorkplaceSurvivalModule.ts";
const SEO_ROUTE_ID = "frenchQuebecModuleOne";

const EXPECTED_LESSON_TITLES_FR: readonly string[] = [
  "Arriver au travail et saluer naturellement",
  "Comprendre les consignes simples",
  "Poser une question sans bloquer",
  "Parler de son horaire et de ses disponibilités",
  "Gérer une petite incompréhension",
  "Prendre un rendez-vous ou confirmer une information",
  "Préparer une première pratique avec un professeur",
];

// ── 1. Module route exists ──────────────────────────────────────────

test("module route page file exists at /yo/langues/francais-quebec/module-1", () => {
  const src = read(PREMIUM_PAGE_FILE);
  assert.ok(src.length > 0, "page.tsx must not be empty");
  assert.ok(
    /export\s+default\s+async\s+function\s+\w+/.test(src),
    "page.tsx must export a default async function",
  );
});

test("SEO entry is wired for the module route", () => {
  const entry =
    yopratiqoSeoEntries[
      SEO_ROUTE_ID as keyof typeof yopratiqoSeoEntries
    ];
  assert.ok(entry, "yopratiqoSeoEntries.frenchQuebecModuleOne must exist");
  assert.equal(entry.route, PREMIUM_ROUTE);
  assert.equal(entry.pageType, "future_premium");
  assert.equal(entry.slug, "francais-quebec");
  assert.equal(
    (entry as { premiumModuleId?: string }).premiumModuleId,
    PREMIUM_MODULE_ID,
  );
});

// ── 2. Module page is noindex ──────────────────────────────────────

test("module page robots metadata is { index: false, follow: false }", () => {
  for (const lang of ["fr", "en"] as const) {
    const metadata = buildYoPratiqoMetadata(SEO_ROUTE_ID, lang);
    assert.deepEqual(metadata.robots, { index: false, follow: false });
  }
});

test("isYoPratiqoRouteIndexable() returns false for the module route", () => {
  assert.equal(isYoPratiqoRouteIndexable(SEO_ROUTE_ID), false);
});

test("metadata canonical is exactly https://www.pratiqo.ca/yo/langues/francais-quebec/module-1", () => {
  const metadata = buildYoPratiqoMetadata(SEO_ROUTE_ID, "fr");
  assert.equal(
    String(metadata.alternates?.canonical ?? ""),
    `https://www.pratiqo.ca${PREMIUM_ROUTE}`,
  );
});

test("metadata never references pratiqo.com", () => {
  const metadata = buildYoPratiqoMetadata(SEO_ROUTE_ID, "fr");
  const json = JSON.stringify(metadata);
  assert.ok(
    !/pratiqo\.com/i.test(json),
    "premium shell metadata must not contain pratiqo.com",
  );
});

// ── 3. Module page is not in the sitemap ───────────────────────────

test("sitemap does not include the premium module route", async () => {
  const entries = await sitemap();
  const matching = entries.filter((e) => e.url.endsWith(PREMIUM_ROUTE));
  assert.equal(
    matching.length,
    0,
    `sitemap must not list ${PREMIUM_ROUTE} (got ${matching
      .map((m) => m.url)
      .join(", ")})`,
  );
});

// ── 4. Module page does not inject Course schema ───────────────────

test("Course schema is not eligible for the premium shell page type", () => {
  assert.equal(
    shouldPublishYoCourseSchema("francais-quebec", "future_premium"),
    false,
  );
  // Belt-and-suspenders: future_premium must always return false even
  // if landing was somehow flipped on for the same slug.
  assert.equal(
    shouldPublishYoCourseSchema(
      "francais-quebec",
      "future_premium" as never,
    ),
    false,
  );
});

test("premium shell page never imports or references a Course schema builder", () => {
  const sources = [read(PREMIUM_PAGE_FILE), read(PREMIUM_SHELL_FILE)];
  for (const src of sources) {
    const stripped = stripComments(src);
    assert.ok(
      !/buildYopratiqoCourseSchema/.test(stripped),
      "premium shell must not import buildYopratiqoCourseSchema",
    );
    assert.ok(
      !/yopratiqoCourseSchema/.test(stripped),
      "premium shell must not reference yopratiqoCourseSchema",
    );
    assert.ok(
      !/application\/ld\+json/i.test(stripped),
      "premium shell must not inject application/ld+json (no Course schema)",
    );
  }
});

// ── 5. Page does not import restricted systems ─────────────────────

test("premium shell never imports Stripe / payments / Supabase / RLS / migrations / booking / Membre Pro", () => {
  const forbidden: Array<[RegExp, string]> = [
    [/\bstripe\b/i, "Stripe"],
    [/@\/lib\/payments/, "payments lib"],
    [/getSupabaseClient|getSupabaseAdmin|@\/lib\/supabase/, "Supabase"],
    [/supabase\/migrations/, "Supabase migrations"],
    [/\bRLS\b/, "RLS reference"],
    [/@\/components\/BookingModal|@\/lib\/booking/, "Booking modal/lib"],
    [/\bmembrePro\b|\bMembrePro\b|\bmembre_pro\b/, "Membre Pro config"],
    [/\bcommission\b/i, "commission math"],
    [/yopratiqoAudio|YOPRATIQO_AUDIO_MANIFEST/, "YoPratiqo audio manifest"],
    [/\bcheckout\b/i, "checkout"],
    [/\bpaywall\b/i, "paywall"],
    [/\bpaid_module\b/i, "paid_module identifier"],
  ];
  for (const file of [
    PREMIUM_PAGE_FILE,
    PREMIUM_SHELL_FILE,
    PREMIUM_DATA_FILE,
  ]) {
    const src = stripComments(read(file));
    for (const [re, label] of forbidden) {
      assert.ok(
        !re.test(src),
        `${file} must not reference ${label} (${re}) — out of scope`,
      );
    }
  }
});

// ── 6. premiumModulesEnabled stays false ───────────────────────────

test("premiumModulesEnabled is and stays false", () => {
  assert.equal(yopratiqoProductConfig.premiumModulesEnabled, false);
});

test("futurePremiumEnabled (legacy alias) is also still false", () => {
  assert.equal(yopratiqoProductConfig.futurePremiumEnabled, false);
});

// ── 7 & 8. checkoutEnabled / publicLaunchEnabled remain false ──────

test("future premium module entry is registered with safe defaults", () => {
  const entry = getYoFuturePremiumModuleById(PREMIUM_MODULE_ID);
  assert.ok(entry, "premium module entry must be present in config");
  assert.equal(entry!.id, PREMIUM_MODULE_ID);
  assert.equal(entry!.route, PREMIUM_ROUTE);
  assert.equal(entry!.languageSlug, "francais-quebec");
  assert.equal(entry!.status, "planned");
  assert.equal(entry!.productType, "future_premium_module");
  assert.equal(
    entry!.publicLaunchEnabled,
    false,
    "publicLaunchEnabled must remain false",
  );
  assert.equal(
    entry!.checkoutEnabled,
    false,
    "checkoutEnabled must remain false",
  );
  assert.equal(
    entry!.indexable,
    false,
    "premium-module indexable flag must remain false",
  );
  assert.equal(
    entry!.courseSchemaEligible,
    false,
    "premium-module Course schema eligibility must remain false",
  );
  assert.equal(entry!.teacherBridgeEnabled, true);
  assert.equal(typeof entry!.priceHypothesisCadCents, "number");
});

test("getYoFuturePremiumModuleByRoute returns the same registered entry", () => {
  const byId = getYoFuturePremiumModuleById(PREMIUM_MODULE_ID);
  const byRoute = getYoFuturePremiumModuleByRoute(PREMIUM_ROUTE);
  assert.deepEqual(byId, byRoute);
});

test("isYoPremiumModulePubliclyAvailable / CheckoutEnabled / Indexable all return false", () => {
  assert.equal(isYoPremiumModulePubliclyAvailable(PREMIUM_MODULE_ID), false);
  assert.equal(isYoPremiumModuleCheckoutEnabled(PREMIUM_MODULE_ID), false);
  assert.equal(isYoPremiumModuleIndexable(PREMIUM_MODULE_ID), false);
});

test("unknown ids fail closed across all premium helpers", () => {
  const unknown = "unknown-premium-module-xyz";
  assert.equal(getYoFuturePremiumModuleById(unknown), null);
  assert.equal(getYoFuturePremiumModuleByRoute("/foo/bar"), null);
  assert.equal(isYoPremiumModulePubliclyAvailable(unknown), false);
  assert.equal(isYoPremiumModuleCheckoutEnabled(unknown), false);
  assert.equal(isYoPremiumModuleIndexable(unknown), false);
});

// ── 9. Price hypothesis is never exposed as a live checkout price ──

test("price hypothesis is internal config only — never rendered on the page or shell", () => {
  const entry = getYoFuturePremiumModuleById(PREMIUM_MODULE_ID)!;
  const priceCents = entry.priceHypothesisCadCents;
  // Format the price in both Quebec ($24,99) and English ($24.99)
  // shapes and confirm neither leaks into the page/shell/data sources.
  const dollars = (priceCents / 100).toFixed(2);
  const candidates: readonly string[] = [
    `$${dollars}`,
    `$${dollars.replace(".", ",")}`,
    `${dollars} CAD`,
    `${dollars.replace(".", ",")} CAD`,
    `${priceCents} cents`,
    "priceHypothesisCadCents",
  ];
  for (const file of [
    PREMIUM_PAGE_FILE,
    PREMIUM_SHELL_FILE,
    PREMIUM_DATA_FILE,
  ]) {
    const stripped = stripComments(read(file));
    for (const candidate of candidates) {
      assert.ok(
        !stripped.includes(candidate),
        `${file} must not surface the price hypothesis "${candidate}" — keep it internal-only`,
      );
    }
  }
});

// ── 10. Page includes "Bientôt disponible" / coming soon language ──

test("shell renders Bientôt disponible / Coming soon copy", () => {
  const src = read(PREMIUM_SHELL_FILE);
  assert.ok(
    /Bient[ôo]t disponible/i.test(src),
    "shell must include « Bientôt disponible »",
  );
  assert.ok(
    /Coming soon/i.test(src),
    "shell must include « Coming soon »",
  );
});

// ── 11. Page links back to /yo/langues/francais-quebec/intro ───────

test("page builds an introHref pointing to /yo/langues/francais-quebec/intro", () => {
  const src = read(PREMIUM_PAGE_FILE);
  assert.ok(
    src.includes("/yo/langues/francais-quebec/intro"),
    "page must reference the free intro path",
  );
});

// ── 12. Page links to /trouver-un-prof?q=francais ──────────────────

test("page links to /trouver-un-prof?q=francais", () => {
  const src = read(PREMIUM_PAGE_FILE);
  assert.ok(
    /\/trouver-un-prof\?q=francais/.test(src),
    "page must link to /trouver-un-prof?q=francais (teacher bridge)",
  );
});

// ── 13. All 7 lesson titles flow through the data + shell ──────────

test("data file declares exactly the 7 expected lesson titles in order", () => {
  assert.equal(frQuebecWorkplaceSurvivalModule.lessons.length, 7);
  for (let i = 0; i < EXPECTED_LESSON_TITLES_FR.length; i += 1) {
    assert.equal(
      frQuebecWorkplaceSurvivalModule.lessons[i]!.titleFr,
      EXPECTED_LESSON_TITLES_FR[i],
      `Lesson ${i + 1} title (FR) must match the planned outline`,
    );
  }
});

test("each lesson carries id, English title, scenario, 3 goals, samples, quiz, and bridge prompts", () => {
  for (const lesson of frQuebecWorkplaceSurvivalModule.lessons) {
    assert.ok(lesson.id.length > 0, `lesson ${lesson.titleFr} needs an id`);
    assert.ok(
      lesson.titleEn.length > 0,
      `lesson ${lesson.id} needs an English title`,
    );
    assert.ok(
      lesson.estimatedMinutes >= 8 && lesson.estimatedMinutes <= 15,
      `lesson ${lesson.id} estimatedMinutes must be 8..15`,
    );
    assert.ok(
      lesson.scenarioFr.length > 0 && lesson.scenarioEn.length > 0,
      `lesson ${lesson.id} needs FR + EN scenarios`,
    );
    assert.equal(
      lesson.learningGoalsFr.length,
      3,
      `lesson ${lesson.id} needs exactly 3 FR learning goals`,
    );
    assert.equal(
      lesson.learningGoalsEn.length,
      3,
      `lesson ${lesson.id} needs exactly 3 EN learning goals`,
    );
    assert.ok(
      lesson.samplePhrases.length >= 3 && lesson.samplePhrases.length <= 5,
      `lesson ${lesson.id} needs between 3 and 5 sample phrases (got ${lesson.samplePhrases.length})`,
    );
    for (const phrase of lesson.samplePhrases) {
      assert.ok(phrase.frQuebec.length > 0, "phrase needs a Quebec form");
      assert.ok(phrase.english.length > 0, "phrase needs an English gloss");
    }
    assert.ok(
      lesson.quizPreview.promptFr.length > 0 &&
        lesson.quizPreview.promptEn.length > 0,
      `lesson ${lesson.id} quiz preview needs both FR + EN prompts`,
    );
    assert.ok(
      lesson.teacherBridgePromptFr.length > 0 &&
        lesson.teacherBridgePromptEn.length > 0,
      `lesson ${lesson.id} teacher bridge prompts must be present`,
    );
  }
});

test("each FR lesson title is referenced (or sourced) so the shell renders all 7", () => {
  // The shell renders titles by indexing into the data array, so the
  // indirection is real — we assert both that the data is plumbed
  // through and that the data module exports the planned titles.
  const pageSrc = read(PREMIUM_PAGE_FILE);
  assert.ok(
    pageSrc.includes("frQuebecWorkplaceSurvivalModule.lessons"),
    "page must pass the 7 lessons through to the shell",
  );
  const shellSrc = read(PREMIUM_SHELL_FILE);
  assert.ok(
    shellSrc.includes("lessons.map"),
    "shell must iterate through the 7 lessons",
  );
});

// ── 14. Legal-safe disclaimer concepts ─────────────────────────────

test("shell composes the YoLegalDisclaimer (educational + marketplace separation)", () => {
  const src = read(PREMIUM_SHELL_FILE);
  assert.ok(
    /import\s*\{\s*YoLegalDisclaimer\s*\}\s*from\s*"@\/components\/yo\/YoLegalDisclaimer"/.test(
      src,
    ),
    "shell must import YoLegalDisclaimer",
  );
  assert.ok(
    /<YoLegalDisclaimer\s+locale=\{locale\}\s*\/>/.test(src),
    "shell must render <YoLegalDisclaimer locale={locale} />",
  );
});

test("data file surfaces the honest-promise concepts (educational, no fluency, no exam, no immigration)", () => {
  const src = read(PREMIUM_DATA_FILE);
  // Localized copy lives under honestPromiseFr / honestPromiseEn —
  // we check the EN version for clean keyword-detection.
  assert.ok(
    /No guarantee of fluency, employment, immigration outcomes, TEF\/TEFAQ success, or official francization certification\./.test(
      src,
    ),
    "honestPromiseEn must enumerate the educational-only disclaimer scope",
  );
});

// ── 15. Copy avoids fake commercial signals + fluency claims ───────

test("shell + data + page never include fake commercial signals", () => {
  // The honest-promise / disclaimer copy LEGITIMATELY uses negated
  // forms like "Aucune garantie de fluidité" or "No guarantee of …".
  // To avoid flagging that honest language, this test focuses on
  // unambiguous fake commercial signals: star glyphs, fabricated
  // ratings, percentage discounts, countdowns, "limited-time"
  // urgency, and unreviewed claim words like "review" / "rating"
  // that a future marketer could slip in. Honest *guarantee
  // disclaimers* are pinned positively in the dedicated
  // honest-promise test above.
  const banned: ReadonlyArray<[RegExp, string]> = [
    [/⭐|★/u, "fake star rating glyph"],
    [/\d(?:\.\d)?\s*\/\s*5\s+(?:stars?|[ée]toiles?)/i, "fake N/5 star rating"],
    [/fake\s+review/i, "fake review"],
    [/limited[-\s]time\s+offer/i, "limited-time offer"],
    [/offre\s+limit[ée]e\s+dans\s+le\s+temps/i, "offre limitée dans le temps"],
    [/save\s+\d+%/i, "fake discount language"],
    [/\d+%\s+off\b/i, "fake discount language"],
    [/[ée]conomisez\s+\d+%/i, "fake discount language"],
    [/countdown/i, "countdown"],
    [/compte\s+[àa]\s+rebours/i, "compte à rebours"],
    [/satisfait\s+ou\s+rembours[ée]/i, "satisfait ou remboursé"],
    [/money[-\s]back\s+guarantee/i, "money-back guarantee"],
  ];
  for (const file of [
    PREMIUM_PAGE_FILE,
    PREMIUM_SHELL_FILE,
    PREMIUM_DATA_FILE,
  ]) {
    const stripped = stripComments(read(file));
    for (const [re, label] of banned) {
      assert.ok(
        !re.test(stripped),
        `${file} must not include "${label}" (matched ${re})`,
      );
    }
  }
});

test("data file only frames guarantees as DISCLAIMERS, never as positive promises", () => {
  // For each guarantee-style keyword, look for any positive
  // assertion (no leading negation). We strip comments first so a
  // doc-comment that names the concept negatively doesn't count as
  // a positive assertion in code.
  const stripped = stripComments(read(PREMIUM_DATA_FILE));
  // Accept negation prefixes in either FR or EN.
  const negationPrefix =
    "(?:aucune?\\s+|no\\s+|pas\\s+de\\s+|sans\\s+|without\\s+|jamais\\s+de\\s+)";
  const guaranteeRoots: ReadonlyArray<[string, string]> = [
    ["guaranteed\\s+fluency", "guaranteed fluency"],
    ["guaranteed\\s+employment", "guaranteed employment"],
    ["guaranteed\\s+immigration", "guaranteed immigration"],
    ["guaranteed\\s+TEF\\b", "guaranteed TEF"],
    ["guaranteed\\s+TEFAQ\\b", "guaranteed TEFAQ"],
    ["government\\s+accredit", "government accreditation"],
    ["officially\\s+accredit", "officially accredited"],
    [
      "agr[ée][ée]?\\s+par\\s+le\\s+gouvernement",
      "agréé par le gouvernement",
    ],
    [
      "garantie\\s+de\\s+fluidit",
      "garantie de fluidité (positive)",
    ],
    [
      "garantie\\s+d['’]emploi",
      "garantie d’emploi (positive)",
    ],
    [
      "garantie\\s+d['’]immigration",
      "garantie d’immigration (positive)",
    ],
  ];
  for (const [root, label] of guaranteeRoots) {
    const positive = new RegExp(`(?<!${negationPrefix})${root}`, "i");
    assert.ok(
      !positive.test(stripped),
      `${PREMIUM_DATA_FILE} must not assert "${label}" without a negation prefix`,
    );
  }
});

// ── Sanity check: data shell + product config agree ────────────────

test("module shell id matches the future-premium product config id", () => {
  assert.equal(frQuebecWorkplaceSurvivalModule.id, PREMIUM_MODULE_ID);
  assert.equal(frQuebecWorkplaceSurvivalModule.status, "planned");
});

// ─── LESSON 1 — full content suite ────────────────────────────────
//
// Lesson 1 ("Arriver au travail et saluer naturellement") is the
// first lesson with a populated free-preview body. The tests below
// pin every documented section AND every safety invariant so a
// regression breaks the launch gate. The other six lessons stay
// outline-only on purpose; we only assert their lifecycle flags here.

const LESSON_ONE_ID = "arriver-saluer";

function getLessonOne() {
  const lesson = frQuebecWorkplaceSurvivalModule.lessons[0];
  assert.equal(lesson.id, LESSON_ONE_ID, "Lesson 1 must be the first entry");
  return lesson;
}

test("Lesson 1 has the documented metadata (id, title, minutes, status, accessStatus)", () => {
  const lesson = getLessonOne();
  assert.equal(lesson.id, LESSON_ONE_ID);
  assert.equal(lesson.titleFr, "Arriver au travail et saluer naturellement");
  assert.equal(lesson.titleEn, "Arriving at work and greeting naturally");
  assert.equal(lesson.estimatedMinutes, 10);
  assert.equal(lesson.status, "preview");
  assert.equal(lesson.accessStatus, "coming_soon");
  assert.ok(lesson.content, "Lesson 1 must carry a populated content block");
});

test("every lesson reports accessStatus 'coming_soon' (no live paid surface)", () => {
  for (const lesson of frQuebecWorkplaceSurvivalModule.lessons) {
    assert.equal(
      lesson.accessStatus,
      "coming_soon",
      `lesson ${lesson.id} accessStatus must remain coming_soon`,
    );
  }
});

test("lessons 2-7 stay outline-only ('planned', no content body)", () => {
  for (let i = 1; i < frQuebecWorkplaceSurvivalModule.lessons.length; i += 1) {
    const lesson = frQuebecWorkplaceSurvivalModule.lessons[i]!;
    assert.equal(
      lesson.status,
      "planned",
      `lesson ${lesson.id} (#${i + 1}) status must remain planned`,
    );
    assert.equal(
      lesson.content,
      undefined,
      `lesson ${lesson.id} (#${i + 1}) must not carry a rich content body yet`,
    );
  }
});

test("Lesson 1 declares a clear bilingual learning objective", () => {
  const content = getLessonOne().content!;
  assert.ok(content.objectiveFr.length > 60);
  assert.ok(content.objectiveEn.length > 60);
  assert.ok(
    /tu\/vous|« tu » ou « vous »|« tu »|« vous »/i.test(content.objectiveFr) ||
      /tutoyer|vouvoyer/i.test(content.objectiveFr),
    "FR objective must mention the tu/vous decision",
  );
  assert.ok(
    /tu\b|vous\b/i.test(content.objectiveEn),
    "EN objective must mention the tu/vous decision",
  );
});

test("Lesson 1 carries a longer bilingual scenario than the outline card", () => {
  const lesson = getLessonOne();
  const content = lesson.content!;
  assert.ok(
    content.scenarioFr.length > lesson.scenarioFr.length,
    "Lesson 1 content scenario must be richer than the outline scenario",
  );
  assert.ok(
    content.scenarioEn.length > lesson.scenarioEn.length,
    "Lesson 1 content scenario (EN) must be richer than the outline",
  );
});

test("Lesson 1 cultural note is warm + nuanced (mentions tu/vous + 'follow' rule + workplace variability)", () => {
  const content = getLessonOne().content!;
  // FR side
  assert.ok(/tu/i.test(content.culturalNoteFr));
  assert.ok(/vous/i.test(content.culturalNoteFr));
  assert.ok(
    /suiv|mir/i.test(content.culturalNoteFr),
    "FR cultural note should advise following / mirroring the other person",
  );
  assert.ok(
    /toutes les [ée]quipes ne|pas pareil|diff[ée]rent/i.test(
      content.culturalNoteFr,
    ),
    "FR cultural note should acknowledge that workplaces differ",
  );
  // EN side
  assert.ok(/tu/i.test(content.culturalNoteEn));
  assert.ok(/vous/i.test(content.culturalNoteEn));
  assert.ok(
    /follow|mirror/i.test(content.culturalNoteEn),
    "EN cultural note should advise following / mirroring",
  );
  assert.ok(
    /don't all|differ|reserved/i.test(content.culturalNoteEn),
    "EN cultural note should acknowledge that workplaces differ",
  );
});

test("Lesson 1 ships 12 to 16 core phrases with register + bilingual usage notes", () => {
  const content = getLessonOne().content!;
  assert.ok(
    content.corePhrases.length >= 12 && content.corePhrases.length <= 16,
    `expected 12–16 core phrases, got ${content.corePhrases.length}`,
  );
  const ids = new Set<string>();
  for (const phrase of content.corePhrases) {
    assert.ok(phrase.id.length > 0, "phrase needs a stable id");
    assert.ok(!ids.has(phrase.id), `phrase id ${phrase.id} must be unique`);
    ids.add(phrase.id);
    assert.ok(phrase.frQuebec.length > 0, "phrase needs a Quebec form");
    assert.ok(phrase.english.length > 0, "phrase needs an English gloss");
    assert.ok(
      ["informal", "neutral", "formal"].includes(phrase.register),
      `phrase ${phrase.id} register must be informal | neutral | formal`,
    );
    assert.ok(phrase.usageFr.length > 0, "phrase needs FR usage note");
    assert.ok(phrase.usageEn.length > 0, "phrase needs EN usage note");
  }
});

test("Lesson 1 covers the documented core phrase landmarks", () => {
  const content = getLessonOne().content!;
  const fr = content.corePhrases.map((p) => p.frQuebec).join(" || ");
  const expectedFragments = [
    "Salut",
    "Bonjour",
    "nouveau",
    "Je commence aujourd",
    "Tu peux me tutoyer",
    "vous tutoyer",
    "Je vais m’installer",
    "salle de réunion",
    "habitué",
    "Peux-tu me montrer",
    "remercie",
    "apprécié",
    "À tantôt",
    "Bonne journée",
  ];
  for (const fragment of expectedFragments) {
    assert.ok(
      fr.includes(fragment),
      `core phrases must include a phrase containing "${fragment}"`,
    );
  }
});

test("Lesson 1 has exactly 3 mini-dialogues (reception / colleague / team lead)", () => {
  const content = getLessonOne().content!;
  assert.equal(content.miniDialogues.length, 3);
  const ids = content.miniDialogues.map((d) => d.id);
  assert.equal(new Set(ids).size, 3, "dialogue ids must be unique");
  for (const dialogue of content.miniDialogues) {
    assert.ok(dialogue.titleFr.length > 0);
    assert.ok(dialogue.titleEn.length > 0);
    assert.ok(dialogue.contextFr.length > 0);
    assert.ok(dialogue.contextEn.length > 0);
    assert.ok(
      dialogue.lines.length >= 2,
      `dialogue ${dialogue.id} must have at least 2 lines`,
    );
    for (const line of dialogue.lines) {
      assert.ok(line.frQuebec.length > 0);
      assert.ok(line.english.length > 0);
      assert.ok(line.speakerFr.length > 0);
      assert.ok(line.speakerEn.length > 0);
    }
  }
  // Spot-check the documented archetypes.
  const titlesFr = content.miniDialogues.map((d) => d.titleFr).join(" || ");
  assert.ok(/accueil/i.test(titlesFr), "first dialogue should be reception");
  assert.ok(/coll[èe]gue/i.test(titlesFr), "second dialogue should be a colleague");
  assert.ok(/responsable/i.test(titlesFr), "third dialogue should be the team lead");
});

test("Lesson 1 has exactly 5 tu/vous practice situations with deterministic safest choices", () => {
  const content = getLessonOne().content!;
  assert.equal(content.tuVousPractice.length, 5);
  const ids = content.tuVousPractice.map((s) => s.id);
  assert.equal(new Set(ids).size, 5, "tu/vous situation ids must be unique");
  for (const situation of content.tuVousPractice) {
    assert.ok(situation.situationFr.length > 0);
    assert.ok(situation.situationEn.length > 0);
    assert.ok(
      ["tu", "vous", "follow"].includes(situation.safestChoice),
      `situation ${situation.id} safestChoice must be tu | vous | follow`,
    );
    assert.ok(situation.explanationFr.length > 0);
    assert.ok(situation.explanationEn.length > 0);
  }
  // The expected mapping locks the user-spec scenarios in place.
  const choices = content.tuVousPractice.map((s) => s.safestChoice);
  assert.deepEqual(choices, ["vous", "tu", "follow", "vous", "tu"]);
});

test("Lesson 1 ships exactly 5 quiz questions with valid options + correct ids", () => {
  const content = getLessonOne().content!;
  assert.equal(content.quizQuestions.length, 5);
  const qIds = new Set<string>();
  for (const question of content.quizQuestions) {
    assert.ok(question.id.length > 0);
    assert.ok(!qIds.has(question.id), "quiz question ids must be unique");
    qIds.add(question.id);
    assert.ok(question.promptFr.length > 0);
    assert.ok(question.promptEn.length > 0);
    assert.ok(
      question.options.length >= 3 && question.options.length <= 4,
      `question ${question.id} should expose 3–4 options`,
    );
    const optionIds = new Set(question.options.map((o) => o.id));
    assert.equal(
      optionIds.size,
      question.options.length,
      `question ${question.id} option ids must be unique`,
    );
    assert.ok(
      optionIds.has(question.correctOptionId),
      `question ${question.id} correctOptionId must point at one of its options`,
    );
    assert.ok(question.explanationFr.length > 0);
    assert.ok(question.explanationEn.length > 0);
    for (const opt of question.options) {
      assert.ok(opt.labelFr.length > 0);
      assert.ok(opt.labelEn.length > 0);
    }
  }
});

test("Lesson 1 carries a bilingual reflection prompt", () => {
  const content = getLessonOne().content!;
  assert.ok(content.reflectionPromptFr.length > 30);
  assert.ok(content.reflectionPromptEn.length > 30);
  assert.ok(
    /\?\s*$/.test(content.reflectionPromptFr.trim()),
    "FR reflection prompt should end with a question mark",
  );
  assert.ok(
    /\?\s*$/.test(content.reflectionPromptEn.trim()),
    "EN reflection prompt should end with a question mark",
  );
});

test("Lesson 1 teacher-bridge prompt is consent-safe (no auto-routing, no data sharing, no recording)", () => {
  const content = getLessonOne().content!;
  const fr = content.teacherBridgePromptFr;
  const en = content.teacherBridgePromptEn;
  assert.ok(fr.length > 0, "FR teacher-bridge prompt required");
  assert.ok(en.length > 0, "EN teacher-bridge prompt required");
  // It must invite practice with a teacher, but only when the
  // learner is ready — the consent signal.
  assert.ok(
    /pr[êe]t/i.test(fr),
    "FR teacher-bridge prompt must include the 'when you are ready' consent cue",
  );
  assert.ok(
    /ready/i.test(en),
    "EN teacher-bridge prompt must include the 'when you are ready' consent cue",
  );
  // The forbidden phrasings below match anything that would imply
  // automatic teacher routing, voice recording, or learner-data
  // forwarding — none of those features exist in this PR.
  const banned: ReadonlyArray<[RegExp, string]> = [
    [/voice\s+recording/i, "voice recording (EN)"],
    [/enregistrement\s+vocal/i, "enregistrement vocal (FR)"],
    [/automatic(?:\s+\w+){0,3}\s+(?:teacher|routing)/i, "automatic teacher routing (EN)"],
    [/jumelage\s+automatique/i, "jumelage automatique (FR)"],
    [/forward(?:s|ing)?\s+(?:your|the)\s+(?:logs?|data|results|quiz)/i, "forwarding logs/data/results (EN)"],
    [/transmettre\s+(?:vos|tes)\s+(?:r[ée]sultats|donn[ée]es|logs)/i, "transmettre résultats/données (FR)"],
  ];
  for (const [re, label] of banned) {
    assert.ok(
      !re.test(fr) && !re.test(en),
      `Lesson 1 teacher-bridge prompt must not include "${label}"`,
    );
  }
});

test("Lesson 1 content never mentions voice recording, automatic teacher routing, or data forwarding", () => {
  const content = getLessonOne().content!;
  // We serialize the WHOLE Lesson 1 content tree (every string in
  // every nested section) and scan it once. This is stricter than
  // testing individual fields and gets future contributors for free.
  const serialized = JSON.stringify(content);
  const banned: ReadonlyArray<[RegExp, string]> = [
    [/voice\s+recording/i, "voice recording (EN)"],
    [/voice\s+capture/i, "voice capture (EN)"],
    [/record(?:ing)?\s+your\s+voice/i, "recording your voice (EN)"],
    [/enregistrement\s+vocal/i, "enregistrement vocal (FR)"],
    [/microphone/i, "microphone reference"],
    [/automatic(?:\s+\w+){0,3}\s+(?:teacher|routing|matching)/i, "automatic teacher routing (EN)"],
    [/auto[-\s]?match\w*\s+(?:teacher|prof)/i, "auto-match teacher (EN)"],
    [/jumelage\s+automatique/i, "jumelage automatique (FR)"],
    [/(?:forward|share|send)\s+(?:your|the)\s+(?:quiz|results?|logs?|data|answers?)/i, "data sharing with teacher (EN)"],
    [/(?:partager|transmettre|envoyer)\s+(?:vos|tes)\s+(?:r[ée]ponses|r[ée]sultats|donn[ée]es|logs)/i, "data sharing with teacher (FR)"],
  ];
  for (const [re, label] of banned) {
    assert.ok(
      !re.test(serialized),
      `Lesson 1 content must not mention "${label}"`,
    );
  }
});

test("Lesson 1 content never mentions checkout, payment, Stripe, price, discount, countdown, certification, or guarantees", () => {
  const content = getLessonOne().content!;
  const serialized = JSON.stringify(content);
  const banned: ReadonlyArray<[RegExp, string]> = [
    [/\bcheckout\b/i, "checkout"],
    [/\bpaywall\b/i, "paywall"],
    [/\bstripe\b/i, "Stripe"],
    [/\bpaiement\b/i, "paiement"],
    [/\bpayment\b/i, "payment"],
    [/\$\s?\d/i, "literal price"],
    [/\d+\s*(?:CAD|USD|\$)\b/i, "currency amount"],
    [/\d+\s*%\s*(?:off|de\s+rabais|de\s+r[ée]duction)/i, "percentage discount"],
    [/\bdiscount\b/i, "discount"],
    [/\brabais\b/i, "rabais"],
    [/\bcountdown\b/i, "countdown"],
    [/compte\s+[àa]\s+rebours/i, "compte à rebours"],
    [/limited[-\s]time/i, "limited-time urgency"],
    [/dur[ée]e\s+limit[ée]e/i, "durée limitée"],
    [/\bcertification\b/i, "certification"],
    [/\bdiplome\b|\bdipl[ôo]me\b/i, "diplôme"],
    [/\bguaranteed\b/i, "guaranteed"],
    [/\bgarantie\b/i, "garantie"],
    [/(?:r[ée]sultat|outcome).{0,40}immigration/i, "immigration outcome"],
    [/\bTEFAQ\b/i, "TEFAQ"],
    [/\bTEF\b/i, "TEF"],
    [/employment\s+(?:guarantee|outcome|guaranteed)/i, "employment guarantee"],
    [/garantie\s+d['’]emploi/i, "garantie d’emploi"],
  ];
  for (const [re, label] of banned) {
    assert.ok(
      !re.test(serialized),
      `Lesson 1 content must not mention "${label}"`,
    );
  }
});

test("Lesson 1 page UI renders all 9 documented sections (objective, scenario, culture, phrases, dialogues, tu/vous, quiz, reflection, bridge)", () => {
  const src = read(PREMIUM_SHELL_FILE);
  const labels: Array<[RegExp, string]> = [
    [/PREVIEW_OBJECTIVE_LABEL/, "objective label"],
    [/PREVIEW_SCENARIO_LABEL/, "scenario label"],
    [/PREVIEW_CULTURE_LABEL/, "culture label"],
    [/PREVIEW_PHRASES_LABEL/, "core phrases label"],
    [/PREVIEW_DIALOGUES_LABEL/, "dialogues label"],
    [/PREVIEW_TUVOUS_LABEL/, "tu/vous label"],
    [/PREVIEW_QUIZ_LABEL/, "quiz label"],
    [/PREVIEW_REFLECTION_LABEL/, "reflection label"],
    [/PREVIEW_BRIDGE_LABEL/, "bridge label"],
  ];
  for (const [re, label] of labels) {
    assert.ok(re.test(src), `shell must wire the ${label}`);
  }
  // Each lesson section field must be threaded through the renderer.
  for (const field of [
    "content.objectiveFr",
    "content.objectiveEn",
    "content.scenarioFr",
    "content.scenarioEn",
    "content.culturalNoteFr",
    "content.culturalNoteEn",
    "content.corePhrases",
    "content.miniDialogues",
    "content.tuVousPractice",
    "content.quizQuestions",
    "content.reflectionPromptFr",
    "content.reflectionPromptEn",
    "content.teacherBridgePromptFr",
    "content.teacherBridgePromptEn",
  ]) {
    assert.ok(
      src.includes(field),
      `shell must consume ${field} in the rich preview renderer`,
    );
  }
});

test("Lesson 1 UI never wires forms, voice recording, or progress tracking", () => {
  const src = stripComments(read(PREMIUM_SHELL_FILE));
  const banned: ReadonlyArray<[RegExp, string]> = [
    [/<form\b/i, "<form> tag"],
    [/<input\b/i, "<input> tag"],
    [/<textarea\b/i, "<textarea> tag"],
    [/<button\b/i, "<button> tag"],
    [/onChange|onSubmit|onClick/, "interactive event handler"],
    [/useState|useReducer|useEffect/, "client React hook"],
    [/MediaRecorder|getUserMedia|navigator\.mediaDevices/, "voice recording API"],
    [/audio\s*=|new\s+Audio\b/i, "audio playback"],
    [/progressTracking|trackProgress|recordProgress/i, "progress tracking"],
    [/"use client"/, "client boundary"],
  ];
  for (const [re, label] of banned) {
    assert.ok(!re.test(src), `shell must not include "${label}" (matched ${re})`);
  }
});

test("Lesson 1 still respects the route-level safety contract (noindex + no sitemap + no Course schema)", async () => {
  // These already exist as standalone tests above, but we re-assert
  // them inside the Lesson 1 context so a Lesson 1-specific
  // regression report is unambiguous.
  for (const lang of ["fr", "en"] as const) {
    const metadata = buildYoPratiqoMetadata(SEO_ROUTE_ID, lang);
    assert.deepEqual(metadata.robots, { index: false, follow: false });
  }
  const entries = await sitemap();
  assert.equal(
    entries.filter((e) => e.url.endsWith(PREMIUM_ROUTE)).length,
    0,
    "premium module route must remain absent from the sitemap",
  );
  assert.equal(
    shouldPublishYoCourseSchema("francais-quebec", "future_premium"),
    false,
    "Course schema must remain disabled for the future-premium page type",
  );
  assert.equal(yopratiqoProductConfig.premiumModulesEnabled, false);
  const moduleEntry = getYoFuturePremiumModuleById(PREMIUM_MODULE_ID)!;
  assert.equal(moduleEntry.checkoutEnabled, false);
  assert.equal(moduleEntry.publicLaunchEnabled, false);
});

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
    `\n${passed} YoPratiqo Quebec French premium shell assertions passed.`,
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
