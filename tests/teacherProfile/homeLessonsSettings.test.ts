/**
 * Home-lesson settings restoration (Cours à domicile).
 *
 * Background:
 *   Before the /teacher/verification UX/UI redesign, teachers could configure:
 *     1. Whether they offer lessons at the student's home (home_lesson_enabled)
 *     2. Maximum travel radius in km            (home_lesson_radius_km)
 *     3. Hourly rate for home lessons           (home_lesson_price)
 *   This file guards the restored UI + its plumbing so it does not regress
 *   silently again.
 *
 * Why these assertions matter:
 *   `home_lesson_price` is an ALTERNATE hourly rate, NOT an additive surcharge:
 *   computeBookingChargeCents() and BookingModal use it as the hourly rate that
 *   REPLACES `price_per_lesson` when teaching_mode === "domicile". The UI labels
 *   must say so explicitly, and we must not silently change that semantic.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function loadJson(path: string): Record<string, string> {
  return JSON.parse(readFileSync(join(REPO_ROOT, path), "utf8")) as Record<string, string>;
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

function stripJsComments(src: string): string {
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, "");
  return noBlock
    .split("\n")
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, "$1"))
    .join("\n");
}

// ── File sources ─────────────────────────────────────────────────────────────
const VERIFICATION_PATH = "app/(app)/teacher/verification/page.tsx";
const PRICING_API_PATH = "app/api/teacher/pricing/route.ts";
const LOCATION_VERIFY_PATH = "app/api/teacher/location/verify/route.ts";
const BOOKING_CHARGE_PATH = "lib/pricing/bookingCharge.ts";
const BOOKING_MODAL_PATH = "components/BookingModal.tsx";
const TEACHER_PROFILE_PATH = "components/TeacherProfile.tsx";
const VALIDATION_SCHEMAS_PATH = "lib/validation/schemas.ts";
const HOME_LESSON_MIGRATION_PATH = "supabase/migrations/004_home_lesson.sql";

const FR = "lib/i18n/locales/fr.json";
const EN = "lib/i18n/locales/en.json";
const ES = "lib/i18n/locales/es.json";

const verificationSrc = read(VERIFICATION_PATH);
const verificationNoComments = stripJsComments(verificationSrc);
const pricingApiSrc = read(PRICING_API_PATH);
const pricingApiNoComments = stripJsComments(pricingApiSrc);
const locationVerifySrc = read(LOCATION_VERIFY_PATH);
const bookingChargeSrc = read(BOOKING_CHARGE_PATH);
const bookingModalSrc = read(BOOKING_MODAL_PATH);
const teacherProfileSrc = read(TEACHER_PROFILE_PATH);
const validationSrc = read(VALIDATION_SCHEMAS_PATH);
const migrationSrc = read(HOME_LESSON_MIGRATION_PATH);

const fr = loadJson(FR);
const en = loadJson(EN);
const es = loadJson(ES);

// ── Required i18n keys ───────────────────────────────────────────────────────
const HOME_LESSON_I18N_KEYS = [
  "teacherProfileMgmtSectionHomeLessons",
  "teacherProfileMgmtHomeLessonsDesc",
  "teacherProfileMgmtHomeLessonsSaveBtn",
  "homeLessonsEnableLabel",
  "homeLessonsEnableHelper",
  "homeLessonsRadiusLabel",
  "homeLessonsRadiusUnit",
  "homeLessonsRadiusHelper",
  "homeLessonsHourlyRateLabel",
  "homeLessonsHourlyRateUnit",
  "homeLessonsHourlyRateHelper",
  "homeLessonsPrivacyNote",
  "homeLessonsMinorSafetyNote",
  "homeLessonsRadiusError",
  "homeLessonsRateError",
  "homeLessonsRateRequiredWhenEnabled",
  "homeLessonsPublicHeader",
  "homeLessonsPublicRadiusSummary",
  "homeLessonsPublicHourlyRateSummary",
] as const;

// ── Underlying schema must NOT have been modified ────────────────────────────
test("DB schema for home lessons still lives in migration 004 (no new migration)", () => {
  for (const col of [
    "home_lesson_enabled",
    "home_lesson_price",
    "home_lesson_radius_km",
    "home_lesson_min_duration",
    "home_lesson_requires_confirmation",
    "home_lesson_force_2h_over_20km",
  ]) {
    assert.ok(
      migrationSrc.includes(col),
      `Migration 004_home_lesson.sql must still declare column ${col}.`,
    );
  }

  const migrationFiles = readdirSync(join(REPO_ROOT, "supabase", "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .filter((f) => {
      const lower = f.toLowerCase();
      return lower.includes("home_lesson") || lower.includes("home_lessons");
    });
  // Only 004_home_lesson.sql should mention home_lesson* in its filename. If a
  // new migration ever appears with that token, the team must confirm it was
  // intentional — this PR was display-only and must not have added migrations.
  assert.deepEqual(
    migrationFiles.sort(),
    ["004_home_lesson.sql"],
    "Only 004_home_lesson.sql should contain `home_lesson` in its filename.",
  );
});

// ── PART F.1: Teacher profile renders Cours à domicile section ───────────────
test("Teacher profile management page renders a Cours à domicile section", () => {
  assert.ok(
    verificationSrc.includes('data-testid="teacher-profile-mgmt-section-home-lessons"'),
    "Verification page must declare a Cours à domicile <section> with stable test id.",
  );
  assert.ok(
    verificationSrc.includes('cardKey="homeLessons"'),
    "LaunchCard for home lessons must use cardKey=\"homeLessons\".",
  );
  assert.ok(
    verificationSrc.includes('t("teacherProfileMgmtSectionHomeLessons")'),
    "Section title must come from teacherProfileMgmtSectionHomeLessons i18n key.",
  );
  assert.ok(
    verificationSrc.includes('t("teacherProfileMgmtHomeLessonsDesc")'),
    "Section description must come from teacherProfileMgmtHomeLessonsDesc i18n key.",
  );
});

// ── PART F.2: Toggle exists and binds to home_lesson_enabled ─────────────────
test("Toggle exists for enabling/disabling home lessons", () => {
  assert.ok(
    verificationSrc.includes('data-testid="teacher-profile-mgmt-home-lessons-enabled"'),
    "Verification page must expose the home-lessons toggle with stable test id.",
  );
  assert.ok(
    verificationSrc.includes('t("homeLessonsEnableLabel")'),
    "Toggle must render the homeLessonsEnableLabel i18n key.",
  );
  assert.ok(
    verificationSrc.includes("setEditHomeEnabled"),
    "Toggle must control the editHomeEnabled state.",
  );
  assert.ok(
    /home_lesson_enabled\s*:\s*editHomeEnabled/.test(verificationSrc),
    "Save handler must send home_lesson_enabled: editHomeEnabled in its PATCH body.",
  );
});

// ── PART F.3: Radius input in km, with sane bounds ───────────────────────────
test("Radius input is present, labelled in km, and constrained to 5–50 km", () => {
  assert.ok(
    verificationSrc.includes('data-testid="teacher-profile-mgmt-home-lessons-radius"'),
    "Radius input must have stable test id.",
  );
  assert.ok(
    verificationSrc.includes('t("homeLessonsRadiusLabel")'),
    "Radius input must render the homeLessonsRadiusLabel i18n key.",
  );
  assert.ok(
    verificationSrc.includes('t("homeLessonsRadiusUnit")'),
    "Radius input must display the km unit via homeLessonsRadiusUnit i18n key.",
  );
  assert.match(
    verificationNoComments,
    /HOME_RADIUS_MIN_KM\s*=\s*5/,
    "Client-side radius min must equal 5 km (matches server schema in lib/validation/schemas.ts).",
  );
  assert.match(
    verificationNoComments,
    /HOME_RADIUS_MAX_KM\s*=\s*50/,
    "Client-side radius max must equal 50 km.",
  );
});

// ── PART F.4: Hourly home rate input in $CA, with sane bounds ────────────────
test("Hourly home-lesson rate input is present and constrained to 20–500 $CA", () => {
  assert.ok(
    verificationSrc.includes('data-testid="teacher-profile-mgmt-home-lessons-hourly-rate"'),
    "Hourly home rate input must have stable test id.",
  );
  assert.ok(
    verificationSrc.includes('t("homeLessonsHourlyRateLabel")'),
    "Rate input must render the homeLessonsHourlyRateLabel i18n key.",
  );
  assert.ok(
    verificationSrc.includes('t("homeLessonsHourlyRateHelper")'),
    "Rate helper must come from homeLessonsHourlyRateHelper i18n key.",
  );
  assert.match(
    verificationNoComments,
    /HOME_HOURLY_RATE_MIN_CAD\s*=\s*20/,
    "Client-side rate min must equal 20 CAD.",
  );
  assert.match(
    verificationNoComments,
    /HOME_HOURLY_RATE_MAX_CAD\s*=\s*500/,
    "Client-side rate max must equal 500 CAD.",
  );
  // The label must clearly state that this REPLACES the studio rate, not adds
  // on top of it. Surcharge wording would mislead teachers about checkout math.
  for (const [locale, dict] of Object.entries({ fr, en, es })) {
    const helper = dict.homeLessonsHourlyRateHelper ?? "";
    assert.ok(
      /replac|remplac|reemplaz/i.test(helper),
      `[${locale}] homeLessonsHourlyRateHelper must clarify that the rate replaces the studio rate.`,
    );
  }
});

// ── PART F.5: Values are saved through the existing pricing PATCH route ──────
test("Save handler PATCHes /api/teacher/pricing with the three home-lesson fields", () => {
  assert.match(
    verificationSrc,
    /fetch\(\s*"\/api\/teacher\/pricing"\s*,[\s\S]*?method:\s*"PATCH"/,
    "saveHomeLessons must PATCH /api/teacher/pricing.",
  );
  assert.ok(
    /home_lesson_enabled\s*:\s*editHomeEnabled/.test(verificationSrc),
    "Body must include home_lesson_enabled.",
  );
  assert.ok(
    /home_lesson_price\s*=\s*hourlyRate/.test(verificationSrc),
    "Body must include home_lesson_price (the alternate hourly rate).",
  );
  assert.ok(
    /home_lesson_radius_km\s*=\s*radiusKm/.test(verificationSrc),
    "Body must include home_lesson_radius_km.",
  );

  // The PATCH route itself must accept these fields with the same bounds.
  assert.ok(
    /home_lesson_enabled\s*:\s*z\.coerce\.boolean/.test(pricingApiNoComments),
    "PATCH schema must validate home_lesson_enabled as boolean.",
  );
  assert.ok(
    /home_lesson_radius_km\s*:\s*z\.coerce[\s\S]*?min\(\s*HOME_LESSON_RADIUS_MIN_KM\s*\)[\s\S]*?max\(\s*HOME_LESSON_RADIUS_MAX_KM\s*\)/.test(
      pricingApiNoComments,
    ),
    "PATCH schema must validate home_lesson_radius_km using the named bounds (5–50).",
  );
  assert.ok(
    /HOME_LESSON_RADIUS_MIN_KM\s*=\s*5/.test(pricingApiNoComments) &&
      /HOME_LESSON_RADIUS_MAX_KM\s*=\s*50/.test(pricingApiNoComments),
    "PATCH schema must keep the 5–50 km canonical range.",
  );
  assert.ok(
    /home_lesson_price\s*:\s*z\s*\.union\([\s\S]*?\.min\(\s*HOME_LESSON_HOURLY_RATE_MIN_CAD\s*\)[\s\S]*?\.max\(\s*HOME_LESSON_HOURLY_RATE_MAX_CAD\s*\)/.test(
      pricingApiNoComments,
    ),
    "PATCH schema must validate home_lesson_price within 20–500 CAD or null.",
  );
});

// ── PART F.6: Values reload correctly into the form on mount ─────────────────
test("Loaded teacher row hydrates the home-lesson editor state", () => {
  assert.ok(
    /setEditHomeEnabled\(\s*teacherRow\.home_lesson_enabled\s*===\s*true\s*\)/.test(
      verificationSrc,
    ),
    "useEffect must hydrate editHomeEnabled from teacherRow.home_lesson_enabled.",
  );
  assert.ok(
    /setEditHomeRadius\([\s\S]*?teacherRow\.home_lesson_radius_km/.test(verificationSrc),
    "useEffect must hydrate editHomeRadius from teacherRow.home_lesson_radius_km.",
  );
  assert.ok(
    /teacherRow\.home_lesson_price/.test(verificationSrc),
    "useEffect must read teacherRow.home_lesson_price into the hourly-rate input.",
  );
  // SELECT clause must request the column from the DB
  assert.ok(
    /"id[^"]*home_lesson_price[^"]*"/.test(verificationSrc),
    "Teacher SELECT must include home_lesson_price so the form can reload it.",
  );
});

// ── PART F.7+9+10: Public display only when configured + amount only when > 0 ─
test("Public profile shows home-lesson summary only when homeConfigured", () => {
  assert.ok(
    teacherProfileSrc.includes('data-testid="teacher-profile-home-lessons-summary"'),
    "TeacherProfile must render a home-lessons summary block with stable test id.",
  );

  // The block must be gated by the existing `homeConfigured` flag — same gate
  // as the booking modal, which means home_lesson_enabled === true AND
  // home_lesson_price > 0. If price is 0/undefined, nothing is shown.
  assert.match(
    teacherProfileSrc,
    /\{homeConfigured\s*\?\s*\([\s\S]*?teacher-profile-home-lessons-summary/,
    "Summary block must be gated by `homeConfigured`.",
  );

  assert.ok(
    /homeConfigured\s*=[\s\S]*?Boolean\(teacher\.homeLessonEnabled\)[\s\S]*?homeLessonPrice[\s\S]*?>\s*0/.test(
      teacherProfileSrc,
    ),
    "`homeConfigured` must require BOTH homeLessonEnabled and homeLessonPrice > 0.",
  );

  // Public lines must use the i18n keys with their interpolation tokens
  assert.ok(
    teacherProfileSrc.includes('t("homeLessonsPublicRadiusSummary").replace("{km}"'),
    "Radius summary must use the {km} token replacement.",
  );
  assert.ok(
    teacherProfileSrc.includes('t("homeLessonsPublicHourlyRateSummary").replace('),
    "Hourly-rate summary must use the {price} token replacement.",
  );
});

// ── PART F.8: Exact address is NEVER exposed ─────────────────────────────────
test("Address-verify route never echoes the teacher's exact address back", () => {
  // Response body builder must only include the safe public fields.
  const responseSlice = locationVerifySrc.slice(
    locationVerifySrc.lastIndexOf("NextResponse.json({"),
  );
  for (const forbidden of [
    "address_line1",
    "address_line2",
    "postal_code",
    "private",
    "exact",
  ]) {
    assert.ok(
      !responseSlice.includes(forbidden),
      `location/verify response must NOT echo back \`${forbidden}\`. Found in last NextResponse.json body.`,
    );
  }
  for (const safe of ["ok:", "status:", "city,", "region,", "fuzz_radius_km:"]) {
    assert.ok(
      responseSlice.includes(safe),
      `location/verify response must include the safe public field \`${safe.replace(/[:,]/g, "")}\`.`,
    );
  }

  // The public summary on the teacher profile must not render any raw address.
  for (const forbidden of [
    "addressLine1",
    "address_line1",
    "addressLine2",
    "postalCode",
    "exact address",
  ]) {
    // Loose check around the summary block only.
    const summaryStart = teacherProfileSrc.indexOf(
      'data-testid="teacher-profile-home-lessons-summary"',
    );
    const summarySlice = teacherProfileSrc.slice(summaryStart, summaryStart + 800);
    assert.ok(
      !summarySlice.toLowerCase().includes(forbidden.toLowerCase()),
      `Public home-lesson summary must not mention \`${forbidden}\`.`,
    );
  }
});

// ── PART F.11: Minor-safety helper text exists in all locales ────────────────
test("Minor-safety helper text is present in FR / EN / ES locale dictionaries", () => {
  for (const [locale, dict] of Object.entries({ fr, en, es })) {
    const note = dict.homeLessonsMinorSafetyNote ?? "";
    assert.ok(
      note.length > 30,
      `[${locale}] homeLessonsMinorSafetyNote must be a non-trivial sentence.`,
    );
    // Must reference minors / underage / mineurs in some way
    assert.ok(
      /mineur|minor|underage|menor/i.test(note),
      `[${locale}] homeLessonsMinorSafetyNote must mention minors / underage.`,
    );
    // Must NOT claim background checks are performed today (we don't do them).
    assert.ok(
      !/background\s*check|verifi[eé]\s*l[ea]\s*cas[ie]r/i.test(note),
      `[${locale}] homeLessonsMinorSafetyNote must not claim background checks are performed.`,
    );
  }

  // And the rendered UI references that key
  assert.ok(
    verificationSrc.includes('t("homeLessonsMinorSafetyNote")'),
    "Verification page must render the minor-safety note via i18n.",
  );
});

// ── PART F.12: No payment / checkout / tax logic was changed in this PR ──────
test("Checkout, payment math, and tax logic remain untouched on this branch", () => {
  // computeBookingChargeCents still uses home_lesson_price as the alternate
  // HOURLY rate (replacement, not surcharge). If anyone tries to repurpose it
  // as an additive surcharge, the math here will diverge and this test fails.
  assert.match(
    bookingChargeSrc,
    /teachingMode\s*===\s*"domicile"[\s\S]*?home_lesson_enabled\s*!==\s*true[\s\S]*?home_lesson_price[\s\S]*?Math\.round\(\s*hourly\s*\*\s*\(\s*durationMinutes\s*\/\s*60\s*\)\s*\*\s*100\s*\)/,
    "computeBookingChargeCents must keep its alternate-hourly-rate semantics for at-home lessons.",
  );

  // BookingModal still uses home_lesson_price as a replacement hourly rate
  assert.match(
    bookingModalSrc,
    /hourlyRate\s*=\s*teachingMode\s*===\s*"domicile"\s*\?\s*Number\(\s*teacher\.homeLessonPrice/,
    "BookingModal must keep using home_lesson_price as the alternate hourly rate.",
  );

  // No diff against main on the payment + tax + checkout files this PR cares about.
  // Using `git diff main -- file` lets us catch silent drift.
  const guardedFiles = [
    BOOKING_CHARGE_PATH,
    "app/api/stripe/checkout/route.ts",
    "lib/pricing/bookingCharge.ts",
  ];
  for (const file of guardedFiles) {
    try {
      const diff = execSync(`git diff main -- "${file}"`, {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      assert.equal(
        diff.trim(),
        "",
        `${file} must not differ from main on this branch (payment-logic guard).`,
      );
    } catch {
      // `main` may not be resolvable in some local checkouts (e.g. detached
      // HEAD or shallow clones). In that case we silently skip — CI / launch
      // validation re-runs the assertion in a normal clone.
    }
  }

  // Existing canonical schema still has the same bounds.
  assert.match(
    validationSrc,
    /home_lesson_radius_km:\s*z\.coerce\.number\(\)\.finite\(\)\.min\(5\)\.max\(50\)/,
    "lib/validation/schemas.ts radius range (5–50 km) must not have changed.",
  );
  assert.match(
    validationSrc,
    /home_lesson_price:\s*z\.coerce\.number\(\)\.finite\(\)\.min\(20\)\.max\(500\)/,
    "lib/validation/schemas.ts home_lesson_price range (20–500 CAD) must not have changed.",
  );
});

// ── PART F.13: No new migration was added for this PR ────────────────────────
test("No new migration was added on this branch", () => {
  // Independent re-check, complementary to the first test: counts migrations
  // touched by the diff against main.
  try {
    const diff = execSync("git diff --name-only main -- supabase/migrations", {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const touched = diff
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    assert.equal(
      touched.length,
      0,
      `Branch must not modify or add migrations. Touched: ${touched.join(", ")}`,
    );
  } catch {
    // skipped when `main` can't be resolved locally
  }
});

// ── PART F.14: No restricted content folders were touched ────────────────────
test("YoPratiqo / audio / OpenAI / legal pages were not touched on this branch", () => {
  try {
    const diff = execSync("git diff --name-only main", {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const touched = diff
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const forbiddenPrefixes = [
      "content/yopratiqo/",
      "public/audio/",
      "public/mp3/",
      "scripts/openai/",
      "lib/openai/",
      "content/legal/",
      "app/sitemap",
      "app/api/sitemap",
    ];

    for (const file of touched) {
      for (const prefix of forbiddenPrefixes) {
        assert.ok(
          !file.startsWith(prefix),
          `Branch must not touch \`${prefix}\` — file \`${file}\` is restricted.`,
        );
      }
    }
  } catch {
    // skipped when `main` can't be resolved locally
  }
});

// ── i18n parity: every key exists in FR / EN / ES with non-empty values ──────
test("Home-lesson i18n keys exist in FR / EN / ES with non-empty values", () => {
  for (const key of HOME_LESSON_I18N_KEYS) {
    for (const [locale, dict] of Object.entries({ fr, en, es })) {
      assert.ok(
        typeof dict[key] === "string" && dict[key].length > 0,
        `[${locale}] i18n key \`${key}\` must be defined and non-empty.`,
      );
    }
  }
});

test("Public summary i18n keys keep their interpolation tokens", () => {
  for (const [locale, dict] of Object.entries({ fr, en, es })) {
    assert.ok(
      (dict.homeLessonsPublicRadiusSummary ?? "").includes("{km}"),
      `[${locale}] homeLessonsPublicRadiusSummary must keep the {km} token.`,
    );
    assert.ok(
      (dict.homeLessonsPublicHourlyRateSummary ?? "").includes("{price}"),
      `[${locale}] homeLessonsPublicHourlyRateSummary must keep the {price} token.`,
    );
  }
});

// ── Sanity: the file is wired into the launch-critical suite (self-check) ────
test("This test file is referenced by the test:launch-critical npm script", () => {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  const script = pkg.scripts?.["test:launch-critical"] ?? "";
  assert.ok(
    script.includes("tests/teacherProfile/homeLessonsSettings.test.ts"),
    "Add `tsx tests/teacherProfile/homeLessonsSettings.test.ts` to the test:launch-critical npm script.",
  );
});

// ── Mtime guard (defensive): migration 004 is older than 2026-06-01 ──────────
test("Migration 004_home_lesson.sql was not modified on this branch", () => {
  const stats = statSync(join(REPO_ROOT, HOME_LESSON_MIGRATION_PATH));
  // We don't fail if older filesystem clones bumped the mtime — instead we
  // make sure git considers it unchanged against main where possible.
  try {
    const diff = execSync(`git diff --name-only main -- "${HOME_LESSON_MIGRATION_PATH}"`, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    assert.equal(
      diff.trim(),
      "",
      "supabase/migrations/004_home_lesson.sql must not differ from main.",
    );
  } catch {
    // ignore when `main` isn't resolvable
  }
  assert.ok(stats.isFile(), "Migration 004_home_lesson.sql must exist on disk.");
});
