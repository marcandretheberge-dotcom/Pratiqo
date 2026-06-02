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
      const output = execFileSync("git", args, { cwd: root, encoding: "utf8" });
      output
        .split(/\r?\n/)
        .map((file) => file.trim())
        .filter(Boolean)
        .forEach((file) => files.add(file));
    }

    const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
      cwd: root,
      encoding: "utf8",
    });
    status
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

const changedDisclosureFiles = [
  "lib/config/membrePro.ts",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  "content/legal/membre-pro.fr.md",
  "content/legal/membre-pro.en.md",
  "content/legal/membre-pro.es.md",
  "content/legal/conditions-professeurs.fr.md",
  "content/legal/conditions-professeurs.en.md",
  "content/legal/conditions-professeurs.es.md",
  "content/legal/yo-refund.fr.md",
  "content/legal/yo-refund.en.md",
  "content/legal/yo-refund.es.md",
  "content/legal/accessibilite.fr.md",
  "content/legal/accessibilite.en.md",
  "content/legal/accessibilite.es.md",
  "app/(app)/legal/accessibilite/page.tsx",
  "components/LegalLayout.tsx",
  "components/LegalFooterLinks.tsx",
];

function changedDisclosureText(): string {
  return changedDisclosureFiles
    .filter((file) => existsSync(join(root, file)))
    .map((file) => `\n--- ${file} ---\n${read(file)}`)
    .join("\n");
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

    assert.match(combined, /29/);
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

test("Membre Pro copy has no affirmative guarantee of income, ranking, bookings, visibility, or students", () => {
  const text = changedDisclosureText();
  const forbiddenPositiveClaims = [
    /\bguaranteed\s+(income|earnings|ranking|bookings|visibility|students)\b/i,
    /\b(income|earnings|ranking|bookings|visibility|students)\s+guaranteed\b/i,
    /\brevenu\s+garanti\b/i,
    /\brevenus\s+garantis\b/i,
    /\bclassement\s+garanti\b/i,
    /\bvisibilit.\s+garantie\b/i,
    /\br.servations\s+garanties\b/i,
    /\b.l.ves\s+garantis\b/i,
    /\bingresos?\s+garantizad[oa]s?\b/i,
    /\bposicionamiento\s+garantizado\b/i,
    /\bvisibilidad\s+garantizada\b/i,
    /\breservas\s+garantizadas\b/i,
    /\bestudiantes\s+garantizados\b/i,
  ];

  for (const pattern of forbiddenPositiveClaims) {
    assert.doesNotMatch(text, pattern);
  }
});

test("annual ristourne wording is conditional and complete in all locales", () => {
  const dictionaries = locales.map((locale) => readJson(`lib/i18n/locales/${locale}.json`));

  for (const locale of locales) {
    const legal = read(`content/legal/membre-pro.${locale}.md`);
    assert.match(legal, /condition|sous r.serve|sujeta/i);
    assert.match(legal, /5\s*%/);
    assert.match(legal, /net profits|profits nets|ganancias netas/i);
    assert.match(legal, /January|janvier|enero/i);
    assert.match(legal, /150[\s,.]000|150,000/);
    assert.match(legal, /10[^\n]{0,80}(?:eligible|.ligibles|elegibles)/i);
    assert.match(legal, /10[\s,.]000|10,000/);
    assert.match(legal, /relative annual volume|volume annuel relatif|volumen anual relativo/i);
    assert.match(legal, /not guarantee|ne garantit|no garantiza/i);
  }

  for (const dict of dictionaries) {
    const text = [
      dict.btRistourneBody,
      dict.pricingPageCommissionFootnote,
      dict.pricingPageCommissionDisclaimer,
      dict.pricingPageFaq6A,
    ].join("\n");
    assert.match(text, /5\s*%/);
    assert.match(text, /150[\s,.]000|150,000/);
    assert.match(text, /10[\s,.]000|10,000/);
    assert.match(text, /condition|not guaranteed|non garantie|no est. garantizada/i);
  }
});

test("forbidden legal shortcuts were not introduced", () => {
  const text = changedDisclosureText();

  assert.doesNotMatch(text, /\bLPC\b/i);
  assert.doesNotMatch(text, /waiv(?:e|er)[^\n]{0,120}consumer protection/i);
  assert.doesNotMatch(text, /renonciation[^\n]{0,120}protection du consommateur/i);
  assert.doesNotMatch(text, /renuncia[^\n]{0,120}protecci.n/i);
  assert.doesNotMatch(text, /\bescrow\b|s.questre|fideicomiso/i);
  assert.doesNotMatch(text, /\b(?:liability cap|plafond de responsabilit.|l.mite de responsabilidad)\b/i);
  assert.doesNotMatch(text, /\b(?:CAD\s*)?\$?\s*100\s*(?:CAD|\$CA)?[^\n]{0,80}\b(?:liability|responsabilit.|responsabilidad)\b/i);
});

test("YoPratiqo keeps lifetime access and adds only safe learning disclaimers", () => {
  for (const locale of locales) {
    const content = read(`content/legal/yo-refund.${locale}.md`);
    const plain = content.replace(/[*_`]/g, "");
    assert.match(plain, /as long as (?:Cours )?Pratiqo(?: Inc\.)? operates|aussi longtemps que (?:Cours )?Pratiqo(?: Inc\.)? exploite|mientras (?:Cours )?Pratiqo(?: Inc\.)? opere/i);
    assert.doesNotMatch(plain, /(lifetime access|acc.s . vie|acceso de por vida)[^\n]{0,140}(12 months|12 mois|12 meses)/i);
    assert.match(plain, /educational preparation|pr.paration .ducative|preparaci.n educativa/i);
    assert.match(plain, /fluency|aisance|fluidit.|fluidez/i);
    assert.match(plain, /exam|examen/i);
    assert.match(plain, /immigration|migratorio/i);
    assert.match(plain, /employment|emploi|empleo|laboral/i);
    assert.match(plain, /teacher booking|booking with a teacher|r.servation avec un professeur|reserva con un profesor/i);
    assert.match(plain, /lawyer review|legal review|r.vision juridique|revisi.n jur.dica|revisi.n legal/i);
  }
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
