import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function ok(name: string) {
  console.log(`ok - ${name}`);
}

function assertNoForbiddenInternals(relativePath: string) {
  const source = read(relativePath);
  const forbidden = [
    /stack\s*trace/i,
    /error\.stack/i,
    /digest/i,
    /STRIPE_/,
    /SUPABASE_SERVICE_ROLE_KEY/,
    /getSupabaseAdmin/,
    /createClient/,
    /CourseJsonLd|schema\.org/i,
    /commission/i,
    /refund/i,
    /tax/i,
  ];

  for (const pattern of forbidden) {
    assert.ok(!pattern.test(source), `${relativePath} should not expose or import ${pattern}`);
  }
}

assert.ok(existsSync(path.join(root, "app/not-found.tsx")), "app/not-found.tsx exists");
ok("app/not-found.tsx exists");

assert.ok(existsSync(path.join(root, "app/error.tsx")), "app/error.tsx exists");
ok("app/error.tsx exists");

assert.ok(existsSync(path.join(root, "app/global-error.tsx")), "app/global-error.tsx exists");
ok("app/global-error.tsx exists");

const errorPage = read("app/error.tsx");
assert.ok(errorPage.startsWith('"use client";'), "app/error.tsx must be a client component");
assert.match(errorPage, /reset|unstable_retry/, "app/error.tsx should expose retry behavior");
assert.match(errorPage, /Reessayer/, "app/error.tsx should render a retry button");
ok("app/error.tsx is a client component with retry behavior");

const globalErrorPage = read("app/global-error.tsx");
assert.ok(globalErrorPage.startsWith('"use client";'), "app/global-error.tsx must be a client component");
assert.match(globalErrorPage, /<html lang="fr">/, "global error must render its own html tag");
assert.match(globalErrorPage, /<body>/, "global error must render its own body tag");
ok("app/global-error.tsx is a valid global error boundary");

for (const file of ["app/not-found.tsx", "app/error.tsx", "app/global-error.tsx"]) {
  const source = read(file);
  assert.match(source, /Retour a l'accueil/, `${file} should link home`);
  assert.match(source, /Trouver un cours/, `${file} should link to course search`);
  assert.match(source, /Contacter Pratiqo/, `${file} should link to contact/support`);
  assert.match(source, /\/trouver-un-prof/, `${file} should link to teacher search`);
  assert.match(source, /\/contact/, `${file} should link to contact`);
  assertNoForbiddenInternals(file);
}
assert.match(read("app/not-found.tsx"), /Explorer YoPratiqo/, "404 should include the YoPratiqo exploration link");
ok("error pages include useful navigation links and no technical internals");

const status = execSync("git status --porcelain -uall", { cwd: root, encoding: "utf8" });
const changed = status
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => line.replace(/^[ MADRCU?!]{1,2}\s+/, "").replace(/^"|"$/g, ""));

const ignoredUntracked = new Set([
  "Untitled",
  "docs/LAUNCH_READINESS_ANALYSIS.md",
  "pratiqo-legal-export-20260528-2221.zip",
]);

const allowed = new Set([
  "app/not-found.tsx",
  "app/error.tsx",
  "app/global-error.tsx",
  "tests/ui/customErrorPages.test.ts",
]);

for (const file of changed) {
  if (ignoredUntracked.has(file)) continue;
  assert.ok(allowed.has(file), `unexpected file touched by custom error page task: ${file}`);
}
ok("custom error page branch does not touch restricted systems");

console.log("[ui:custom-error-pages] tests passed");
