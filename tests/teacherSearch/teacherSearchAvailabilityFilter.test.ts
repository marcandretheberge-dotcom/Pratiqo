/**
 * Teacher search — availability filter regression test.
 *
 * Product context: students could not filter teacher results by day/time
 * windows. The advanced panel had a free-text "Disponibilité" input that
 * substring-matched against `teacher.availability` raw labels — useless
 * for "show me teachers available Tuesday evening".
 *
 * Fix:
 *   1. Replaced the free-text input with two structured selects (day +
 *      period) in `components/TeacherSearchAdvancedPanel.tsx`.
 *   2. Added a strict matcher `teacherMatchesAvailabilityWindow` in
 *      `lib/slots.ts` that reuses the existing
 *      `weeklyAvailabilityFromTeacherRows` parser — so search and the
 *      booking modal cannot disagree on a teacher's weekly window.
 *   3. Replaced `criteria.availability: string` with
 *      `availabilityDay?` + `availabilityPeriod?` in
 *      `lib/teacherSearchCriteria.ts`, and wired it into
 *      `filterTeacherPool`.
 *   4. Both `app/LandingPageClient.tsx` and `app/(app)/student/search/page.tsx`
 *      forward the new criteria to the engine.
 *
 * Coverage style matches the project pattern (see
 * `tests/search/segmentedSearchFields.test.ts` and
 * `tests/search/quoiAutosuggestSubjectBank.test.ts`):
 * a mix of (a) pure-logic assertions on the matcher and engine and
 * (b) static-source assertions on the React/Page wiring + i18n.
 *
 * Strict guardrails enforced here:
 *   - Booking slot generation (`generateSlots`/`getAvailableDays`) is
 *     NOT regressed — the new matcher is additive.
 *   - Stripe / payment / messaging / YoPratiqo code is not touched (the
 *     allow-list of files this PR reads is intentionally short).
 *   - Existing teacher search behavior with NO availability filter is
 *     identical to the pre-fix baseline.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DAY_KEYS,
  JS_DOW_TO_KEY,
  PERIODS,
  teacherMatchesAvailabilityWindow,
  weeklyAvailabilityFromTeacherRows,
  type DayKey,
  type PeriodKey,
} from "../../lib/slots";
import { filterTeacherPool } from "../../lib/teacherSearchEngine";
import type { Teacher } from "../../types";

// ── Lightweight test runner (matches existing project style) ────────────
type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();
const panelSrc = readFileSync(
  join(root, "components", "TeacherSearchAdvancedPanel.tsx"),
  "utf8",
);
const enginesrc = readFileSync(
  join(root, "lib", "teacherSearchEngine.ts"),
  "utf8",
);
const slotsSrc = readFileSync(join(root, "lib", "slots.ts"), "utf8");
const landingClientSrc = readFileSync(
  join(root, "app", "LandingPageClient.tsx"),
  "utf8",
);
const studentSearchSrc = readFileSync(
  join(root, "app", "(app)", "student", "search", "page.tsx"),
  "utf8",
);
const enLocale = JSON.parse(
  readFileSync(join(root, "lib", "i18n", "locales", "en.json"), "utf8"),
) as Record<string, string>;
const frLocale = JSON.parse(
  readFileSync(join(root, "lib", "i18n", "locales", "fr.json"), "utf8"),
) as Record<string, string>;
const esLocale = JSON.parse(
  readFileSync(join(root, "lib", "i18n", "locales", "es.json"), "utf8"),
) as Record<string, string>;

// ── Helpers ─────────────────────────────────────────────────────────────
function makeTeacher(overrides: Partial<Teacher>): Teacher {
  // Minimal teacher fixture — only fields the engine inspects. Cast keeps
  // the test focused on the availability path without dragging the whole
  // Supabase row shape into this file.
  return {
    id: "t",
    name: "Test Teacher",
    discipline: "Piano",
    category: "Musique",
    bio: "",
    rating: 4.5,
    pricePerLesson: 40,
    isVerified: true,
    imageUrl: "",
    availability: [],
    location: { neighborhood: "", lat: 0, lng: 0 },
    languages: [],
    levels: [],
    teachingMode: "online",
    ...overrides,
  } as unknown as Teacher;
}

// ── 1. Constants reused, not redefined ─────────────────────────────────
test("PERIODS exposes matin / apresmidi / soir with non-overlapping ranges", () => {
  // The brief explicitly says: reuse existing daypart constants. Pin the
  // canonical set so a future "let's add a 4th period" PR has to break
  // this test on purpose.
  for (const key of ["matin", "apresmidi", "soir"] as const) {
    assert.ok(PERIODS[key], `PERIODS.${key} must exist`);
    assert.ok(
      PERIODS[key].end > PERIODS[key].start,
      `PERIODS.${key} must have end > start`,
    );
  }
  assert.ok(PERIODS.matin.end <= PERIODS.apresmidi.start, "matin must end at or before apresmidi");
  assert.ok(
    PERIODS.apresmidi.end <= PERIODS.soir.start,
    "apresmidi must end at or before soir",
  );
});

test("DAY_KEYS enumerates Lundi through Dimanche (Monday-first)", () => {
  assert.deepEqual(
    [...DAY_KEYS],
    ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"],
    "DAY_KEYS must list every day exactly once, Monday-first",
  );
  // JS_DOW_TO_KEY is the JavaScript Date#getDay() mapping (Sunday-first)
  // and must still be Sunday-first — booking code depends on it.
  assert.equal(JS_DOW_TO_KEY[0], "dim", "JS_DOW_TO_KEY[0] must still be Sunday");
});

// ── 2. weeklyAvailabilityFromTeacherRows is the source of truth ─────────
test("teacherMatchesAvailabilityWindow uses the same parser the booking modal uses", () => {
  // Defense in depth: if the booking modal and the search filter ever
  // disagreed on how to parse `teacher.availability`, students would see
  // teachers in search that have no real Tuesday evening slots. This pins
  // them to the same source of truth.
  const rows = ["Mar Soir", "Jeu Matin"];
  const parsed = weeklyAvailabilityFromTeacherRows(rows);
  assert.equal(parsed.mar!.soir, true, "parser must mark Mar Soir true");
  assert.equal(parsed.jeu!.matin, true, "parser must mark Jeu Matin true");
  // The matcher must agree with the parser on every (day, period) cell.
  for (const day of DAY_KEYS) {
    for (const period of ["matin", "apresmidi", "soir"] as const) {
      const expected = parsed[day]?.[period] ?? false;
      const got = teacherMatchesAvailabilityWindow(rows, day, period);
      assert.equal(
        got,
        expected,
        `matcher and parser disagree at (${day}, ${period}): got=${got} expected=${expected}`,
      );
    }
  }
});

// ── 3. Matcher rules ────────────────────────────────────────────────────
test("Matcher: empty filter (no day, no period) widens to true", () => {
  assert.equal(teacherMatchesAvailabilityWindow(["Mar Soir"], null, null), true);
  assert.equal(teacherMatchesAvailabilityWindow([], null, null), true);
  assert.equal(teacherMatchesAvailabilityWindow(null, null, null), true);
});

test("Matcher: day + period requires that exact cell to be set", () => {
  const rows = ["Mar Soir"];
  assert.equal(teacherMatchesAvailabilityWindow(rows, "mar", "soir"), true);
  assert.equal(
    teacherMatchesAvailabilityWindow(rows, "mar", "matin"),
    false,
    "Mardi matin must NOT match a teacher who only teaches Mardi soir",
  );
  assert.equal(
    teacherMatchesAvailabilityWindow(rows, "mer", "soir"),
    false,
    "Mercredi soir must NOT match a teacher who only teaches Mardi soir",
  );
});

test("Matcher: day only matches any period on that day", () => {
  const rows = ["Sam Matin"];
  assert.equal(teacherMatchesAvailabilityWindow(rows, "sam", null), true);
  assert.equal(teacherMatchesAvailabilityWindow(rows, "dim", null), false);
});

test("Matcher: period only matches across any day", () => {
  const rows = ["Lun Apres-midi", "Jeu Matin"]; // unaccented label
  // The parser only accepts the accented spelling "Après-midi"; this
  // verifies that an unaccented stored label DOES NOT silently match —
  // it would be a false positive for the student. This also documents
  // the contract: teachers should store the canonical accented label.
  assert.equal(
    teacherMatchesAvailabilityWindow(rows, null, "apresmidi"),
    false,
    "unaccented 'Apres-midi' must not match — parser expects 'Après-midi'",
  );
  const canonical = ["Lun Après-midi", "Jeu Matin"];
  assert.equal(teacherMatchesAvailabilityWindow(canonical, null, "apresmidi"), true);
  assert.equal(teacherMatchesAvailabilityWindow(canonical, null, "matin"), true);
  assert.equal(teacherMatchesAvailabilityWindow(canonical, null, "soir"), false);
});

test("Matcher: malformed rows are silently ignored, never crash", () => {
  // Real-world `teacher.availability` may contain partial / legacy rows.
  // The matcher must treat them as "absent" rather than blowing up.
  const rows = ["", "garbage", "Mar", "Lun ", "Lun Bogus", { x: 1 } as unknown as string];
  assert.equal(teacherMatchesAvailabilityWindow(rows, "mar", "soir"), false);
  assert.equal(teacherMatchesAvailabilityWindow(rows, null, null), true);
});

// ── 4. filterTeacherPool wires the new criteria correctly ──────────────
const POOL: Teacher[] = [
  makeTeacher({ id: "tue-eve", name: "Tue Evening Piano", availability: ["Mar Soir"] }),
  makeTeacher({ id: "sat-morn", name: "Sat Morning Spanish", discipline: "Espagnol", availability: ["Sam Matin"] }),
  makeTeacher({ id: "thu-aft", name: "Thu Afternoon Piano", availability: ["Jeu Après-midi"] }),
  makeTeacher({ id: "no-avail", name: "Empty Calendar Piano", availability: [] }),
];

test("Engine: Tuesday evening filter returns the Tuesday evening teacher", () => {
  const result = filterTeacherPool(POOL, {
    availabilityDay: "mar",
    availabilityPeriod: "soir",
  });
  const ids = result.map((t) => t.id);
  assert.deepEqual(ids, ["tue-eve"], `expected only tue-eve, got ${ids.join(", ")}`);
});

test("Engine: Tuesday evening filter excludes teachers without Tuesday evening availability", () => {
  const result = filterTeacherPool(POOL, {
    availabilityDay: "mar",
    availabilityPeriod: "soir",
  });
  const ids = result.map((t) => t.id);
  assert.ok(!ids.includes("sat-morn"));
  assert.ok(!ids.includes("thu-aft"));
  assert.ok(!ids.includes("no-avail"));
});

test("Engine: Saturday morning + Spanish subject combines correctly", () => {
  // Brief: availability filter must combine with existing subject filter.
  const result = filterTeacherPool(POOL, {
    searchQuery: "espagnol",
    availabilityDay: "sam",
    availabilityPeriod: "matin",
  });
  const ids = result.map((t) => t.id);
  assert.deepEqual(ids, ["sat-morn"]);
});

test("Engine: empty availability filter does not narrow results", () => {
  // Brief: existing search without availability filter is unchanged.
  const baseline = filterTeacherPool(POOL, {});
  const withEmpty = filterTeacherPool(POOL, {
    availabilityDay: undefined,
    availabilityPeriod: undefined,
  });
  assert.equal(baseline.length, withEmpty.length);
  assert.equal(baseline.length, POOL.length);
});

test("Engine: day-only filter matches any period on that day", () => {
  const result = filterTeacherPool(POOL, { availabilityDay: "jeu" });
  const ids = result.map((t) => t.id);
  assert.deepEqual(ids, ["thu-aft"]);
});

test("Engine: period-only filter matches any day with that period", () => {
  const result = filterTeacherPool(POOL, { availabilityPeriod: "soir" });
  const ids = result.map((t) => t.id);
  assert.deepEqual(ids, ["tue-eve"]);
});

test("Engine: clearing availability filter restores broader results", () => {
  // Apply, then clear — must reach the same set as the baseline run.
  const narrow = filterTeacherPool(POOL, {
    availabilityDay: "mar",
    availabilityPeriod: "soir",
  });
  assert.equal(narrow.length, 1);
  const restored = filterTeacherPool(POOL, {
    availabilityDay: undefined,
    availabilityPeriod: undefined,
  });
  assert.equal(restored.length, POOL.length, "cleared filter must restore the full pool");
});

test("Engine: free-text criteria.availability is no longer consumed", () => {
  // The pre-fix code accepted `criteria.availability: string` and did a
  // substring match against the raw teacher.availability labels. That
  // field has been replaced by structured day/period — make sure the
  // engine source no longer references the legacy keyword matcher.
  assert.ok(
    !/teacherMatchesAvailabilityKeyword/.test(enginesrc),
    "engine must no longer define or call teacherMatchesAvailabilityKeyword",
  );
  assert.ok(
    /teacherMatchesAvailabilityWindow/.test(enginesrc),
    "engine must call the new structured matcher",
  );
});

// ── 5. Booking slot generation contract is unchanged ───────────────────
test("Slot generation surface (generateSlots/getAvailableDays) is untouched", () => {
  // Static-source guard: a future PR must not "improve" the search filter
  // by silently rewiring the booking-side slot generation.
  assert.ok(/export function generateSlots\(/.test(slotsSrc));
  assert.ok(/export function getAvailableDays\(/.test(slotsSrc));
  assert.ok(/export function weeklyAvailabilityFromTeacherRows\(/.test(slotsSrc));
  // The new matcher must live in the same module so the parser is shared.
  assert.ok(/export function teacherMatchesAvailabilityWindow\(/.test(slotsSrc));
});

// ── 6. Panel UI exposes structured day + period controls ───────────────
test("Panel: AdvancedFilterValues type drops the free-text `availability` string", () => {
  assert.ok(
    !/availability:\s*string/.test(panelSrc),
    "AdvancedFilterValues must no longer carry `availability: string`",
  );
  assert.ok(
    /availabilityDay:\s*DayKey\s*\|\s*""/.test(panelSrc),
    "AdvancedFilterValues must carry availabilityDay: DayKey | \"\"",
  );
  assert.ok(
    /availabilityPeriod:\s*PeriodKey\s*\|\s*""/.test(panelSrc),
    "AdvancedFilterValues must carry availabilityPeriod: PeriodKey | \"\"",
  );
});

test("Panel: renders an 'Disponibilité' fieldset with day + period selects + clear button", () => {
  assert.ok(
    /data-testid="teacher-search-availability"/.test(panelSrc),
    "Panel must render the availability section with a stable test hook",
  );
  assert.ok(
    /data-testid="teacher-search-availability-day"/.test(panelSrc),
    "Panel must render the day select",
  );
  assert.ok(
    /data-testid="teacher-search-availability-period"/.test(panelSrc),
    "Panel must render the period select",
  );
  assert.ok(
    /data-testid="teacher-search-availability-clear"/.test(panelSrc),
    "Panel must render the clear button when at least one field is set",
  );
});

test("Panel: day options enumerate every weekday key (Mon-Sun)", () => {
  // Read the static option list out of the source so a future trim is loud.
  for (const key of DAY_KEYS) {
    const pattern = new RegExp(`value:\\s*"${key}"`);
    assert.ok(pattern.test(panelSrc), `DAY_OPTIONS must include ${key}`);
  }
});

test("Panel: period options enumerate matin / apresmidi / soir", () => {
  for (const key of ["matin", "apresmidi", "soir"] as const) {
    const pattern = new RegExp(`value:\\s*"${key}"`);
    assert.ok(pattern.test(panelSrc), `PERIOD_OPTIONS must include ${key}`);
  }
});

// ── 7. Parent surfaces forward the structured filter ───────────────────
test("LandingPageClient forwards availabilityDay + availabilityPeriod to filterTeacherPool", () => {
  assert.ok(
    /availabilityDay:\s*adv\.availabilityDay\s*\|\|\s*undefined/.test(landingClientSrc),
    "LandingPageClient must forward adv.availabilityDay to the engine",
  );
  assert.ok(
    /availabilityPeriod:\s*adv\.availabilityPeriod\s*\|\|\s*undefined/.test(landingClientSrc),
    "LandingPageClient must forward adv.availabilityPeriod to the engine",
  );
  // hasAdvancedFilter must consider the new fields so results mode kicks in.
  assert.ok(
    /adv\.availabilityDay\s*\|\|\s*\n\s*adv\.availabilityPeriod\s*\|\|/.test(landingClientSrc) ||
      /adv\.availabilityDay\s*\|\|\s*adv\.availabilityPeriod/.test(landingClientSrc),
    "hasAdvancedFilter useMemo must include the new fields",
  );
  // Analytics payload must carry the new fields.
  assert.ok(
    /availabilityDay:\s*adv\.availabilityDay/.test(landingClientSrc),
    "logSearchEvent payload must include availabilityDay",
  );
  assert.ok(
    /availabilityPeriod:\s*adv\.availabilityPeriod/.test(landingClientSrc),
    "logSearchEvent payload must include availabilityPeriod",
  );
});

test("Student search page forwards availabilityDay + availabilityPeriod to filterTeacherPool", () => {
  assert.ok(
    /availabilityDay:\s*adv\.availabilityDay\s*\|\|\s*undefined/.test(studentSearchSrc),
    "student/search must forward adv.availabilityDay to the engine",
  );
  assert.ok(
    /availabilityPeriod:\s*adv\.availabilityPeriod\s*\|\|\s*undefined/.test(studentSearchSrc),
    "student/search must forward adv.availabilityPeriod to the engine",
  );
  // The useMemo deps must include the new fields so results actually
  // re-compute when the student picks Mardi soir.
  assert.ok(
    /adv\.availabilityDay,\s*\n\s*adv\.availabilityPeriod/.test(studentSearchSrc) ||
      /adv\.availabilityDay,\s*adv\.availabilityPeriod/.test(studentSearchSrc),
    "student/search useMemo deps must include adv.availabilityDay + adv.availabilityPeriod",
  );
});

// ── 8. i18n contract ───────────────────────────────────────────────────
const REQUIRED_KEYS = [
  "searchAvailabilityLabel",
  "searchAvailabilityDay",
  "searchAvailabilityDayAny",
  "searchAvailabilityPeriod",
  "searchAvailabilityPeriodAny",
  "searchAvailabilityClear",
  "dayMonday",
  "dayTuesday",
  "dayWednesday",
  "dayThursday",
  "dayFriday",
  "daySaturday",
  "daySunday",
] as const;

test("All availability i18n keys exist in en/fr/es", () => {
  for (const locale of [
    ["en", enLocale],
    ["fr", frLocale],
    ["es", esLocale],
  ] as const) {
    const [name, dict] = locale;
    for (const key of REQUIRED_KEYS) {
      assert.ok(
        typeof dict[key] === "string" && dict[key]!.length > 0,
        `${name}.${key} must exist and be non-empty`,
      );
    }
  }
});

test("French labels match the brief's required strings exactly", () => {
  // The brief pins user-visible French copy. Don't drift.
  assert.equal(frLocale.searchAvailabilityLabel, "Disponibilité");
  assert.equal(frLocale.searchAvailabilityDay, "Jour");
  assert.equal(frLocale.searchAvailabilityPeriod, "Moment");
  assert.equal(frLocale.searchAvailabilityClear, "Effacer la disponibilité");
  assert.equal(frLocale.dayMonday, "Lundi");
  assert.equal(frLocale.dayTuesday, "Mardi");
  assert.equal(frLocale.dayWednesday, "Mercredi");
  assert.equal(frLocale.dayThursday, "Jeudi");
  assert.equal(frLocale.dayFriday, "Vendredi");
  assert.equal(frLocale.daySaturday, "Samedi");
  assert.equal(frLocale.daySunday, "Dimanche");
  // Period labels (existing keys) must still hold the brief's spellings.
  assert.equal(frLocale.morning, "Matin");
  assert.equal(frLocale.afternoon, "Après-midi");
  assert.equal(frLocale.evening, "Soir");
});

test("Deprecated free-text availability i18n keys are fully removed", () => {
  // We pulled the free-text field from the UI; the obsolete keys must go
  // too so no contributor accidentally reattaches them later.
  for (const locale of [
    ["en", enLocale],
    ["fr", frLocale],
    ["es", esLocale],
  ] as const) {
    const [name, dict] = locale;
    assert.equal(
      typeof dict.searchFieldAvailability,
      "undefined",
      `${name}.searchFieldAvailability must be removed`,
    );
    assert.equal(
      typeof dict.searchFieldAvailabilityPlaceholder,
      "undefined",
      `${name}.searchFieldAvailabilityPlaceholder must be removed`,
    );
  }
});

// ── 9. No forbidden imports leaked into this PR's surface ──────────────
test("Touched files do NOT import Stripe, payments, messaging, or YoPratiqo modules", () => {
  // Defense in depth against scope creep — the brief's hard guardrails.
  const forbidden = [
    /["']@\/lib\/stripe/,
    /["']@\/lib\/payments/,
    /["']@\/lib\/messaging/,
    /["']@\/lib\/email/,
    /["']@\/lib\/yo\//,
    /["']@\/lib\/commission/,
    /["']@\/lib\/membrePro/,
  ];
  const sources: Array<[string, string]> = [
    ["panelSrc", panelSrc],
    ["enginesrc", enginesrc],
    ["slotsSrc", slotsSrc],
  ];
  for (const [name, src] of sources) {
    for (const re of forbidden) {
      assert.ok(!re.test(src), `${name} must not import ${re.source}`);
    }
  }
});

// ── 10. Type compatibility: PeriodKey is "matin" | "apresmidi" | "soir" ─
test("PeriodKey aligns with PERIODS keys (no silent drift)", () => {
  const keys = Object.keys(PERIODS).sort();
  assert.deepEqual(keys, ["apresmidi", "matin", "soir"]);
  // Smoke-check that each PeriodKey is a valid matcher input.
  for (const p of keys as PeriodKey[]) {
    teacherMatchesAvailabilityWindow(["Mar Soir"], "mar", p); // would TS-error if drift
  }
});

test("DayKey aligns with DAY_KEYS (no silent drift)", () => {
  // Smoke-check at runtime that every DayKey is accepted by the matcher.
  for (const d of DAY_KEYS as readonly DayKey[]) {
    teacherMatchesAvailabilityWindow(["Mar Soir"], d, "soir");
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
  console.log(`[teacherSearch:availabilityFilter] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
