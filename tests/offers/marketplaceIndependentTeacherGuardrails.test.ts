/**
 * Marketplace independent-teacher guardrails for offers/packages copy.
 * See docs/product/marketplace-independent-teacher-guardrails.md.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const FORBIDDEN = [
  /Nos professeurs/i,
  /Nous vous offrons des cours/i,
  /Embaucher un tuteur/i,
  /Les cours de Pratiqo/i,
  /Acheter un cours Pratiqo/i,
  /Nos forfaits Pratiqo/i,
  /Acheter un forfait Pratiqo/i,
  /\bsalaire\b/i,
  /\bwage\b/i,
  /\bemployé\b/i,
  /\bemployee\b/i,
  /\bemployer\b/i,
  /Mes formules/i,
  /\bformules\b/i,
];

/** Code surfaces for package/offers redemption + builder (not entire i18n catalogs). */
const CODE_SURFACES = [
  "docs/product/marketplace-independent-teacher-guardrails.md",
  "lib/offers/packageRedemptions.ts",
  "lib/offers/packageEntitlements.ts",
  "components/BookingModal.tsx",
  "components/teacher/TeacherOfferForm.tsx",
  "components/teacher/PublicTeacherOffersSection.tsx",
  "components/admin/AdminPaymentSourceSection.tsx",
  "app/api/package-entitlements/route.ts",
  "app/api/package-entitlements/[entitlementId]/redeem/route.ts",
];

/** i18n keys owned by offers/packages booking + admin payment source. */
const PACKAGE_OFFER_I18N_KEY_PREFIXES = [
  "bookingPackage",
  "adminPaymentSourcePackage",
  "adminOfferSnapshotListPackage",
  "cancelOutcomePackageCredit",
  "teacherOffer",
  "offerTypePackage",
  "publicOffer",
];

assert.equal(existsSync(join(ROOT, "docs/product/marketplace-independent-teacher-guardrails.md")), true);

for (const rel of CODE_SURFACES) {
  const src = read(rel);
  // Guardrails doc may mention forbidden phrases as examples of what NOT to use.
  if (rel.endsWith("marketplace-independent-teacher-guardrails.md")) continue;
  for (const pattern of FORBIDDEN) {
    assert.doesNotMatch(
      src,
      pattern,
      `${rel} must not contain employer/school wording matching ${pattern}`,
    );
  }
}

for (const localeFile of [
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
]) {
  const catalog = JSON.parse(read(localeFile)) as Record<string, string>;
  for (const [key, value] of Object.entries(catalog)) {
    if (!PACKAGE_OFFER_I18N_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
    for (const pattern of FORBIDDEN) {
      assert.doesNotMatch(
        value,
        pattern,
        `${localeFile}:${key} must not contain employer/school wording matching ${pattern}`,
      );
    }
  }
}

const fr = read("lib/i18n/locales/fr.json");
assert.match(fr, /Utiliser une séance du forfait/);
assert.match(fr, /avec ce professeur/);
assert.match(fr, /Forfait proposé par le professeur/);
assert.match(fr, /facilitée par Pratiqo/);
assert.match(fr, /remise dans le forfait/);

console.log("ok - marketplace independent-teacher guardrails copy");
console.log("[offers:marketplace-guardrails] tests passed");
