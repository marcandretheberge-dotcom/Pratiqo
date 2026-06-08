import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function changedFilesAgainstMain(): string[] | null {
  try {
    const mergeBase = execFileSync("git", ["merge-base", "HEAD", "origin/main"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    const committed = execFileSync("git", ["diff", "--name-only", mergeBase, "HEAD"], {
      cwd: root,
      encoding: "utf8",
    });
    const unstaged = execFileSync("git", ["diff", "--name-only"], {
      cwd: root,
      encoding: "utf8",
    });
    const staged = execFileSync("git", ["diff", "--cached", "--name-only"], {
      cwd: root,
      encoding: "utf8",
    });
    return [...new Set(`${committed}\n${unstaged}\n${staged}`.split(/\r?\n/).map((f) => f.trim()).filter(Boolean))].sort();
  } catch {
    console.warn("# skipped legal live sync branch boundary scan - could not diff against origin/main");
    return null;
  }
}

test("shared legal layout is branded and professional", () => {
  const layout = read("components/LegalLayout.tsx");
  assert.match(layout, /PratiqoLogo/);
  assert.match(layout, /Documents légaux|Legal documents|Documentos legales/);
  assert.match(layout, /bg-gradient-to-b/);
  assert.match(layout, /lg:grid-cols-\[300px_minmax\(0,1fr\)\]/);
  assert.match(layout, /lg:sticky/);
  assert.match(layout, /currentPath: LegalPath/);
});

test("legal markdown body renders readable tables, links, callouts, and stable headings", () => {
  const markdown = read("components/LegalMarkdownBody.tsx");
  assert.match(markdown, /createLegalHeadingIdRegistry/);
  assert.match(markdown, /overflow-x-auto/);
  assert.match(markdown, /underline-offset-4/);
  assert.match(markdown, /bg-\[#FFF8E6\]/);
  assert.match(markdown, /scroll-mt-28/);
});

test("YoPratiqo refund page uses shared legal layout and is present in legal nav", () => {
  const page = read("app/(app)/legal/yo-remboursement/page.tsx");
  const layout = read("components/LegalLayout.tsx");
  const footer = read("components/LegalFooterLinks.tsx");
  assert.match(page, /<LegalLayout/);
  assert.doesNotMatch(page, /layout is inlined/i);
  assert.match(page, /currentPath="\/legal\/yo-remboursement"/);
  assert.match(layout, /"\/legal\/yo-remboursement"/);
  assert.match(footer, /href="\/legal\/yo-remboursement"/);
});

test("YoPratiqo live policy includes V9 progress-data privacy disclosure in FR, EN, and ES", () => {
  const fr = read("content/legal/yo-refund.fr.md");
  const en = read("content/legal/yo-refund.en.md");
  const es = read("content/legal/yo-refund.es.md");
  assert.match(fr, /## 7\. Données de progression et vie privée/);
  assert.match(en, /## 7\. Progress data and privacy/);
  assert.match(es, /## 7\. Datos de progreso y privacidad/);
  assert.match(fr, /interactions audio/);
  assert.match(en, /audio interactions/);
  assert.match(es, /interacciones de audio/);
  assert.match(fr + en + es, /consentement explicite|explicit consent|consentimiento explícito/);
});

test("privacy policy exposes V9 retention and provider-location disclosures across locales", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const file = `content/legal/confidentialite.${locale}.md`;
    const text = read(file);
    assert.match(text, /7 ans|7 years|7 años/);
    assert.match(text, /90 à 180 jours|90 to 180 days|90 a 180 días/);
    assert.match(text, /Stripe/);
    assert.match(text, /Supabase/);
    assert.match(text, /OpenAI/);
    assert.match(text, /YoPratiqo/);
  }
});

test("live legal sync branch did not touch restricted systems", () => {
  const changed = changedFilesAgainstMain();
  if (!changed) return;

  const restrictedRules: Array<{ label: string; re: RegExp }> = [
    { label: "Stripe/payment APIs", re: /^app\/api\/(?:stripe|payments|payouts|refunds)\// },
    { label: "payment internals", re: /^lib\/payments\// },
    { label: "Supabase migrations", re: /^supabase\/migrations\// },
    { label: "RLS/security helpers", re: /^lib\/(?:rls|security)\// },
    { label: "booking logic", re: /^app\/\(app\)\/booking\// },
    { label: "YoPratiqo lesson or audio content", re: /^app\/yo\/|^components\/yo\/|^lib\/yo\/|^public\/.*\.(?:mp3|wav|m4a)$/i },
    { label: "SEO indexation or schema", re: /^app\/sitemap\.ts$|^app\/robots\.ts$|^lib\/seo\// },
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
  console.log(`[legal:live-sync-layout] ${tests.length} tests passed`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
