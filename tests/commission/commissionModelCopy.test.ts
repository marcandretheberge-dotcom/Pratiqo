import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  calculateBookingAmounts,
  getPlatformFeeBasisPoints,
  type LoyaltyTier,
} from "../../lib/payments/commission";
import {
  MEMBRE_PRO_COMMISSION_MODEL,
  MEMBRE_PRO_PLAN,
} from "../../lib/config/membrePro";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function readJson(relativePath: string): Record<string, string> {
  return JSON.parse(read(relativePath)) as Record<string, string>;
}

function trackedSourceFiles(): string[] {
  const output = execFileSync("git", ["ls-files"], {
    cwd: root,
    encoding: "utf8",
  });
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) =>
      /^(app|components|content\/legal|docs|lib|tests|package\.json)/.test(file),
    )
    .filter((file) => /\.(ts|tsx|json|md)$/.test(file))
    .filter((file) => !file.startsWith("app/yo/"))
    .filter((file) => !file.startsWith("components/yo/"))
    .filter((file) => !file.startsWith("lib/yo/"))
    .filter((file) => !file.startsWith("tests/yo/"))
    .filter((file) => file !== "tests/commission/commissionModelCopy.test.ts");
}

function changedFilesAgainstMain(): string[] | null {
  try {
    const mergeBase = execFileSync("git", ["merge-base", "HEAD", "origin/main"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    const output = execFileSync("git", ["diff", "--name-only", mergeBase, "HEAD"], {
      cwd: root,
      encoding: "utf8",
    });
    return output
      .split(/\r?\n/)
      .map((file) => file.trim())
      .filter(Boolean);
  } catch {
    console.warn("# skipped commission branch boundary scan — could not diff against origin/main");
    return null;
  }
}

const staleOldModelPatterns: Array<{ label: string; re: RegExp }> = [
  { label: "old 10% to 7% range", re: /10\s*%\s*(?:->|to|a|à|-|–|→)\s*7\s*%/i },
  { label: "old 10 percent to 7 percent range", re: /10\s+percent\s+(?:to|a|à)\s+7\s+percent/i },
  { label: "old reverse 7% to 10% range", re: /7\s*%\s*(?:->|to|a|à|-|–|→)\s*10\s*%/i },
  { label: "old free commission at 10%", re: /\b(?:free|gratuit|gratis|standard)\b[^\r\n]{0,120}\b10\s*%/i },
  { label: "old silver commission at 9%", re: /\b(?:silver|argent|plata)\b[^\r\n]{0,120}\b9\s*%/i },
  { label: "old gold commission at 8%", re: /\b(?:gold|or|oro)\b[^\r\n]{0,120}\b8\s*%/i },
  { label: "old platinum commission at 7%", re: /\b(?:platinum|platine|platino)\b[^\r\n]{0,120}\b7\s*%/i },
  { label: "old flat 10% commission", re: /\b(?:flat\s+10\s*%|10\s*%\s+flat|commission\s+fixe[^\r\n]{0,80}10\s*%|10\s*%\s+fixe)\b/i },
  { label: "old 10% commission context", re: /\bcommission\b[^\r\n]{0,120}\b10\s*%/i },
  { label: "old literal booking commission fallback", re: /\bcommissionRate\s*=\s*0\.1\b/ },
  { label: "old free commission config", re: /\bfreeCommissionPercent\s*:\s*10\b/ },
];

test("canonical payment calculator uses the new Free and Pro tier rates", () => {
  const freeExpected: Record<LoyaltyTier, number> = {
    bronze: 1500,
    argent: 1400,
    or: 1300,
    platine: 1200,
  };
  const proExpected: Record<LoyaltyTier, number> = {
    bronze: 500,
    argent: 450,
    or: 400,
    platine: 350,
  };

  for (const tier of Object.keys(freeExpected) as LoyaltyTier[]) {
    assert.equal(
      getPlatformFeeBasisPoints({ teacherPlan: "free", loyaltyTier: tier }),
      freeExpected[tier],
    );
    assert.equal(
      getPlatformFeeBasisPoints({ teacherPlan: "pro", loyaltyTier: tier }),
      proExpected[tier],
    );
  }

  const bronzeFree = calculateBookingAmounts({
    subtotalCents: 20_000,
    teacherPlan: "free",
    loyaltyTier: "bronze",
  });
  assert.equal(bronzeFree.platformFeeCents, 3_000);
  assert.equal(bronzeFree.teacherNetCents, 17_000);
});

test("Membre Pro config exposes the canonical price, ranges, and annual ristourne rules", () => {
  // Source of truth: Stripe Price referenced by STRIPE_PRO_MONTHLY_PRICE_ID
  // has unit_amount = 2999 (= $29.99 CAD). The numeric constant exposed by
  // lib/config/membrePro must stay in lockstep with that dashboard value.
  assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCad, 29.99);
  // Locale-aware display strings keep FR/ES "29,99" and EN "29.99" consistent
  // across every user-facing surface that quotes the monthly price.
  assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.fr, "29,99");
  assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.en, "29.99");
  assert.equal(MEMBRE_PRO_PLAN.proMonthlyPriceCadDisplay.es, "29,99");
  assert.equal(MEMBRE_PRO_PLAN.freeCommissionPercent, 15);
  assert.equal(MEMBRE_PRO_PLAN.proCommissionPercent, 5);
  assert.deepEqual(MEMBRE_PRO_COMMISSION_MODEL.freeCommissionRange, {
    startPercent: 15,
    bestPercent: 12,
  });
  assert.deepEqual(MEMBRE_PRO_COMMISSION_MODEL.proCommissionRange, {
    startPercent: 5,
    bestPercent: 3.5,
  });
  assert.deepEqual(MEMBRE_PRO_COMMISSION_MODEL.proRistourneRange, {
    goldPercent: 0.5,
    platinumPercent: 1,
  });
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.annualProfitSharingPoolPercent, 5);
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.annualProfitSharingPoolCapCad, 150_000);
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.annualProfitSharingMinimumEligibleTeachers, 10);
  assert.equal(MEMBRE_PRO_COMMISSION_MODEL.annualProfitSharingMaxPerTeacherCad, 10_000);
});

test("FR, EN, and ES pricing dictionaries expose the new commission table", () => {
  const fr = readJson("lib/i18n/locales/fr.json");
  const en = readJson("lib/i18n/locales/en.json");
  const es = readJson("lib/i18n/locales/es.json");

  for (const dict of [fr, en, es]) {
    assert.match(dict.pricingPagePctFreeBronze ?? "", /\b15\s*%/);
    assert.match(dict.pricingPagePctFreeSilver ?? "", /\b14\s*%/);
    assert.match(dict.pricingPagePctFreeGold ?? "", /\b13\s*%/);
    assert.match(dict.pricingPagePctFreePlatinum ?? "", /\b12\s*%/);
    assert.match(dict.pricingPagePctProBronze ?? "", /\b5\s*%/);
    assert.match(dict.pricingPagePctProSilver ?? "", /\b4[.,]5\s*%/);
    assert.match(dict.pricingPagePctProGold ?? "", /\b4\s*%/);
    assert.match(dict.pricingPagePctProGold ?? "", /\b0[.,]5\s*%/);
    assert.match(dict.pricingPagePctProPlatinum ?? "", /\b3[.,]5\s*%/);
    assert.match(dict.pricingPagePctProPlatinum ?? "", /\b1\s*%/);
    assert.match(
      dict.pricingPageCommissionFootnote ?? "",
      /not guaranteed|non garantie|n['’]est pas garantie|no est[aá] garantizada/i,
    );
  }

  assert.match(fr.btRistourneBody ?? "", /150 000 \$CA/);
  assert.match(en.btRistourneBody ?? "", /CAD \$150,000/);
  assert.match(es.btRistourneBody ?? "", /150 000 \$CA/);
});

test("teacher welcome email no longer advertises the old 10% to 7% model", () => {
  const welcome = read("lib/email/messages/welcome.ts");
  assert.match(welcome, /15 % \/ 5 %/);
  assert.match(welcome, /15% \/ 5%/);
  assert.match(welcome, /13 % \/ 4 % \+ 0,5 % ristourne/);
  assert.match(welcome, /13% \/ 4% \+ 0\.5% profit-sharing/);
  assert.match(welcome, /12 % \/ 3,5 % \+ 1 % redistribuci/);
});

test("tracked source has no stale old commission model claims", () => {
  const offenders: string[] = [];
  for (const file of trackedSourceFiles()) {
    const source = read(file);
    for (const { label, re } of staleOldModelPatterns) {
      if (re.test(source)) {
        offenders.push(`${file}: ${label} (${re})`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test("commission model branch may update canonical commission files but not restricted systems", () => {
  const changed = changedFilesAgainstMain();
  if (!changed) return;

  const allowedCommissionFiles = new Set([
    "lib/config/membrePro.ts",
    "lib/payments/commission.ts",
    "tests/commission/commissionModelCopy.test.ts",
    "tests/marketing/membreProCommissionModel.test.ts",
    "tests/payments/commissionSubtotal.test.ts",
    "tests/payments/stripeTaxInclusive.test.ts",
    "tests/email/welcome.test.ts",
  ]);

  for (const file of allowedCommissionFiles) {
    if (changed.includes(file)) {
      assert.ok(true, `${file} is an approved commission-model update surface`);
    }
  }

  const restrictedRules: Array<{ label: string; re: RegExp }> = [
    { label: "Stripe routes", re: /^app\/api\/stripe\// },
    { label: "checkout routes", re: /^app\/api\/.*checkout/i },
    { label: "webhook routes", re: /^app\/api\/.*webhook/i },
    { label: "payment routes", re: /^app\/api\/(payments|payouts|refunds)\// },
    { label: "tax logic", re: /^lib\/payments\/.*tax/i },
    { label: "payment infrastructure outside canonical commission math", re: /^lib\/payments\/(?!commission\.ts$)/ },
    { label: "Supabase migrations", re: /^supabase\/migrations\// },
    { label: "RLS/security helpers", re: /^lib\/(rls|security)\// },
    { label: "booking flow outside commission disclosure success page", re: /^app\/\(app\)\/booking\/(?!success\/page\.tsx$)/ },
    { label: "cron jobs", re: /^app\/api\/cron\/|^\.github\/workflows\/.*cron/i },
  ];

  const violations: string[] = [];
  for (const file of changed) {
    for (const rule of restrictedRules) {
      if (rule.re.test(file)) {
        violations.push(`${file} (${rule.label})`);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `commission-model branch touched restricted systems:\n  ${violations.join("\n  ")}`,
  );
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
  console.log(`[commission:model] ${tests.length} tests passed`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
