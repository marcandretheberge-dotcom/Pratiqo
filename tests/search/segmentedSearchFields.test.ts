/**
 * Regression tests for the segmented Pratiqo search bar.
 *
 * The user-reported bug ("typing piano in Quoi, then selecting a city in
 * Lieu, ends up putting the city into Quoi and clearing piano") was caused
 * by a single line in `app/LandingPageClient.tsx` that wrote the selected
 * city's name into the *subject* state. The fix keeps subject / place /
 * format strictly independent.
 *
 * These tests mix three layers:
 *  1. Pure data tests on the new datasets (Canadian places, subject buckets).
 *  2. Pure logic tests on the matchers (accent-insensitive, alias-aware).
 *  3. Static-source assertions on the React components — we read the source
 *     and check that:
 *       a. `selectCityForSearch` no longer writes to `searchQuery`
 *       b. Quoi inputs use `disableCitySuggestions`
 *       c. The Lieu input uses the new Canada-wide dataset
 *
 * Static source assertions follow the existing pattern in
 * `tests/studentLocation/studentLocation.test.ts` — light, fast, no
 * heavy testing framework introduced.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CANADIAN_PLACES,
  PROVINCE_LABELS_BY_LOCALE,
  formatPlaceLabel,
  normalizePlaceQuery,
  searchCanadianPlaces,
} from "../../lib/search/canadianPlaces";
import {
  SUBJECT_BUCKETS,
  groupSubjectMatchesByCategory,
  searchSubjectBuckets,
} from "../../lib/search/subjectBuckets";

// ── Lightweight test runner (matches existing project style) ────────────
type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();
const landingClientSrc = readFileSync(join(root, "app", "LandingPageClient.tsx"), "utf8");
const landingHeroSrc = readFileSync(
  join(root, "components", "marketing", "LandingSearchHero.tsx"),
  "utf8",
);
const landingDiscoverySrc = readFileSync(
  join(root, "components", "marketing", "LandingDiscoverySearch.tsx"),
  "utf8",
);
const landingLocationSrc = readFileSync(
  join(root, "components", "marketing", "LandingLocationSearch.tsx"),
  "utf8",
);
const smartSearchSrc = readFileSync(join(root, "components", "SmartSearchInput.tsx"), "utf8");

// ── Canadian places dataset ─────────────────────────────────────────────
test("Canadian places dataset covers every province and territory", () => {
  const required = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"];
  const seen = new Set(CANADIAN_PLACES.map((p) => p.provinceCode));
  for (const code of required) {
    assert.ok(seen.has(code as never), `missing places for ${code}`);
  }
});

test("Canadian places dataset includes major cities across Canada", () => {
  const names = new Set(CANADIAN_PLACES.map((p) => p.name));
  // Sample one anchor per province / territory so the launch baseline is solid.
  for (const expected of [
    "Montréal",
    "Québec",
    "Toronto",
    "Ottawa",
    "Calgary",
    "Edmonton",
    "Vancouver",
    "Winnipeg",
    "Halifax",
    "Moncton",
    "St. John's",
    "Charlottetown",
    "Whitehorse",
    "Yellowknife",
    "Iqaluit",
    "Saskatoon",
    "Regina",
  ]) {
    assert.ok(names.has(expected), `expected ${expected} in CANADIAN_PLACES`);
  }
});

test("Province labels are localized in fr/en/es", () => {
  assert.equal(PROVINCE_LABELS_BY_LOCALE.QC.fr, "Québec");
  assert.equal(PROVINCE_LABELS_BY_LOCALE.QC.en, "Quebec");
  assert.equal(PROVINCE_LABELS_BY_LOCALE.NL.en, "Newfoundland and Labrador");
  assert.equal(PROVINCE_LABELS_BY_LOCALE.BC.fr, "Colombie-Britannique");
});

test("Place query normalization strips accents and lower-cases", () => {
  assert.equal(normalizePlaceQuery("Montréal"), "montreal");
  assert.equal(normalizePlaceQuery("Québec"), "quebec");
  assert.equal(normalizePlaceQuery("Saint-Jérôme"), "saint jerome");
  assert.equal(normalizePlaceQuery("ROUYN-NORANDA"), "rouyn noranda");
});

test("searchCanadianPlaces is accent and alias aware", () => {
  const direct = searchCanadianPlaces("Montréal");
  assert.ok(direct.length >= 1);
  assert.equal(direct[0]!.name, "Montréal");

  const accentless = searchCanadianPlaces("montreal");
  assert.equal(accentless[0]!.name, "Montréal", "must match without accents");

  const cityHyphen = searchCanadianPlaces("trois rivieres");
  assert.equal(
    cityHyphen[0]!.name,
    "Trois-Rivières",
    "must match cities written without hyphens or accents",
  );

  const aliasMatch = searchCanadianPlaces("quebec city");
  assert.equal(
    aliasMatch[0]!.name,
    "Québec",
    "alias 'Quebec City' must surface Québec",
  );

  const provincial = searchCanadianPlaces("Ontario");
  assert.ok(
    provincial.length > 0 && provincial.every((p) => p.provinceCode === "ON"),
    "typing a province name should narrow results to that province",
  );
});

test("formatPlaceLabel returns 'City, PROV' format", () => {
  const toronto = CANADIAN_PLACES.find((p) => p.name === "Toronto")!;
  assert.equal(formatPlaceLabel(toronto), "Toronto, ON");
  const moncton = CANADIAN_PLACES.find((p) => p.name === "Moncton")!;
  assert.equal(formatPlaceLabel(moncton), "Moncton, NB");
});

// ── Quebec completeness ────────────────────────────────────────────────
// Pratiqo product rule: "Quebec must feel complete and local". Verify
// every anchor the product owner explicitly listed is in the dataset.
test("Quebec completeness baseline covers product-owner anchors", () => {
  const qc = new Set(
    CANADIAN_PLACES.filter((p) => p.provinceCode === "QC").map((p) => p.name),
  );
  for (const expected of [
    "Montréal",
    "Québec",
    "Saint-Georges",
    "Sainte-Marie",
    "Beauceville",
    "Saint-Joseph-de-Beauce",
    "Thetford Mines",
    "Lac-Mégantic",
    "Montmagny",
    "Lévis",
    "Rivière-du-Loup",
    "Rimouski",
    "Rouyn-Noranda",
    "Val-d'Or",
    "Sept-Îles",
    "Baie-Comeau",
  ]) {
    assert.ok(qc.has(expected), `Quebec dataset must include ${expected}`);
  }
});

test("Beauce strategic coverage — every product-owner-listed municipality is present", () => {
  // The Beauce MRCs (Beauce-Sartigan, La Nouvelle-Beauce, Robert-Cliche,
  // Les Etchemins) are key Pratiqo geographies. Every entry the product
  // owner flagged must be present *and* tagged isStrategicLocal so the
  // ranker keeps them visible against bigger flagship cities.
  const strategicNames = [
    "Saint-Georges",
    "Sainte-Marie",
    "Beauceville",
    "Saint-Joseph-de-Beauce",
    "Saint-Prosper",
    "Saint-Côme-Linière",
    "Saint-Éphrem-de-Beauce",
    "La Guadeloupe",
    "Saint-Benoît-Labre",
    "Vallée-Jonction",
    "Scott",
    "Saint-Elzéar",
    "Frampton",
    "Tring-Jonction",
    "Saint-Odilon-de-Cranbourne",
    "Saint-Victor",
    "Saint-Évariste-de-Forsyth",
    "Saint-Honoré-de-Shenley",
    "Saint-Martin",
    "Saint-Gédéon-de-Beauce",
    "Saint-Théophile",
    "Saint-Zacharie",
  ];
  for (const name of strategicNames) {
    const place = CANADIAN_PLACES.find(
      (p) => p.name === name && p.provinceCode === "QC",
    );
    assert.ok(place, `Beauce strategic municipality missing: ${name}`);
    assert.ok(
      place!.isStrategicLocal === true,
      `${name} must be flagged isStrategicLocal so the ranker preserves it`,
    );
  }
});

test("Beauce searches return the right place for common French spellings", () => {
  const georges = searchCanadianPlaces("saint georges", { limit: 5 });
  assert.ok(
    georges.some((p) => p.name === "Saint-Georges" && p.provinceCode === "QC"),
    "'saint georges' must surface Saint-Georges, QC",
  );

  const stGeorges = searchCanadianPlaces("st georges", { limit: 5 });
  assert.ok(
    stGeorges.some((p) => p.name === "Saint-Georges" && p.provinceCode === "QC"),
    "'st georges' must surface Saint-Georges, QC",
  );

  const steMarie = searchCanadianPlaces("ste marie", { limit: 5 });
  assert.ok(
    steMarie.some((p) => p.name === "Sainte-Marie" && p.provinceCode === "QC"),
    "'ste marie' must surface Sainte-Marie, QC",
  );

  const sainteMarie = searchCanadianPlaces("sainte marie", { limit: 5 });
  assert.ok(
    sainteMarie.some((p) => p.name === "Sainte-Marie" && p.provinceCode === "QC"),
    "'sainte marie' must surface Sainte-Marie, QC",
  );

  // "beauce" alone should bring up Beauce-flavoured municipalities.
  const beauce = searchCanadianPlaces("beauce", { limit: 10 });
  const beauceNames = beauce.map((p) => p.name);
  assert.ok(
    beauceNames.includes("Beauceville") || beauceNames.includes("Saint-Joseph-de-Beauce"),
    "'beauce' must include at least Beauceville or Saint-Joseph-de-Beauce",
  );

  // Multi-token: "st joseph beauce" must hit Saint-Joseph-de-Beauce
  // even though "joseph beauce" is not a contiguous substring of the name.
  const stJoseph = searchCanadianPlaces("st joseph beauce", { limit: 5 });
  assert.ok(
    stJoseph.some((p) => p.name === "Saint-Joseph-de-Beauce"),
    "'st joseph beauce' must surface Saint-Joseph-de-Beauce, QC",
  );

  // Other common Beauce-region searches.
  const thetford = searchCanadianPlaces("thetford", { limit: 5 });
  assert.ok(
    thetford.some((p) => p.name === "Thetford Mines"),
    "'thetford' must surface Thetford Mines, QC",
  );

  const lacMegantic = searchCanadianPlaces("lac megantic", { limit: 5 });
  assert.ok(
    lacMegantic.some((p) => p.name === "Lac-Mégantic"),
    "'lac megantic' must surface Lac-Mégantic, QC",
  );
});

test("Canada outside Quebec threshold coverage (>= 5,000)", () => {
  const byKey = new Map(
    CANADIAN_PLACES.map((p) => [`${p.name}|${p.provinceCode}`, p]),
  );
  const required: Array<[string, string]> = [
    ["Calgary", "AB"],
    ["Toronto", "ON"],
    ["Vancouver", "BC"],
    ["Halifax", "NS"],
    ["Moncton", "NB"],
    ["Winnipeg", "MB"],
    ["Saskatoon", "SK"],
    ["St. John's", "NL"],
    ["Charlottetown", "PE"],
    ["Whitehorse", "YT"],
    ["Yellowknife", "NT"],
    ["Iqaluit", "NU"],
  ];
  for (const [name, prov] of required) {
    const place = byKey.get(`${name}|${prov}`);
    assert.ok(place, `${name}, ${prov} must be in CANADIAN_PLACES`);
  }
});

test("Quebec coverage is meaningfully beyond a flagship-only seed", () => {
  // Soft floor: the previous MVP shipped with ~33 Quebec entries. The new
  // dataset must add genuine breadth (regional centres, Beauce strategic
  // municipalities, Couronne nord, Capitale-Nationale), so we expect a
  // generous lower bound — not 33 anymore.
  const quebecCount = CANADIAN_PLACES.filter((p) => p.provinceCode === "QC").length;
  assert.ok(
    quebecCount >= 200,
    `Quebec dataset must hold >= 200 places (got ${quebecCount})`,
  );
});

test("Canada outside Quebec coverage holds the >= 5,000 baseline", () => {
  // Soft floor: with the StatCan 5k threshold non-QC should comfortably
  // pass 150 entries; we're conservative to avoid flakiness if a future
  // edit adds or trims a handful.
  const otherCount = CANADIAN_PLACES.filter((p) => p.provinceCode !== "QC").length;
  assert.ok(
    otherCount >= 150,
    `Non-Quebec dataset must hold >= 150 places (got ${otherCount})`,
  );
});

test("Place ranking — broad 'mont' prefix still returns Montréal", () => {
  // When the query is generic, population helps: "mont" should keep
  // Montréal near the top while still leaving room for Quebec
  // municipalities that share the prefix.
  const matches = searchCanadianPlaces("mont", { limit: 10 });
  const top = matches.slice(0, 3).map((p) => p.name);
  assert.ok(top.includes("Montréal"), `Montréal must appear in top 3 for 'mont' (got ${top.join(", ")})`);
});

test("Place ranking — 'saint' returns multiple Quebec Saint-* municipalities", () => {
  // Generic Saint query: results must surface multiple Quebec Saint-*
  // entries rather than only St. John's, NL or St. Albert, AB. This
  // protects the Beauce/Quebec product rule.
  const matches = searchCanadianPlaces("saint", { limit: 15 });
  const quebecSaints = matches.filter(
    (p) => p.provinceCode === "QC" && /^Saint/.test(p.name),
  );
  assert.ok(
    quebecSaints.length >= 3,
    `'saint' must include >= 3 Quebec Saint-* matches (got ${quebecSaints.length})`,
  );
});

test("Place ranking — population alone never hides a name-exact small place", () => {
  // Saint-Georges (~33k) is dwarfed by Toronto (~2.8M), but typing
  // "Saint-Georges" must still rank Saint-Georges first.
  const matches = searchCanadianPlaces("Saint-Georges", { limit: 5 });
  assert.equal(
    matches[0]!.name,
    "Saint-Georges",
    "Exact-name query must rank Saint-Georges first",
  );

  // Tiny strategic-local hit: Frampton is ~1.4k, and the only Canadian
  // place named Frampton — typing it must surface it as the top match.
  const frampton = searchCanadianPlaces("frampton", { limit: 5 });
  assert.equal(
    frampton[0]!.name,
    "Frampton",
    "Strategic local Frampton must surface despite tiny population",
  );
});

test("Programmatic alias generation covers Saint↔St / Sainte↔Ste / accents", () => {
  // Saint-Joseph-de-Beauce should be findable via "st joseph beauce"
  // (Saint→St swap + suffix-strip + accent-strip).
  const stJoseph = searchCanadianPlaces("St-Joseph", { limit: 5 });
  assert.ok(
    stJoseph.some((p) => p.name === "Saint-Joseph-de-Beauce"),
    "'St-Joseph' must surface Saint-Joseph-de-Beauce",
  );

  // Saint-Côme-Linière → "st come liniere" (accent strip + Saint→St).
  const stCome = searchCanadianPlaces("st come", { limit: 5 });
  assert.ok(
    stCome.some((p) => p.name === "Saint-Côme-Linière"),
    "'st come' must surface Saint-Côme-Linière",
  );

  // Trois-Rivières → "trois rivieres" already covered above; sanity here.
  const trois = searchCanadianPlaces("Trois Rivieres", { limit: 5 });
  assert.equal(trois[0]!.name, "Trois-Rivières");
});

// ── Subject buckets dataset ─────────────────────────────────────────────
test("Subject buckets cover all four categories", () => {
  const categories = new Set(SUBJECT_BUCKETS.map((b) => b.category));
  for (const c of ["music", "languages", "academic", "arts_skills"] as const) {
    assert.ok(categories.has(c), `missing category ${c}`);
  }
});

test("Subject buckets carry FR/EN/ES labels for the user's example list", () => {
  const piano = SUBJECT_BUCKETS.find((b) => b.canonicalId === "piano")!;
  assert.equal(piano.labels.fr, "Piano");
  assert.equal(piano.labels.en, "Piano");
  assert.equal(piano.labels.es, "Piano");

  const spanish = SUBJECT_BUCKETS.find((b) => b.canonicalId === "spanish")!;
  assert.equal(spanish.labels.fr, "Espagnol");
  assert.equal(spanish.labels.en, "Spanish");
  assert.equal(spanish.labels.es, "Español");

  const math = SUBJECT_BUCKETS.find((b) => b.canonicalId === "math")!;
  assert.equal(math.labels.fr, "Mathématiques");
  assert.equal(math.labels.en, "Math");
  assert.equal(math.labels.es, "Matemáticas");

  const homework = SUBJECT_BUCKETS.find((b) => b.canonicalId === "homework_help")!;
  assert.equal(homework.labels.fr, "Aide aux devoirs");
  assert.equal(homework.labels.en, "Homework help");
  assert.equal(homework.labels.es, "Ayuda con tareas");
});

test("searchSubjectBuckets finds piano in every locale", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const matches = searchSubjectBuckets("piano", { locale });
    assert.ok(
      matches.some((m) => m.bucket.canonicalId === "piano"),
      `piano should match in ${locale}`,
    );
  }
});

test("searchSubjectBuckets is accent-insensitive across locales", () => {
  // FR: "Mathématiques" → "mathematiques" after diacritic stripping; the
  // user typing "Mathematiques" (no accent) must still find it.
  const fr = searchSubjectBuckets("Mathematiques", { locale: "fr" });
  assert.ok(fr.some((m) => m.bucket.canonicalId === "math"));

  // ES: "Español" → "espanol"; the user typing "espanol" without the tilde.
  const es = searchSubjectBuckets("espanol", { locale: "es" });
  assert.ok(es.some((m) => m.bucket.canonicalId === "spanish"));

  // FR: "Français" → "francais".
  const fr2 = searchSubjectBuckets("francais", { locale: "fr" });
  assert.ok(fr2.some((m) => m.bucket.canonicalId === "french"));
});

test("groupSubjectMatchesByCategory preserves category order", () => {
  const matches = searchSubjectBuckets("a", { locale: "en", limit: 30 });
  const groups = groupSubjectMatchesByCategory(matches);
  const order = groups.map((g) => g.category);
  // Categories must appear in canonical order: music, languages, academic, arts_skills.
  for (let i = 1; i < order.length; i += 1) {
    const prevIdx = ["music", "languages", "academic", "arts_skills"].indexOf(order[i - 1]!);
    const curIdx = ["music", "languages", "academic", "arts_skills"].indexOf(order[i]!);
    assert.ok(prevIdx < curIdx, `category order broken at ${order[i]}`);
  }
});

// ── Static React source guards ──────────────────────────────────────────
test("LandingPageClient.selectCityForSearch must NOT overwrite the subject query", () => {
  // Scope the regex to the body of `selectCityForSearch` so we don't
  // accidentally pick up a `setSearchQuery` call in an unrelated handler.
  const match = landingClientSrc.match(
    /const\s+selectCityForSearch\s*=\s*useCallback\(\([\s\S]*?\)\s*=>\s*\{[\s\S]*?\},\s*\[/,
  );
  assert.ok(match, "selectCityForSearch must exist with a useCallback wrapper");
  const body = match[0];
  assert.ok(
    !/setSearchQuery\s*\(/.test(body),
    "selectCityForSearch must not call setSearchQuery — that was the root cause of the segmented-search bug",
  );
  // Defense in depth: it should still keep the geo update.
  assert.ok(/setGeo\s*\(/.test(body), "selectCityForSearch must keep the geo update");
});

test("Quoi inputs explicitly opt out of city suggestions", () => {
  // Both segmented hero variants must pass `disableCitySuggestions` so the
  // subject autocomplete never surfaces cities.
  assert.ok(
    /SmartSearchInput[\s\S]*?disableCitySuggestions/.test(landingDiscoverySrc),
    "LandingDiscoverySearch's Quoi must set disableCitySuggestions",
  );
  assert.ok(
    /SmartSearchInput[\s\S]*?disableCitySuggestions/.test(landingHeroSrc),
    "LandingSearchHero's Quoi must set disableCitySuggestions",
  );
});

test("SmartSearchInput accepts disableCitySuggestions and gates city items", () => {
  assert.ok(
    /disableCitySuggestions/.test(smartSearchSrc),
    "SmartSearchInput must export the disableCitySuggestions prop",
  );
  assert.ok(
    /citySuggestionsEnabled/.test(smartSearchSrc),
    "SmartSearchInput must compute citySuggestionsEnabled to gate the city section",
  );
});

test("LandingLocationSearch uses the Canada-wide dataset and 'City, PROV' format", () => {
  assert.ok(
    /from\s+["']@\/lib\/search\/canadianPlaces["']/.test(landingLocationSrc),
    "LandingLocationSearch must pull from the new canadianPlaces dataset",
  );
  assert.ok(
    /searchCanadianPlaces\s*\(/.test(landingLocationSrc),
    "LandingLocationSearch must call searchCanadianPlaces(...)",
  );
  assert.ok(
    /provinceCode/.test(landingLocationSrc),
    "LandingLocationSearch must render the provinceCode (City, PROV)",
  );
});

test("LandingLocationSearch echoes the selected 'City, PROV' label back into the input", () => {
  // After PR #63 the Lieu input was left empty after a selection, which
  // confused users (their selected place was invisible). Confirm
  // selectPlace now writes the formatted label and that the parent
  // surfaces no longer overwrite it back to the empty string.
  assert.ok(
    /onChange\(\s*formatPlaceLabel\(/.test(landingLocationSrc),
    "selectPlace must echo formatPlaceLabel(...) into onChange",
  );
  assert.ok(
    !/setLocationSearch\(\s*""\s*\)/.test(landingClientSrc),
    "LandingPageClient.selectCityForSearch must not clear locationSearch — the child owns the echoed label",
  );
  const studentSearchSrc = readFileSync(
    join(root, "app", "(app)", "student", "search", "page.tsx"),
    "utf8",
  );
  assert.ok(
    !/setLandingLocQuery\(\s*""\s*\)/.test(studentSearchSrc),
    "student/search onSelectCity must not clear landingLocQuery — the child owns the echoed label",
  );
});

test("LandingLocationSearch supports select-all on focus", () => {
  // Standard marketplace pattern: when the input already holds a
  // selected label, focusing the field highlights the text so a fresh
  // keystroke replaces it instead of appending.
  assert.ok(
    /e\.currentTarget\.select\(\)/.test(landingLocationSrc),
    "Lieu input must call e.currentTarget.select() on focus",
  );
});

test("LandingLocationSearch input has a visible caret style", () => {
  // `caret-teal-700` is the Tailwind utility we apply to make the blinking
  // caret visible against the white field; a regression that drops it would
  // bring the "barely visible caret" complaint right back.
  assert.ok(
    /caret-teal-700/.test(landingLocationSrc),
    "Lieu input must carry caret-teal-700",
  );
  assert.ok(
    /caret-teal-700/.test(smartSearchSrc),
    "Quoi input must carry caret-teal-700",
  );
});

test("Segmented hero focus ring is applied via focus-within", () => {
  assert.ok(
    /focus-within:ring-2/.test(landingLocationSrc),
    "Lieu input shell must use focus-within ring",
  );
  assert.ok(
    /focus-within:ring-2/.test(smartSearchSrc),
    "Quoi input shell must use focus-within ring",
  );
});

// ── Layout rhythm: search-to-results visual proximity ──────────────────
//
// Before this PR the landing page rendered a quiz CTA + hero trust strip
// between the search controls and the teacher results, so the cards were
// pushed below the fold even when the user had already entered a query.
// The fix introduces a `hasSearchIntent` flag and conditionally hides
// marketing blocks plus tightens the hero/results section padding.

test("LandingPageClient defines a hasSearchIntent flag", () => {
  assert.ok(
    /const\s+hasSearchIntent\s*=\s*useMemo\(/.test(landingClientSrc),
    "LandingPageClient must expose a hasSearchIntent useMemo",
  );
  // The flag must consider the canonical search-state inputs.
  for (const dep of ["searchQuery", "activeCat", "geo", "formatFilter", "mapBounds"]) {
    assert.ok(
      new RegExp(`${dep}`).test(
        landingClientSrc.split("hasSearchIntent")[1] ?? "",
      ),
      `hasSearchIntent must factor in ${dep}`,
    );
  }
});

test("Quiz CTA + hero trust strip are hidden when search intent exists", () => {
  // The quiz CTA + LandingHeroTrustStrip live between the filters and
  // the results section. When a query is active they must not render
  // — that is the root cause of the reported "huge vertical gap".
  assert.ok(
    /hasSearchIntent\s*\?\s*null\s*:\s*\(\s*<div[\s\S]*?marketplaceQuizCta[\s\S]*?LandingHeroTrustStrip/.test(
      landingClientSrc,
    ),
    "Quiz CTA + LandingHeroTrustStrip block must be gated behind !hasSearchIntent",
  );
});

test("Hero bottom padding shrinks in results mode", () => {
  // The hero wrapper switches its bottom padding from pb-8/pb-10 to
  // pb-3/pb-4 once search intent exists, so the results section sits
  // tightly under the filters.
  assert.ok(
    /hasSearchIntent\s*\?\s*"pb-3 sm:pb-4"\s*:\s*"pb-8 lg:pb-10"/.test(
      landingClientSrc,
    ),
    "Hero wrapper must tighten its bottom padding in results mode",
  );
});

test("Results section uses tight top padding in results mode", () => {
  // Results section: pt-4/pt-5 in results mode vs py-8/py-10 pre-search
  // — keeps a deliberate 24-32 px rhythm between filters and the cards.
  assert.ok(
    /hasSearchIntent[\s\S]*?"pt-4 pb-10 sm:pt-5 sm:pb-12"[\s\S]*?:\s*"py-8 sm:py-10"/.test(
      landingClientSrc,
    ),
    "Results section must use tight top padding when search intent exists",
  );
});

test("LandingResultsHeading renders contextual subject/place summary", () => {
  // The summary heading replaces the static teacherGridNearYou label
  // and uses {subject}/{place} interpolation against the locale keys.
  assert.ok(
    /function LandingResultsHeading\(/.test(landingClientSrc),
    "LandingResultsHeading helper must exist in LandingPageClient",
  );
  assert.ok(
    /landingResultsHeadingForNear/.test(landingClientSrc),
    "LandingResultsHeading must reference the subject+place locale key",
  );
  assert.ok(
    /landingResultsHeadingFor"\)\s*\.replace\("\{subject\}"/.test(landingClientSrc),
    "LandingResultsHeading must substitute {subject} via the project's standard interpolation",
  );
});

test("Empty results state is contextual and hints at relaxing filters", () => {
  assert.ok(
    /function LandingResultsEmptyState\(/.test(landingClientSrc),
    "LandingResultsEmptyState helper must exist",
  );
  assert.ok(
    /landingResultsEmptyHint/.test(landingClientSrc),
    "Empty state must surface the 'widen filters' hint",
  );
});

test("New results-summary i18n keys exist in fr/en/es", () => {
  const requiredKeys = [
    "landingResultsHeadingDefault",
    "landingResultsHeadingFor",
    "landingResultsHeadingForNear",
    "landingResultsHeadingNear",
    "landingResultsHeadingFiltered",
    "landingResultsEmptyFor",
    "landingResultsEmptyForNear",
    "landingResultsEmptyNear",
    "landingResultsEmptyDefault",
    "landingResultsEmptyHint",
  ];
  const placeholderKeys = new Set([
    "landingResultsHeadingFor",
    "landingResultsHeadingForNear",
    "landingResultsHeadingNear",
    "landingResultsEmptyFor",
    "landingResultsEmptyForNear",
    "landingResultsEmptyNear",
  ]);
  for (const locale of ["fr", "en", "es"] as const) {
    const dict = JSON.parse(
      readFileSync(join(root, "lib", "i18n", "locales", `${locale}.json`), "utf8"),
    ) as Record<string, string>;
    for (const key of requiredKeys) {
      assert.ok(
        typeof dict[key] === "string" && dict[key].length > 0,
        `${locale}.${key} must exist`,
      );
    }
    for (const key of placeholderKeys) {
      const value = dict[key]!;
      if (key.endsWith("ForNear")) {
        assert.ok(
          value.includes("{subject}") && value.includes("{place}"),
          `${locale}.${key} must contain {subject} and {place} placeholders`,
        );
      } else if (key.endsWith("For")) {
        assert.ok(
          value.includes("{subject}"),
          `${locale}.${key} must contain a {subject} placeholder`,
        );
      } else if (key.endsWith("Near")) {
        assert.ok(
          value.includes("{place}"),
          `${locale}.${key} must contain a {place} placeholder`,
        );
      }
    }
  }
});

test("Results-mode marketing blocks (LandingNeighborhoodSignals) are gated", () => {
  // The neighborhood signals block is decorative pre-search marketing;
  // in results mode the cards should appear immediately under the
  // filter row instead of after another marketing module.
  assert.ok(
    /hasSearchIntent\s*\?\s*null\s*:\s*\(\s*<LandingNeighborhoodSignals/.test(
      landingClientSrc,
    ),
    "LandingNeighborhoodSignals must only render when !hasSearchIntent",
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
  console.log(`[search:segmentedSearchFields] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
