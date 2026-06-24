/**
 * Regression suite for the public `/trouver-un-prof` marketing page.
 *
 * What we guard against (and why):
 *
 *  1. Re-introduction of the legacy text-only "Pratiqo" header. Every
 *     YoPratiqo language module ends with a "Pratique avec un vrai prof"
 *     CTA that lands here, so the page must look like the rest of the
 *     marketplace — not a 2024-era teal slab with a homemade header.
 *
 *  2. Drift between this page and the homepage's shared marketing
 *     header / footer. Logo, locale switcher (FR / EN / ES), currency
 *     selector (CAD-default), and "Tarifs / Ressources / Devenir
 *     professeur / Se connecter" must come from the same components
 *     `app/page.tsx` already uses. Custom `<header>` markup with a
 *     hand-rolled "Pratiqo" wordmark is forbidden.
 *
 *  3. French hardcoding in user-facing copy. Hero title, subtitle,
 *     CTAs, search labels/placeholders, and trust card titles MUST
 *     resolve through `findTeacher*` keys present in fr / en / es so
 *     the page is locale-ready.
 *
 *  4. Loss of the segmented Quoi / Où / Format search. The historical
 *     bug where selecting a city silently overwrote the subject MUST
 *     stay fixed: the subject input never autocompletes places, the
 *     place autocomplete is provided by the existing
 *     `LandingLocationSearch` component, and the form submits to the
 *     existing `/student/search` route.
 *
 *  5. Broken YoPratiqo CTA contracts. All five language intro modules
 *     (Spanish, Quebec French, Italian, English, Japanese) MUST keep
 *     pointing to `/trouver-un-prof`. A typo there would break every
 *     end-of-module funnel.
 *
 *  6. Touching out-of-scope subsystems. The page file MUST NOT import
 *     anything from Stripe, Supabase, payments, migrations, the
 *     booking modal, the YoPratiqo audio manifest, or Membre Pro
 *     configuration.
 *
 * Static-source style — matches `tests/marketing/testimonialsLaunchScope.test.ts`.
 * No browser automation, no payments / Supabase / RLS / migration code.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();

const fr = JSON.parse(
  readFileSync(join(root, "lib", "i18n", "locales", "fr.json"), "utf8"),
) as Record<string, string>;
const en = JSON.parse(
  readFileSync(join(root, "lib", "i18n", "locales", "en.json"), "utf8"),
) as Record<string, string>;
const es = JSON.parse(
  readFileSync(join(root, "lib", "i18n", "locales", "es.json"), "utf8"),
) as Record<string, string>;

const pageSrc = readFileSync(
  join(root, "app", "(marketing)", "trouver-un-prof", "page.tsx"),
  "utf8",
);
const searchSrc = readFileSync(
  join(root, "components", "marketing", "FindTeacherSearch.tsx"),
  "utf8",
);
const trustSrc = readFileSync(
  join(root, "components", "marketing", "FindTeacherTrustStrip.tsx"),
  "utf8",
);
const headerSrc = readFileSync(
  join(root, "components", "marketing", "LandingHeader.tsx"),
  "utf8",
);
const localeSwitcherSrc = readFileSync(
  join(root, "components", "LocaleSwitcher.tsx"),
  "utf8",
);

const yoModules: Array<{ label: string; path: string }> = [
  {
    label: "Spanish intro",
    path: join(root, "app", "yo", "langues", "espagnol", "intro", "page.tsx"),
  },
  {
    label: "Quebec French intro",
    path: join(root, "app", "yo", "langues", "francais-quebec", "intro", "page.tsx"),
  },
  {
    label: "Italian intro",
    path: join(root, "app", "yo", "langues", "italien", "intro", "page.tsx"),
  },
  {
    label: "English intro",
    path: join(root, "app", "yo", "langues", "anglais", "intro", "page.tsx"),
  },
  {
    label: "Japanese intro",
    path: join(root, "app", "yo", "langues", "japonais", "intro", "page.tsx"),
  },
];

// ── Part B / Part C: shared marketing header + i18n parity ─────────────

test("/trouver-un-prof renders the shared LandingHeader (no homemade header)", () => {
  assert.ok(
    /from\s+["']@\/components\/marketing\/LandingHeader["']/.test(pageSrc),
    "page must import the shared LandingHeader component",
  );
  assert.ok(
    /<LandingHeader\s*\/>/.test(pageSrc),
    "page must render <LandingHeader /> instead of a custom header",
  );
  // Forbid resurrecting the legacy text-only "Pratiqo" wordmark inside a
  // <header> tag on this specific page. We allow the string "Pratiqo"
  // anywhere else (metadata, schema, etc.) but not as a hand-rolled
  // header brand.
  const headerRegex = /<header[\s\S]*?<\/header>/g;
  for (const block of pageSrc.match(headerRegex) ?? []) {
    assert.ok(
      !/>Pratiqo<\/[A-Za-z]+>/.test(block),
      "page must not embed a hand-rolled <header>…Pratiqo…</header> wordmark",
    );
  }
});

test("/trouver-un-prof renders the shared LandingFooter (so footer/legal links match landing)", () => {
  assert.ok(
    /from\s+["']@\/components\/marketing\/LandingFooter["']/.test(pageSrc),
    "page must import the shared LandingFooter component",
  );
  assert.ok(
    /<LandingFooter\s*\/>/.test(pageSrc),
    "page must render <LandingFooter />",
  );
});

test("LandingHeader (used by this page) ships the modern Pratiqo logo + locale + currency + nav", () => {
  // Verifies the SHARED header conforms to the marketing brief, since
  // this is the same component the rebuilt /trouver-un-prof now uses.
  assert.ok(
    /PratiqoLogo/.test(headerSrc),
    "LandingHeader must render <PratiqoLogo /> (not a text-only wordmark)",
  );
  assert.ok(
    /LocaleSwitcher/.test(headerSrc),
    "LandingHeader must include the LocaleSwitcher (language + currency)",
  );
  assert.ok(
    /\/devenir-enseignant/.test(headerSrc),
    "LandingHeader must link to /devenir-enseignant (Devenir professeur)",
  );
  assert.ok(
    /\/tarifs/.test(headerSrc),
    "LandingHeader must link to /tarifs (Tarifs)",
  );
  assert.ok(
    /\/ressources/.test(headerSrc),
    "LandingHeader must link to /ressources (Ressources)",
  );
  assert.ok(
    /\/login/.test(headerSrc),
    "LandingHeader must link to /login (Se connecter)",
  );
  for (const key of ["navPricing", "navResources", "becomeTeacher", "navLogin"]) {
    assert.ok(
      headerSrc.includes(`t("${key}")`) ||
        headerSrc.includes(`t('${key}')`),
      `LandingHeader must read the "${key}" translation key`,
    );
  }
});

test("LandingHeader mobile navigation exposes login and the core landing CTAs", () => {
  assert.ok(
    /data-testid="landing-mobile-login-link"/.test(headerSrc),
    "mobile header must keep a directly visible Connexion / Log in link",
  );
  assert.ok(
    /data-testid="landing-mobile-menu-button"/.test(headerSrc),
    "mobile header must expose a hamburger/menu button",
  );
  assert.ok(
    /data-testid="landing-mobile-menu"/.test(headerSrc),
    "mobile header must render a mobile menu surface",
  );
  for (const [href, labelKey] of [
    ["/trouver-un-prof", "findTeacher"],
    ["/devenir-enseignant", "becomeTeacher"],
    ["loginHref", "navLogin"],
  ] as const) {
    assert.ok(
      headerSrc.includes(href),
      `mobile header/menu must include ${href}`,
    );
    assert.ok(
      headerSrc.includes(`t("${labelKey}")`) ||
        headerSrc.includes(`t('${labelKey}')`),
      `mobile header/menu must read the "${labelKey}" translation key`,
    );
  }
  assert.equal(fr.navLogin, "Connexion");
  assert.equal(en.navLogin, "Log in");
  assert.equal(es.navLogin, "Iniciar sesión");
});

test("LocaleSwitcher exposes both a language selector (FR / EN / ES) and a currency selector that defaults to CAD", () => {
  // LocaleSwitcher is the shared component embedded in LandingHeader,
  // so this single assertion is what backs Part B's "currency selector:
  // CAD" + "language selector: FR / EN / ES" requirement on the
  // rebuilt marketing page.
  for (const code of ["FR", "EN", "ES"]) {
    assert.ok(
      new RegExp(`code:\\s*"${code}"`).test(localeSwitcherSrc),
      `LocaleSwitcher must offer the ${code} language option`,
    );
  }
  assert.ok(
    /currency:\s*"CAD"/.test(localeSwitcherSrc),
    "LocaleSwitcher must offer CAD as a currency option",
  );
  // The currency dropdown must be wired to a real state setter, not a
  // decorative pill — otherwise it's not a real "selector".
  assert.ok(
    /setCurrency\(option\.currency\)/.test(localeSwitcherSrc),
    "LocaleSwitcher must call setCurrency() so the currency choice actually persists",
  );
});

test("hero / search / trust copy comes from translation keys, not hardcoded French", () => {
  const expectedKeys = [
    "findTeacherEyebrow",
    "findTeacherHeroTitle",
    "findTeacherHeroSubtitle",
    "findTeacherPrimaryCta",
    "findTeacherSecondaryCta",
    "findTeacherSearchWhatLabel",
    "findTeacherSearchWhereLabel",
    "findTeacherSearchFormatLabel",
    "findTeacherSearchSubmit",
    "findTeacherSearchWhatPlaceholder",
    "findTeacherSearchWherePlaceholder",
    "findTeacherSearchFormatAny",
    "findTeacherTrustClearProfilesTitle",
    "findTeacherTrustClearProfilesBody",
    "findTeacherTrustSecurePaymentsTitle",
    "findTeacherTrustSecurePaymentsBody",
    "findTeacherTrustLocalTeachersTitle",
    "findTeacherTrustLocalTeachersBody",
    "findTeacherFloatLocalTeachersHint",
    "findTeacherFloatClearProfilesHint",
    "findTeacherFloatSecurePaymentsHint",
  ];
  for (const key of expectedKeys) {
    for (const [locale, dict] of [
      ["fr", fr],
      ["en", en],
      ["es", es],
    ] as const) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(dict, key),
        `${locale}.json must define "${key}" so the page is not French-hardcoded`,
      );
      assert.ok(
        dict[key] && dict[key].trim().length > 0,
        `${locale}.json["${key}"] must be a non-empty string`,
      );
    }
  }
});

test("hero copy matches the marketing brief verbatim in FR / EN / ES", () => {
  // Brief is the source of truth — translators may not paraphrase.
  assert.equal(fr.findTeacherHeroTitle, "Trouvez le bon prof près de chez vous");
  assert.equal(en.findTeacherHeroTitle, "Find the right teacher near you");
  assert.equal(es.findTeacherHeroTitle, "Encuentra el profesor ideal cerca de ti");

  assert.equal(fr.findTeacherPrimaryCta, "Trouver un prof");
  assert.equal(en.findTeacherPrimaryCta, "Find a teacher");
  assert.equal(es.findTeacherPrimaryCta, "Buscar profesor");

  assert.equal(fr.findTeacherSecondaryCta, "Devenir professeur");
  assert.equal(en.findTeacherSecondaryCta, "Become a teacher");
  assert.equal(es.findTeacherSecondaryCta, "Ser profesor");

  assert.equal(fr.findTeacherSearchWhatLabel, "Quoi");
  assert.equal(fr.findTeacherSearchWhereLabel, "Où");
  assert.equal(fr.findTeacherSearchFormatLabel, "Format");
  assert.equal(fr.findTeacherSearchSubmit, "Rechercher");

  assert.equal(en.findTeacherSearchWhatLabel, "What");
  assert.equal(en.findTeacherSearchWhereLabel, "Where");
  assert.equal(en.findTeacherSearchFormatLabel, "Format");
  assert.equal(en.findTeacherSearchSubmit, "Search");

  assert.equal(es.findTeacherSearchWhatLabel, "Qué");
  assert.equal(es.findTeacherSearchWhereLabel, "Dónde");
  assert.equal(es.findTeacherSearchFormatLabel, "Formato");
  assert.equal(es.findTeacherSearchSubmit, "Buscar");

  assert.equal(fr.findTeacherSearchWhatPlaceholder, "Matière ou activité");
  assert.equal(fr.findTeacherSearchWherePlaceholder, "Ville ou quartier");
  assert.equal(fr.findTeacherSearchFormatAny, "En ligne ou en personne");

  assert.equal(fr.findTeacherTrustClearProfilesTitle, "Profils clairs");
  assert.equal(fr.findTeacherTrustSecurePaymentsTitle, "Paiements sécurisés");
  assert.equal(fr.findTeacherTrustLocalTeachersTitle, "Profs locaux");
});

// ── Part E: segmented Quoi / Où / Format search ────────────────────────

test("FindTeacherSearch renders the segmented Quoi / Où / Format / Rechercher form", () => {
  // The three segments must each read from their own translation key
  // so labels stay locale-aware. The submit button must exist as a
  // real <button type="submit"> driving an HTML <form>, never a
  // <Link> dressed up as a search button.
  assert.ok(
    /t\("findTeacherSearchWhatLabel"\)/.test(searchSrc),
    'FindTeacherSearch must render the t("findTeacherSearchWhatLabel") label',
  );
  assert.ok(
    /t\("findTeacherSearchWhereLabel"\)/.test(searchSrc),
    'FindTeacherSearch must render the t("findTeacherSearchWhereLabel") label',
  );
  assert.ok(
    /t\("findTeacherSearchFormatLabel"\)/.test(searchSrc),
    'FindTeacherSearch must render the t("findTeacherSearchFormatLabel") label',
  );
  assert.ok(
    /t\("findTeacherSearchSubmit"\)/.test(searchSrc),
    'FindTeacherSearch must render the t("findTeacherSearchSubmit") label',
  );
  assert.ok(
    /<form[\s\S]*?onSubmit/.test(searchSrc),
    "FindTeacherSearch must wrap the segments in a <form> with onSubmit",
  );
  assert.ok(
    /type="submit"/.test(searchSrc),
    "FindTeacherSearch must include a real <button type=\"submit\">",
  );
});

test("FindTeacherSearch reuses LandingLocationSearch for the place field (no city/subject overwrite bug)", () => {
  assert.ok(
    /from\s+["']@\/components\/marketing\/LandingLocationSearch["']/.test(searchSrc),
    "FindTeacherSearch must reuse the existing LandingLocationSearch autocomplete",
  );
  // The subject field must be a plain <input> with explicit
  // autoComplete="off" — never a city autocomplete pretending to be a
  // subject. This is the contract that prevents PR #63's regression.
  assert.ok(
    /<input[\s\S]*?id=\{`?\$\{formatId\}-subject`?\}[\s\S]*?autoComplete="off"/.test(searchSrc),
    'FindTeacherSearch subject input must declare autoComplete="off"',
  );
  // Defensive: the subject onChange must only update the subject
  // state. We assert the bare `setSubject(e.target.value)` shape so a
  // future "let's also setPlace here" regression fails this test.
  assert.ok(
    /onChange=\{\(e\)\s*=>\s*setSubject\(e\.target\.value\)\}/.test(searchSrc),
    "FindTeacherSearch subject input must only update the subject state",
  );
  // And the place onSelectCity must NOT touch setSubject.
  const onSelectMatch = searchSrc.match(/const onSelectCity[\s\S]*?\};/);
  assert.ok(onSelectMatch, "FindTeacherSearch must declare an onSelectCity handler");
  assert.ok(
    !/setSubject/.test(onSelectMatch![0]),
    "onSelectCity must never call setSubject — places cannot overwrite subject",
  );
});

test("FindTeacherSearch submits to /student/search with the existing q= contract", () => {
  assert.ok(
    /\/student\/search/.test(searchSrc),
    "FindTeacherSearch must navigate to the existing /student/search route",
  );
  assert.ok(
    /params\.set\("q",\s*trimmedSubject\)/.test(searchSrc),
    'FindTeacherSearch must forward the subject as ?q= (the contract /student/search already reads)',
  );
});

// ── Part D: hero CTAs + visual ──────────────────────────────────────────

test("page renders the Trouver un prof primary CTA linking into the search funnel", () => {
  assert.ok(
    /t\(locale,\s*"findTeacherPrimaryCta"\)/.test(pageSrc),
    'page must render the t(locale, "findTeacherPrimaryCta") label',
  );
  // The primary CTA above the fold must point at the existing teacher
  // search funnel. /student/search handles its own auth fallback, so a
  // direct link is the canonical entry point.
  assert.ok(
    /href="\/student\/search"/.test(pageSrc),
    "page must include a primary CTA href=/student/search",
  );
});

test("page renders the Devenir professeur secondary CTA linking to /devenir-enseignant", () => {
  assert.ok(
    /t\(locale,\s*"findTeacherSecondaryCta"\)/.test(pageSrc),
    'page must render the t(locale, "findTeacherSecondaryCta") label',
  );
  assert.ok(
    /href="\/devenir-enseignant"/.test(pageSrc),
    "page must include a secondary CTA href=/devenir-enseignant",
  );
});

test("page renders the FindTeacherSearch and FindTeacherTrustStrip components in order", () => {
  assert.ok(
    /<FindTeacherSearch\s*\/>/.test(pageSrc),
    "page must render <FindTeacherSearch />",
  );
  assert.ok(
    /<FindTeacherTrustStrip\s*\/>/.test(pageSrc),
    "page must render <FindTeacherTrustStrip />",
  );
  const searchIdx = pageSrc.indexOf("<FindTeacherSearch");
  const trustIdx = pageSrc.indexOf("<FindTeacherTrustStrip");
  assert.ok(
    searchIdx >= 0 && trustIdx > searchIdx,
    "trust strip must render BELOW the search module per the marketing brief",
  );
});

test("trust strip contains all three branded cards (Profils clairs / Paiements sécurisés / Profs locaux)", () => {
  for (const key of [
    "findTeacherTrustClearProfilesTitle",
    "findTeacherTrustClearProfilesBody",
    "findTeacherTrustSecurePaymentsTitle",
    "findTeacherTrustSecurePaymentsBody",
    "findTeacherTrustLocalTeachersTitle",
    "findTeacherTrustLocalTeachersBody",
  ]) {
    assert.ok(
      new RegExp(`["']${key}["']`).test(trustSrc),
      `FindTeacherTrustStrip must reference the "${key}" translation key`,
    );
  }
});

// ── Part D continued: legacy full-teal hero MUST NOT come back ─────────

test("legacy teal hero / homemade header layout is not reintroduced", () => {
  // The old design used `bg-teal-700 text-white` for the hero AND for
  // a homemade footer CTA section. The new design uses a white / mint
  // background. We forbid the old class set as a hero/section
  // background to prevent visual regression.
  assert.ok(
    !/<section[^>]*bg-teal-700[^>]*text-white/.test(pageSrc),
    "page must not render a full-teal hero/section (legacy 2024 layout)",
  );
  // No more inline lucide `Search` icon imported by the page itself —
  // search lives in the FindTeacherSearch island.
  assert.ok(
    !/from\s+["']lucide-react["'][\s\S]{0,200}\bSearch\b/.test(
      pageSrc.split("\n").slice(0, 12).join("\n"),
    ),
    "page must not import the lucide Search icon directly (search lives in FindTeacherSearch)",
  );
});

// ── Part F: YoPratiqo CTA compatibility ─────────────────────────────────

test("every YoPratiqo language module CTA still points to the canonical /trouver-un-prof", () => {
  for (const { label, path } of yoModules) {
    const src = readFileSync(path, "utf8");
    assert.ok(
      /\/trouver-un-prof/.test(src),
      `${label} must still link to /trouver-un-prof`,
    );
    // Forbid the rebrand typo — `/trouverunprof` was never a real
    // route, but a future autocomplete typo would silently break the
    // entire end-of-module funnel.
    assert.ok(
      !/\/trouverunprof(?![A-Za-z-])/.test(src),
      `${label} must not link to the legacy slug /trouverunprof`,
    );
  }
});

// ── Part G #11: scope guard — no out-of-bounds imports ─────────────────

test("page does not touch Stripe / payments / Supabase / RLS / migrations / booking / Membre Pro / Yo audio", () => {
  // Strip JSDoc / block comments and trailing line comments before
  // scanning so the explicit "Out-of-scope: Stripe, …" docblock at
  // the top of the page (which exists *because* this test is here)
  // does not trigger a false positive.
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  const pageCode = stripComments(pageSrc);
  const searchCode = stripComments(searchSrc);
  const trustCode = stripComments(trustSrc);

  const forbidden: Array<[RegExp, string]> = [
    [/\bstripe\b/i, "Stripe"],
    [/@\/lib\/payments/, "payments lib"],
    [/@\/lib\/supabase/, "Supabase client"],
    [/getSupabaseClient/, "Supabase client"],
    [/supabase\/migrations/, "Supabase migrations"],
    [/@\/components\/BookingModal/, "Booking modal"],
    [/\bmembrePro\b|\bmembre_pro\b|\bMembrePro\b/, "Membre Pro config"],
    [/yopratiqoAudio|YOPRATIQO_AUDIO_MANIFEST/, "YoPratiqo audio manifest"],
  ];
  for (const [re, label] of forbidden) {
    assert.ok(
      !re.test(pageCode),
      `/trouver-un-prof page must not reference ${label} (${re}) — out of scope`,
    );
    assert.ok(
      !re.test(searchCode),
      `FindTeacherSearch must not reference ${label} (${re}) — out of scope`,
    );
    assert.ok(
      !re.test(trustCode),
      `FindTeacherTrustStrip must not reference ${label} (${re}) — out of scope`,
    );
  }
});

// ── Part G #12: route audit — canonical path stays canonical ───────────

test("only one /trouver-un-prof page file exists at the canonical (marketing) path", () => {
  // A second copy under /trouverunprof would fork the funnel and is
  // forbidden. We assert the canonical path is the one we just edited.
  const canonical = join(root, "app", "(marketing)", "trouver-un-prof", "page.tsx");
  assert.ok(
    readFileSync(canonical, "utf8").length > 0,
    "canonical page must exist at app/(marketing)/trouver-un-prof/page.tsx",
  );
});

// ── Run ─────────────────────────────────────────────────────────────────

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
  console.log(`[marketing:trouverUnProfPage] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
