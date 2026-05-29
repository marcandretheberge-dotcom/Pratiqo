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
