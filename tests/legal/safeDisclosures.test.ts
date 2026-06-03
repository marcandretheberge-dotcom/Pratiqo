import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { UPGRADE_PAGE_COPY } from "../../lib/config/membrePro";

type TestFn = () => void;
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
    console.warn("# skipped safe-disclosure branch boundary scan - could not diff against origin/main");
    return null;
  }
}

const liveDisclosureFiles = [
  "lib/config/membrePro.ts",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  "lib/email/messages/welcome.ts",
  "content/legal/membre-pro.fr.md",
  "content/legal/membre-pro.en.md",
  "content/legal/membre-pro.es.md",
  "content/legal/conditions-professeurs.fr.md",
  "content/legal/conditions-professeurs.en.md",
  "content/legal/conditions-professeurs.es.md",
  "content/legal/paiements-remboursements.fr.md",
  "content/legal/paiements-remboursements.en.md",
  "content/legal/paiements-remboursements.es.md",
  "content/legal/yo-refund.fr.md",
  "content/legal/yo-refund.en.md",
  "content/legal/yo-refund.es.md",
  "content/legal/terms.fr.md",
  "content/legal/terms.en.md",
  "content/legal/terms.es.md",
  "content/legal/accessibilite.fr.md",
  "content/legal/accessibilite.en.md",
  "content/legal/accessibilite.es.md",
  "app/(app)/legal/accessibilite/page.tsx",
  "app/(app)/legal/annulation/page.tsx",
  "app/(app)/loyalty/rapport/page.tsx",
  "app/yo/page.tsx",
  "app/yo/langues/espagnol/intro/page.tsx",
  "app/yo/langues/francais-quebec/intro/page.tsx",
  "app/become-teacher/page.tsx",
  "app/(marketing)/devenir-enseignant/DevenirEnseignantContent.tsx",
  "components/LegalLayout.tsx",
  "components/LegalFooterLinks.tsx",
];

const allowedYoDisclosureFiles = new Set([
  "app/yo/page.tsx",
  "app/yo/langues/espagnol/intro/page.tsx",
  "app/yo/langues/francais-quebec/intro/page.tsx",
]);

function liveDisclosureText(): string {
  return liveDisclosureFiles
    .filter((file) => existsSync(join(root, file)))
    .map((file) => `\n--- ${file} ---\n${read(file)}`)
    .join("\n");
}

function withoutNegatedGuaranteeSentences(text: string): string {
  return text
    .replace(/\bnot\b.{0,300}\bguaranteed income\b/gi, "")
    .replace(/\b(?:does not|do not|not|no)\b[^.\n]{0,220}\b(?:guarantee|guaranteed)\b[^.\n]*/gi, "")
    .replace(/\bno\s+(?:income|earnings|ranking|bookings|visibility|students)\s+guarantee\b/gi, "")
    .replace(/\b(?:ne|n['’])\b[^.\n]{0,220}\b(?:garantit|garantie|garanties|garanti|garantis)\b[^.\n]*/gi, "")
    .replace(/\bno\b[^.\n]{0,220}\b(?:garantiza|garantizado|garantizada|garantizados|garantizadas)\b[^.\n]*/gi, "");
}

test("Membre Pro subscription disclosure exists in FR, EN, and ES", () => {
  for (const locale of locales) {
    const legal = read(`content/legal/membre-pro.${locale}.md`);
    const terms = read(`content/legal/conditions-professeurs.${locale}.md`);
    const copy = UPGRADE_PAGE_COPY[locale];
    const combined = [
      legal,
      terms,
      copy.summary,
      copy.proPlanPrice,
      copy.disclosureLead,
      copy.disclosureRenewTail,
      copy.commissionDisclaimer,
    ].join("\n");

    assert.match(combined, /29(?:[,.]99)?/);
    assert.match(combined, /CAD|\$CA|CA\$/i);
    assert.match(combined, /tax|taxes|impuestos/i);
    assert.match(combined, /monthly|mensuellement|mensual/i);
    assert.match(combined, /advance|avance|adelantad/i);
    assert.match(combined, /automatic|automatique|autom.tica/i);
    assert.match(combined, /dashboard|tableau de bord|panel/i);
    assert.match(combined, /support@pratiqo\.ca/i);
    assert.match(combined, /end of the current paid billing period|fin de la p.riode pay.e en cours|final del per.odo pagado en curso/i);
  }
});

test("Membre Pro rebate is framed as a conditional commercial volume rebate, not profit-sharing", () => {
  for (const locale of locales) {
    const legal = read(`content/legal/membre-pro.${locale}.md`);
    const teacherTerms = read(`content/legal/conditions-professeurs.${locale}.md`);
    const dict = readJson(`lib/i18n/locales/${locale}.json`);
    const combined = [
      legal,
      teacherTerms,
      dict.btFaq3A,
      dict.btRistourneBody,
      dict.pricingPageCommissionFootnote,
    ].join("\n");

    assert.match(combined, /commercial|commerciale|comercial/i);
    assert.match(combined, /volume/i);
    assert.match(combined, /marketplace/i);
    assert.match(combined, /YoPratiqo/);
    assert.doesNotMatch(combined, /net profits|profits nets|ganancias netas|profit-sharing/i);
    assert.match(combined, /not participation|ne constitue pas une participation|no constituye una participaci/i);
    assert.match(combined, /not[^.\n]{0,160}guaranteed income|ni un revenu garanti|ni un ingreso garantizado/i);
  }
});

test("Membre Pro copy has no affirmative guarantee of income, ranking, bookings, visibility, or students", () => {
  const text = withoutNegatedGuaranteeSentences(liveDisclosureText());
  const forbiddenPositiveClaims = [
    /\bguarantees?\s+(?:any\s+)?(?:minimum\s+)?(?:income|earnings|ranking|bookings|visibility|students)\b/i,
    /\bguarantees?\s+(?:a\s+)?(?:profile\s+)?(?:rank|ranking|booking|student|visibility|income|earning)\b/i,
    /\bgarantit\s+(?:un\s+|des\s+)?(?:revenu|revenus|classement|positionnement|visibilit.|r.servations|.l.ves)\b/i,
    /\bgarantiza\s+(?:ingresos?|posicionamiento|visibilidad|reservas|estudiantes)\b/i,
  ];

  for (const pattern of forbiddenPositiveClaims) {
    assert.doesNotMatch(text, pattern);
  }
});

test("YoPratiqo paid-module legal copy uses 12-month access, not lifetime access", () => {
  for (const locale of locales) {
    const policy = read(`content/legal/yo-refund.${locale}.md`);
    const terms = read(`content/legal/terms.${locale}.md`);
    const combined = `${policy}\n${terms}`;
    assert.match(combined, /twelve \(12\) months|douze \(12\) mois|doce \(12\) meses/i);
    assert.match(combined, /subject to mandatory legal rights|droits imp.ratifs applicables|derechos legales obligatorios/i);
    assert.doesNotMatch(combined, /lifetime access|acc.s . vie|acceso de por vida/i);
  }
});

test("forbidden legal shortcuts were not introduced", () => {
  const text = liveDisclosureText();

  assert.doesNotMatch(text, /\bLPC\b/i);
  assert.doesNotMatch(text, /\b(?:waive|waiver)\s+(?:of\s+)?(?:mandatory\s+)?(?:consumer protection|Consumer Protection Act)\s+rights/i);
  assert.doesNotMatch(text, /renonciation[^\n]{0,120}protection du consommateur/i);
  assert.doesNotMatch(text, /\bescrow\b|s.questre|fiducie|trust account/i);
  assert.doesNotMatch(text, /\b(?:CAD\s*)?\$?\s*100\s*(?:CAD|\$CA)?[^\n]{0,80}\b(?:liability|responsabilit.|responsabilidad)\b/i);
});

test("accessibility legal page exists with cautious wording and support contact", () => {
  assert.equal(existsSync(join(root, "app/(app)/legal/accessibilite/page.tsx")), true);
  const route = read("app/(app)/legal/accessibilite/page.tsx");
  assert.match(route, /accessibilite\.\$\{lang\}\.md/);
  assert.match(route, /currentPath="\/legal\/accessibilite"/);

  for (const locale of locales) {
    const content = read(`content/legal/accessibilite.${locale}.md`);
    assert.match(content, /support@pratiqo\.ca/i);
    assert.match(content, /souhaite rendre|aims to make|busca que/i);
    assert.match(content, /travaille progressivement|progressively working|trabaja progresivamente/i);
    assert.doesNotMatch(content, /perfect WCAG|full WCAG compliance|conformit. WCAG compl.te garantie|cumplimiento WCAG completo garantizado/i);
  }

  const legalLayout = read("components/LegalLayout.tsx");
  const footerLinks = read("components/LegalFooterLinks.tsx");
  assert.match(legalLayout, /\/legal\/accessibilite/);
  assert.match(footerLinks, /\/legal\/accessibilite/);
});

test("safe-disclosure branch did not touch restricted systems", () => {
  const changed = changedFilesForBranch();
  if (!changed) return;

  const restrictedRules: Array<{ label: string; re: RegExp }> = [
    { label: "Stripe API routes", re: /^app\/api\/stripe\// },
    { label: "checkout routes", re: /^app\/api\/.*checkout/i },
    { label: "webhook routes", re: /^app\/api\/.*webhook/i },
    { label: "payment/refund/payout routes", re: /^app\/api\/(payments|payouts|refunds)\// },
    { label: "payment calculation/config internals", re: /^lib\/(payments|pricing|commissions)\// },
    { label: "Supabase migrations", re: /^supabase\/migrations\// },
    { label: "RLS/security helpers", re: /^lib\/(rls|security)\// },
    { label: "booking flow", re: /^app\/\(app\)\/booking\// },
    { label: "cron jobs", re: /^app\/api\/cron\/|^\.github\/workflows\/.*cron/i },
    { label: "YoPratiqo app content", re: /^app\/yo\// },
    { label: "YoPratiqo components", re: /^components\/yo\// },
    { label: "YoPratiqo library content", re: /^lib\/yo\// },
    { label: "generated audio files", re: /^public\/.*\.(?:mp3|wav|m4a)$/i },
    { label: "OpenAI generation scripts", re: /^scripts\/.*(?:openai|generate-yopratiqo-audio)/i },
    { label: "sitemap/indexation/schema", re: /^app\/sitemap\.ts$|^app\/robots\.ts$|^lib\/seo\// },
  ];

  const violations: string[] = [];
  for (const file of changed) {
    if (allowedYoDisclosureFiles.has(file)) continue;
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
  console.log(`[legal:safe-disclosures] ${tests.length} tests passed`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
