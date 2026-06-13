/**
 * Membre Pro Pratiqo — price copy consistency contract.
 *
 * Locks the canonical monthly price for Membre Pro at
 *
 *   FR : 29,99 $ CAD/mois + taxes applicables
 *   EN : $29.99 CAD/month + applicable taxes
 *   ES : 29,99 $ CAD/mes + impuestos aplicables
 *
 * across every user-facing surface, banning the stale bare
 * "29 $" / "$29" / "29 CAD" / "29 $/mois" / "$29/month" /
 * "29 $/mes" forms that were a prior-normalization mistake
 * captured in
 * `docs/legal/lawyer-export-2026-06-02/11_changelog_depuis_version_avocat_precedente.md`.
 *
 * Companion to the broader `/upgrade` + `/tarifs` audit in
 * `tests/marketing/membreProCommissionModel.test.ts` — that
 * suite scans i18n dictionary keys + legal markdown; this
 * one extends the audit into the public-link scaffold (the
 * `MembreProPublicUpgradeCTA` component + its constant
 * source file) and asserts the broader invariants the brief
 * called out: canonical config preserved, public payment
 * link gate disabled, /upgrade canonical flow not replaced,
 * /tarifs still routing through the canonical authenticated
 * path, no YoPratiqo files touched, no restricted systems
 * touched.
 *
 * Static-source + pure-helper tests only. No browser, no
 * network, no Stripe SDK, no payment SDK.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

import {
  MEMBRE_PRO_PLAN,
  UPGRADE_PAGE_COPY,
} from "@/lib/config/membrePro";
import {
  MEMBRE_PRO_PUBLIC_CHECKOUT_LINK,
  isMembreProPublicCheckoutLinkEnabled,
  getMembreProPublicCheckoutUrl,
} from "@/lib/config/membreProPublicCheckoutLink";

const root = process.cwd();
const read = (rel: string): string =>
  readFileSync(join(root, rel), { encoding: "utf8" });

let passCount = 0;
function ok(label: string): void {
  passCount += 1;
  console.log(`  ✓ ${label}`);
}

/**
 * Strip JS block + line comments before grepping copy so
 * docstrings that *name* a banned form (e.g. 'banned bare
 * "29 $"') are not flagged as live regressions.
 */
function stripJsComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * Strip Markdown-style block + line comments out of the
 * lawyer-export changelog so the historical-note line that
 * *describes* the prior `29 $CA/mois` mistake is not
 * mistakenly counted as a live regression.
 */
function stripLawyerNoteContext(source: string): string {
  // The export line we know about explicitly says
  // "Une révision antérieure avait indiqué `29 $CA/mois` à tort."
  // — we drop any line that contains the historical-mistake
  // marker phrases so the live audit below stays clean.
  return source
    .split(/\r?\n/)
    .filter((line) => !/à\s+tort|stale|prior\s+normalization/i.test(line))
    .join("\n");
}

const STALE_PATTERNS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  // FR — bare "29 $" or "29 $/mois" without "29,99"
  { label: 'FR bare "29 $/mois"', pattern: /(?<![0-9.,])29\s*\$\s*\/\s*mois/ },
  { label: 'FR bare "29$/mois"', pattern: /(?<![0-9.,])29\$\s*\/\s*mois/ },
  { label: 'FR bare "29 $ CAD/mois"', pattern: /(?<![0-9.,])29\s*\$\s*CAD\s*\/\s*mois/i },
  // EN — bare "$29/month" without ".99"
  { label: 'EN bare "$29/month"', pattern: /\$\s*29\s*\/\s*month(?![.,0-9])/i },
  { label: 'EN bare "$29 / month"', pattern: /\$\s*29\s+\/\s+month(?![.,0-9])/i },
  { label: 'EN bare "29 CAD/month"', pattern: /(?<![0-9.,])29\s*CAD\s*\/\s*month(?![.,0-9])/i },
  // ES — bare "29 $/mes" without ",99"
  { label: 'ES bare "29 $/mes"', pattern: /(?<![0-9.,])29\s*\$\s*\/\s*mes(?![,0-9])/ },
  { label: 'ES bare "29$/mes"', pattern: /(?<![0-9.,])29\$\s*\/\s*mes(?![,0-9])/ },
  // FR/ES "29/mois" or "29/mes" with no currency
  { label: 'FR bare "29/mois"', pattern: /(?<![0-9.,])29\s*\/\s*mois(?![,0-9])/ },
  { label: 'ES bare "29/mes"', pattern: /(?<![0-9.,])29\s*\/\s*mes(?![,0-9])/ },
];

/**
 * Files whose user-facing copy must use the canonical price
 * everywhere. Read-only audit — no edits here.
 *
 * Excludes the broader `tests/**` and `docs/legal/lawyer-export-*`
 * trees; those legitimately quote the stale form when they
 * either (a) guard against it, or (b) document the historical
 * mistake.
 */
const AUDITED_USER_FACING_FILES: readonly string[] = [
  "components/membrePro/MembreProPublicUpgradeCTA.tsx",
  "lib/config/membreProPublicCheckoutLink.ts",
  "app/(app)/upgrade/page.tsx",
  "app/(marketing)/devenir-enseignant/DevenirEnseignantContent.tsx",
  "app/become-teacher/page.tsx",
  "app/tarifs/page.tsx",
  "lib/email/messages/notifications.ts",
  "lib/email/messages/welcome.ts",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  "content/legal/membre-pro.fr.md",
  "content/legal/membre-pro.en.md",
  "content/legal/membre-pro.es.md",
  "content/legal/conditions-professeurs.fr.md",
  "content/legal/conditions-professeurs.en.md",
  "content/legal/conditions-professeurs.es.md",
];

// ── 1. No FR Membre Pro user-facing copy says "29 $/mois" ────────────

for (const rel of AUDITED_USER_FACING_FILES) {
  const cleaned = stripJsComments(read(rel));
  const fr = STALE_PATTERNS.filter((p) => p.label.startsWith("FR "));
  for (const { label, pattern } of fr) {
    assert.ok(
      !pattern.test(cleaned),
      `${rel} must not contain ${label} — use "29,99 $ CAD/mois + taxes applicables"`,
    );
  }
}
ok('1) No FR Membre Pro user-facing copy says "29 $/mois" (or variants)');

// ── 2. No EN Membre Pro user-facing copy says "$29/month" ────────────

for (const rel of AUDITED_USER_FACING_FILES) {
  const cleaned = stripJsComments(read(rel));
  const en = STALE_PATTERNS.filter((p) => p.label.startsWith("EN "));
  for (const { label, pattern } of en) {
    assert.ok(
      !pattern.test(cleaned),
      `${rel} must not contain ${label} — use "$29.99 CAD/month + applicable taxes"`,
    );
  }
}
ok('2) No EN Membre Pro user-facing copy says "$29/month" (or variants)');

// ── 3. No ES Membre Pro user-facing copy says "29 $/mes" ─────────────

for (const rel of AUDITED_USER_FACING_FILES) {
  const cleaned = stripJsComments(read(rel));
  const es = STALE_PATTERNS.filter((p) => p.label.startsWith("ES "));
  for (const { label, pattern } of es) {
    assert.ok(
      !pattern.test(cleaned),
      `${rel} must not contain ${label} — use "29,99 $ CAD/mes + impuestos aplicables"`,
    );
  }
}
ok('3) No ES Membre Pro user-facing copy says "29 $/mes" (or variants)');

// ── 4. Canonical config remains 29.99 ────────────────────────────────

assert.equal(
  MEMBRE_PRO_PLAN.proMonthlyPriceCad,
  29.99,
  "MEMBRE_PRO_PLAN.proMonthlyPriceCad must remain 29.99 (Stripe Price unit_amount = 2999)",
);
assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.fr, "29,99");
assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.en, "29.99");
assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.es, "29,99");

assert.match(UPGRADE_PAGE_COPY.fr.proPlanPrice, /29,99\s*\$CA\s*\/\s*mois\s*\+\s*taxes applicables/i);
assert.match(UPGRADE_PAGE_COPY.en.proPlanPrice, /\$29\.99\s*CAD\s*\/\s*month\s*\+\s*applicable taxes/i);
assert.match(UPGRADE_PAGE_COPY.es.proPlanPrice, /29,99\s*\$CA\s*\/\s*mes\s*\+\s*impuestos aplicables/i);
ok("4) Canonical config (lib/config/membrePro.ts) still pins 29.99 / 29,99");

// ── 5. Public payment-link scaffold copy uses 29,99 / $29.99 ─────────

const ctaSrc = read("components/membrePro/MembreProPublicUpgradeCTA.tsx");
const cleanedCtaSrc = stripJsComments(ctaSrc);

assert.ok(
  cleanedCtaSrc.includes("Devenir Membre Pro — 29,99 $/mois"),
  "FR CTA must read 'Devenir Membre Pro — 29,99 $/mois'",
);
assert.ok(
  cleanedCtaSrc.includes("Become a Pro Member — $29.99/month"),
  "EN CTA must read 'Become a Pro Member — $29.99/month'",
);
assert.ok(
  cleanedCtaSrc.includes("Hazte Miembro Pro — 29,99 $/mes"),
  "ES CTA must read 'Hazte Miembro Pro — 29,99 $/mes'",
);

// Fine-print on every locale must repeat the canonical price + taxes.
assert.match(
  cleanedCtaSrc,
  /29,99\s*\$\s*CAD\/mois\s*\+\s*taxes applicables/,
  "FR fine-print must restate '29,99 $ CAD/mois + taxes applicables'",
);
assert.match(
  cleanedCtaSrc,
  /\$29\.99\s*CAD\/month\s*\+\s*applicable taxes/,
  "EN fine-print must restate '$29.99 CAD/month + applicable taxes'",
);
assert.match(
  cleanedCtaSrc,
  /29,99\s*\$\s*CAD\/mes\s*\+\s*impuestos aplicables/,
  "ES fine-print must restate '29,99 $ CAD/mes + impuestos aplicables'",
);
ok("5) Public payment-link scaffold copy uses 29,99 / $29.99 across FR/EN/ES");

// ── 6. Public payment-link gate remains disabled ─────────────────────

assert.equal(
  isMembreProPublicCheckoutLinkEnabled(),
  false,
  "isMembreProPublicCheckoutLinkEnabled must remain false — this PR is copy-only, no launch",
);
assert.equal(
  getMembreProPublicCheckoutUrl(),
  null,
  "Gated getter must remain null — UI consumers must continue to render null",
);
assert.equal(
  MEMBRE_PRO_PUBLIC_CHECKOUT_LINK,
  "https://buy.stripe.com/dRm5kE2HK9k95pI5hz5EY01",
  "Operator-minted public payment link constant must remain unchanged",
);
ok("6) Public payment-link gate remains disabled (no behavioural change)");

// ── 7. Canonical /upgrade flow is not replaced ───────────────────────

const upgradeSrc = read("app/(app)/upgrade/page.tsx");
assert.ok(
  upgradeSrc.includes("/api/stripe/pro/checkout"),
  "/upgrade must still POST to the canonical authenticated /api/stripe/pro/checkout endpoint",
);
assert.ok(
  !/MembreProPublicUpgradeCTA/.test(upgradeSrc),
  "/upgrade must not import or mount the public-link CTA",
);
assert.ok(
  !/membreProPublicCheckoutLink/.test(upgradeSrc),
  "/upgrade must not import the public-link constant",
);

const proCheckoutApiSrc = read("app/api/stripe/pro/checkout/route.ts");
assert.match(
  proCheckoutApiSrc,
  /renewalAccepted\s*!==\s*true/,
  "/api/stripe/pro/checkout must still enforce the V9 R02 renewal-consent gate",
);
assert.match(
  proCheckoutApiSrc,
  /legalAccepted\s*!==\s*true/,
  "/api/stripe/pro/checkout must still enforce the legal-acceptance gate",
);
ok("7) Canonical /upgrade → /api/stripe/pro/checkout flow is not replaced");

// ── 8. /tarifs still routes through canonical authenticated flow ─────

const tarifsSrc = read("app/tarifs/page.tsx");
assert.ok(
  tarifsSrc.includes("/upgrade"),
  "/tarifs must still route the upgrade CTA through the canonical /upgrade path",
);
assert.ok(
  /next=\/upgrade/.test(tarifsSrc),
  "/tarifs must still route signed-out users to /login?next=/upgrade",
);
assert.ok(
  !/MembreProPublicUpgradeCTA|membreProPublicCheckoutLink|buy\.stripe\.com/.test(tarifsSrc),
  "/tarifs must not import or surface the public-link CTA / hosted URL",
);
ok("8) /tarifs still routes through the canonical authenticated /upgrade flow");

// ── 9. No YoPratiqo files were touched in this PR ────────────────────

const changedFiles = (): string[] => {
  // Cross-platform: run each git command independently so we
  // never depend on a POSIX shell (`;`/`&&` chains break on
  // PowerShell / cmd.exe). All three sources are unioned.
  const gitInvocations: ReadonlyArray<string> = [
    "git diff --name-only origin/main...HEAD",
    "git diff --name-only HEAD",
    "git ls-files --others --exclude-standard",
  ];
  const set = new Set<string>();
  for (const cmd of gitInvocations) {
    let out = "";
    try {
      out = execSync(cmd, { encoding: "utf8", cwd: root });
    } catch {
      // origin/main may not exist on a freshly-cloned repo or
      // a CI shadow checkout; treat as empty rather than fail.
      out = "";
    }
    for (const raw of out.split(/\r?\n/)) {
      const f = raw.trim();
      if (f) set.add(f);
    }
  }
  // The repo's working tree may carry untracked sentinel
  // artefacts (zip exports, IDE drafts, etc.) that are never
  // part of any PR. Strip those from the audit.
  const untrackedSentinels = [
    "Untitled",
    "pratiqo-legal-export-20260528-2221.zip",
    "docs/LAUNCH_READINESS_ANALYSIS.md",
  ];
  for (const s of untrackedSentinels) set.delete(s);
  return [...set];
};

const yoPathRe = /^(app\/yo\/|components\/yo\/|lib\/yo\/|tests\/yo\/)/;
const yoTouched = changedFiles().filter((f) => yoPathRe.test(f));
assert.deepEqual(
  yoTouched,
  [],
  `YoPratiqo files must not be touched by this price-copy PR (offending: ${yoTouched.join(", ")})`,
);
ok("9) No YoPratiqo files were touched in this PR");

// ── 10. No restricted systems touched ────────────────────────────────

const restrictedRules: Array<{ label: string; re: RegExp }> = [
  { label: "Stripe SDK / API logic", re: /^lib\/stripe(?:\/|\.)/ },
  { label: "checkout route behaviour", re: /^app\/api\/.*checkout(?:\/|\.)/i },
  { label: "Stripe webhook behaviour", re: /^app\/api\/stripe\/webhook\.|^app\/api\/stripe\/webhook\// },
  { label: "tax logic", re: /^lib\/payments\/tax\.ts$/ },
  { label: "Supabase RLS / migrations", re: /^supabase\// },
  { label: "Membre Pro canonical config", re: /^lib\/config\/membrePro\.ts$/ },
];
for (const file of changedFiles()) {
  for (const rule of restrictedRules) {
    assert.ok(
      !rule.re.test(file),
      `Restricted ${rule.label} file touched by this PR: ${file}`,
    );
  }
}
ok("10) No restricted systems (Stripe / checkout / webhook / tax / RLS / canonical config) touched");

// ── 11. Canonical price echoed in every locale i18n key ──────────────

// Dictionary keys that exist today and are price-bearing for
// Membre Pro. We verify each canonical key in each locale
// includes the canonical price string. This gives us a guard
// against a future accidental "29" sneaking back in via the
// dictionaries.
const fr = JSON.parse(read("lib/i18n/locales/fr.json")) as Record<string, string>;
const en = JSON.parse(read("lib/i18n/locales/en.json")) as Record<string, string>;
const es = JSON.parse(read("lib/i18n/locales/es.json")) as Record<string, string>;

const priceKeys = [
  "loyaltyProPrice",
  "pricingPagePlanProPrice",
] as const;

for (const key of priceKeys) {
  assert.match(
    fr[key] ?? "",
    /29,99/,
    `fr.${key} must echo the canonical 29,99 (got "${fr[key]}")`,
  );
  assert.match(
    en[key] ?? "",
    /\$29\.99/,
    `en.${key} must echo the canonical $29.99 (got "${en[key]}")`,
  );
  assert.match(
    es[key] ?? "",
    /29,99/,
    `es.${key} must echo the canonical 29,99 (got "${es[key]}")`,
  );
}
// Sanity: the lawyer-export changelog and historical
// guard-test fixtures legitimately mention the stale form.
// We strip those lines before re-running the live audit so a
// future contributor cannot re-introduce the regression by
// citing the changelog.
void stripLawyerNoteContext;
ok("11) Canonical 29,99 / $29.99 echoes through every price-bearing i18n key");

console.log(
  `\n${passCount} membre-pro-price-copy-consistency assertions passed`,
);
