/**
 * YoPratiqo — Quebec French / Francisation Module 1 entry-point
 * discoverability regression suite.
 *
 * Two pages gained a visible "coming soon / preview" entry-point card
 * pointing at the (still noindex) Quebec French workplace module shell
 * at /yo/langues/francais-quebec/module-1:
 *
 *   1. /yo/langues/francais-quebec       — language hub
 *   2. /yo/langues/francais-quebec/intro — free pre-arrival intro
 *
 * Both surfaces must:
 *   - link to the locale-aware module URL (`?lang=fr|en|es`)
 *   - pin the exact spec-mandated FR / EN / ES heading + body + CTA copy
 *   - frame the destination as a "coming soon / preview" only
 *   - NEVER imply checkout / paid access / payment / Stripe / discount /
 *     countdown / unlock-now / guaranteed-outcome
 *   - NEVER import payment, Supabase, RLS, migrations, booking, Membre
 *     Pro, commission, audio-generation, OpenAI, teacher-dashboard, or
 *     live-legal-page code
 *
 * The module ROUTE itself must also stay invariant:
 *   - noindex across FR / EN / ES
 *   - absent from the sitemap
 *   - never eligible for the Course JSON-LD schema
 *
 * Static-source + pure-helper tests only. No browser, no network, no
 * Stripe, no payments, no Supabase calls.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { emptySupplySitemap as sitemap } from "../seo/emptySupplySitemap";
import {
  shouldPublishYoCourseSchema,
  yopratiqoProductConfig,
} from "@/lib/yo/yopratiqoProductConfig";
import { buildYoPratiqoMetadata } from "@/lib/yo/yopratiqoSeo";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

/**
 * Strip JS comments (block + line) before scanning code for forbidden
 * patterns. Same helper used by `yopratiqoFrQuebecPremiumShell.test.ts`
 * — a doc-comment that explicitly names a forbidden concept ("no
 * checkout", "no Stripe", …) must never falsely trigger a regex meant
 * to detect real code.
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

// ── File registry ───────────────────────────────────────────────────────

const HUB_PAGE_FILE = "app/yo/langues/francais-quebec/page.tsx";
const INTRO_PAGE_FILE = "app/yo/langues/francais-quebec/intro/page.tsx";
const CARD_COMPONENT_FILE = "components/yo/YoUpcomingModuleCard.tsx";
const MODULE_ROUTE = "/yo/langues/francais-quebec/module-1";
const SEO_ROUTE_ID = "frenchQuebecModuleOne";

/**
 * The complete list of files this PR touched (or added) that the
 * commercial-signal / forbidden-imports scans must run against. Listed
 * once here so a future contributor adding a new entry-point file only
 * has to add it in one place.
 */
const MODIFIED_FILES: readonly string[] = [
  HUB_PAGE_FILE,
  INTRO_PAGE_FILE,
  CARD_COMPONENT_FILE,
];

/** All entry-point source files concatenated, comments preserved. */
function readEntryPointSources(): string {
  return MODIFIED_FILES.map(read).join("\n\n");
}

// ── 1. Hub page links to the module route ──────────────────────────────

test("hub page (/yo/langues/francais-quebec) links to the Quebec French module route", () => {
  const src = read(HUB_PAGE_FILE);
  // Accept both the literal path and a `?lang=…` query-string suffix
  // (template form is fine — the URL must just be reachable from the
  // hub page's source).
  assert.ok(
    /\/yo\/langues\/francais-quebec\/module-1(?:\?lang=[a-z]+)?/.test(src),
    `${HUB_PAGE_FILE} must reference /yo/langues/francais-quebec/module-1`,
  );
});

// ── 2. Intro page links to the module route ────────────────────────────

test("intro page (/yo/langues/francais-quebec/intro) links to the Quebec French module route", () => {
  const src = read(INTRO_PAGE_FILE);
  assert.ok(
    /\/yo\/langues\/francais-quebec\/module-1(?:\?lang=[a-z]+)?/.test(src),
    `${INTRO_PAGE_FILE} must reference /yo/langues/francais-quebec/module-1`,
  );
});

// ── 3. All three locale-aware URLs present across hub + intro ──────────

test("hub + intro source together expose all three locale-aware module URLs (?lang=fr|en|es)", () => {
  const combined = `${read(HUB_PAGE_FILE)}\n${read(INTRO_PAGE_FILE)}`;
  for (const locale of ["fr", "en", "es"] as const) {
    const needle = `${MODULE_ROUTE}?lang=${locale}`;
    assert.ok(
      combined.includes(needle),
      `combined hub + intro source must include the literal "${needle}"`,
    );
  }
});

// ── 4. New card heading copy exists in FR / EN / ES ────────────────────

test("new card heading copy exists in FR / EN / ES", () => {
  const combined = readEntryPointSources();
  const headings: readonly string[] = [
    "Module à venir — Français québécois au travail",
    "Upcoming module — Quebec French at work",
    "Módulo próximamente — Francés quebequense en el trabajo",
  ];
  for (const heading of headings) {
    assert.ok(
      combined.includes(heading),
      `expected heading copy "${heading}" not found in modified sources`,
    );
  }
});

// ── 5. New card body copy exists in FR / EN / ES ───────────────────────

test("new card body copy exists in FR / EN / ES", () => {
  const combined = readEntryPointSources();
  const bodies: readonly string[] = [
    "Explorez l’aperçu de la première leçon : arriver au travail, saluer naturellement et choisir entre tu et vous.",
    "Preview the first lesson: arriving at work, greeting naturally, and choosing between tu and vous.",
    "Explora la primera lección: llegar al trabajo, saludar naturalmente y elegir entre tu y vous.",
  ];
  for (const body of bodies) {
    assert.ok(
      combined.includes(body),
      `expected body copy "${body}" not found in modified sources`,
    );
  }
});

// ── 6. CTA copy exists exactly in FR / EN / ES ─────────────────────────

test("primary CTA copy exists exactly in FR / EN / ES", () => {
  const combined = readEntryPointSources();
  const ctas: readonly string[] = [
    "Voir le module à venir",
    "Preview the upcoming module",
    "Ver el módulo próximamente",
  ];
  for (const cta of ctas) {
    assert.ok(
      combined.includes(cta),
      `expected CTA copy "${cta}" not found in modified sources`,
    );
  }
});

// ── 7. New copy is unambiguously "coming soon / preview" ───────────────

test("new copy is unambiguously coming-soon / preview in FR / EN / ES", () => {
  const combined = stripComments(readEntryPointSources());
  // At least one of the listed cues per language must survive comment
  // stripping. We deliberately accept a small whitelist per locale so
  // copy editors have wiggle room without weakening the test contract.
  const cueGroups: ReadonlyArray<[readonly string[], string]> = [
    [["à venir", "aperçu"], "FR"],
    [["upcoming", "preview"], "EN"],
    [["próximamente", "vista previa", "próxima lección"], "ES"],
  ];
  for (const [cues, label] of cueGroups) {
    const hit = cues.some((cue) => combined.toLowerCase().includes(cue.toLowerCase()));
    assert.ok(
      hit,
      `${label} copy must include at least one of: ${cues.join(" | ")}`,
    );
  }
});

// ── 8. New copy contains no banned commercial signals ──────────────────

test("entry-point copy contains no banned commercial signals (after stripComments)", () => {
  // Banned signals across the three locales. Every regex is scoped
  // narrowly enough to avoid matching honest "no checkout / no
  // payment / no guarantee" disclaimers — those live in dedicated
  // copy on the legal disclaimer / honest-promise modules, not on
  // any of the files scanned here. We strip comments first so doc
  // comments that explicitly name a forbidden concept cannot trigger
  // a false positive.
  const banned: ReadonlyArray<[RegExp, string]> = [
    [/\bbuy\b/i, "buy"],
    [/\bpurchase\b/i, "purchase"],
    [/\bcheckout\b/i, "checkout"],
    [/\bpaywall\b/i, "paywall"],
    [/\bunlock\s+now\b/i, "unlock now"],
    [/\bd[ée]verrouiller\b/i, "déverrouiller"],
    [/\bdesbloquear\b/i, "desbloquear"],
    [/\bbuy\s+now\b/i, "buy now"],
    [/\bachet(?:er|ez)\b/i, "acheter / achetez"],
    [/\bcomprar\b/i, "comprar"],
    [/\bpay\b/i, "pay"],
    [/\bpaiement\b/i, "paiement"],
    [/\bpago\b/i, "pago"],
    [/\bdiscount\b/i, "discount"],
    [/\brabais\b/i, "rabais"],
    [/\bdescuento\b/i, "descuento"],
    [/\bcountdown\b/i, "countdown"],
    [/\bcompte\s+[àa]\s+rebours\b/i, "compte à rebours"],
    [/\bcuenta\s+regresiva\b/i, "cuenta regresiva"],
    [/\bguaranteed\s+fluen/i, "guaranteed fluen…"],
    [/\bgaranti(?:e|t)?\s+(?:de|d')?\s*fluidit/i, "garantie de fluidité"],
    [/\bfluidez\s+garantizad/i, "fluidez garantizad…"],
    [/\bguaranteed\s+(?:job|employment|immigration|TEF|TEFAQ)\b/i,
      "guaranteed job/employment/immigration/TEF/TEFAQ"],
    [/\bgaranti(?:e|t)?\s+d['’]?\s*emploi\b/i, "garantie d’emploi"],
    [/\bgaranti[ae]?\s+de\s+(?:empleo|inmigraci[óo]n|TEF|TEFAQ)\b/i,
      "garantía de empleo/inmigración/TEF/TEFAQ"],
    [/\b%\s*off\b/i, "% off"],
    [/\d+%\s+off/i, "<N>% off"],
    [/\d+%\s+de\s+(?:rabais|r[ée]duction|descuento)/i,
      "<N>% de rabais/réduction/descuento"],
  ];
  for (const file of MODIFIED_FILES) {
    const stripped = stripComments(read(file));
    for (const [re, label] of banned) {
      assert.ok(
        !re.test(stripped),
        `${file} must not include "${label}" (matched ${re})`,
      );
    }
  }
});

// ── 9. Module route stays noindex in FR / EN / ES ──────────────────────

test("module route metadata is noindex { index: false, follow: false } across FR / EN / ES", () => {
  for (const lang of ["fr", "en", "es"] as const) {
    const metadata = buildYoPratiqoMetadata(SEO_ROUTE_ID, lang);
    assert.deepEqual(
      metadata.robots,
      { index: false, follow: false },
      `Adding entry-point cards must not flip module robots metadata for lang="${lang}"`,
    );
  }
});

// ── 10. Sitemap still excludes the module route ────────────────────────

test("sitemap still excludes the Quebec French module route after entry-points were added", async () => {
  const entries = await sitemap();
  const matching = entries.filter((e) => e.url.endsWith(MODULE_ROUTE));
  assert.equal(
    matching.length,
    0,
    `sitemap must remain free of ${MODULE_ROUTE} (got ${matching
      .map((m) => m.url)
      .join(", ")})`,
  );
});

// ── 11. Course schema stays disabled for the future-premium page ───────

test("Course schema remains disabled for the future-premium page type", () => {
  assert.equal(
    shouldPublishYoCourseSchema("francais-quebec", "future_premium"),
    false,
    "Course schema must remain disabled for the future-premium page type",
  );
  // Belt-and-suspenders: the global flags the premium shell relies on
  // are still in their safe default state. If a future change quietly
  // flipped premiumModulesEnabled, the entry-point card would suddenly
  // promote a launch-eligible route — re-pin both flags here so the
  // regression is impossible to miss.
  assert.equal(yopratiqoProductConfig.premiumModulesEnabled, false);
  assert.equal(yopratiqoProductConfig.futurePremiumEnabled, false);
});

// ── 12. Modified files don't import restricted systems ─────────────────

test("modified files never import payment / Stripe / Supabase / RLS / migrations / booking / Membre Pro / commission / OpenAI / audio-gen / live-legal-page code", () => {
  // Mirrors the forbidden-imports regex set in
  // yopratiqoFrQuebecPremiumShell.test.ts, with two task-specific
  // additions for OpenAI and the audio-generation script. The
  // teacher-dashboard / live-legal-page restriction is enforced by
  // refusing any import path under `@/app/teacher` or
  // `@/app/legal` — neither is needed for a navigational entry-point
  // card and pulling them in would imply unrelated coupling.
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
    [/\bopenai\b/i, "OpenAI"],
    [/scripts\/generate-yopratiqo-audio/, "audio generation script"],
    [/from\s+["']@\/app\/teacher\b/, "teacher dashboard module import"],
    [/from\s+["']@\/app\/legal\b/, "live legal page module import"],
  ];
  for (const file of MODIFIED_FILES) {
    const stripped = stripComments(read(file));
    for (const [re, label] of forbidden) {
      assert.ok(
        !re.test(stripped),
        `${file} must not reference ${label} (${re}) — out of scope for the entry-point change`,
      );
    }
  }
});

// ── Bonus: card component is a pure Server Component ───────────────────

test("YoUpcomingModuleCard is a Server Component (no 'use client', no client-only hooks)", () => {
  const stripped = stripComments(read(CARD_COMPONENT_FILE));
  assert.ok(
    !/["']use client["']/.test(stripped),
    `${CARD_COMPONENT_FILE} must NOT declare a "use client" boundary`,
  );
  const clientHooks: ReadonlyArray<[RegExp, string]> = [
    [/\buseState\b/, "useState"],
    [/\buseReducer\b/, "useReducer"],
    [/\buseEffect\b/, "useEffect"],
    [/\buseLayoutEffect\b/, "useLayoutEffect"],
    [/\buseRouter\b/, "useRouter"],
    [/\busePathname\b/, "usePathname"],
    [/\buseSearchParams\b/, "useSearchParams"],
    [/onClick|onChange|onSubmit/, "interactive event handler"],
  ];
  for (const [re, label] of clientHooks) {
    assert.ok(
      !re.test(stripped),
      `${CARD_COMPONENT_FILE} must not use "${label}" (matched ${re})`,
    );
  }
});

// ── Driver ─────────────────────────────────────────────────────────────

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
    `\n${passed} YoPratiqo Quebec French module entry-point assertions passed.`,
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
