/**
 * PR 13 — Marketplace independent-teacher legal/copy hardening.
 * Docs + Terms/teacher-terms assertions + forbidden product copy + no behavior change.
 *
 * See docs/product/marketplace-independent-teacher-guardrails.md
 * and docs/product/paid-packages-legal-launch-checklist.md
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void }> = [];
function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

/** Forbidden in product/UI surfaces (not in legal docs that explicitly negate employment). */
const PRODUCT_FORBIDDEN = [
  /Nos professeurs/i,
  /Nous vous offrons des cours/i,
  /Embaucher un tuteur/i,
  /Les cours de Pratiqo/i,
  /Acheter un cours Pratiqo/i,
  /Nos forfaits Pratiqo/i,
  /Acheter un forfait Pratiqo/i,
  /Politique Pratiqo imposée/i,
  /Garantie de remboursement Pratiqo/i,
  /Pratiqo vous offre/i,
  /Pratiqo vous assigne/i,
  /Mes formules/i,
];

const PRODUCT_SURFACES = [
  "components/teacher/TeacherOffersDashboard.tsx",
  "components/teacher/TeacherOfferForm.tsx",
  "components/teacher/PublicTeacherOffersSection.tsx",
  "components/teacher/TeacherPackageDashboard.tsx",
  "components/teacher/TeacherPackageCard.tsx",
  "components/student/StudentPackageDashboard.tsx",
  "components/student/StudentPackageCard.tsx",
  "components/BookingModal.tsx",
  "components/admin/AdminPaymentSourceSection.tsx",
];

const BEHAVIOR_CRITICAL = [
  "app/api/stripe/checkout/route.ts",
  "lib/payments/commission.ts",
  "lib/payments/refunds.ts",
  "lib/offers/packageEntitlements.ts",
  "lib/offers/packageRedemptions.ts",
];

test("marketplace guardrail and legal launch checklist docs exist", () => {
  assert.equal(
    existsSync(join(ROOT, "docs/product/marketplace-independent-teacher-guardrails.md")),
    true,
  );
  assert.equal(
    existsSync(join(ROOT, "docs/product/paid-packages-legal-launch-checklist.md")),
    true,
  );
  const guardrails = read("docs/product/marketplace-independent-teacher-guardrails.md");
  assert.match(guardrails, /Copy do \/ don’t|Copy do \/ don't/);
  assert.match(guardrails, /Engineering guardrails for future PRs/);
  assert.match(guardrails, /Legal review TODOs/);
  assert.match(guardrails, /Legal review required before public paid package launch/);
  assert.match(guardrails, /not legal advice/i);
  const checklist = read("docs/product/paid-packages-legal-launch-checklist.md");
  assert.match(checklist, /Feature flags/);
  assert.match(checklist, /Québec legal counsel|Quebec legal counsel/i);
});

test("Terms FR/EN/ES include marketplace intermediary and package role", () => {
  const fr = read("content/legal/terms.fr.md");
  assert.match(fr, /intermédiaire technologique/i);
  assert.match(fr, /proposé par le professeur/i);
  assert.match(fr, /contrat de service/i);
  assert.match(fr, /frais de plateforme|commission/i);
  assert.match(fr, /aucune exclusivité|demeurent libres d’offrir|demeurent libres d'offrir/i);
  assert.match(fr, /n’assigne pas|n'assigne pas/i);
  assert.match(fr, /Offres de cours et forfaits/);
  assert.doesNotMatch(fr, /Nos forfaits Pratiqo|Acheter un forfait Pratiqo/);

  const en = read("content/legal/terms.en.md");
  assert.match(en, /technology intermediary/i);
  assert.match(en, /offered by the teacher/i);
  assert.match(en, /service agreement/i);
  assert.match(en, /platform fee|commission/i);
  assert.match(en, /no exclusivity|remain free to offer/i);
  assert.match(en, /does \*\*not\*\* assign|does not assign/i);

  const es = read("content/legal/terms.es.md");
  assert.match(es, /intermediario tecnológico/i);
  assert.match(es, /propuesto por el profesor/i);
  assert.match(es, /comisión/i);
  assert.match(es, /no se exige exclusividad|siguen siendo libres/i);
});

test("Teacher terms include teacher-owned offers/packages and no exclusivity", () => {
  const fr = read("content/legal/conditions-professeurs.fr.md");
  assert.match(fr, /Offres de cours et forfaits proposés par le professeur/);
  assert.match(fr, /proposé par le professeur/);
  assert.match(fr, /n’impose pas|n'impose pas/);
  assert.match(fr, /n’assigne pas|n'assigne pas/);
  assert.match(fr, /Aucune exclusivité|demeurent libres/);

  const en = read("content/legal/conditions-professeurs.en.md");
  assert.match(en, /Course offers and packages offered by the teacher/);
  assert.match(en, /offered by the teacher/);
  assert.match(en, /does not assign/);
  assert.match(en, /No exclusivity/);

  const es = read("content/legal/conditions-professeurs.es.md");
  assert.match(es, /Ofertas de cursos y paquetes ofrecidos por el profesor/);
  assert.match(es, /propuesto por el profesor/);
  assert.match(es, /No se exige exclusividad/);
});

test("teacher offers dashboard shows marketplace notice", () => {
  const dash = read("components/teacher/TeacherOffersDashboard.tsx");
  assert.match(dash, /teacherOffersMarketplaceNotice/);
  assert.match(dash, /teacher-offers-marketplace-notice/);
  const fr = read("lib/i18n/locales/fr.json");
  assert.match(fr, /"teacherOffersMarketplaceNotice":/);
  assert.match(fr, /intermédiaire technologique/);
  assert.match(fr, /Vous créez et gérez vos propres offres/);
  assert.doesNotMatch(fr, /"blogNoRelatedTeachers": "Découvrez tous nos professeurs/);
  assert.match(fr, /"blogNoRelatedTeachers": "Découvrez les professeurs inscrits sur Pratiqo/);
});

test("product surfaces avoid employer/school package wording", () => {
  for (const rel of PRODUCT_SURFACES) {
    const src = read(rel);
    for (const pattern of PRODUCT_FORBIDDEN) {
      assert.doesNotMatch(
        src,
        pattern,
        `${rel} must not contain forbidden product wording matching ${pattern}`,
      );
    }
    assert.doesNotMatch(src, /\bformules\b/i);
  }
});

test("package/offer i18n keys stay marketplace-safe", () => {
  for (const localeFile of [
    "lib/i18n/locales/fr.json",
    "lib/i18n/locales/en.json",
    "lib/i18n/locales/es.json",
  ]) {
    const catalog = JSON.parse(read(localeFile)) as Record<string, string>;
    for (const [key, value] of Object.entries(catalog)) {
      if (
        !(
          key.startsWith("teacherOffers") ||
          key.startsWith("teacherPackages") ||
          key.startsWith("studentPackages") ||
          key.startsWith("bookingPackage") ||
          key.startsWith("publicOffer") ||
          key === "studentTabPackages" ||
          key === "blogNoRelatedTeachers"
        )
      ) {
        continue;
      }
      for (const pattern of PRODUCT_FORBIDDEN) {
        assert.doesNotMatch(
          value,
          pattern,
          `${localeFile}:${key} must not contain ${pattern}`,
        );
      }
      assert.doesNotMatch(value, /\bsalaire\b|\bwage\b/i);
      // Allow explicit negation only in onboarding/legal ack keys — not these product keys.
      assert.doesNotMatch(value, /\bemployé\b|\bemployee\b|\bemployer\b/i);
    }
  }
});

test("behavior-critical payment/package mutation modules are untouched by this PR surface", () => {
  for (const rel of BEHAVIOR_CRITICAL) {
    const src = read(rel);
    assert.doesNotMatch(
      src,
      /teacherOffersMarketplaceNotice|paid-packages-legal-launch-checklist|4quinquies|Offres de cours et forfaits/,
      `${rel} must not be rewritten by legal-copy PR markers`,
    );
  }
  assert.doesNotMatch(
    read("app/api/stripe/checkout/route.ts"),
    /ENABLE_TEACHER_PACKAGE_VISIBILITY|marketplaceIndependentTeacherHardening|teacherOffersMarketplaceNotice/,
  );
  assert.doesNotMatch(read("lib/payments/commission.ts"), /teacherOffersMarketplaceNotice/);
  assert.doesNotMatch(read("lib/payments/refunds.ts"), /teacherOffersMarketplaceNotice/);
  assert.doesNotMatch(
    read("app/api/teacher/packages/route.ts"),
    /\.update\(|\.insert\(|redeem|reverse_package/,
  );
  assert.doesNotMatch(
    read("app/api/student/packages/route.ts"),
    /\.update\(|\.insert\(|redeem|reverse_package/,
  );
});

test("no public catalog or Mes formules product label introduced", () => {
  assert.doesNotMatch(read("components/teacher/TeacherOffersDashboard.tsx"), /Mes formules|\bformules\b/i);
  assert.doesNotMatch(read("lib/i18n/locales/fr.json"), /"teacherOffersTitle": "Mes formules"/);
  assert.match(read("lib/i18n/locales/fr.json"), /"teacherOffersTitle": "Mes offres de cours"/);
});

for (const { name, fn } of tests) {
  fn();
  console.log(`ok - ${name}`);
}
console.log(`[legal:marketplace-independent-teacher-hardening] ${tests.length} tests passed`);
