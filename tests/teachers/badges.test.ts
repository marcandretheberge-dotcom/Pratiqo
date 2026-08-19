/**
 * Tests for the public teacher badge taxonomy.
 *
 * Two layers of coverage:
 *
 *   1. Unit tests for buildTeacherBadges + getCompactTeacherBadges + the
 *      narrow predicates (isPublicTeacherIdentityVerified,
 *      hasVerifiedDiplomaEvidence, hasPublicTeacherReviews, isFounderTeacher).
 *
 *   2. Source-scan regression tests asserting the public render surfaces
 *      cannot regress to:
 *        - showing a separate "Email vérifié" trust badge,
 *        - duplicating the identity chip via the legacy
 *          getPublicTeacherTrustBadgeKey helper,
 *        - mixing "Pro" with verification language,
 *        - rendering a 5-star rating when reviewCount === 0,
 *        - introducing commission / payout / Stripe logic in the founder
 *          allowlist helper.
 *
 * The source-scan layer is what guarantees we can't regress by reintroducing
 * the noisy badges later.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildTeacherBadges,
  getCompactTeacherBadges,
  getSearchCardTeacherBadges,
  hasPublicTeacherReviews,
  hasVerifiedDiplomaEvidence,
  isPublicTeacherIdentityVerified,
  type TeacherBadge,
  type TeacherBadgeInput,
} from "@/lib/teachers/badges";
import { isFounderTeacher } from "@/lib/teachers/founderTeachers";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const baseInput: TeacherBadgeInput = {
  teacherId: "tch_test",
  identityVerified: false,
  identityStatus: null,
  stripeIdentityStatus: null,
  diplomaVerified: false,
  credentials: [],
  profilePlan: "free",
  reviewCount: 5, // not "new" by default — keeps the test surface small
  founder: false,
};

function withInput(overrides: Partial<TeacherBadgeInput>): TeacherBadgeInput {
  return { ...baseInput, ...overrides };
}

function ids(badges: TeacherBadge[]): string[] {
  return badges.map((b) => b.id);
}

// ---------------------------------------------------------------------------
// 1. Identity predicate
// ---------------------------------------------------------------------------

test("isPublicTeacherIdentityVerified: boolean flag wins", () => {
  assert.equal(isPublicTeacherIdentityVerified({ identityVerified: true }), true);
});

test("isPublicTeacherIdentityVerified: identityStatus=verified wins", () => {
  assert.equal(isPublicTeacherIdentityVerified({ identityStatus: "verified" }), true);
});

test("isPublicTeacherIdentityVerified: stripeIdentityStatus=verified wins", () => {
  assert.equal(isPublicTeacherIdentityVerified({ stripeIdentityStatus: "VERIFIED" }), true);
});

test("isPublicTeacherIdentityVerified: pending / missing / unknown is false", () => {
  assert.equal(
    isPublicTeacherIdentityVerified({
      identityVerified: false,
      identityStatus: "pending",
      stripeIdentityStatus: "requires_input",
    }),
    false,
  );
});

// ---------------------------------------------------------------------------
// 2. Diploma predicate
// ---------------------------------------------------------------------------

test("hasVerifiedDiplomaEvidence: explicit boolean flag wins", () => {
  assert.equal(hasVerifiedDiplomaEvidence({ diplomaVerified: true }), true);
});

test("hasVerifiedDiplomaEvidence: verified degree credential counts", () => {
  assert.equal(
    hasVerifiedDiplomaEvidence({
      credentials: [{ type: "degree", verificationStatus: "verified" }],
    }),
    true,
  );
});

test("hasVerifiedDiplomaEvidence: pending credential does NOT count", () => {
  assert.equal(
    hasVerifiedDiplomaEvidence({
      credentials: [{ type: "degree", verificationStatus: "pending" }],
    }),
    false,
  );
});

test("hasVerifiedDiplomaEvidence: verified experience credential does NOT count as diploma", () => {
  // Experience-type credentials are not diplomas — they must not trigger
  // the "Diplôme vérifié" badge.
  assert.equal(
    hasVerifiedDiplomaEvidence({
      credentials: [{ type: "experience", verificationStatus: "verified" }],
    }),
    false,
  );
});

// ---------------------------------------------------------------------------
// 3. buildTeacherBadges — taxonomy + no duplicates + ordering
// ---------------------------------------------------------------------------

test("no duplicate identity badge (only one identity_verified, even with all signals true)", () => {
  const badges = buildTeacherBadges(
    withInput({
      identityVerified: true,
      identityStatus: "verified",
      stripeIdentityStatus: "verified",
    }),
  );
  assert.equal(
    badges.filter((b) => b.id === "identity_verified").length,
    1,
    "identity_verified must appear exactly once",
  );
});

test("identity_verified is a trust badge with shield icon", () => {
  const badges = buildTeacherBadges(withInput({ identityVerified: true }));
  const identity = badges.find((b) => b.id === "identity_verified");
  assert.ok(identity, "identity_verified badge must be present");
  assert.equal(identity?.type, "trust");
  assert.equal(identity?.icon, "shield");
});

test("diploma_verified appears only when verified evidence is present", () => {
  const withoutEvidence = buildTeacherBadges(withInput({ diplomaVerified: false, credentials: [] }));
  assert.ok(!ids(withoutEvidence).includes("diploma_verified"));

  const withEvidence = buildTeacherBadges(withInput({ diplomaVerified: true }));
  assert.ok(ids(withEvidence).includes("diploma_verified"));
});

test("founder badge is emitted only when founder===true or allowlist matches", () => {
  const off = buildTeacherBadges(withInput({ founder: false }));
  assert.ok(!ids(off).includes("founder"));

  const on = buildTeacherBadges(withInput({ founder: true }));
  assert.ok(ids(on).includes("founder"));
  const founder = on.find((b) => b.id === "founder")!;
  assert.equal(founder.type, "marketplace", "founder must be a marketplace badge, not trust");
});

test("new_teacher badge appears when reviewCount === 0", () => {
  const badges = buildTeacherBadges(withInput({ reviewCount: 0 }));
  assert.ok(ids(badges).includes("new_teacher"));
});

test("new_teacher badge does NOT appear when reviewCount > 0", () => {
  const badges = buildTeacherBadges(withInput({ reviewCount: 3 }));
  assert.ok(!ids(badges).includes("new_teacher"));
});

test("pro badge is a product badge (not trust, not marketplace)", () => {
  const badges = buildTeacherBadges(withInput({ profilePlan: "pro" }));
  const pro = badges.find((b) => b.id === "pro");
  assert.ok(pro, "pro badge should appear for profilePlan=pro");
  assert.equal(pro?.type, "product");
});

test("badges are emitted in stable priority order (trust → marketplace → product)", () => {
  const badges = buildTeacherBadges(
    withInput({
      identityVerified: true,
      diplomaVerified: true,
      founder: true,
      reviewCount: 0,
      profilePlan: "pro",
    }),
  );
  // Priority numbers in the helper: identity=10, founder=20, diploma=30, new=40, pro=50.
  assert.deepEqual(ids(badges), [
    "identity_verified",
    "founder",
    "diploma_verified",
    "new_teacher",
    "pro",
  ]);
});

// ---------------------------------------------------------------------------
// 4. getCompactTeacherBadges — max 2
// ---------------------------------------------------------------------------

test("getCompactTeacherBadges returns at most 2 badges by default", () => {
  const compact = getCompactTeacherBadges(
    withInput({
      identityVerified: true,
      diplomaVerified: true,
      founder: true,
      reviewCount: 0,
      profilePlan: "pro",
    }),
  );
  assert.equal(compact.length, 2, "compact slot must cap at 2 even with 5 candidates");
});

test("getCompactTeacherBadges respects an explicit max", () => {
  const compact = getCompactTeacherBadges(
    withInput({ identityVerified: true, founder: true }),
    1,
  );
  assert.equal(compact.length, 1);
  assert.equal(compact[0].id, "identity_verified", "highest-priority badge wins");
});

test("getSearchCardTeacherBadges caps at 2 and prefers identity then experience", () => {
  const compact = getSearchCardTeacherBadges(
    withInput({
      identityVerified: true,
      verifiedExperience: true,
      diplomaVerified: true,
      founder: true,
      reviewCount: 0,
      profilePlan: "pro",
    }),
  );
  assert.deepEqual(ids(compact), ["identity_verified", "verified_experience"]);
});

test("getSearchCardTeacherBadges omits Nouveau because the rating slot covers it", () => {
  const compact = getSearchCardTeacherBadges(withInput({ reviewCount: 0, founder: true }));
  assert.deepEqual(ids(compact), ["founder"]);
  assert.ok(!ids(compact).includes("new_teacher"));
});

// ---------------------------------------------------------------------------
// 5. hasPublicTeacherReviews — avoids fake "5 (0 reviews)" rendering
// ---------------------------------------------------------------------------

test("hasPublicTeacherReviews: rating 5 / reviewCount 0 → false (prevents fake stars)", () => {
  assert.equal(hasPublicTeacherReviews({ rating: 5, reviewCount: 0 }), false);
});

test("hasPublicTeacherReviews: rating 0 / reviewCount 0 → false", () => {
  assert.equal(hasPublicTeacherReviews({ rating: 0, reviewCount: 0 }), false);
});

test("hasPublicTeacherReviews: rating 4.5 / reviewCount 12 → true", () => {
  assert.equal(hasPublicTeacherReviews({ rating: 4.5, reviewCount: 12 }), true);
});

test("hasPublicTeacherReviews: null inputs → false", () => {
  assert.equal(hasPublicTeacherReviews({ rating: null, reviewCount: null }), false);
});

// ---------------------------------------------------------------------------
// 6. Founder allowlist — visual-only, no commission side-effects
// ---------------------------------------------------------------------------

test("isFounderTeacher: empty / null / undefined inputs return false", () => {
  assert.equal(isFounderTeacher(null), false);
  assert.equal(isFounderTeacher(undefined), false);
  assert.equal(isFounderTeacher(""), false);
  assert.equal(isFounderTeacher("   "), false);
});

test("isFounderTeacher: default allowlist is empty (no live founder ids yet)", () => {
  assert.equal(
    isFounderTeacher("tch_no_such_teacher"),
    false,
    "default allowlist must be empty pre-launch; add ids deliberately later",
  );
});

// ---------------------------------------------------------------------------
// 7. Source-scan: founder helper must not touch commission / Stripe / payout
// ---------------------------------------------------------------------------

const FOUNDER_HELPER_SRC = readFileSync(
  join(process.cwd(), "lib", "teachers", "founderTeachers.ts"),
  "utf8",
);

test("founder helper is visual-only — no stripe / commission / payout / waiver imports or calls", () => {
  // Strip both line comments (`// ...`) and block comments (`/* ... */`)
  // before scanning. The helper's TODO comment legitimately mentions
  // "commission" and "waiver" — we only want to flag those words in
  // executable code.
  const codeOnly = FOUNDER_HELPER_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(
    /^[ \t]*\/\/.*$/gm,
    "",
  );

  assert.ok(
    !/from\s+["']stripe["']/i.test(codeOnly),
    "founder helper must not import the Stripe SDK",
  );
  assert.ok(
    !/\bstripe\.[a-z]+/i.test(codeOnly),
    "founder helper must not call any stripe.* method",
  );
  assert.ok(
    !/\bcommission\b/i.test(codeOnly),
    "founder helper must not contain commission logic (code only — comments ok)",
  );
  assert.ok(
    !/\bpayout\b/i.test(codeOnly),
    "founder helper must not contain payout logic (code only — comments ok)",
  );
  assert.ok(
    !/\bwaiver\b/i.test(codeOnly),
    "founder helper must not implement a waiver (code only — comments ok)",
  );
});

test("founder helper carries the TODO marker pointing at teacher_promotions table", () => {
  assert.match(
    FOUNDER_HELPER_SRC,
    /TODO:[\s\S]*teacher_promotions/i,
    "TODO breadcrumb must reference the future teacher_promotions table",
  );
});

// ---------------------------------------------------------------------------
// 8. Source-scan: badges.ts taxonomy invariants
// ---------------------------------------------------------------------------

const BADGES_SRC = readFileSync(
  join(process.cwd(), "lib", "teachers", "badges.ts"),
  "utf8",
);

test("badges helper does NOT emit a public 'Email vérifié' badge id", () => {
  // We allow the word "email" in JSDoc, but the badge id set must not
  // include any email-verification badge.
  assert.ok(
    !/id:\s*["']email_verified["']/.test(BADGES_SRC),
    "no email_verified badge id may exist",
  );
  assert.ok(
    !/trustEmailVerified/.test(BADGES_SRC),
    "badges helper must not reference the legacy trustEmailVerified i18n key",
  );
});

test("Pro badge uses neutral copy keys, not verification keys", () => {
  // The pro entry must use teacherBadgePro / teacherBadgeProDescription, NOT
  // any key containing 'verified' / 'verification' / 'identity'.
  const proBlock = BADGES_SRC.match(/id:\s*["']pro["'][\s\S]{0,300}?priority/);
  assert.ok(proBlock, "could not locate the pro badge block in badges.ts");
  assert.match(proBlock![0], /teacherBadgePro/);
  assert.doesNotMatch(
    proBlock![0],
    /verified|verification|identity/i,
    "Pro badge must not mix verification wording with the product plan",
  );
});

// ---------------------------------------------------------------------------
// 9. Source-scan: TeacherProfile must use the new badge surface (no legacy)
// ---------------------------------------------------------------------------

const PROFILE_SRC = readFileSync(
  join(process.cwd(), "components", "TeacherProfile.tsx"),
  "utf8",
);

test("TeacherProfile uses getCompactTeacherBadges(..., 2) for the headline slot", () => {
  assert.match(
    PROFILE_SRC,
    /getCompactTeacherBadges\(\s*[^,]+,\s*2\s*\)/,
    "headline badges must be capped at 2 via getCompactTeacherBadges",
  );
});

test("TeacherProfile no longer renders the legacy getPublicTeacherTrustBadgeKey chip", () => {
  assert.ok(
    !/getPublicTeacherTrustBadgeKey/.test(PROFILE_SRC),
    "legacy getPublicTeacherTrustBadgeKey chip must not be reintroduced (duplicates identity)",
  );
});

test("TeacherProfile no longer iterates buildTeacherTrustBadges in the header", () => {
  assert.ok(
    !/buildTeacherTrustBadges/.test(PROFILE_SRC),
    "old buildTeacherTrustBadges header strip must be replaced by TeacherBadgePill",
  );
});

test("TeacherProfile renders the trust box title via the new teacherTrustTitle key", () => {
  assert.match(
    PROFILE_SRC,
    /t\(\s*["']teacherTrustTitle["']\s*\)/,
    "right-side trust box must use the new teacherTrustTitle key",
  );
});

test("TeacherProfile trust box explains non-verified identity neutrally", () => {
  assert.match(
    PROFILE_SRC,
    /teacherTrustIdentityNotVerifiedTitle/,
    "non-verified identity must use the neutral title key",
  );
  assert.match(
    PROFILE_SRC,
    /teacherTrustIdentityNotVerifiedDescription/,
    "non-verified identity must use the neutral description key",
  );
  assert.match(
    PROFILE_SRC,
    /identityVerifiedForTrustBox \?/,
    "trust box must still branch on identityVerifiedForTrustBox",
  );
});

test("TeacherProfile trust box does NOT show 'Email vérifié' as a public item", () => {
  // The trust box ul must not iterate buildTeacherTrustItems anymore.
  assert.ok(
    !/trustItems\.map\(/.test(PROFILE_SRC),
    "trustItems iteration in the trust box must be removed",
  );
  assert.ok(
    !/trustEmailVerified/.test(PROFILE_SRC),
    "trustEmailVerified must not be referenced by the public profile",
  );
});

test("TeacherProfile rating render is gated by hasPublicTeacherReviews / hasReviews", () => {
  // The new render is `{hasReviews ? (...) : (t("teacherNoReviewsYet"))}`.
  assert.match(
    PROFILE_SRC,
    /hasReviews\s*\?\s*\(/,
    "rating display must be gated by hasReviews",
  );
  assert.match(
    PROFILE_SRC,
    /teacherNoReviewsYet/,
    "no-reviews state must use the localized teacherNoReviewsYet key",
  );
});

// ---------------------------------------------------------------------------
// 10. i18n: required keys exist in every locale with the agreed copy
// ---------------------------------------------------------------------------

const FR = JSON.parse(readFileSync(join(process.cwd(), "lib", "i18n", "locales", "fr.json"), "utf8"));
const EN = JSON.parse(readFileSync(join(process.cwd(), "lib", "i18n", "locales", "en.json"), "utf8"));
const ES = JSON.parse(readFileSync(join(process.cwd(), "lib", "i18n", "locales", "es.json"), "utf8"));

const REQUIRED_KEYS = [
  "teacherBadgeIdentityVerified",
  "teacherBadgeDiplomaVerified",
  "teacherBadgeFounder",
  "teacherBadgeFounderDescription",
  "teacherBadgeNewTeacher",
  "teacherTrustTitle",
  "teacherTrustIdentityVerifiedDescription",
  "teacherTrustIdentityNotVerifiedTitle",
  "teacherTrustIdentityNotVerifiedDescription",
  "teacherTrustPaymentProtected",
  "teacherTrustPaymentProtectedDescription",
  "teacherTrustContactProtected",
  "teacherTrustContactProtectedDescription",
  "teacherNoReviewsYet",
  "bookingIdentityCautionTitle",
  "bookingIdentityCautionBody",
  "bookingIdentityCautionContinue",
] as const;

test("all required badge / trust keys exist in fr/en/es", () => {
  for (const key of REQUIRED_KEYS) {
    assert.ok(typeof FR[key] === "string" && FR[key].length > 0, `fr missing: ${key}`);
    assert.ok(typeof EN[key] === "string" && EN[key].length > 0, `en missing: ${key}`);
    assert.ok(typeof ES[key] === "string" && ES[key].length > 0, `es missing: ${key}`);
  }
});

test("founder copy is restrained: no certified/guaranteed/best/government language", () => {
  // The product spec forbids overstated claims on the founder badge.
  // The combined label + description must not contain any of these tokens
  // in FR, EN, or ES (matching the spec's banlist).
  const bannedFr = /\b(meilleur|certifié|garanti|gouvernement)\b/i;
  const bannedEn = /\b(best|certified|guaranteed|government)\b/i;
  const bannedEs = /\b(mejor|certificado|garantizado|gobierno)\b/i;

  const frCombined = `${FR.teacherBadgeFounder} ${FR.teacherBadgeFounderDescription}`;
  const enCombined = `${EN.teacherBadgeFounder} ${EN.teacherBadgeFounderDescription}`;
  const esCombined = `${ES.teacherBadgeFounder} ${ES.teacherBadgeFounderDescription}`;

  assert.doesNotMatch(frCombined, bannedFr, `fr founder copy must avoid: ${bannedFr}`);
  assert.doesNotMatch(enCombined, bannedEn, `en founder copy must avoid: ${bannedEn}`);
  assert.doesNotMatch(esCombined, bannedEs, `es founder copy must avoid: ${bannedEs}`);
});

test("Pro badge copy is plan-flavoured, not verification-flavoured", () => {
  // The Pro label/description must not contain verification language in any locale.
  for (const dict of [FR, EN, ES]) {
    const combined = `${dict.teacherBadgePro} ${dict.teacherBadgeProDescription ?? ""}`;
    assert.doesNotMatch(combined, /verif|vérifi/i, "Pro badge must not mix verification wording");
  }
});

test("trust box title is exactly the agreed copy in fr/en/es", () => {
  assert.equal(FR.teacherTrustTitle, "Confiance Pratiqo");
  assert.equal(EN.teacherTrustTitle, "Pratiqo trust");
  assert.equal(ES.teacherTrustTitle, "Confianza Pratiqo");
});

test("teacherNoReviewsYet is the agreed copy in fr/en/es", () => {
  assert.equal(FR.teacherNoReviewsYet, "Aucun avis pour le moment");
  assert.equal(EN.teacherNoReviewsYet, "No reviews yet");
  assert.equal(ES.teacherNoReviewsYet, "Aún no hay reseñas");
});

test("non-verified identity profile copy is the agreed neutral copy in fr/en/es", () => {
  assert.equal(FR.teacherTrustIdentityNotVerifiedTitle, "Identité non vérifiée par Pratiqo");
  assert.equal(
    FR.teacherTrustIdentityNotVerifiedDescription,
    "Ce professeur n’a pas encore complété la vérification d’identité Pratiqo.",
  );
  assert.equal(EN.teacherTrustIdentityNotVerifiedTitle, "Identity not verified by Pratiqo");
  assert.equal(
    EN.teacherTrustIdentityNotVerifiedDescription,
    "This teacher has not completed Pratiqo identity verification yet.",
  );
  assert.equal(ES.teacherTrustIdentityNotVerifiedTitle, "Identidad no verificada por Pratiqo");
  assert.equal(
    ES.teacherTrustIdentityNotVerifiedDescription,
    "Este profesor todavía no completó la verificación de identidad de Pratiqo.",
  );
});

test("booking identity caution copy is the agreed copy in fr/en/es", () => {
  assert.equal(FR.bookingIdentityCautionTitle, "Identité non vérifiée");
  assert.equal(EN.bookingIdentityCautionTitle, "Identity not verified");
  assert.equal(ES.bookingIdentityCautionTitle, "Identidad no verificada");
  assert.equal(FR.bookingIdentityCautionContinue, "Je comprends et je veux continuer");
  assert.equal(EN.bookingIdentityCautionContinue, "I understand and want to continue");
  assert.equal(ES.bookingIdentityCautionContinue, "Entiendo y quiero continuar");
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
