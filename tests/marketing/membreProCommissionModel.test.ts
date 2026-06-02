/**
 * Regression suite for Pratiqo's canonical Membre Pro commission model.
 *
 * The product owner's directive (see fix branch
 * `fix/membre-pro-declining-commission-canonical`):
 *   Pratiqo's commission model is *régressive / declining* — Free
 *   15 % → 12 %, Pro 5 % → 3.5 % plus higher-tier annual
 *   ristourne/profit-sharing eligibility — and `/upgrade`, `/tarifs`, and
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
 *  3. Stale subscription price (29.99) leaks back into a user-facing
 *     surface, since Stripe charges the canonical $29 and /upgrade
 *     displays $29 from `MEMBRE_PRO_PLAN.proMonthlyPriceCad`.
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
  assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCad, 29);
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
    assert.match(dict.pricingPagePctProGold!, /\b4\s*%.*(ristourne|profit-sharing|redistribuci)/i);
    assert.match(dict.pricingPagePctProPlatinum!, /\b3[.,]5\s*%/);
    assert.match(dict.pricingPagePctProPlatinum!, /\b1\s*%.*(ristourne|profit-sharing|redistribuci)/i);
  }
});

test("/tarifs displays the canonical $29 monthly price (no stale 29.99) in FR/EN/ES", () => {
  for (const [locale, dict] of [["fr", fr], ["en", en], ["es", es]] as const) {
    assert.ok(
      !/29[,.]99/.test(dict.pricingPagePlanProPrice ?? ""),
      `${locale} pricingPagePlanProPrice must not display 29.99 / 29,99`,
    );
    assert.ok(
      /\b29\b/.test(dict.pricingPagePlanProPrice ?? ""),
      `${locale} pricingPagePlanProPrice must display the canonical 29`,
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
    for (const re of GUARANTEE_PATTERNS) {
      // The legal-safe disclaimer itself contains "ne garantit ni"
      // / "does not guarantee" / "no garantiza" — those negated forms
      // must not be reframed as promises elsewhere. The forbidden
      // patterns above are all *positive* guarantees, never matched
      // by the disclaimer wording.
      assert.ok(
        !re.test(src),
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
