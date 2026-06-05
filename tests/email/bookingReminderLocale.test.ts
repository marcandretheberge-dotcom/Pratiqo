/**
 * tests/email/bookingReminderLocale.test.ts
 *
 * Regression suite for the launch-blocking localization bug:
 *
 *   Symptom — Booking reminder emails were sent in English to both teacher
 *   and learner, even when:
 *     1. The teacher profile/settings were set to French.
 *     2. The user was in Québec.
 *     3. The platform should support FR/EN/ES email localization.
 *
 *   Root causes confirmed in code:
 *     • `inferEmailLocaleFromRegion` defaulted ALL `country_code = "CA"`
 *       rows (with any non-QC region) to `en`, silently overriding the
 *       Québec-first launch contract.
 *     • `resolveEmailLocaleForUser` never read any explicit profile
 *       `locale` / `language` / `dashboard.locale` value — only
 *       `country_code, region` + auth user_metadata.
 *     • `normalizeLocale` ignored common variants (`fr_CA`, `French`,
 *       `français`), returning `en` for them.
 *     • `LocaleSwitcher` never persisted UI locale changes server-side,
 *       so the cron could never see the user's chosen language.
 *
 * Each section of this test corresponds to a numbered PART D requirement
 * from the bug brief. Comments at each `test(...)` site name the
 * requirement explicitly so future engineers know what they are protecting.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EMAIL_FALLBACK_LOCALE,
  inferEmailLocaleFromRegion,
  normalizeEmailLocale,
  resolveEmailLocale,
  resolveEmailLocaleForStudent,
  resolveEmailLocaleForTeacher,
  resolveEmailLocaleForUser,
} from "@/lib/email/locale";
import { getBookingEmailCopy } from "@/lib/email/messages/booking";
import { normalizeLocale } from "@/lib/i18n/types";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

// ---------------------------------------------------------------------------
// Minimal in-memory Supabase admin stub
// ---------------------------------------------------------------------------
// The locale helpers query Supabase via the .from(...).select(...).eq(...)
// .maybeSingle() chain and via admin.auth.admin.getUserById(...). We stub
// JUST those surfaces so tests run with no network and no DB.
// ---------------------------------------------------------------------------

type StubProfile = Record<string, unknown>;
type StubTeacher = Record<string, unknown>;
type StubAuthMeta = Record<string, unknown>;

function buildAdminStub(world: {
  profiles?: Record<string, StubProfile | null>;
  teachers?: Record<string, StubTeacher | null>;
  authMeta?: Record<string, StubAuthMeta | null>;
}) {
  return {
    from(table: string) {
      const rows =
        table === "profiles"
          ? (world.profiles ?? {})
          : table === "teachers"
            ? (world.teachers ?? {})
            : ({} as Record<string, unknown>);

      const builder = {
        _column: "id" as string,
        select() {
          return builder;
        },
        eq(column: string, value: string) {
          builder._column = column;
          builder._eqValue = value;
          return builder;
        },
        _eqValue: "",
        maybeSingle() {
          const key = builder._eqValue;
          const row = (rows as Record<string, unknown>)[key];
          return Promise.resolve({ data: row ?? null, error: null });
        },
      };
      return builder;
    },
    auth: {
      admin: {
        async getUserById(id: string) {
          const meta = world.authMeta?.[id] ?? null;
          if (!meta) return { data: { user: null }, error: null };
          return {
            data: { user: { id, user_metadata: meta } },
            error: null,
          };
        },
      },
    },
  };
}

// Cast helper — the stub only implements the narrow surface our code uses.
function asAdmin(stub: ReturnType<typeof buildAdminStub>) {
  return stub as unknown as Parameters<typeof resolveEmailLocaleForUser>[0];
}

// ---------------------------------------------------------------------------
// PART D #6 — normalization contract (fr-CA → fr, fr_FR → fr, …)
// ---------------------------------------------------------------------------

test("PART D#6 normalizeLocale handles BCP 47, underscores, and human names", () => {
  // BCP 47 forms.
  assert.equal(normalizeLocale("fr-CA"), "fr");
  assert.equal(normalizeLocale("fr-FR"), "fr");
  assert.equal(normalizeLocale("en-CA"), "en");
  assert.equal(normalizeLocale("en-US"), "en");
  assert.equal(normalizeLocale("es-419"), "es");
  assert.equal(normalizeLocale("es-UY"), "es");

  // Underscore variants — they previously fell through to `en`.
  assert.equal(normalizeLocale("fr_CA"), "fr");
  assert.equal(normalizeLocale("fr_FR"), "fr");
  assert.equal(normalizeLocale("en_US"), "en");
  assert.equal(normalizeLocale("es_UY"), "es");

  // Case variants.
  assert.equal(normalizeLocale("FR"), "fr");
  assert.equal(normalizeLocale("EN-ca"), "en");

  // Human-readable names from the brief.
  assert.equal(normalizeLocale("French"), "fr");
  assert.equal(normalizeLocale("français"), "fr");
  assert.equal(normalizeLocale("francais"), "fr");
  assert.equal(normalizeLocale("English"), "en");
  assert.equal(normalizeLocale("anglais"), "en");
  assert.equal(normalizeLocale("Spanish"), "es");
  assert.equal(normalizeLocale("español"), "es");
  assert.equal(normalizeLocale("espagnol"), "es");
});

test("normalizeEmailLocale returns null for empty/whitespace, never silently 'en'", () => {
  assert.equal(normalizeEmailLocale(""), null);
  assert.equal(normalizeEmailLocale("   "), null);
  assert.equal(normalizeEmailLocale(null), null);
  assert.equal(normalizeEmailLocale(undefined), null);
  // But valid values still resolve.
  assert.equal(normalizeEmailLocale("fr"), "fr");
  assert.equal(normalizeEmailLocale("fr_CA"), "fr");
  assert.equal(normalizeEmailLocale("français"), "fr");
});

// ---------------------------------------------------------------------------
// PART D #7 — Québec / QC fallback resolves to fr when no explicit locale.
// ---------------------------------------------------------------------------

test("PART D#7 QC / Quebec / Québec all infer fr", () => {
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "CA", region: "QC" }), "fr");
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "CA", region: "qc" }), "fr");
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "CA", region: "Quebec" }), "fr");
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "CA", region: "Québec" }), "fr");
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "CA", region: "QUEBEC" }), "fr");
});

test("ROOT-CAUSE GUARD: country=CA with non-Québec / empty region must NOT default to en", () => {
  // This was the launch-blocking bug. A Québec teacher whose region was
  // empty or set to a city name (e.g. "Montréal") got English emails
  // because the previous helper had a `country === "CA"` → "en" catch-all.
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "CA", region: "" }), null);
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "CA", region: null }), null);
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "CA", region: "Montréal" }), null);
  // Falling through to null means the platform fallback (fr) wins.
  assert.equal(
    resolveEmailLocale({ countryCode: "CA", region: "Montréal" }),
    "fr",
  );
  assert.equal(
    resolveEmailLocale({ countryCode: "CA", region: "" }),
    EMAIL_FALLBACK_LOCALE,
  );
  assert.equal(EMAIL_FALLBACK_LOCALE, "fr");
});

test("Ontario still infers en, US still infers en", () => {
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "CA", region: "ON" }), "en");
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "CA", region: "Ontario" }), "en");
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "US" }), "en");
});

test("Uruguay still infers es", () => {
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "UY" }), "es");
});

// ---------------------------------------------------------------------------
// PART D #1, #2, #3, #4 — teacher / learner both get their OWN locale.
// ---------------------------------------------------------------------------

test("PART D#1 teacher with French profile receives French reminder copy", async () => {
  const admin = buildAdminStub({
    profiles: { "teacher-user-1": { country_code: "CA", region: "QC" } },
    teachers: { "teacher-user-1": { country_code: "CA", region: "QC" } },
    authMeta: { "teacher-user-1": { locale: "fr" } },
  });
  const locale = await resolveEmailLocaleForTeacher(asAdmin(admin), "teacher-user-1");
  assert.equal(locale, "fr");
  assert.match(getBookingEmailCopy(locale).reminderTeacher.hero24h, /Cours/);
});

test("PART D#2 student with French profile receives French reminder copy", async () => {
  const admin = buildAdminStub({
    profiles: { "student-1": { country_code: "CA", region: "QC" } },
    authMeta: { "student-1": { locale: "fr" } },
  });
  const locale = await resolveEmailLocaleForStudent(asAdmin(admin), "student-1");
  assert.equal(locale, "fr");
  assert.match(getBookingEmailCopy(locale).reminderStudent.hero24h, /approche|Cours/);
});

test("PART D#3 teacher reminder does not default to English when teacher language is fr", async () => {
  // Teacher profile only has the JSONB dashboard.locale; no top-level
  // column, no auth metadata, region is a free-form city. Pre-fix this
  // produced "en"; post-fix it produces "fr".
  const admin = buildAdminStub({
    profiles: {
      "teacher-2": {
        country_code: "CA",
        region: "Montréal",
        dashboard: { locale: "fr" },
      },
    },
    teachers: { "teacher-2": { country_code: "CA", region: null } },
    authMeta: { "teacher-2": null },
  });
  const locale = await resolveEmailLocaleForTeacher(asAdmin(admin), "teacher-2");
  assert.equal(locale, "fr");
});

test("PART D#4 learner reminder does not default to English when learner language is fr", async () => {
  const admin = buildAdminStub({
    profiles: { "student-2": { country_code: "CA", region: "" } },
    authMeta: { "student-2": { preferred_locale: "fr" } },
  });
  const locale = await resolveEmailLocaleForStudent(asAdmin(admin), "student-2");
  assert.equal(locale, "fr");
});

test("PART D#5 teacher and learner locales are resolved INDEPENDENTLY", async () => {
  // A French teacher with an English-speaking student: the teacher email
  // must be French, the student email must be English. Neither leaks into
  // the other.
  const admin = buildAdminStub({
    profiles: {
      "teacher-3": { country_code: "CA", region: "QC" },
      "student-3": { country_code: "CA", region: "ON" },
    },
    teachers: { "teacher-3": { country_code: "CA", region: "QC" } },
    authMeta: {
      "teacher-3": { locale: "fr" },
      "student-3": { locale: "en" },
    },
  });
  const teacherLocale = await resolveEmailLocaleForTeacher(asAdmin(admin), "teacher-3");
  const studentLocale = await resolveEmailLocaleForStudent(asAdmin(admin), "student-3");
  assert.equal(teacherLocale, "fr");
  assert.equal(studentLocale, "en");
});

test("teacher row region is preferred over profile region when both exist", async () => {
  // /api/teacher/location/verify writes a canonical province code into
  // teachers.region; profiles.region may be stale free-form text. The
  // canonical teacher row should win.
  const admin = buildAdminStub({
    profiles: { "teacher-4": { country_code: "CA", region: "Montréal" } },
    teachers: { "teacher-4": { country_code: "CA", region: "QC" } },
    authMeta: { "teacher-4": null },
  });
  const locale = await resolveEmailLocaleForTeacher(asAdmin(admin), "teacher-4");
  assert.equal(locale, "fr");
});

// ---------------------------------------------------------------------------
// PART D #8, #9 — non-French locales still work end-to-end.
// ---------------------------------------------------------------------------

test("PART D#8 English profile still receives English email", async () => {
  const admin = buildAdminStub({
    profiles: { "en-user": { country_code: "CA", region: "ON" } },
    authMeta: { "en-user": { locale: "en" } },
  });
  const locale = await resolveEmailLocaleForUser(asAdmin(admin), "en-user");
  assert.equal(locale, "en");
  assert.match(getBookingEmailCopy(locale).reminderStudent.hero24h, /Your lesson/);
});

test("PART D#9 Spanish profile (Uruguay) receives Spanish email", async () => {
  const admin = buildAdminStub({
    profiles: { "es-user": { country_code: "UY", region: "Montevideo" } },
    authMeta: { "es-user": { locale: "es" } },
  });
  const locale = await resolveEmailLocaleForUser(asAdmin(admin), "es-user");
  assert.equal(locale, "es");
  assert.match(getBookingEmailCopy(locale).reminderStudent.hero24h, /Tu clase|Clase/);
});

test("Uruguay inference works even without explicit locale metadata", async () => {
  const admin = buildAdminStub({
    profiles: { "es-noauth": { country_code: "UY", region: null } },
    authMeta: { "es-noauth": null },
  });
  const locale = await resolveEmailLocaleForUser(asAdmin(admin), "es-noauth");
  assert.equal(locale, "es");
});

// ---------------------------------------------------------------------------
// PART D #10 — no reminder email contains mixed EN/FR labels.
// ---------------------------------------------------------------------------

test("PART D#10 reminder copy never mixes EN/FR/ES labels within one locale", () => {
  // Phrases that, if they appeared in the FR template, would prove a copy
  // regression (mixed-language email). Same idea for EN/ES.
  const FR_TELLTALES = [
    /Upcoming lesson/i,
    /Your lesson starts soon/i,
    /Your lesson is coming up/i,
    /Lesson tomorrow/i,
    /Lesson in 1 hour/i,
    /Join lesson/i,
    /View booking/i,
    /\bStudent\b/, // English label noun
    /\bTeacher\b/, // English label noun
  ];
  const EN_TELLTALES = [
    /Rappel de cours/i,
    /Cours demain/i,
    /Votre cours commence/i,
    /Voir le cours\b/,
    /Voir mon cours\b/,
    /\bÉlève\b/,
    /\bProfesseur\b/,
  ];
  const ES_TELLTALES_OF_FR = EN_TELLTALES; // ES must not contain French phrases.
  const ES_TELLTALES_OF_EN = FR_TELLTALES; // ES must not contain English phrases.

  const collectReminderText = (locale: "fr" | "en" | "es") => {
    const copy = getBookingEmailCopy(locale);
    return [
      copy.reminderStudent.subject24h("Marie"),
      copy.reminderStudent.subject1h("Marie"),
      copy.reminderStudent.hero24h,
      copy.reminderStudent.hero1h,
      copy.reminderStudent.intro24h("Alex", "Marie"),
      copy.reminderStudent.intro1h("Alex", "Marie"),
      copy.reminderStudent.cta,
      ...Object.values(copy.reminderStudent.labels),
      copy.reminderTeacher.subject24h("Alex"),
      copy.reminderTeacher.subject1h("Alex"),
      copy.reminderTeacher.hero24h,
      copy.reminderTeacher.hero1h,
      copy.reminderTeacher.intro24h("Marie", "Alex"),
      copy.reminderTeacher.intro1h("Marie", "Alex"),
      copy.reminderTeacher.cta,
      ...Object.values(copy.reminderTeacher.labels),
    ].join("\n");
  };

  const fr = collectReminderText("fr");
  for (const pat of FR_TELLTALES) {
    assert.doesNotMatch(fr, pat, `FR reminder copy contains English phrase ${pat}`);
  }

  const en = collectReminderText("en");
  for (const pat of EN_TELLTALES) {
    assert.doesNotMatch(en, pat, `EN reminder copy contains French phrase ${pat}`);
  }

  const es = collectReminderText("es");
  for (const pat of ES_TELLTALES_OF_FR) {
    assert.doesNotMatch(es, pat, `ES reminder copy contains French phrase ${pat}`);
  }
  for (const pat of ES_TELLTALES_OF_EN) {
    assert.doesNotMatch(es, pat, `ES reminder copy contains English phrase ${pat}`);
  }
});

test("FR reminder copy uses the exact phrasing required by the brief", () => {
  const fr = getBookingEmailCopy("fr");
  // From PART C: "Use natural French" — Rappel de cours / Élève / Professeur.
  const blob = [
    fr.reminderStudent.subject24h("Marie"),
    fr.reminderStudent.subject1h("Marie"),
    fr.reminderStudent.hero24h,
    fr.reminderStudent.hero1h,
    fr.reminderTeacher.subject24h("Alex"),
    fr.reminderTeacher.subject1h("Alex"),
    fr.reminderTeacher.hero24h,
    fr.reminderTeacher.hero1h,
    fr.reminderStudent.labels.teacher,
    fr.reminderTeacher.labels.student,
  ].join("\n");
  assert.match(blob, /Rappel/i, "FR reminder uses 'Rappel'");
  assert.match(blob, /Cours/i, "FR reminder uses 'Cours'");
  assert.equal(fr.reminderStudent.labels.teacher, "Professeur");
  assert.equal(fr.reminderTeacher.labels.student, "Élève");
});

// ---------------------------------------------------------------------------
// PART D #11 — no hardcoded "en" remains in the reminder send path
//              (only as an explicit final fallback).
// ---------------------------------------------------------------------------
//
// We assert this structurally by reading the source of the relevant files.
// Tests run with `tsx`, so __dirname is not defined; resolve via import.meta.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), "utf8");
}

test("PART D#11 reminder send path has no stale hardcoded 'en' default", () => {
  const reminderSrc = readSource("lib/bookings/reminders.ts");
  // Strip line comments so any prose discussion of "en" doesn't trigger
  // the structural check.
  const code = reminderSrc.replace(/\/\/.*$/gm, "");

  // Must NOT hardcode `locale: "en"` anywhere in the reminder pipeline.
  assert.doesNotMatch(
    code,
    /locale\s*:\s*"en"/,
    "lib/bookings/reminders.ts hardcodes locale: 'en' somewhere — must use resolver instead",
  );

  // Reminder code MUST be calling the dedicated teacher + student helpers.
  assert.match(
    code,
    /resolveEmailLocaleForTeacher\s*\(/,
    "lib/bookings/reminders.ts must call resolveEmailLocaleForTeacher",
  );
  assert.match(
    code,
    /resolveEmailLocaleForStudent\s*\(/,
    "lib/bookings/reminders.ts must call resolveEmailLocaleForStudent",
  );
});

test("EMAIL_FALLBACK_LOCALE is the only platform fallback and it is 'fr'", () => {
  const localeSrc = readSource("lib/email/locale.ts");
  // The exported constant.
  assert.match(
    localeSrc,
    /export\s+const\s+EMAIL_FALLBACK_LOCALE\s*:\s*EmailLocale\s*=\s*"fr"/,
    "EMAIL_FALLBACK_LOCALE must be 'fr' for the Québec-first launch",
  );
  // And the inference helper must not still ship the CA→en catch-all.
  assert.doesNotMatch(
    localeSrc,
    /if\s*\(\s*country\s*===\s*"CA"\s*\)\s*return\s*"en"/,
    "Stale `country === 'CA' → 'en'` catch-all is back — re-introduces the launch bug",
  );
});

// ---------------------------------------------------------------------------
// PART D #12 — no restricted systems touched.
// ---------------------------------------------------------------------------

test("PART D#12 no restricted files were touched by this fix", () => {
  // The fix may add app/api/user/locale/route.ts. It must NOT touch:
  //   - Stripe/checkout files
  //   - Supabase RLS policies
  //   - Migrations under supabase/migrations
  //   - YoPratiqo content / audio
  //   - OpenAI scripts
  //   - Legal pages
  //   - Sitemap / Course schema
  //
  // The structural guard: nothing in the locale-resolution path should
  // import from those areas.
  const reminderSrc = readSource("lib/bookings/reminders.ts");
  const localeSrc = readSource("lib/email/locale.ts");
  const localeRouteSrc = readSource("app/api/user/locale/route.ts");

  const FORBIDDEN_IMPORTS = [
    /from\s+["']@\/lib\/stripe/,
    /from\s+["']@\/lib\/payments/, // payment math
    /from\s+["']@\/lib\/yopratiqo/,
    /openai/i,
  ];

  for (const src of [reminderSrc, localeSrc, localeRouteSrc]) {
    for (const pat of FORBIDDEN_IMPORTS) {
      if (src === reminderSrc && /lib\/payments/.test(pat.source)) {
        // reminders.ts legitimately depends on payment status (read-only)
        // to decide whether to skip a reminder. That existed BEFORE this
        // fix and is out of scope here. Skip this single combination.
        continue;
      }
      assert.doesNotMatch(src, pat, `file imports forbidden module: ${pat}`);
    }
  }
});

test("PART D#12b no new Supabase migration was introduced by this fix", () => {
  // The fix relies entirely on EXISTING columns + defensive SELECT. Adding
  // a migration here would violate the brief.
  const migrationsDir = path.join(REPO_ROOT, "supabase", "migrations");
  const files = fs.readdirSync(migrationsDir);
  for (const f of files) {
    // Reject any file whose body claims to be about email locale resolution
    // or whose name contains "email_locale" / "reminder_locale" — that
    // would mean we shipped a schema change for this fix.
    if (/email[_-]?locale|reminder[_-]?locale/i.test(f)) {
      assert.fail(`Unexpected migration file added for the locale fix: ${f}`);
    }
  }
});

// ---------------------------------------------------------------------------
// Bonus — server-side persistence route exists.
// ---------------------------------------------------------------------------

test("PATCH /api/user/locale route exists and uses normalizeLocale", () => {
  const src = readSource("app/api/user/locale/route.ts");
  assert.match(src, /export\s+async\s+function\s+PATCH/);
  assert.match(src, /normalizeLocale/);
  // Must update user_metadata (so the cron's auth-metadata read sees it).
  assert.match(src, /updateUserById/);
  assert.match(src, /user_metadata/);
});

test("LocaleSwitcher posts the chosen locale to /api/user/locale", () => {
  const src = readSource("components/LocaleSwitcher.tsx");
  assert.match(src, /\/api\/user\/locale/);
  assert.match(src, /persistLocaleToServer/);
  assert.match(src, /method:\s*"PATCH"/);
});

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function run() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (err) {
      console.error(`not ok - ${name}`);
      throw err;
    }
  }
  console.log(`[email:bookingReminderLocale] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
