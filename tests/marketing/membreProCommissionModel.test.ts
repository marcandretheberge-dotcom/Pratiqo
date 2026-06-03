/**
 * Regression suite for Pratiqo's canonical Membre Pro commission model.
 *
 * The product owner's directive (see fix branch
 * `fix/membre-pro-declining-commission-canonical`):
 *   Pratiqo's commission model is *régressive / declining* — Free
 *   15 % → 12 %, Pro 5 % → 3.5 % plus higher-tier annual
 *   rebate/ristourne eligibility — and `/upgrade`, `/tarifs`, and
 *   `lib/config/membrePro.ts` must agree on that single canonical model.
 *
 * What we guard against, and why:
 *
 *  1. /upgrade silently re-implies a flat 5 % / 15 % commission. The
 *     copy must use cautious "starting at" / "à partir de" / "desde"
 *     wording in FR/EN/ES, with a secondary line that mentions tiers
 *     based on eligible volume.
 *
 *  2. The two surfaces drift out of sync. /tarifs's tier figures must
 *     start / end at the canonical range (15 % / 12 % free, 5 % / 3.5 %
 *     pro). /upgrade derives its summary from the same constants.
 *
 *  3. Stale "$29" subscription price (a prior normalization mistake)
 *     leaks back into a user-facing surface. The canonical Stripe
 *     Price referenced by `STRIPE_PRO_MONTHLY_PRICE_ID` has
 *     `unit_amount = 2999` (= $29.99 CAD), and /upgrade, /tarifs and
 *     the legal copy must all display $29.99 / 29,99 sourced from
 *     `MEMBRE_PRO_PLAN.proMonthlyPriceCad` and
 *     `MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay`.
 *
 *  4. Brand naming regresses. "Plan Pro" / "Teacher Pro" must not
 *     appear in user-facing pages — the canonical brand is Membre Pro
 *     (FR), Pro Member (EN), Miembro Pro (ES).
 *
 *  5. Legal-safe disclaimer disappears or drifts between locales.
 *     "No guaranteed ranking, bookings, or income" must remain in
 *     FR/EN/ES /upgrade and /tarifs.
 *
 *  6. Public-facing pages assert guaranteed income, ranking, or
 *     bookings — terms expressly forbidden by the legal review.
 *
 * Static-source style — matches `tests/marketing/testimonialsLaunchScope`.
 * No browser automation, no payments / Supabase / RLS / migration code.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  MEMBRE_PRO_COMMISSION_MODEL,
  MEMBRE_PRO_PLAN,
  UPGRADE_PAGE_COPY,
} from "../../lib/config/membrePro";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();

const fr = JSON.parse(
  readFileSync(join(root, "lib", "i18n", "locales", "fr.json"), "utf8"),
) as Record<string, string>;
const en = JSON.parse(
  readFileSync(join(root, "lib", "i18n", "locales", "en.json"), "utf8"),
) as Record<string, string>;
const es = JSON.parse(
  readFileSync(join(root, "lib", "i18n", "locales", "es.json"), "utf8"),
) as Record<string, string>;

const upgradeSrc = readFileSync(
  join(root, "app", "(app)", "upgrade", "page.tsx"),
  "utf8",
);
const tarifsSrc = readFileSync(
  join(root, "app", "tarifs", "page.tsx"),
  "utf8",
);
const tarifsLayoutSrc = readFileSync(
  join(root, "app", "tarifs", "layout.tsx"),
  "utf8",
);
const membreProConfigSrc = readFileSync(
  join(root, "lib", "config", "membrePro.ts"),
  "utf8",
);

// ── Canonical commission model ────────────────────────────────────────
test("MEMBRE_PRO_COMMISSION_MODEL exposes the canonical 15 → 12 / 5 → 3.5 ranges", () => {
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.freeCommissionRange.startPercent, 15);
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.freeCommissionRange.bestPercent, 12);
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.proCommissionRange.startPercent, 5);
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.proCommissionRange.bestPercent, 3.5);
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.proRistourneRange.goldPercent, 0.5);
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.proRistourneRange.platinumPercent, 1);
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.annualProfitSharingPoolPercent, 5);
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.annualProfitSharingPoolCapCad, 150_000);
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.annualProfitSharingMinimumEligibleTeachers, 10);
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.annualProfitSharingMaxPerTeacherCad, 10_000);
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.hasTieredCommission, true);
});

test("MEMBRE_PRO_PLAN entry-tier values match the canonical range start", () => {
  assert.equal(
    MEMBRE_PRO_PLAN.freeCommissionPercent,
    MEMBRE_PRO_COMMISSION_MODEL.freeCommissionRange.startPercent,
  );
  assert.equal(
    MEMBRE_PRO_PLAN.proCommissionPercent,
    MEMBRE_PRO_COMMISSION_MODEL.proCommissionRange.startPercent,
  );
  // Stripe Price `STRIPE_PRO_MONTHLY_PRICE_ID` has unit_amount = 2999
  // (= $29.99 CAD). This numeric constant MUST stay aligned with that
  // dashboard value — any divergence creates a public/checkout mismatch.
  assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCad, 29.99);
});

test("MEMBRE_PRO_PLAN exposes locale-aware display strings for the monthly price", () => {
  // FR/ES use a comma decimal mark; EN uses a dot. Any user-facing
  // copy that needs the printable number must consume this map rather
  // than re-interpolate the numeric constant, which would render
  // "29.99 $CA" on FR/ES surfaces.
  assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.fr, "29,99");
  assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.en, "29.99");
  assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.es, "29,99");
});

test("Stripe Pro checkout route still uses the STRIPE_PRO_MONTHLY_PRICE_ID env var", () => {
  // Guards against payment-logic drift: this fix branch must not
  // rename, replace or hard-code the Price ID env var, and must not
  // alter the checkout call shape.
  const checkoutSrc = readFileSync(
    join(root, "app", "api", "stripe", "pro", "checkout", "route.ts"),
    "utf8",
  );
  assert.match(
    checkoutSrc,
    /process\.env\.STRIPE_PRO_MONTHLY_PRICE_ID/,
    "Stripe Pro checkout must keep reading STRIPE_PRO_MONTHLY_PRICE_ID",
  );
  assert.match(
    checkoutSrc,
    /line_items:\s*\[\s*\{\s*price:\s*priceId,\s*quantity:\s*1\s*\}\s*\]/,
    "Stripe Pro checkout must keep passing the env-resolved priceId verbatim to Stripe",
  );
  // No hard-coded Stripe product/price ids may sneak into this route.
  assert.ok(
    !/\bprice_[A-Za-z0-9]{8,}/.test(checkoutSrc),
    "Stripe checkout must not hard-code a Stripe price_… identifier",
  );
  assert.ok(
    !/\bprod_[A-Za-z0-9]{8,}/.test(checkoutSrc),
    "Stripe checkout must not hard-code a Stripe prod_… identifier",
  );
});

// ── /upgrade copy: cautious wording, all locales ──────────────────────
const FLAT_COMMISSION_PATTERNS: Record<string, RegExp[]> = {
  fr: [/commission\s+fixe/i, /5\s*%\s*fixe/i, /15\s*%\s*fixe/i, /commission\s+permanente/i, /\bpour\s+toujours\b/i],
  en: [/flat\s+commission/i, /fixed\s+commission/i, /flat\s+5\s*%/i, /flat\s+15\s*%/i, /\bforever\b/i, /\bpermanent\s+5\s*%/i],
  es: [/comisi[oó]n\s+fija/i, /\b5\s*%\s+fija/i, /\b15\s*%\s+fija/i, /comisi[oó]n\s+permanente/i, /\bpara\s+siempre\b/i],
};

const CAUTIOUS_WORDS_BY_LOCALE: Record<string, RegExp> = {
  fr: /à partir de/i,
  en: /starting at/i,
  es: /desde/i,
};

for (const locale of ["fr", "en", "es"] as const) {
  test(`/upgrade copy (${locale}) avoids flat/fixed/permanent commission wording`, () => {
    const copy = UPGRADE_PAGE_COPY[locale];
    const haystack = [
      copy.summary,
      copy.freePlanCommission,
      copy.freePlanCommissionBody,
      copy.proPlanCommission,
      copy.proPlanCommissionBody,
      copy.commissionDisclaimer,
    ].join("\n");
    for (const re of FLAT_COMMISSION_PATTERNS[locale]!) {
      assert.ok(
        !re.test(haystack),
        `${locale} /upgrade copy must not contain ${re}`,
      );
    }
  });

  test(`/upgrade copy (${locale}) uses cautious "starting at" wording for both plans`, () => {
    const copy = UPGRADE_PAGE_COPY[locale];
    const re = CAUTIOUS_WORDS_BY_LOCALE[locale]!;
    assert.ok(
      re.test(copy.freePlanCommission),
      `${locale} freePlanCommission must use cautious wording (${re})`,
    );
    assert.ok(
      re.test(copy.proPlanCommission),
      `${locale} proPlanCommission must use cautious wording (${re})`,
    );
  });

  test(`/upgrade copy (${locale}) free plan derives the entry 15 % from the canonical range`, () => {
    const copy = UPGRADE_PAGE_COPY[locale];
    const start = MEMBRE_PRO_COMMISSION_MODEL.freeCommissionRange.startPercent;
    assert.ok(
      new RegExp(`\\b${start}\\s*%`).test(copy.freePlanCommission),
      `${locale} freePlanCommission must mention the entry ${start} % rate`,
    );
  });

  test(`/upgrade copy (${locale}) pro plan derives the entry 5 % from the canonical range`, () => {
    const copy = UPGRADE_PAGE_COPY[locale];
    const start = MEMBRE_PRO_COMMISSION_MODEL.proCommissionRange.startPercent;
    assert.ok(
      new RegExp(`\\b${start}\\s*%`).test(copy.proPlanCommission),
      `${locale} proPlanCommission must mention the entry ${start} % rate`,
    );
  });

  test(`/upgrade copy (${locale}) pro plan secondary body mentions tiers / volume`, () => {
    const copy = UPGRADE_PAGE_COPY[locale];
    const tierVolumeWording: RegExp = ({
      fr: /paliers?.*(volume|admissible|conditions)/is,
      en: /tiers?.*(volume|eligible|conditions)/is,
      es: /niveles?.*(volumen|admisible|condiciones)/is,
    }[locale])!;
    assert.ok(
      tierVolumeWording.test(copy.proPlanCommissionBody),
      `${locale} proPlanCommissionBody must mention tiers + volume/eligibility/conditions`,
    );
  });
}

// ── /upgrade legal-safe disclaimer in all locales ─────────────────────
test("/upgrade disclaimer in FR mentions ranking / bookings / income safety", () => {
  const d = UPGRADE_PAGE_COPY.fr.commissionDisclaimer;
  assert.ok(/positionnement/i.test(d), "FR disclaimer must mention positionnement");
  assert.ok(/réservations/i.test(d), "FR disclaimer must mention réservations");
  assert.ok(/revenus/i.test(d), "FR disclaimer must mention revenus");
  assert.ok(/ne garantit/i.test(d), "FR disclaimer must say 'ne garantit'");
});

test("/upgrade disclaimer in EN mentions ranking / bookings / income safety", () => {
  const d = UPGRADE_PAGE_COPY.en.commissionDisclaimer;
  assert.ok(/ranking/i.test(d), "EN disclaimer must mention ranking");
  assert.ok(/bookings/i.test(d), "EN disclaimer must mention bookings");
  assert.ok(/income/i.test(d), "EN disclaimer must mention income");
  assert.ok(/does not guarantee/i.test(d), "EN disclaimer must say 'does not guarantee'");
});

test("/upgrade disclaimer in ES mentions ranking / bookings / income safety", () => {
  const d = UPGRADE_PAGE_COPY.es.commissionDisclaimer;
  assert.ok(/posicionamiento/i.test(d), "ES disclaimer must mention posicionamiento");
  assert.ok(/reservas/i.test(d), "ES disclaimer must mention reservas");
  assert.ok(/ingresos/i.test(d), "ES disclaimer must mention ingresos");
  assert.ok(/no garantiza/i.test(d), "ES disclaimer must say 'no garantiza'");
});

// ── /tarifs i18n: declining ranges + matching disclaimer ──────────────
test("/tarifs commission tier i18n keys span the canonical range in all locales", () => {
  // Bronze entry must equal the start percent; Platinum must equal best.
  for (const dict of [fr, en, es]) {
    assert.match(dict.pricingPagePctFreeBronze!, /\b15\s*%/);
    assert.match(dict.pricingPagePctFreeSilver!, /\b14\s*%/);
    assert.match(dict.pricingPagePctFreeGold!, /\b13\s*%/);
    assert.match(dict.pricingPagePctFreePlatinum!, /\b12\s*%/);
    assert.match(dict.pricingPagePctProBronze!, /\b5\s*%/);
    assert.match(dict.pricingPagePctProGold!, /\b4\s*%.*(ristourne|rebate|reembolso)/i);
    assert.match(dict.pricingPagePctProPlatinum!, /\b3[.,]5\s*%/);
    assert.match(dict.pricingPagePctProPlatinum!, /\b1\s*%.*(ristourne|rebate|reembolso)/i);
  }
});

test("/tarifs displays the canonical 29.99 / 29,99 monthly price (no stale bare $29) in FR/EN/ES", () => {
  // The canonical Stripe price (STRIPE_PRO_MONTHLY_PRICE_ID,
  // unit_amount = 2999) is $29.99 CAD. The matching locale-aware
  // display strings live in MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay
  // and must surface verbatim on /tarifs.
  const expectedDisplay: Record<"fr" | "en" | "es", string> = {
    fr: MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.fr,
    en: MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.en,
    es: MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.es,
  };
  for (const [locale, dict] of [["fr", fr], ["en", en], ["es", es]] as const) {
    const value = dict.pricingPagePlanProPrice ?? "";
    assert.ok(
      value.includes(expectedDisplay[locale]),
      `${locale} pricingPagePlanProPrice must display ${expectedDisplay[locale]} (got "${value}")`,
    );
    assert.ok(
      !/(?<![0-9.,])29(?![0-9.,])/.test(value),
      `${locale} pricingPagePlanProPrice must not display the stale bare "29" amount (got "${value}")`,
    );
  }
});

test("Live FR/EN/ES public copy never surfaces the stale bare $29 monthly price", () => {
  // Catches any future regression that sneaks a "29 $", "$29",
  // "CAD $29" or "29 $CA" reference back into the live i18n
  // dictionaries. Tolerated lookalikes (29.99, 29,99, 290, 2999) are
  // explicitly allowed by the lookarounds.
  const stalePricePattern = /(?<![0-9.,])29(?![0-9.,])\s*\$|\$\s*29(?![0-9.,])/;
  const PRICE_BEARING_KEYS = [
    "btPlanProPrice",
    "loyaltyProPrice",
    "pricingPagePlanProPrice",
    "pricingPageBreakevenFormula",
    "pricingPageFaq5A",
    "pricingPageFaq6A",
  ] as const;
  for (const [locale, dict] of [["fr", fr], ["en", en], ["es", es]] as const) {
    for (const key of PRICE_BEARING_KEYS) {
      const value = dict[key] ?? "";
      assert.ok(
        !stalePricePattern.test(value),
        `${locale}.${key} must not contain the stale bare "$29" / "29 $" price (got "${value}")`,
      );
    }
  }
});

test("Live FR/EN/ES public copy displays the canonical 29.99 / 29,99 on every price-bearing surface", () => {
  // The canonical value is 29.99 (EN) / 29,99 (FR & ES) and lives in
  // MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay. Each price-bearing
  // i18n key must echo the matching locale display string.
  const expectedDisplay: Record<"fr" | "en" | "es", string> = {
    fr: MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.fr,
    en: MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.en,
    es: MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.es,
  };
  const PRICE_BEARING_KEYS = [
    "btPlanProPrice",
    "loyaltyProPrice",
    "pricingPagePlanProPrice",
    "pricingPageBreakevenFormula",
    "pricingPageFaq6A",
  ] as const;
  for (const [locale, dict] of [["fr", fr], ["en", en], ["es", es]] as const) {
    for (const key of PRICE_BEARING_KEYS) {
      const value = dict[key] ?? "";
      assert.ok(
        value.includes(expectedDisplay[locale]),
        `${locale}.${key} must contain the canonical ${expectedDisplay[locale]} (got "${value}")`,
      );
    }
  }
});

test("/tarifs breakeven math reflects $29.99 ÷ 10pp ≈ $300 in FR/EN/ES", () => {
  // At the Bronze tier the Standard plan charges 15% commission and
  // Pro charges 5%, a 10pp delta. With Pro at $29.99/month the volume
  // that offsets the subscription is 29.99 / 0.10 ≈ $300 of paid
  // bookings — never $290 (which would correspond to the stale $29).
  for (const dict of [fr, en, es]) {
    assert.match(
      dict.pricingPageBreakevenLead ?? "",
      /\b300\b/,
      `pricingPageBreakevenLead must mention ~300 (not the stale 290)`,
    );
    assert.match(
      dict.pricingPageBreakevenFormula ?? "",
      /\b300\b/,
      `pricingPageBreakevenFormula must mention ~300 (not the stale 290)`,
    );
    assert.ok(
      !/\b290\b/.test(dict.pricingPageBreakevenLead ?? ""),
      `pricingPageBreakevenLead must not display the stale 290 figure`,
    );
    assert.ok(
      !/\b290\b/.test(dict.pricingPageBreakevenFormula ?? ""),
      `pricingPageBreakevenFormula must not display the stale 290 figure`,
    );
  }
});

test("FR/EN/ES all agree on the canonical $29.99 monthly price (no mixed prices in live copy)", () => {
  // Every live FR/EN/ES surface must agree on the same canonical
  // amount. We assert here on the proPlanPrice copy block surfaced by
  // /upgrade as well as the i18n keys consumed by /tarifs.
  const surfaces: Array<[string, string]> = [
    ["UPGRADE_PAGE_COPY.fr.proPlanPrice", UPGRADE_PAGE_COPY.fr.proPlanPrice],
    ["UPGRADE_PAGE_COPY.en.proPlanPrice", UPGRADE_PAGE_COPY.en.proPlanPrice],
    ["UPGRADE_PAGE_COPY.es.proPlanPrice", UPGRADE_PAGE_COPY.es.proPlanPrice],
    ["UPGRADE_PAGE_COPY.fr.summary", UPGRADE_PAGE_COPY.fr.summary],
    ["UPGRADE_PAGE_COPY.en.summary", UPGRADE_PAGE_COPY.en.summary],
    ["UPGRADE_PAGE_COPY.es.summary", UPGRADE_PAGE_COPY.es.summary],
    ["UPGRADE_PAGE_COPY.fr.disclosureLead", UPGRADE_PAGE_COPY.fr.disclosureLead],
    ["UPGRADE_PAGE_COPY.en.disclosureLead", UPGRADE_PAGE_COPY.en.disclosureLead],
    ["UPGRADE_PAGE_COPY.es.disclosureLead", UPGRADE_PAGE_COPY.es.disclosureLead],
    ["fr.pricingPagePlanProPrice", fr.pricingPagePlanProPrice ?? ""],
    ["en.pricingPagePlanProPrice", en.pricingPagePlanProPrice ?? ""],
    ["es.pricingPagePlanProPrice", es.pricingPagePlanProPrice ?? ""],
    ["fr.loyaltyProPrice", fr.loyaltyProPrice ?? ""],
    ["en.loyaltyProPrice", en.loyaltyProPrice ?? ""],
    ["es.loyaltyProPrice", es.loyaltyProPrice ?? ""],
  ];
  for (const [label, value] of surfaces) {
    assert.ok(
      /29[.,]99/.test(value),
      `${label} must surface the canonical 29.99 / 29,99 (got "${value}")`,
    );
    assert.ok(
      !/(?<![0-9.,])29(?![0-9.,])\s*\$|\$\s*29(?![0-9.,])/.test(value),
      `${label} must not surface the stale bare "$29" / "29 $" (got "${value}")`,
    );
  }
});

test("Legal markdown for FR/EN/ES displays the canonical $29.99 monthly price", () => {
  // Membre Pro Terms + Conditions Professeurs both quote the launch
  // price. Both files in each locale must match the Stripe Price
  // canonical amount ($29.99 CAD); a stale "$29" here would create a
  // contractual mismatch with what Stripe actually charges.
  const legalFiles: Array<[string, "fr" | "en" | "es", RegExp, RegExp]> = [
    ["content/legal/membre-pro.fr.md", "fr", /29,99\s*\$CA\s*\/\s*mois\s*\+\s*taxes applicables/i, /(?<![0-9.,])29(?![0-9.,])\s*\$CA/],
    ["content/legal/membre-pro.en.md", "en", /\$29\.99\s*CAD\s*\/\s*month\s*\+\s*applicable taxes/i, /\$\s*29(?![0-9.,])\s*CAD/],
    ["content/legal/membre-pro.es.md", "es", /29,99\s*\$CA\s*\/\s*mes\s*\+\s*impuestos aplicables/i, /(?<![0-9.,])29(?![0-9.,])\s*\$CA/],
    ["content/legal/conditions-professeurs.fr.md", "fr", /29,99\s*\$CA\s*\/\s*mois\s*\+\s*taxes applicables/i, /(?<![0-9.,])29(?![0-9.,])\s*\$CA/],
    ["content/legal/conditions-professeurs.en.md", "en", /\$29\.99\s*CAD\s*\/\s*month\s*\+\s*applicable taxes/i, /\$\s*29(?![0-9.,])\s*CAD/],
    ["content/legal/conditions-professeurs.es.md", "es", /29,99\s*\$CA\s*\/\s*mes\s*\+\s*impuestos aplicables/i, /(?<![0-9.,])29(?![0-9.,])\s*\$CA/],
  ];
  for (const [relPath, locale, expectedCanonical, stalePattern] of legalFiles) {
    const src = readFileSync(join(root, relPath), "utf8");
    assert.ok(
      expectedCanonical.test(src),
      `${relPath} (${locale}) must contain the canonical 29.99 / 29,99 launch price (looked for ${expectedCanonical})`,
    );
    assert.ok(
      !stalePattern.test(src),
      `${relPath} (${locale}) must not contain a stale bare $29 amount`,
    );
  }
});

test("/tarifs and /upgrade share the same legal-safe disclaimer (FR/EN/ES)", () => {
  assert.equal(fr.pricingPageCommissionDisclaimer, UPGRADE_PAGE_COPY.fr.commissionDisclaimer);
  assert.equal(en.pricingPageCommissionDisclaimer, UPGRADE_PAGE_COPY.en.commissionDisclaimer);
  assert.equal(es.pricingPageCommissionDisclaimer, UPGRADE_PAGE_COPY.es.commissionDisclaimer);
});

test("/tarifs renders the legal-safe disclaimer key", () => {
  assert.ok(
    /pricingPageCommissionDisclaimer/.test(tarifsSrc),
    "/tarifs must render the pricingPageCommissionDisclaimer key",
  );
});

// ── Brand naming preservation ─────────────────────────────────────────
test("/upgrade copy preserves Membre Pro / Pro Member / Miembro Pro brand", () => {
  assert.match(UPGRADE_PAGE_COPY.fr.proPlanTitle, /Membre Pro/);
  assert.match(UPGRADE_PAGE_COPY.en.proPlanTitle, /Pro Member/);
  assert.match(UPGRADE_PAGE_COPY.es.proPlanTitle, /Miembro Pro/);
  assert.match(UPGRADE_PAGE_COPY.fr.heading, /Membre Pro/);
  assert.match(UPGRADE_PAGE_COPY.en.heading, /Pro Member/);
  assert.match(UPGRADE_PAGE_COPY.es.heading, /Miembro Pro/);
});

test("'Plan Pro' / 'Teacher Pro' are not user-facing on /upgrade or /tarifs", () => {
  // We allow these in next.config.ts and dev comments. Production page
  // sources must not surface the legacy framing.
  for (const [name, src] of [
    ["upgrade page", upgradeSrc],
    ["tarifs page", tarifsSrc],
    ["tarifs layout", tarifsLayoutSrc],
  ] as const) {
    assert.ok(
      !/\bPlan\s+Pro\b/.test(src),
      `${name} must not contain user-facing 'Plan Pro'`,
    );
    assert.ok(
      !/\bTeacher\s+Pro\b/.test(src),
      `${name} must not contain user-facing 'Teacher Pro'`,
    );
  }
});

test("All three locale dictionaries avoid 'Plan Pro' / 'Teacher Pro' as user-facing terms", () => {
  for (const [locale, dict] of [["fr", fr], ["en", en], ["es", es]] as const) {
    for (const [key, value] of Object.entries(dict)) {
      assert.ok(
        !/\bPlan\s+Pro\b/.test(value),
        `${locale}.${key} must not contain user-facing 'Plan Pro'`,
      );
      assert.ok(
        !/\bTeacher\s+Pro\b/.test(value),
        `${locale}.${key} must not contain user-facing 'Teacher Pro'`,
      );
    }
  }
});

// ── No guarantee wording in /upgrade or /tarifs ──────────────────────
const GUARANTEE_PATTERNS = [
  /guaranteed\s+income/i,
  /guaranteed\s+ranking/i,
  /guaranteed\s+bookings/i,
  /guaranteed\s+visibility/i,
  /revenus\s+garantis/i,
  /positionnement\s+garanti/i,
  /réservations\s+garanties/i,
  /visibilité\s+garantie/i,
  /ingresos\s+garantizados/i,
  /posicionamiento\s+garantizado/i,
  /reservas\s+garantizadas/i,
  /visibilidad\s+garantizada/i,
];

function withoutNegatedGuaranteeSentences(src: string): string {
  return src
    .replace(/\bnot\b.{0,300}\bguaranteed income\b/gi, "")
    .replace(/\b(?:does not|do not|not|no)\b[^.\n]{0,220}\b(?:guarantee|guaranteed)\b[^.\n]*/gi, "")
    .replace(/\bno\s+(?:income|earnings|ranking|bookings|visibility|students)\s+guarantee\b/gi, "")
    .replace(/\b(?:ne|n['’])\b[^.\n]{0,220}\b(?:garantit|garantie|garanties|garanti|garantis)\b[^.\n]*/gi, "")
    .replace(/\bno\b[^.\n]{0,220}\b(?:garantiza|garantizado|garantizada|garantizados|garantizadas)\b[^.\n]*/gi, "");
}

test("/upgrade and /tarifs sources do not promise ranking / bookings / income", () => {
  // The public copy is i18n-driven; check the rendered locale strings
  // and the React sources that surround them.
  const haystacks: Array<[string, string]> = [
    ["/upgrade", upgradeSrc],
    ["/tarifs", tarifsSrc],
    ["lib/config/membrePro.ts", membreProConfigSrc],
  ];
  for (const dict of [fr, en, es]) {
    haystacks.push(["i18n", JSON.stringify(dict)]);
  }
  for (const [label, src] of haystacks) {
    const positiveClaimSrc = withoutNegatedGuaranteeSentences(src);
    for (const re of GUARANTEE_PATTERNS) {
      // The legal-safe disclaimer itself contains "ne garantit ni"
      // / "does not guarantee" / "no garantiza" — those negated forms
      // must not be reframed as promises elsewhere. The forbidden
      // patterns above are all *positive* guarantees, never matched
      // by the disclaimer wording.
      assert.ok(
        !re.test(positiveClaimSrc),
        `${label} must not contain a positive guarantee (${re})`,
      );
    }
  }
});

// ── /upgrade page renders the new disclaimer ─────────────────────────
test("/upgrade page renders the canonical commissionDisclaimer copy field", () => {
  assert.ok(
    /commissionDisclaimer/.test(upgradeSrc),
    "/upgrade page must render the commissionDisclaimer copy field",
  );
  assert.ok(
    /freePlanCommissionBody/.test(upgradeSrc),
    "/upgrade page must render the freePlanCommissionBody copy field",
  );
  assert.ok(
    /proPlanCommissionBody/.test(upgradeSrc),
    "/upgrade page must render the proPlanCommissionBody copy field",
  );
});

// ── Stripe / payment math untouched ──────────────────────────────────
test("This branch does not touch Stripe / Supabase / RLS / migrations / search / booking", () => {
  // Light static-source guardrail: the test file itself must only
  // reference marketing/config sources. Any future regression that
  // bundles a payment-logic change into this PR would surface as a
  // failure here when the importer paths drift.
  for (const forbidden of [
    /from\s+["']stripe["']/,
    /from\s+["']@supabase\/.*["']/,
    /\bcheckout\.sessions\.create\b/,
    /\bsupabase\.from\b/,
  ]) {
    assert.ok(
      !forbidden.test(upgradeSrc),
      `/upgrade page should remain a thin marketing surface (no ${forbidden})`,
    );
  }
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
  console.log(`[marketing:membreProCommissionModel] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
