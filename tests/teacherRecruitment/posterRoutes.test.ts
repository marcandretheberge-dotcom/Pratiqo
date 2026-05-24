import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const professeurPage = read("app/devenir-professeur/page.tsx");
const tuteurPage = read("app/devenir-tuteur/page.tsx");
const nextConfig = read("next.config.ts");

test("/devenir-professeur exists with founder teacher campaign copy", () => {
  assert.match(professeurPage, /Deviens professeur fondateur sur Pratiqo/);
  assert.match(professeurPage, /100 % de tes revenus jusqu’à 5 élèves actifs/);
  assert.match(professeurPage, /0 % de commission pendant 6 mois/);
  assert.match(professeurPage, /Professeurs fondateurs recherchés/);
});

test("/devenir-professeur supports poster verticals", () => {
  for (const vertical of ["academique", "musique", "langues", "general"]) {
    assert.match(professeurPage, new RegExp(`\\b${vertical}\\b`));
  }
  assert.match(professeurPage, /Tu enseignes le soutien scolaire \?/);
  assert.match(professeurPage, /Tu enseignes la musique \?/);
  assert.match(professeurPage, /Tu enseignes une langue \?/);
});

test("CTA uses the existing teacher login flow and preserves campaign params", () => {
  assert.match(professeurPage, /login\.set\("role", "teacher"\)/);
  assert.match(professeurPage, /login\.set\("next", onboardingPath\)/);
  for (const key of ["vertical", "source", "utm_source", "utm_medium", "utm_campaign"]) {
    assert.match(professeurPage, new RegExp(`"${key}"`));
  }
});

test("/devenir-tuteur redirects to academic teacher recruitment and preserves source/UTM params", () => {
  assert.match(tuteurPage, /redirect\(`\/devenir-professeur\?\$\{query\.toString\(\)\}`\)/);
  assert.match(tuteurPage, /query\.set\("vertical", "academique"\)/);
  assert.match(nextConfig, /source: "\/devenir-tuteur"/);
  assert.match(nextConfig, /destination: "\/devenir-professeur\?vertical=academique"/);
  assert.match(nextConfig, /permanent: false/);
  for (const key of ["source", "utm_source", "utm_medium", "utm_campaign"]) {
    assert.match(tuteurPage, new RegExp(`"${key}"`));
  }
});

test("recruitment pages do not expose support@pratiqo.ca", () => {
  assert.doesNotMatch(professeurPage, /support@pratiqo\.ca/i);
  assert.doesNotMatch(tuteurPage, /support@pratiqo\.ca/i);
  assert.match(professeurPage, /marc-andre\.theberge@pratiqo\.ca/);
  assert.match(professeurPage, /info@pratiqo\.ca/);
});

test("analytics events are wired as best-effort events", () => {
  const analytics = read("components/marketing/TeacherRecruitmentAnalytics.tsx");
  assert.match(analytics, /teacher_recruitment_landing_view/);
  assert.match(analytics, /teacher_recruitment_cta_click/);
  assert.match(analytics, /window\.dataLayer/);
  assert.match(analytics, /window\.plausible/);
});
