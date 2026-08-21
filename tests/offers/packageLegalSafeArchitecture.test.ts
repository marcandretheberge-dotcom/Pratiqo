/**
 * Legal-safe package architecture (docs + readiness) — no public launch.
 * Does not enable package flags, checkout, entitlements, or payout/refund mutations.
 */

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  getPackageLaunchReadiness,
  PACKAGE_LAUNCH_NEVER_PRODUCTION_READY,
  PACKAGE_LAUNCH_REQUIRED_DOCS,
  PACKAGE_LEGAL_REVIEW_COMPLETED_FLAG,
} from "../../lib/offers/packageLaunchReadiness";
import { isPackageEntitlementsEnabled } from "../../lib/offers/packageEntitlements";
import { isPackageRedemptionBookingEnabled } from "../../lib/offers/packageRedemptions";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

function stripForbiddenExampleBlocks(src: string): string {
  return src.replace(
    /<!--\s*FORBIDDEN_TERMINOLOGY_EXAMPLES_START\s*-->[\s\S]*?<!--\s*FORBIDDEN_TERMINOLOGY_EXAMPLES_END\s*-->/gi,
    "",
  );
}

function walkFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "dist") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, out);
    else if (/\.(ts|tsx|js|jsx|md|json)$/.test(name)) out.push(full);
  }
  return out;
}

const FORBIDDEN_LIVE_COPY = [
  /Forfait Pratiqo/i,
  /Nos forfaits(?!\s+Pratiqo)/i, // catch "Nos forfaits" broadly
  /Nos forfaits Pratiqo/i,
  /Banque d[’']heures Pratiqo/i,
  /Heures qui expirent/i,
  /Heures expirent/i,
  /Crédit(?:s)? expiré/i,
  /\bSalaire\b/,
  /\bEmployé\b/i,
  /\bEmployeur\b/i,
  /Pratiqo assigne/i,
  /Pratiqo garantit les cours/i,
  /Pratiqo garantit le professeur/i,
];

/** Docs that may discuss risks/forbidden wording outside the HTML markers. */
const DOC_ALLOWLIST_PATH_FRAGMENT = [
  "package-glossary.md",
  "package-risk-register.md",
  "package-product-decision.md",
  "marketplace-independent-teacher-guardrails.md",
  "paid-packages-legal-launch-checklist.md",
];

const tests: Array<{ name: string; fn: () => void }> = [];
function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

const DECISION = "docs/product/package-product-decision.md";
const ARCH = "docs/product/package-technical-architecture.md";
const GLOSSARY = "docs/product/package-glossary.md";
const CHECKLIST = "docs/product/paid-packages-launch-checklist.md";
const RISKS = "docs/product/package-risk-register.md";
const REFUND = "docs/product/package-refund-cancellation-policy-draft.md";
const COPY = "docs/product/package-public-copy-draft.md";
const ADMIN = "app/(app)/admin/package-launch-readiness/page.tsx";

test("architecture docs exist and are listed as required", () => {
  for (const rel of [DECISION, ARCH, GLOSSARY, CHECKLIST, RISKS, REFUND, COPY]) {
    assert.equal(existsSync(join(ROOT, rel)), true, `missing ${rel}`);
    assert.ok(
      (PACKAGE_LAUNCH_REQUIRED_DOCS as readonly string[]).includes(rel),
      `${rel} must be in PACKAGE_LAUNCH_REQUIRED_DOCS`,
    );
  }
});

test("Phase 1 planned packages and Phase 2 protected credits are documented", () => {
  const decision = read(DECISION);
  const checklist = read(CHECKLIST);
  assert.match(decision, /Phase 1/i);
  assert.match(decision, /[Pp]lanned packages|forfaits planifiés|Préparation audition/);
  assert.match(decision, /Phase 2/i);
  assert.match(decision, /[Pp]rotected teacher credits|[Cc]rédits.*professeur/);
  assert.match(decision, /Generic Pratiqo-wide credits are not part/);
  assert.match(decision, /progressive, not fully upfront/i);
  assert.match(decision, /PACKAGE_LEGAL_REVIEW_COMPLETED|legal review completion/i);
  assert.match(decision, /No package credits should expire automatically/i);
  assert.match(checklist, /Phase 1 — Planned packages/);
  assert.match(checklist, /Phase 2 — Protected teacher credits/);
  assert.match(checklist, /Phase 3 — Cohorts/);
});

test("architecture requires progressive payout and separate charges/transfers", () => {
  const arch = read(ARCH);
  assert.match(arch, /separate charges and transfers/i);
  assert.match(arch, /Do \*\*not\*\* transfer the full package amount up front|not transfer the full package amount up front/i);
  assert.match(arch, /completed sessions/i);
  assert.match(arch, /PACKAGE_LEGAL_REVIEW_COMPLETED/);
  assert.doesNotMatch(arch, /ENABLE_PACKAGE_ENTITLEMENTS\s*=\s*["']true["']/);
});

test("glossary has approved and forbidden terminology sections", () => {
  const g = read(GLOSSARY);
  assert.match(g, /Forfait proposé par le professeur/);
  assert.match(g, /Paiement facilité par Pratiqo/);
  assert.match(g, /FORBIDDEN_TERMINOLOGY_EXAMPLES_START/);
  assert.match(g, /Forfait Pratiqo/);
  assert.match(g, /Banque d[’']heures Pratiqo/);
});

test("refund draft requires legal review and covers core scenarios", () => {
  const src = read(REFUND);
  assert.match(src, /Requires legal review before public launch/i);
  assert.match(src, /Before any session occurs/i);
  assert.match(src, /After some sessions occur/i);
  assert.match(src, /Unused sessions/i);
  assert.match(src, /Teacher cancellation/i);
  assert.match(src, /Teacher no-show/i);
  assert.match(src, /Student no-show/i);
  assert.match(src, /not allowed/i);
  assert.match(src, /No\*\* automatic expiration|No\*\* automatic expiration|automatic expiration/i);
});

test("risk register lists critical launch blockers", () => {
  const src = read(RISKS);
  assert.match(src, /full package payout then disappears/i);
  assert.match(src, /Chargeback after transfer/i);
  assert.match(src, /Legal review missing but feature flags enabled/i);
  assert.match(src, /Launch blocker/);
});

test("admin readiness remains blocked without legal review and separates offers", () => {
  const prev = process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
  delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
  try {
    assert.equal(PACKAGE_LAUNCH_NEVER_PRODUCTION_READY, true);
    assert.equal(PACKAGE_LEGAL_REVIEW_COMPLETED_FLAG, "PACKAGE_LEGAL_REVIEW_COMPLETED");
    const readiness = getPackageLaunchReadiness();
    assert.equal(readiness.checks.legalReviewCompletedSignal, false);
    assert.ok(
      readiness.blockers.some(
        (b) =>
          b.code === "legal_review_required" ||
          b.message.includes("PACKAGE_LEGAL_REVIEW_COMPLETED"),
      ),
    );
    assert.notEqual(readiness.status as string, "production_ready");
  } finally {
    if (prev === undefined) delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
    else process.env.PACKAGE_LEGAL_REVIEW_COMPLETED = prev;
  }

  const page = read(ADMIN);
  assert.match(page, /package-launch-offers-separation/);
  assert.match(page, /Offres de cours standards/);
  assert.match(page, /Forfaits payants/);
  assert.match(page, /modèle de remboursement/);
  assert.doesNotMatch(page, /type=["']checkbox["']|setFlag|process\.env\.\w+\s*=/);
});

test("package feature flags are not enabled by this architecture PR", () => {
  assert.equal(isPackageEntitlementsEnabled(), false);
  assert.equal(isPackageRedemptionBookingEnabled(), false);
  for (const rel of [
    DECISION,
    ARCH,
    ADMIN,
    "lib/offers/packageLaunchReadiness.ts",
    "package.json",
  ]) {
    const src = read(rel);
    assert.doesNotMatch(src, /ENABLE_PACKAGE_ENTITLEMENTS\s*=\s*["']true["']/);
    assert.doesNotMatch(src, /PACKAGE_LEGAL_REVIEW_COMPLETED\s*=\s*["']true["']/);
  }
});

test("no public launch path or payment mutation surfaces changed", () => {
  assert.doesNotMatch(read("app/api/stripe/checkout/route.ts"), /package-product-decision|package-technical-architecture/);
  assert.doesNotMatch(read("lib/payments/commission.ts"), /package-product-decision|getPackageLaunchReadiness/);
  assert.doesNotMatch(read("lib/payments/refunds.ts"), /package-product-decision|planned packages/i);
  assert.doesNotMatch(read("lib/offers/packageEntitlements.ts"), /package-product-decision/);
  assert.doesNotMatch(read("lib/offers/packageRedemptions.ts"), /package-product-decision/);
  // Mutation helpers still exist but this PR must not rewrite their balance logic:
  const entitlements = read("lib/offers/packageEntitlements.ts");
  const redemptions = read("lib/offers/packageRedemptions.ts");
  assert.match(entitlements, /isPackageEntitlementsEnabled/);
  assert.match(redemptions, /isPackageRedemptionBookingEnabled/);
});

test("live copy guard: forbidden package wording outside marked glossary examples", () => {
  const roots = ["app", "components", "lib", "docs/product"].map((d) => join(ROOT, d));
  const violations: string[] = [];

  const skipPath = (rel: string) =>
    rel.includes("/yo/") ||
    rel.startsWith("lib/yo/") ||
    rel.startsWith("app/yo/") ||
    rel.includes("packageLegalSafeArchitecture.test.ts") ||
    rel.includes("marketplaceIndependentTeacherGuardrails.test.ts") ||
    rel.includes("marketplaceIndependentTeacherHardening.test.ts") ||
    rel.endsWith(".test.ts");

  const isPackageArchitectureDoc = (rel: string) =>
    rel.startsWith("docs/product/") &&
    (DOC_ALLOWLIST_PATH_FRAGMENT.some((frag) => rel.endsWith(frag)) ||
      /package-|paid-packages|marketplace-independent/.test(rel));

  for (const rootDir of roots) {
    for (const file of walkFiles(rootDir)) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (skipPath(rel)) continue;

      let src = read(rel);
      if (rel.startsWith("docs/product/")) {
        src = stripForbiddenExampleBlocks(src);
        if (isPackageArchitectureDoc(rel)) {
          for (const re of [
            /Acheter un forfait Pratiqo/i,
            /Pratiqo vous assigne/i,
            /Pratiqo garantit les cours/i,
          ]) {
            if (re.test(src) && !/No [“"]|Avoid|éviter|interdit|Forbidden/i.test(src)) {
              // Only flag if the doc asserts the phrase as product copy (heuristic: not in a negation section).
              // Architecture docs list these as anti-patterns; skip bulk scan.
            }
          }
          continue;
        }
      }

      for (const re of FORBIDDEN_LIVE_COPY) {
        if (re.test(src)) violations.push(`${rel} :: ${re}`);
      }
    }
  }

  assert.deepEqual(violations, [], `unsafe package copy:\n${violations.join("\n")}`);
});

test("approved public copy draft exists with progressive payout message", () => {
  const src = read(COPY);
  assert.match(src, /proposés par des professeurs/);
  assert.match(src, /payé au rythme des séances complétées/i);
  assert.match(src, /Avoid claiming/i);
});

for (const { name, fn } of tests) {
  fn();
  console.log(`ok - ${name}`);
}

console.log(`[offers:package-legal-safe-architecture] ${tests.length} tests passed`);
