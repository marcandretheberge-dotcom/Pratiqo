/**
 * Tests for the public teacher bio sanitizer.
 *
 * Coverage:
 *   1. Direct unit tests for sanitizePublicTeacherBio — emails, NANP phones,
 *      international phones, channel keywords, social handles, external URLs,
 *      pratiqo.ca exception, and normal-text passthrough.
 *   2. Source-scan integration tests asserting that:
 *        - app/teacher/profile/[id]/page.tsx uses the sanitizer for both
 *          meta description and JSON-LD (no raw teacher.bio fed to either).
 *        - components/TeacherProfile.tsx renders sanitizedBio.content and
 *          conditionally shows the i18n notice when masked.
 *
 * The source-scan layer is what guarantees we cannot accidentally regress
 * by re-introducing a raw teacher.bio reference into a public surface.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  sanitizePublicTeacherBio,
  type SanitizePublicBioResult,
} from "@/lib/teacherProfile/sanitizePublicBio";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const PLACEHOLDERS = {
  fr: "[coordonnées masquées]",
  en: "[contact details hidden]",
  es: "[datos de contacto ocultos]",
} as const;

const RAW_EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const RAW_NA_PHONE_RE = /\b(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;

function maskedBio(input: string | null | undefined, locale: "fr" | "en" | "es" = "fr"): SanitizePublicBioResult {
  return sanitizePublicTeacherBio(input, locale);
}

// ---------------------------------------------------------------------------
// 1. Email
// ---------------------------------------------------------------------------

test("email in bio is masked (fr)", () => {
  const out = maskedBio("Écrivez-moi à elena.dance@example.com pour info.", "fr");
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("email"), "email reason should be present");
  assert.equal(out.content, `Écrivez-moi à ${PLACEHOLDERS.fr} pour info.`);
  assert.doesNotMatch(out.content, RAW_EMAIL_RE, "raw email must not survive masking");
});

test("email is masked in en + es with localized placeholder", () => {
  const en = maskedBio("Reach me at me@example.com.", "en");
  assert.equal(en.content, `Reach me at ${PLACEHOLDERS.en}.`);

  const es = maskedBio("Escríbeme a yo@example.com.", "es");
  assert.equal(es.content, `Escríbeme a ${PLACEHOLDERS.es}.`);
});

// ---------------------------------------------------------------------------
// 2. NANP phone
// ---------------------------------------------------------------------------

test("North American phone (514-555-0123) is masked", () => {
  const out = maskedBio("Appelez le 514-555-0123 entre 9h et 17h.");
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("phone_na"));
  assert.equal(out.content, `Appelez le ${PLACEHOLDERS.fr} entre 9h et 17h.`);
  assert.doesNotMatch(out.content, RAW_NA_PHONE_RE);
});

test("North American phone with parens and +1 is masked", () => {
  const out = maskedBio("Direct: +1 (438) 555-9876.");
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("phone_na"));
  assert.doesNotMatch(out.content, RAW_NA_PHONE_RE);
});

// ---------------------------------------------------------------------------
// 3. International phone
// ---------------------------------------------------------------------------

test("French international phone (+33 6 12 34 56 78) is masked", () => {
  const out = maskedBio("Mon numéro français : +33 6 12 34 56 78.");
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("phone_intl"));
  assert.doesNotMatch(out.content, /\+\d/);
});

test("UK international phone (+447911123456) is masked", () => {
  const out = maskedBio("UK: +447911123456 anytime.", "en");
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("phone_intl"));
  assert.doesNotMatch(out.content, /\+\d/);
});

// ---------------------------------------------------------------------------
// 4. Channel keywords (WhatsApp, Telegram, Instagram, etc.)
// ---------------------------------------------------------------------------

test("WhatsApp keyword is masked", () => {
  const out = maskedBio("Disponible sur WhatsApp pour les questions.");
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("channel_keyword"));
  assert.doesNotMatch(out.content, /whatsapp/i);
});

test("Telegram keyword is masked", () => {
  const out = maskedBio("Telegram is the fastest way to reach me.", "en");
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("channel_keyword"));
  assert.doesNotMatch(out.content, /telegram/i);
});

test("Instagram + Insta + Snap variants are all masked", () => {
  const out = maskedBio("Suivez-moi sur Instagram ou Insta, parfois Snap.");
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("channel_keyword"));
  assert.doesNotMatch(out.content, /instagram/i);
  assert.doesNotMatch(out.content, /\binsta\b/i);
  assert.doesNotMatch(out.content, /\bsnap\b/i);
});

test("Interac / e-transfer / virement keywords are masked", () => {
  const out = maskedBio("Paiement par Interac, e-transfer ou virement bancaire.");
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("channel_keyword"));
  assert.doesNotMatch(out.content, /interac/i);
  assert.doesNotMatch(out.content, /e[-\s]?transfer/i);
  assert.doesNotMatch(out.content, /virement/i);
});

// ---------------------------------------------------------------------------
// 5. Social handles
// ---------------------------------------------------------------------------

test("@handle is masked", () => {
  const out = maskedBio("Mon pseudo: @elena.dance pour me suivre.");
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("social_handle"));
  assert.doesNotMatch(out.content, /@elena\.dance/);
});

test("short @noise (less than 3 chars) is preserved", () => {
  // "@a" should be ignored — too noisy to flag confidently.
  const out = maskedBio("Réservez @ midi tous les jours.");
  assert.equal(out.masked, false);
  assert.equal(out.content, "Réservez @ midi tous les jours.");
});

// ---------------------------------------------------------------------------
// 6. External URLs (and pratiqo.ca exception)
// ---------------------------------------------------------------------------

test("external https URL is masked", () => {
  const out = maskedBio("Voir mes vidéos sur https://my-site.example/portfolio");
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("external_url"));
  assert.doesNotMatch(out.content, /https?:\/\//i);
});

test("external www. URL is masked", () => {
  const out = maskedBio("Aussi sur www.elena-dance.com pour plus d'infos.");
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("external_url"));
  assert.doesNotMatch(out.content, /www\./i);
});

test("bare external domain (example.com) is masked", () => {
  const out = maskedBio("Visit example.com for my full schedule.", "en");
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("external_url"));
  assert.doesNotMatch(out.content, /example\.com/i);
});

test("pratiqo.ca URL is preserved (https://pratiqo.ca/...)", () => {
  const out = maskedBio("Réservez via https://pratiqo.ca/teacher/profile/abc");
  assert.equal(out.masked, false, "pratiqo.ca link should not trigger masking");
  assert.match(out.content, /https:\/\/pratiqo\.ca\/teacher\/profile\/abc/);
});

test("pratiqo.ca bare domain is preserved", () => {
  const out = maskedBio("Plateforme: pratiqo.ca");
  assert.equal(out.masked, false);
  assert.match(out.content, /pratiqo\.ca/);
});

// ---------------------------------------------------------------------------
// 7. Normal teaching text remains unchanged
// ---------------------------------------------------------------------------

test("normal teaching bio remains unchanged", () => {
  const input =
    "Professeure de piano depuis 12 ans, formée au Conservatoire de Montréal. " +
    "J'enseigne le classique, le jazz et la chanson populaire aux enfants et adultes. " +
    "Cours adaptés à votre rythme, dans une ambiance bienveillante.";
  const out = maskedBio(input);
  assert.equal(out.masked, false);
  assert.equal(out.reasons.length, 0);
  assert.equal(out.content, input);
});

test("null and empty inputs return empty content, masked=false", () => {
  assert.deepEqual(maskedBio(null), { content: "", masked: false, reasons: [] });
  assert.deepEqual(maskedBio(undefined), { content: "", masked: false, reasons: [] });
  assert.deepEqual(maskedBio(""), { content: "", masked: false, reasons: [] });
});

// ---------------------------------------------------------------------------
// 8. Defense-in-depth: multiple categories at once
// ---------------------------------------------------------------------------

test("bio with email + phone + Instagram + handle + URL gets all masked", () => {
  const input =
    "Contact: me@example.com, 514-555-0123, Instagram @elena.dance, https://elena.example/";
  const out = maskedBio(input, "en");
  assert.equal(out.masked, true);
  // All five categories should fire (order = insertion order in sanitizer).
  for (const r of ["email", "phone_na", "channel_keyword", "social_handle", "external_url"] as const) {
    assert.ok(out.reasons.includes(r), `expected reason ${r} in ${JSON.stringify(out.reasons)}`);
  }
  assert.doesNotMatch(out.content, RAW_EMAIL_RE);
  assert.doesNotMatch(out.content, RAW_NA_PHONE_RE);
  assert.doesNotMatch(out.content, /instagram/i);
  assert.doesNotMatch(out.content, /@elena\.dance/);
  assert.doesNotMatch(out.content, /https?:\/\//i);
});

// ---------------------------------------------------------------------------
// 9. Source-scan integration: SEO + JSON-LD must use sanitizer
// ---------------------------------------------------------------------------

const SEO_PAGE_SRC = readFileSync(
  join(process.cwd(), "app", "teacher", "profile", "[id]", "page.tsx"),
  "utf8",
);

test("SEO page imports sanitizePublicTeacherBio", () => {
  assert.match(
    SEO_PAGE_SRC,
    /from\s+["']@\/lib\/teacherProfile\/sanitizePublicBio["']/,
    "SEO page must import the sanitizer",
  );
});

test("meta description is built from sanitized bio, not raw teacher.bio", () => {
  // buildTeacherSeoDescription must receive a sanitized variable, not `teacher.bio`.
  assert.match(
    SEO_PAGE_SRC,
    /buildTeacherSeoDescription\([\s\S]*?sanitizedBioForMeta/,
    "buildTeacherSeoDescription must be called with the sanitized bio",
  );
  assert.doesNotMatch(
    SEO_PAGE_SRC,
    /buildTeacherSeoDescription\([\s\S]*?teacher\.bio[\s\S]*?\)/,
    "buildTeacherSeoDescription must NOT be called with raw teacher.bio",
  );
});

test("JSON-LD description uses sanitized bio, not raw initialTeacher.bio", () => {
  assert.doesNotMatch(
    SEO_PAGE_SRC,
    /initialTeacher\.bio\.slice\(/,
    "JSON-LD must not slice raw initialTeacher.bio",
  );
  assert.match(
    SEO_PAGE_SRC,
    /sanitizedBioForJsonLd[\s\S]*?\.slice\(/,
    "JSON-LD must slice the sanitized bio variable",
  );
});

// ---------------------------------------------------------------------------
// 10. Source-scan: TeacherProfile.tsx renders sanitized bio + conditional notice
// ---------------------------------------------------------------------------

const PROFILE_SRC = readFileSync(
  join(process.cwd(), "components", "TeacherProfile.tsx"),
  "utf8",
);

test("TeacherProfile imports sanitizePublicTeacherBio", () => {
  assert.match(
    PROFILE_SRC,
    /from\s+["']@\/lib\/teacherProfile\/sanitizePublicBio["']/,
  );
});

test("TeacherProfile memoizes sanitizedBio from teacher.bio + locale", () => {
  assert.match(
    PROFILE_SRC,
    /sanitizePublicTeacherBio\(\s*teacher\.bio\s*,\s*locale\s*\)/,
    "sanitizer must be called with teacher.bio + locale",
  );
});

test("TeacherProfile bio render uses sanitizedBio.content (not raw teacher.bio)", () => {
  // The about-section render must reference sanitizedBio.content somewhere.
  assert.match(
    PROFILE_SRC,
    /sanitizedBio\.content/,
    "render must use sanitizedBio.content",
  );
  // And the legacy `{teacher.bio ||` render must be gone.
  assert.doesNotMatch(
    PROFILE_SRC,
    /\{teacher\.bio\s*\|\|/,
    "raw `{teacher.bio || ...}` render must be replaced by sanitized variant",
  );
});

test("TeacherProfile shows i18n notice when sanitizedBio.masked is true", () => {
  assert.match(
    PROFILE_SRC,
    /sanitizedBio\.masked[\s\S]{0,400}teacherBioContactHiddenNotice/,
    "notice must be rendered conditionally on sanitizedBio.masked using i18n key",
  );
});

// ---------------------------------------------------------------------------
// 11. i18n parity: the new notice exists in all locales with the agreed copy
// ---------------------------------------------------------------------------

const FR = JSON.parse(readFileSync(join(process.cwd(), "lib", "i18n", "locales", "fr.json"), "utf8"));
const EN = JSON.parse(readFileSync(join(process.cwd(), "lib", "i18n", "locales", "en.json"), "utf8"));
const ES = JSON.parse(readFileSync(join(process.cwd(), "lib", "i18n", "locales", "es.json"), "utf8"));

test("teacherBioContactHiddenNotice exists in fr/en/es with the agreed copy", () => {
  assert.equal(
    FR.teacherBioContactHiddenNotice,
    "Les coordonnées personnelles sont masquées avant la première leçon.",
  );
  assert.equal(
    EN.teacherBioContactHiddenNotice,
    "Personal contact details are hidden before the first lesson.",
  );
  assert.equal(
    ES.teacherBioContactHiddenNotice,
    "Los datos personales de contacto están ocultos antes de la primera clase.",
  );
});

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main() {
  let passed = 0;
  const failed: Array<{ name: string; err: unknown }> = [];

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed++;
      console.log(`  ok  ${name}`);
    } catch (err) {
      failed.push({ name, err });
      console.log(`  FAIL ${name}`);
    }
  }

  console.log(`\n${passed}/${tests.length} passed`);

  if (failed.length > 0) {
    for (const { name, err } of failed) {
      console.error(`\n--- ${name} ---`);
      console.error(err);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
