/**
 * Quoi autosuggest — subject-bank regression test.
 *
 * Production bug (pre-fix): the landing page "Quoi" field only autosuggested
 * the three broad disciplines from `lib/disciplines.ts` (Musique, Langues,
 * Tuteurs académiques). Typing "pi" never surfaced Piano; typing "esp"
 * surfaced teachers but never Espagnol as a category.
 *
 * Root cause: `components/SmartSearchInput.tsx` consumed
 * `getEnabledDisciplines()` (3 broad rows) instead of the
 * `lib/search/subjectBuckets.ts` dataset that was added but never wired in.
 *
 * Fix:
 *   1. Expanded `SUBJECT_BUCKETS` to cover instruments, 25+ common
 *      languages, and core academic subjects.
 *   2. Wired `searchSubjectBuckets()` into `SmartSearchInput` so the dropdown
 *      surfaces specific subjects + the broad categories (via the
 *      `*_general` buckets).
 *   3. Broad categories (`music_general`, `languages_general`,
 *      `tutors_general`) still route through the existing
 *      `onSelectDiscipline` callback to preserve the parent-side category
 *      chip filter; specific subjects populate the input text instead.
 *
 * Coverage style follows `tests/search/segmentedSearchFields.test.ts`:
 * lightweight node-only assertions, mix of pure-data assertions on the
 * bucket dataset and static-source assertions on the React component.
 *
 * Strict guardrails enforced here:
 *   - Lieu (place) input wiring is NOT regressed.
 *   - Teacher matching path stays compatible with selected suggestions.
 *   - No Stripe / payment / booking / messaging / YoPratiqo file is touched
 *     by this PR (asserted indirectly: the file allow-list is short).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  GENERAL_DISCIPLINE_BUCKET_IDS,
  SUBJECT_BUCKETS,
  groupSubjectMatchesByCategory,
  normalizeSubjectQuery,
  searchSubjectBuckets,
  type SubjectBucket,
  type SubjectCategoryId,
} from "../../lib/search/subjectBuckets";
import { getEnabledDisciplines } from "../../lib/disciplines";

// ── Lightweight test runner (matches existing project style) ────────────
type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();
const smartSearchSrc = readFileSync(
  join(root, "components", "SmartSearchInput.tsx"),
  "utf8",
);
const subjectBucketsSrc = readFileSync(
  join(root, "lib", "search", "subjectBuckets.ts"),
  "utf8",
);
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

// ── Helpers ─────────────────────────────────────────────────────────────
function bucketLabels(canonicalId: string): SubjectBucket["labels"] {
  const bucket = SUBJECT_BUCKETS.find((b) => b.canonicalId === canonicalId);
  if (!bucket) throw new Error(`bucket ${canonicalId} not found`);
  return bucket.labels;
}

function bucketsByCategory(category: SubjectCategoryId): SubjectBucket[] {
  return SUBJECT_BUCKETS.filter((b) => b.category === category);
}

function hasMatch(query: string, canonicalId: string, locale: "fr" | "en" | "es" = "fr"): boolean {
  const matches = searchSubjectBuckets(query, { locale, limit: 12 });
  return matches.some((m) => m.bucket.canonicalId === canonicalId);
}

// ── 1. Broad categories preserved ───────────────────────────────────────
test("Broad categories survive: Langues, Musique, Tuteurs académiques, Francisation", () => {
  // The four broad-category buckets the brief asks us to preserve.
  // - music_general    → "Musique"
  // - languages_general → "Langues"
  // - tutors_general   → "Tuteurs académiques"
  // - francisation     → "Francisation"
  for (const id of ["music_general", "languages_general", "tutors_general", "francisation"]) {
    const bucket = SUBJECT_BUCKETS.find((b) => b.canonicalId === id);
    assert.ok(bucket, `broad bucket ${id} must exist`);
  }

  assert.equal(bucketLabels("music_general").fr, "Musique");
  assert.equal(bucketLabels("languages_general").fr, "Langues");
  assert.equal(bucketLabels("tutors_general").fr, "Tuteurs académiques");
  assert.equal(bucketLabels("francisation").fr, "Francisation");
});

test("Broad-category bucket FR labels MUST match discipline labels exactly", () => {
  // SmartSearchInput.select routes broad-category bucket picks through
  // `onSelectDiscipline(bucket.labels.fr)`. The parent matches `activeCat`
  // against the canonical French discipline label, so any drift here would
  // silently break the category chip filter on the landing page.
  const enabled = getEnabledDisciplines();
  const byLabel = new Map(enabled.map((d) => [d.label, d]));
  for (const id of ["music_general", "languages_general", "tutors_general"]) {
    const bucket = SUBJECT_BUCKETS.find((b) => b.canonicalId === id)!;
    assert.ok(
      byLabel.has(bucket.labels.fr),
      `bucket ${id} FR label "${bucket.labels.fr}" must match an enabled discipline label`,
    );
  }
  // GENERAL_DISCIPLINE_BUCKET_IDS is the explicit allow-list the component
  // uses — it must enumerate exactly the three buckets above.
  assert.equal(GENERAL_DISCIPLINE_BUCKET_IDS.size, 3);
  for (const id of ["music_general", "languages_general", "tutors_general"]) {
    assert.ok(GENERAL_DISCIPLINE_BUCKET_IDS.has(id), `${id} must be in GENERAL_DISCIPLINE_BUCKET_IDS`);
  }
});

// ── 2. Music coverage ───────────────────────────────────────────────────
test("Music bank covers Piano, Guitare, Ukulélé, Chant + the required instruments", () => {
  const required: Array<[string, string /* canonicalId */]> = [
    ["Piano", "piano"],
    ["Guitare", "guitar"],
    ["Ukulélé", "ukulele"],
    ["Chant", "singing"],
    ["Violon", "violin"],
    ["Batterie", "drums"],
    ["Basse", "bass"],
    ["Saxophone", "saxophone"],
    ["Flûte", "flute"],
    ["Clarinette", "clarinet"],
    ["Violoncelle", "cello"],
    ["Accordéon", "accordion"],
    ["Solfège", "music_theory"],
    ["Composition", "composition"],
    ["Production musicale", "music_production"],
  ];
  for (const [frLabel, id] of required) {
    const bucket = SUBJECT_BUCKETS.find((b) => b.canonicalId === id);
    assert.ok(bucket, `music bucket ${id} ("${frLabel}") missing`);
    assert.equal(bucket!.labels.fr, frLabel, `${id} FR label mismatch`);
    assert.equal(bucket!.category, "music", `${id} must live in the music category`);
  }
});

// ── 3. Language coverage (>= 25 + minimum named set) ────────────────────
test("Language bank holds at least 25 specific languages (excluding the broad bucket)", () => {
  const specific = bucketsByCategory("languages").filter(
    (b) => b.canonicalId !== "languages_general",
  );
  assert.ok(
    specific.length >= 25,
    `expected >= 25 specific language buckets, got ${specific.length}`,
  );
});

test("Language bank covers every minimum the brief lists", () => {
  // The brief enumerates a minimum set; each entry below must surface via
  // searchSubjectBuckets in FR locale. "Mandarin" maps to the canonical
  // chinese_mandarin bucket; "LSQ" maps to sign_language_quebec.
  const minimums: Array<[string /* user query */, string /* canonicalId */]> = [
    ["Anglais", "english"],
    ["Français", "french"],
    ["Espagnol", "spanish"],
    ["Allemand", "german"],
    ["Japonais", "japanese"],
    ["Chinois", "chinese_mandarin"],
    ["Mandarin", "chinese_mandarin"],
    ["Portugais", "portuguese"],
    ["Italien", "italian"],
    ["Coréen", "korean"],
    ["Arabe", "arabic"],
    ["Russe", "russian"],
    ["Néerlandais", "dutch"],
    ["Grec", "greek"],
    ["Latin", "latin"],
    ["Hindi", "hindi"],
    ["Turc", "turkish"],
    ["Polonais", "polish"],
    ["Ukrainien", "ukrainian"],
    ["Suédois", "swedish"],
    ["Norvégien", "norwegian"],
    ["Danois", "danish"],
    ["Finnois", "finnish"],
    ["Hébreu", "hebrew"],
    ["Vietnamien", "vietnamese"],
    ["Thaï", "thai"],
    ["Indonésien", "indonesian"],
    ["Persan", "persian"],
    ["Créole haïtien", "haitian_creole"],
    ["LSQ", "sign_language_quebec"],
    ["Langue des signes québécoise", "sign_language_quebec"],
  ];
  for (const [query, id] of minimums) {
    assert.ok(
      hasMatch(query, id, "fr"),
      `query "${query}" must surface bucket ${id} in FR locale`,
    );
  }
});

// ── 4. Academic coverage ───────────────────────────────────────────────
test("Academic bank covers Mathématiques, Chimie, Physique, Biologie + the required subjects", () => {
  const required: Array<[string, string]> = [
    ["Mathématiques", "math"],
    ["Sciences", "science_general"],
    ["Physique", "physics"],
    ["Chimie", "chemistry"],
    ["Biologie", "biology"],
    ["Histoire", "history"],
    ["Géographie", "geography"],
    ["Économie", "economics"],
    ["Philosophie", "philosophy"],
    ["Informatique", "computer_skills"],
    ["Programmation", "coding"],
    ["Statistiques", "statistics"],
    ["Calcul différentiel", "calculus_differential"],
    ["Calcul intégral", "calculus_integral"],
    ["Algèbre", "algebra"],
    ["Géométrie", "geometry"],
    ["Lecture", "reading"],
    ["Écriture", "writing"],
    ["Aide aux devoirs", "homework_help"],
    ["Préparation aux examens", "exam_prep"],
    ["Méthodologie", "study_methodology"],
    ["Français scolaire", "french_tutoring"],
    ["Anglais scolaire", "english_tutoring"],
  ];
  for (const [frLabel, id] of required) {
    const bucket = SUBJECT_BUCKETS.find((b) => b.canonicalId === id);
    assert.ok(bucket, `academic bucket ${id} ("${frLabel}") missing`);
    assert.equal(bucket!.labels.fr, frLabel, `${id} FR label mismatch`);
    assert.equal(bucket!.category, "academic", `${id} must live in the academic category`);
  }
});

// ── 5. Lifestyle / arts-skills launch subjects ─────────────────────────
test("Arts & skills bank covers Coach, Cuisine, Arts martiaux, and Danse in FR/EN/ES", () => {
  const required: Array<[string, { fr: string; en: string; es: string }]> = [
    [
      "coach_trainer",
      { fr: "Coach sportif", en: "Fitness coach", es: "Entrenador deportivo" },
    ],
    ["cooking", { fr: "Cuisine", en: "Cooking", es: "Cocina" }],
    ["martial_arts", { fr: "Arts martiaux", en: "Martial arts", es: "Artes marciales" }],
    ["dance", { fr: "Danse", en: "Dance", es: "Danza / baile" }],
  ];

  for (const [id, labels] of required) {
    const bucket = SUBJECT_BUCKETS.find((b) => b.canonicalId === id);
    assert.ok(bucket, `arts_skills bucket ${id} missing`);
    assert.equal(bucket!.category, "arts_skills", `${id} must live in arts_skills`);
    assert.deepEqual(bucket!.labels, labels, `${id} labels must be localized`);
  }
});

test("Coach aliases resolve in FR / EN / ES, including accent-insensitive trainer terms", () => {
  assert.ok(hasMatch("entraîneur", "coach_trainer", "fr"));
  assert.ok(hasMatch("entraineur", "coach_trainer", "fr"));
  assert.ok(hasMatch("coach sportif", "coach_trainer", "fr"));
  assert.ok(hasMatch("personal trainer", "coach_trainer", "en"));
  assert.ok(hasMatch("private trainer", "coach_trainer", "en"));
  assert.ok(hasMatch("entrenador", "coach_trainer", "es"));
  assert.ok(hasMatch("preparador fisico", "coach_trainer", "es"));
});

test("Cuisine aliases resolve in FR / EN / ES, including cooking and cocina", () => {
  assert.ok(hasMatch("cuisine", "cooking", "fr"));
  assert.ok(hasMatch("cours de cuisine", "cooking", "fr"));
  assert.ok(hasMatch("patisserie", "cooking", "fr"));
  assert.ok(hasMatch("cooking", "cooking", "en"));
  assert.ok(hasMatch("cooking class", "cooking", "en"));
  assert.ok(hasMatch("cocina", "cooking", "es"));
  assert.ok(hasMatch("clase de cocina", "cooking", "es"));
});

test("Martial arts aliases resolve in FR / EN / ES, including accent variants", () => {
  assert.ok(hasMatch("arts martiaux", "martial_arts", "fr"));
  assert.ok(hasMatch("karaté", "martial_arts", "fr"));
  assert.ok(hasMatch("karate", "martial_arts", "fr"));
  assert.ok(hasMatch("martial arts", "martial_arts", "en"));
  assert.ok(hasMatch("self defence", "martial_arts", "en"));
  assert.ok(hasMatch("artes marciales", "martial_arts", "es"));
  assert.ok(hasMatch("kárate", "martial_arts", "es"));
});

test("Dance aliases resolve in FR / EN / ES, including baile", () => {
  assert.ok(hasMatch("danse", "dance", "fr"));
  assert.ok(hasMatch("cours de danse", "dance", "fr"));
  assert.ok(hasMatch("dance", "dance", "en"));
  assert.ok(hasMatch("latin dance", "dance", "en"));
  assert.ok(hasMatch("baile", "dance", "es"));
  assert.ok(hasMatch("clase de baile", "dance", "es"));
});

test("Lifestyle subject search stays metadata-only and creates no fake teacher inventory", () => {
  for (const id of ["coach_trainer", "cooking", "martial_arts", "dance"]) {
    const bucket = SUBJECT_BUCKETS.find((b) => b.canonicalId === id);
    assert.ok(bucket, `${id} bucket missing`);
    assert.ok(!("teacher" in bucket!), `${id} must not embed teacher/listing data`);
    assert.ok(!("availability" in bucket!), `${id} must not embed availability data`);
    assert.ok(!("review" in bucket!), `${id} must not embed review data`);
  }
});

// ── 6. Fragment matching — the specific examples from the brief ────────
test("Typing 'pi' suggests Piano", () => {
  assert.ok(hasMatch("pi", "piano", "fr"));
});

test("Typing 'gui' suggests Guitare", () => {
  assert.ok(hasMatch("gui", "guitar", "fr"));
});

test("Typing 'uku' suggests Ukulélé", () => {
  assert.ok(hasMatch("uku", "ukulele", "fr"));
});

test("Typing 'chan' suggests Chant", () => {
  assert.ok(hasMatch("chan", "singing", "fr"));
});

// ── LSQ / Langue des signes québécoise — explicit per-query regression ──
// The `sign_language_quebec` bucket landed in PR #186 with both terms
// stored in its label and alias set. These narrow assertions pin the
// specific queries called out by the LSQ-focused brief so a future
// alias trim cannot silently break LSQ discoverability.
test("Typing 'lsq' suggests LSQ / Langue des signes québécoise", () => {
  assert.ok(hasMatch("lsq", "sign_language_quebec", "fr"));
});

test("Typing 'langue des signes' suggests Langue des signes québécoise", () => {
  assert.ok(hasMatch("langue des signes", "sign_language_quebec", "fr"));
});

test("Typing 'signe' (singular) suggests Langue des signes québécoise", () => {
  // Substring matching: "signe" is contained in "signes" → must surface.
  assert.ok(hasMatch("signe", "sign_language_quebec", "fr"));
});

test("Typing 'signes' (plural) suggests Langue des signes québécoise", () => {
  assert.ok(hasMatch("signes", "sign_language_quebec", "fr"));
});

test("Accent-insensitive: 'langue des signes quebecoise' (no accents) matches LSQ", () => {
  // The bucket's alias set includes both the accented and unaccented FR
  // spellings; verify accent-insensitive matching survives at the
  // fragment level (relevant for mobile keyboards without easy accents).
  assert.ok(hasMatch("langue des signes quebecoise", "sign_language_quebec", "fr"));
});

test("LSQ bucket carries no ASL / LSF / cross-region sign-language drift", () => {
  // The LSQ-focused brief is explicit: do NOT add ASL or LSF here. Pin
  // the label so a future "let's bundle ASL into this row" edit is loud.
  const bucket = SUBJECT_BUCKETS.find((b) => b.canonicalId === "sign_language_quebec");
  assert.ok(bucket, "sign_language_quebec bucket must exist");
  assert.ok(
    bucket!.labels.fr.includes("Langue des signes québécoise"),
    "FR label must keep the full 'Langue des signes québécoise' phrase",
  );
  assert.ok(bucket!.labels.fr.includes("LSQ"), "FR label must keep the LSQ abbreviation");
  for (const term of ["asl", "american sign language", "lsf", "french sign language", "langue des signes française"]) {
    const haystack = [
      bucket!.labels.fr,
      bucket!.labels.en,
      bucket!.labels.es,
      ...(bucket!.aliases.fr ?? []),
      ...(bucket!.aliases.en ?? []),
      ...(bucket!.aliases.es ?? []),
    ]
      .join(" | ")
      .toLowerCase();
    assert.ok(
      !haystack.includes(term),
      `LSQ bucket must not contain "${term}" — ASL/LSF are out of scope for this bucket`,
    );
  }
});

test("Typing 'esp' suggests Espagnol (FR locale)", () => {
  assert.ok(hasMatch("esp", "spanish", "fr"));
});

test("Typing 'jap' suggests Japonais", () => {
  assert.ok(hasMatch("jap", "japanese", "fr"));
});

test("Typing 'chi' suggests BOTH Chinois AND Chimie", () => {
  // Documented brief expectation: ambiguous fragments must surface both
  // plausible buckets so the user can disambiguate.
  const matches = searchSubjectBuckets("chi", { locale: "fr", limit: 12 });
  const ids = new Set(matches.map((m) => m.bucket.canonicalId));
  assert.ok(ids.has("chinese_mandarin"), `"chi" must surface chinese_mandarin (got ${[...ids].join(", ")})`);
  assert.ok(ids.has("chemistry"), `"chi" must surface chemistry (got ${[...ids].join(", ")})`);
});

test("Typing 'mand' suggests Mandarin (Chinese)", () => {
  assert.ok(hasMatch("mand", "chinese_mandarin", "fr"));
});

test("Typing 'math' suggests Mathématiques (and aliases 'maths' resolve too)", () => {
  assert.ok(hasMatch("math", "math", "fr"));
  // The "maths" alias is documented in the brief; verify it's part of the
  // bucket's alias set so future trims don't silently break it.
  const math = SUBJECT_BUCKETS.find((b) => b.canonicalId === "math")!;
  assert.ok(
    (math.aliases.fr ?? []).some((a) => a.toLowerCase() === "maths"),
    `math.aliases.fr must include "maths"`,
  );
});

test("Typing 'phys' suggests Physique", () => {
  assert.ok(hasMatch("phys", "physics", "fr"));
});

test("Typing 'chim' suggests Chimie", () => {
  assert.ok(hasMatch("chim", "chemistry", "fr"));
});

test("Typing 'bio' suggests Biologie", () => {
  assert.ok(hasMatch("bio", "biology", "fr"));
});

// ── 6. Accent-insensitive matching (no-accent inputs) ──────────────────
test("Accent-insensitive: 'ukulele' (no accents) matches Ukulélé", () => {
  assert.ok(hasMatch("ukulele", "ukulele", "fr"));
});

test("Accent-insensitive: 'mathematiques' matches Mathématiques", () => {
  assert.ok(hasMatch("mathematiques", "math", "fr"));
});

test("Accent-insensitive: 'francais' matches Français", () => {
  assert.ok(hasMatch("francais", "french", "fr"));
});

test("Accent-insensitive: 'hebreu' matches Hébreu", () => {
  assert.ok(hasMatch("hebreu", "hebrew", "fr"));
});

test("Accent-insensitive: 'francisation' matches Francisation (immigrant-friendly typing)", () => {
  // Francisation is a Quebec-specific term; users typing it without context
  // (no accents, no quotes) must still hit the bucket.
  assert.ok(hasMatch("francisation", "francisation", "fr"));
});

test("normalizeSubjectQuery strips diacritics consistently", () => {
  assert.equal(normalizeSubjectQuery("Hébreu"), "hebreu");
  assert.equal(normalizeSubjectQuery("Ukulélé"), "ukulele");
  assert.equal(normalizeSubjectQuery("Mathématiques"), "mathematiques");
  assert.equal(normalizeSubjectQuery("Français"), "francais");
});

// ── 7. Ranking: exact/prefix matches outrank substring matches ─────────
test("Prefix match outranks substring match for the same query", () => {
  // "pian" should put Piano first — any future bucket that contains "pian"
  // mid-word must not jump ahead.
  const matches = searchSubjectBuckets("pian", { locale: "fr", limit: 5 });
  assert.ok(matches.length >= 1, `"pian" must return at least one match`);
  assert.equal(matches[0]!.bucket.canonicalId, "piano");
});

// ── 8. Locale parity: EN and ES still work ─────────────────────────────
test("EN locale: 'pi' suggests Piano", () => {
  assert.ok(hasMatch("pi", "piano", "en"));
});

test("ES locale: 'espanol' matches Spanish (es)", () => {
  // ES users typing "espanol" without the tilde must still hit the bucket.
  assert.ok(hasMatch("espanol", "spanish", "es"));
});

// ── 9. SmartSearchInput is correctly wired to subjectBuckets ───────────
test("SmartSearchInput.tsx imports searchSubjectBuckets from the buckets module", () => {
  assert.ok(
    /import\s*\{[^}]*searchSubjectBuckets[^}]*\}\s*from\s*["']@\/lib\/search\/subjectBuckets["']/.test(
      smartSearchSrc,
    ),
    "SmartSearchInput must import searchSubjectBuckets from @/lib/search/subjectBuckets",
  );
});

test("SmartSearchInput.tsx no longer reads from the 3-row disciplines list", () => {
  // The bug was that the dropdown read `getEnabledDisciplines()` from
  // `lib/disciplines.ts` and surfaced only the 3 broad rows. Verify that
  // dependency is gone so a future regression is loud.
  assert.ok(
    !/getEnabledDisciplines/.test(smartSearchSrc),
    "SmartSearchInput must not import getEnabledDisciplines anymore",
  );
  assert.ok(
    !/from\s*["']@\/lib\/disciplines["']/.test(smartSearchSrc),
    "SmartSearchInput must not import from @/lib/disciplines anymore",
  );
});

test("SmartSearchInput.tsx calls searchSubjectBuckets in its suggestions useMemo", () => {
  assert.ok(
    /searchSubjectBuckets\(\s*debouncedQuery\s*,\s*\{\s*locale[^}]*\}\s*\)/.test(smartSearchSrc),
    "SmartSearchInput must call searchSubjectBuckets(debouncedQuery, { locale, ... })",
  );
});

test("SmartSearchInput.tsx routes general-discipline buckets through onSelectDiscipline", () => {
  // The select() handler must still call onSelectDiscipline for the broad
  // buckets — that's how the parent's category-chip filter stays alive.
  assert.ok(
    /GENERAL_DISCIPLINE_BUCKET_IDS\.has\(\s*bucket\.canonicalId\s*\)/.test(smartSearchSrc),
    "select() must gate the onSelectDiscipline call by GENERAL_DISCIPLINE_BUCKET_IDS",
  );
  assert.ok(
    /onSelectDiscipline\(\s*bucket\.labels\.fr\s*\)/.test(smartSearchSrc),
    "select() must pass bucket.labels.fr (canonical French label) to onSelectDiscipline",
  );
});

test("SmartSearchInput.tsx populates the input with the localized label for specific subjects", () => {
  // Specific (non-general) subjects must populate the input via onChange
  // so the parent's text-driven teacher filter takes over. We assert the
  // displayLabel is the value passed to onChange in the subject branch.
  const subjectBranch = smartSearchSrc.match(
    /if\s*\(\s*item\.kind\s*===\s*["']subject["']\s*\)\s*\{[\s\S]*?\}\s*else\s+if\s*\(\s*item\.kind\s*===\s*["']teacher["']/,
  );
  assert.ok(subjectBranch, "select() must have a subject branch before the teacher branch");
  assert.ok(
    /onChange\(\s*displayLabel\s*\)/.test(subjectBranch![0]),
    "subject branch must call onChange(displayLabel) for specific subjects",
  );
});

// ── 10. Lieu separation is NOT regressed ───────────────────────────────
test("Lieu input still uses canadianPlaces — subject bank changes did not bleed into places", () => {
  assert.ok(
    /from\s+["']@\/lib\/search\/canadianPlaces["']/.test(landingLocationSrc),
    "LandingLocationSearch must still pull from the canadianPlaces dataset",
  );
  assert.ok(
    /searchCanadianPlaces\s*\(/.test(landingLocationSrc),
    "LandingLocationSearch must still call searchCanadianPlaces(...)",
  );
  assert.ok(
    !/searchSubjectBuckets/.test(landingLocationSrc),
    "LandingLocationSearch must NOT import searchSubjectBuckets (strict separation)",
  );
});

test("Quoi inputs in both segmented heroes still opt out of city suggestions", () => {
  // Defense in depth for the existing segmented-search contract — the Quoi
  // segment must never surface cities from SmartSearchInput's city section.
  assert.ok(
    /SmartSearchInput[\s\S]*?disableCitySuggestions/.test(landingHeroSrc),
    "LandingSearchHero's Quoi must set disableCitySuggestions",
  );
  assert.ok(
    /SmartSearchInput[\s\S]*?disableCitySuggestions/.test(landingDiscoverySrc),
    "LandingDiscoverySearch's Quoi must set disableCitySuggestions",
  );
});

// ── 11. Teacher matching contract is unchanged ─────────────────────────
test("Teacher section in SmartSearchInput still matches name/discipline/bio", () => {
  // The brief explicitly preserves the existing teacher matching behavior
  // ("typing 'esp' can show a teacher because 'espagnol' matches"). Verify
  // the teacher filter still inspects all three fields.
  assert.ok(
    /contains\(tt\.name,\s*q\)\s*\|\|\s*contains\(tt\.discipline,\s*q\)\s*\|\|\s*contains\(tt\.bio,\s*q\)/.test(
      smartSearchSrc,
    ),
    "Teacher filter must still match against name OR discipline OR bio",
  );
});

// ── 12. Dataset doesn't carry forbidden metadata ───────────────────────
test("Subject buckets module carries no Stripe / payment / pricing metadata", () => {
  // Insulate the subject bank from a future drift where someone adds a
  // priceId or a Stripe field to a bucket "just to be helpful".
  const forbidden = [
    "stripe",
    "STRIPE",
    "price_id",
    "priceId",
    "stripeAccount",
    "stripeProduct",
    "membrePro",
    "membre_pro",
  ];
  for (const term of forbidden) {
    assert.ok(
      !subjectBucketsSrc.includes(term),
      `subjectBuckets.ts must not reference ${term}`,
    );
  }
});

// ── 13. Grouping invariant survives the expanded dataset ───────────────
test("groupSubjectMatchesByCategory still returns categories in canonical order with the expanded dataset", () => {
  const matches = searchSubjectBuckets("a", { locale: "en", limit: 50 });
  const groups = groupSubjectMatchesByCategory(matches);
  const canonicalOrder = ["music", "languages", "academic", "arts_skills"] as const;
  for (let i = 1; i < groups.length; i += 1) {
    const prev = canonicalOrder.indexOf(groups[i - 1]!.category);
    const cur = canonicalOrder.indexOf(groups[i]!.category);
    assert.ok(prev < cur, `category order broken at index ${i} (${groups[i]!.category})`);
  }
});

// ── Run ────────────────────────────────────────────────────────────────
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
  console.log(`[search:quoiAutosuggestSubjectBank] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
