/**
 * V9 P0 — Consent and safety gates.
 *
 * Asserts that the three remaining P0 legal mechanics identified after
 * the V9 legal sync are now mechanically enforced (not just documented):
 *
 *   PART A — Membre Pro automatic-renewal consent UI
 *     • A dedicated renewal-acceptance checkbox exists on /upgrade.
 *     • The CTA button is disabled until BOTH the renewal checkbox and
 *       the legal-link acceptance checkbox are ticked.
 *     • The client POSTs `{ renewalAccepted: true }` to the Stripe
 *       Pro checkout route.
 *     • The server route rejects the request with HTTP 400 when the
 *       flag is explicitly false.
 *     • The 29,99 $CA / mois + taxes anchor remains intact in all
 *       three locales (FR / EN / ES).
 *     • No Stripe price IDs / product IDs were renamed or replaced.
 *
 *   PART B — YoPratiqo EU/international paid-checkout gating
 *     • There is NO active paid YoPratiqo checkout route under
 *       `app/api/yopratiqo/<segment>/checkout/` or
 *       `app/api/yo/<segment>/checkout/`.
 *     • The launch gate `YOPRATIQO_PAID_CHECKOUT_ENABLED` is `false`.
 *     • The V9 "international sales will be enabled progressively"
 *       copy is in place in FR / EN / ES.
 *     • No live YoPratiqo UI claims the EU withdrawal-right checkbox
 *       is implemented (the legal copy explicitly flags it as
 *       "pending implementation").
 *
 *   PART C — At-home lessons with minors safety disclosure
 *     • A bilingual "additional safety / verification requirements"
 *       disclosure exists in the FR/EN/ES dictionaries.
 *     • BookingModal renders the disclosure block when the at-home
 *       teaching mode is selected (via stable test id).
 *     • No public copy falsely claims criminal-background checks have
 *       been completed by Pratiqo on every teacher.
 *
 *   Restricted-systems guard
 *     The branch did NOT touch Stripe price/product IDs, payment math,
 *     tax logic, Supabase RLS, migrations, YoPratiqo audio binaries,
 *     OpenAI scripts, or sitemap/Course-schema files. A narrow allow-
 *     list lets the consent-gate file at
 *     `app/api/stripe/pro/checkout/route.ts` through, with a content
 *     check that confirms it only adds consent validation (not Stripe
 *     mechanics).
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  UPGRADE_PAGE_COPY,
  MEMBRE_PRO_PLAN,
} from "../../lib/config/membrePro";
import {
  YOPRATIQO_PAID_CHECKOUT_ENABLED,
  YOPRATIQO_INTERNATIONAL_NOTICE_COPY,
} from "../../lib/config/yopratiqoPaidGate";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();
const locales = ["fr", "en", "es"] as const;

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function readJson(relativePath: string): Record<string, string> {
  return JSON.parse(read(relativePath)) as Record<string, string>;
}

function changedFilesForBranch(): string[] | null {
  const files = new Set<string>();
  try {
    const mergeBase = execFileSync("git", ["merge-base", "HEAD", "origin/main"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    for (const args of [
      ["diff", "--name-only", mergeBase, "HEAD"],
      ["diff", "--name-only"],
      ["diff", "--cached", "--name-only"],
    ]) {
      execFileSync("git", args, { cwd: root, encoding: "utf8" })
        .split(/\r?\n/)
        .map((file) => file.trim())
        .filter(Boolean)
        .forEach((file) => files.add(file));
    }
    execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
      cwd: root,
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .forEach((line) => files.add(line.slice(3).trim()));
    return [...files].filter(Boolean).sort();
  } catch {
    console.warn("# skipped P0 branch boundary scan - could not diff against origin/main");
    return null;
  }
}

// ─── PART A — Membre Pro automatic-renewal consent UI ─────────────────

test("A1: UPGRADE_PAGE_COPY ships the V9 R02 renewal-acceptance label in FR/EN/ES", () => {
  const fr = UPGRADE_PAGE_COPY.fr.renewalAcceptanceLabel;
  const en = UPGRADE_PAGE_COPY.en.renewalAcceptanceLabel;
  const es = UPGRADE_PAGE_COPY.es.renewalAcceptanceLabel;

  // FR — must literally contain the V9 anchors.
  assert.match(fr, /Membre Pro/);
  assert.match(fr, /abonnement\s+mensuel/i);
  assert.match(fr, /renouvel[éeè]\s+automatiquement/i);
  assert.match(fr, /29,99\s*\$CA\s*\/\s*mois/);
  assert.match(fr, /taxes\s+applicables/i);
  assert.match(fr, /annul/i);

  // EN — must literally contain the V9 anchors.
  assert.match(en, /Pro Member/);
  assert.match(en, /monthly\s+subscription/i);
  assert.match(en, /renews\s+automatically/i);
  assert.match(en, /\$29\.99\s*CAD\s*\/\s*month/);
  assert.match(en, /applicable\s+taxes/i);
  assert.match(en, /cancel/i);

  // ES — must literally contain the V9 anchors.
  assert.match(es, /Miembro Pro/);
  assert.match(es, /suscripción\s+mensual/i);
  assert.match(es, /renueva\s+automáticamente/i);
  assert.match(es, /29,99\s*\$CA\s*\/\s*mes/);
  assert.match(es, /impuestos\s+aplicables/i);
  assert.match(es, /cancel/i);
});

test("A2: UPGRADE_PAGE_COPY ships locale-aware alerts when the renewal box is unticked", () => {
  for (const locale of locales) {
    const copy = UPGRADE_PAGE_COPY[locale];
    assert.equal(typeof copy.alertMustAcceptRenewal, "string");
    assert.ok(
      copy.alertMustAcceptRenewal.length >= 20,
      `${locale} alertMustAcceptRenewal must be substantive`,
    );
  }
});

test("A3: /upgrade renders a dedicated renewal-acceptance checkbox separate from the legal acceptance", () => {
  const src = read("app/(app)/upgrade/page.tsx");
  // Two distinct checkboxes, two distinct state hooks.
  assert.match(src, /useState\(\s*false\s*\)\s*[;\n]/);
  assert.match(src, /renewalAccepted/);
  assert.match(src, /setRenewalAccepted/);
  assert.match(src, /legalAccepted/);
  assert.match(src, /setLegalAccepted/);

  // The dedicated test-ids are now stable for E2E and regression.
  assert.match(src, /data-testid="upgrade-renewal-acceptance"/);
  assert.match(src, /data-testid="upgrade-renewal-checkbox"/);
  assert.match(src, /data-testid="upgrade-legal-acceptance"/);
  assert.match(src, /data-testid="upgrade-legal-checkbox"/);
  assert.match(src, /data-testid="upgrade-primary-cta"/);

  // The renewal label is sourced from the locale-aware copy bundle.
  assert.match(src, /copy\.renewalAcceptanceLabel/);
});

test("A4: /upgrade CTA is disabled until BOTH the renewal AND the legal checkboxes are ticked", () => {
  const src = read("app/(app)/upgrade/page.tsx");
  // The disabled expression must reference both state booleans.
  assert.match(
    src,
    /disabled=\{[^}]*!renewalAccepted[^}]*!legalAccepted[^}]*\}/,
    "primary CTA must be disabled until both consent flags are true",
  );
  // And the click handler must short-circuit early on the renewal box.
  assert.match(src, /if\s*\(\s*!renewalAccepted\s*\)/);
  assert.match(src, /alert\(\s*copy\.alertMustAcceptRenewal\s*\)/);
});

test("A5: /upgrade POSTs renewalAccepted in the JSON body to the Pro checkout route", () => {
  const src = read("app/(app)/upgrade/page.tsx");
  assert.match(src, /\/api\/stripe\/pro\/checkout/);
  assert.match(src, /Content-Type["']?\s*:\s*["']application\/json/i);
  assert.match(src, /JSON\.stringify\([^)]*renewalAccepted[^)]*\)/);
  assert.match(src, /renewalAccepted:\s*true/);
});

test("A6: Stripe Pro checkout route rejects requests with renewalAccepted=false", () => {
  const src = read("app/api/stripe/pro/checkout/route.ts");
  // Body must be parsed and the consent flag extracted.
  assert.match(src, /readConsentBody/);
  assert.match(src, /renewalAccepted/);

  // Explicit early-return on a literal false.
  assert.match(
    src,
    /renewalAccepted\s*===\s*false/,
    "route must explicitly reject `renewalAccepted: false`",
  );

  // The error response must surface a stable code.
  assert.match(src, /renewal_consent_required/);

  // The 400 status code is returned (never a silent 200/redirect).
  assert.match(src, /status:\s*400/);
});

test("A7: Stripe Pro checkout route still uses STRIPE_PRO_MONTHLY_PRICE_ID (no Stripe ID renames)", () => {
  const src = read("app/api/stripe/pro/checkout/route.ts");
  assert.match(src, /STRIPE_PRO_MONTHLY_PRICE_ID/);
  // We did NOT introduce any new hardcoded Stripe IDs (price_…, prod_…).
  assert.doesNotMatch(src, /\bprice_[A-Za-z0-9]{6,}\b/);
  assert.doesNotMatch(src, /\bprod_[A-Za-z0-9]{6,}\b/);
});

test("A8: 29,99 $CA / mois + taxes anchor stays intact in upgrade copy (FR/EN/ES)", () => {
  for (const locale of locales) {
    const copy = UPGRADE_PAGE_COPY[locale];
    const combined = [
      copy.summary,
      copy.proPlanPrice,
      copy.disclosureLead,
      copy.disclosureRenewTail,
      copy.renewalAcceptanceLabel,
    ].join("\n");
    assert.match(combined, /29(?:[.,]99)?/);
    assert.match(combined, /CAD|\$CA|CA\$/i);
    assert.match(combined, /tax|taxes|impuestos/i);
    assert.match(combined, /monthly|mensuellement|mensual|month|mois|mes/i);
  }
  // The numeric source-of-truth in MEMBRE_PRO_PLAN was not silently flipped.
  assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCad, 29.99);
});

// ─── PART B — YoPratiqo EU / international paid-checkout gating ───────

test("B1: YOPRATIQO_PAID_CHECKOUT_ENABLED is false at launch", () => {
  assert.equal(
    YOPRATIQO_PAID_CHECKOUT_ENABLED,
    false,
    "Flipping this flag without lawyer sign-off + a real EU withdrawal checkbox would create false-claim risk.",
  );
});

test("B2: V9 international-notice copy exists in FR/EN/ES with the mandated wording", () => {
  for (const locale of locales) {
    const text = YOPRATIQO_INTERNATIONAL_NOTICE_COPY[locale];
    assert.equal(typeof text, "string");
    assert.ok(text.length > 60, `${locale} notice must be substantive`);
  }

  assert.match(
    YOPRATIQO_INTERNATIONAL_NOTICE_COPY.fr,
    /ventes\s+internationales[^\n]{0,80}YoPratiqo[^\n]{0,80}activées\s+progressivement/i,
  );
  assert.match(
    YOPRATIQO_INTERNATIONAL_NOTICE_COPY.fr,
    /droit\s+de\s+rétractation/i,
  );
  assert.match(
    YOPRATIQO_INTERNATIONAL_NOTICE_COPY.en,
    /international\s+sales[^\n]{0,80}YoPratiqo[^\n]{0,80}enabled\s+progressively/i,
  );
  assert.match(
    YOPRATIQO_INTERNATIONAL_NOTICE_COPY.en,
    /withdrawal[- ]right/i,
  );
  assert.match(
    YOPRATIQO_INTERNATIONAL_NOTICE_COPY.es,
    /ventas\s+internacionales[^\n]{0,80}YoPratiqo[^\n]{0,80}progresivamente/i,
  );
  assert.match(
    YOPRATIQO_INTERNATIONAL_NOTICE_COPY.es,
    /derecho\s+de\s+desistimiento/i,
  );
});

test("B3: No active paid YoPratiqo checkout route exists under app/api/", () => {
  const apiDir = join(root, "app", "api");
  if (!existsSync(apiDir)) return;

  const candidates: string[] = [];
  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      const rel = abs.slice(root.length + 1).replace(/\\/g, "/");
      if (statSync(abs).isDirectory()) {
        walk(abs);
        continue;
      }
      // Any route file whose path mentions yo/yopratiqo + checkout.
      const lower = rel.toLowerCase();
      if (
        (lower.includes("/yo/") || lower.includes("/yopratiqo/")) &&
        lower.includes("checkout")
      ) {
        candidates.push(rel);
      }
    }
  }
  walk(apiDir);
  assert.deepEqual(
    candidates,
    [],
    `No paid YoPratiqo checkout route may exist until lawyer sign-off; found: ${candidates.join(", ")}`,
  );
});

test("B4: YoPratiqo legal copy still flags the EU checkout checkbox as not yet implemented", () => {
  for (const locale of locales) {
    const src = read(`content/legal/yo-refund.${locale}.md`);
    assert.match(
      src,
      /pending|remains\s+to\s+be\s+implemented|à\s+implémenter|reste\s+à\s+implémenter|pendiente|queda\s+pendiente/i,
      `${locale} yo-refund must keep the "implementation pending" wording`,
    );
  }
});

// ─── PART C — At-home lessons with minors safety disclosure ───────────

test("C1: Minor safety disclosure i18n keys exist in FR/EN/ES with the V9 wording", () => {
  const fr = readJson("lib/i18n/locales/fr.json");
  const en = readJson("lib/i18n/locales/en.json");
  const es = readJson("lib/i18n/locales/es.json");

  for (const dict of [fr, en, es]) {
    assert.equal(typeof dict.bookingHomeMinorSafetyTitle, "string");
    assert.equal(typeof dict.bookingHomeMinorSafetyBody, "string");
  }

  // FR cautious wording — must use "peuvent" / "peuvent être" framing,
  // never claim a check has been completed.
  assert.match(fr.bookingHomeMinorSafetyBody, /mineurs/i);
  assert.match(
    fr.bookingHomeMinorSafetyBody,
    /exigences\s+supplémentaires\s+de\s+sécurité\s+ou\s+de\s+vérification/i,
  );
  assert.match(
    fr.bookingHomeMinorSafetyBody,
    /peuvent\s+s['’]appliquer/i,
  );

  // EN cautious wording.
  assert.match(en.bookingHomeMinorSafetyBody, /minors/i);
  assert.match(
    en.bookingHomeMinorSafetyBody,
    /additional\s+safety\s+or\s+verification\s+requirements/i,
  );
  assert.match(
    en.bookingHomeMinorSafetyBody,
    /may\s+apply|may\s+be\s+limited/i,
  );

  // ES cautious wording.
  assert.match(es.bookingHomeMinorSafetyBody, /menores/i);
  assert.match(
    es.bookingHomeMinorSafetyBody,
    /requisitos\s+adicionales\s+de\s+seguridad\s+o\s+(?:de\s+)?verificación/i,
  );
  assert.match(
    es.bookingHomeMinorSafetyBody,
    /pueden\s+aplicarse|pueden\s+limitarse/i,
  );
});

test("C2: BookingModal renders the minor safety disclosure block when at-home is selected", () => {
  const src = read("components/BookingModal.tsx");
  // The block lives inside the `teachingMode === "domicile"` branch.
  assert.match(src, /teachingMode\s*===\s*["']domicile["']/);
  assert.match(src, /data-testid="booking-home-minor-safety-disclosure"/);
  assert.match(src, /t\(\s*["']bookingHomeMinorSafetyTitle["']\s*\)/);
  assert.match(src, /t\(\s*["']bookingHomeMinorSafetyBody["']\s*\)/);
});

test("C3: Public dictionaries make no false claim that criminal-background checks are completed", () => {
  const surfaces = [
    "lib/i18n/locales/fr.json",
    "lib/i18n/locales/en.json",
    "lib/i18n/locales/es.json",
  ];
  // Forbidden affirmative claims that a criminal/judicial background
  // check has been COMPLETED on every teacher (Pratiqo does not run
  // them today). Wording about the *professional training* background
  // (`Formation vérifiée` / `trayectoria profesional`) is intentionally
  // out of scope — that is a different verification (diploma + bio).
  const banned: Array<{ re: RegExp; reason: string }> = [
    {
      re: /\bcriminal\s+background\s+check[s]?\s+(?:are|have been|completed|verified)\b/i,
      reason: "EN: criminal background checks completed",
    },
    {
      re: /\bvérification\s+de(?:s)?\s+antécédents\s+(?:judiciaires|criminels)[^\n]{0,80}(?:effectuée|complétée|terminée|réalisée)/i,
      reason: "FR: judicial/criminal background checks completed",
    },
    {
      re: /\bverificación\s+de\s+antecedentes\s+(?:penales|judiciales)[^\n]{0,80}(?:completada|realizada|terminada)/i,
      reason: "ES: criminal/judicial background checks completed",
    },
    {
      re: /\bcasier\s+judiciaire\s+(?:vérifié|contrôlé)\s+(?:de chaque|de tous les)/i,
      reason: "FR: criminal record verified for every teacher",
    },
  ];

  for (const file of surfaces) {
    const src = read(file);
    for (const { re, reason } of banned) {
      assert.doesNotMatch(src, re, `${file}: ${reason}`);
    }
  }
});

// ─── Restricted-systems scope guard ───────────────────────────────────

test("D1: P0 branch did not touch Stripe IDs / payment math / tax / RLS / migrations / audio / SEO", () => {
  const changed = changedFilesForBranch();
  if (!changed) return;

  const restrictedRules: Array<{ label: string; re: RegExp }> = [
    { label: "checkout routes (other than Pro consent gate)", re: /^app\/api\/.*checkout/i },
    { label: "Stripe webhooks", re: /^app\/api\/.*webhook/i },
    { label: "payment/refund/payout routes", re: /^app\/api\/(payments|payouts|refunds)\// },
    { label: "payment math / pricing internals", re: /^lib\/(payments|pricing|commissions|tax)\// },
    { label: "Supabase migrations", re: /^supabase\/migrations\// },
    { label: "RLS / security helpers", re: /^lib\/(rls|security)\// },
    { label: "cron jobs", re: /^app\/api\/cron\/|^\.github\/workflows\/.*cron/i },
    { label: "YoPratiqo lesson surfaces", re: /^app\/yo\// },
    { label: "YoPratiqo lesson library", re: /^lib\/yo\// },
    { label: "generated audio binaries", re: /\.(?:mp3|wav|m4a)$/i },
    { label: "OpenAI / audio-gen scripts", re: /^scripts\/.*(?:openai|generate-yopratiqo-audio)/i },
    { label: "sitemap / Course schema / SEO", re: /^app\/sitemap\.ts$|^app\/robots\.ts$|^lib\/seo\// },
  ];

  // Narrow allow-list for legitimate consent-gate edits. Each entry
  // here is justified inline because future PRs touching these paths
  // must defend the same narrow boundary.
  const allowedConsentGateFiles = new Set<string>([
    // V9 R02 — Membre Pro renewal consent gate. Server route gains
    // an early-rejection branch for `renewalAccepted: false`.
    // Stripe IDs / subscription mechanics stay untouched (asserted in
    // test "A7: Stripe Pro checkout route still uses
    // STRIPE_PRO_MONTHLY_PRICE_ID (no Stripe ID renames)").
    "app/api/stripe/pro/checkout/route.ts",
  ]);

  const violations: string[] = [];
  for (const file of changed) {
    if (allowedConsentGateFiles.has(file)) continue;
    for (const rule of restrictedRules) {
      if (rule.re.test(file)) {
        violations.push(`${file} (${rule.label})`);
      }
    }
  }
  assert.deepEqual(violations, []);
});

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
  console.log(`[legal:p0-consent-and-safety-gates] ${tests.length} tests passed`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
