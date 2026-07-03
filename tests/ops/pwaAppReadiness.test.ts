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

const manifestPath = path.join(root, "public/manifest.json");
assert.ok(existsSync(manifestPath), "public/manifest.json exists");
const manifest = JSON.parse(read("public/manifest.json"));
assert.equal(manifest.name, "Pratiqo");
assert.equal(manifest.short_name, "Pratiqo");
assert.equal(manifest.description, "Trouve un professeur local ou développe tes compétences avec Pratiqo.");
assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.theme_color, "#1D9E75");
assert.equal(manifest.lang, "fr-CA");
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2);
ok("manifest has required installability fields");

for (const icon of ["public/icons/icon-192.png", "public/icons/icon-512.png", "public/icons/icon-512-maskable.png"]) {
  assert.ok(existsSync(path.join(root, icon)), `${icon} exists`);
}
ok("PWA icons exist");

const layout = read("app/layout.tsx");
assert.match(layout, /apple-mobile-web-app-capable/);
assert.match(layout, /apple-mobile-web-app-title/);
assert.match(layout, /theme-color/);
assert.match(layout, /rel="manifest"\s+href="\/manifest\.json"|href="\/manifest\.json"\s+rel="manifest"/);
assert.match(layout, /rel="apple-touch-icon"/);
ok("root layout contains PWA and Apple app meta tags");

assert.ok(existsSync(path.join(root, "app/offline/page.tsx")), "offline page exists");
assert.match(read("app/offline/page.tsx"), /Vous semblez hors ligne/);
ok("offline fallback page exists");

const sw = read("public/sw.js");
for (const blocked of ["/api", "/dashboard", "/booking", "/checkout", "/legal", "/yo/checkout", "/student", "/teacher"]) {
  assert.match(sw, new RegExp(blocked.replace("/", "\\/")));
}
assert.match(sw, /STATIC_PREFIXES/);
assert.match(sw, /caches\.open/);
ok("service worker caches static assets and bypasses sensitive routes");

const providers = read("app/providers.tsx");
assert.match(providers, /PwaServiceWorker/);
ok("service worker registration is mounted from app providers");

const runbook = read("docs/APP_READINESS_RUNBOOK.md");
assert.match(runbook, /Apple IAP is required/i);
assert.match(runbook, /Google Play Billing is required/i);
assert.match(runbook, /Do not submit to the App Store with Stripe checkout enabled for digital content/i);
assert.match(runbook, /YoPratiqo paid checkout must remain disabled/i);
ok("app-readiness runbook includes native payment policy guardrails");

const yoConfig = read("lib/yo/yopratiqoProductConfig.ts");
assert.match(yoConfig, /futurePremiumEnabled:\s*false/);
assert.match(yoConfig, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);
ok("YoPratiqo paid checkout remains disabled");

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

const allowedPrefixes = [
  "app/layout.tsx",
  "app/manifest.ts",
  "app/offline/page.tsx",
  "app/providers.tsx",
  "components/PwaServiceWorker.tsx",
  "components/BookingModal.tsx",
  "components/Dashboard.tsx",
  "components/TeacherProfile.tsx",
  "app/(app)/student/search/page.tsx",
  "docs/APP_READINESS_RUNBOOK.md",
  "public/manifest.json",
  "public/sw.js",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "public/icons/icon-512-maskable.png",
  "tests/ops/pwaAppReadiness.test.ts",
  "tests/ops/pwaInstallabilityVerification.test.ts",
  "tests/teacherProfile/homeLessonsMinorLaunchGate.test.ts",
  // Google-only login restore: mobile/PWA-safe redirect OAuth on /login (no email/password UI).
  "app/login/page.tsx",
  "lib/auth.ts",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  "package.json",
  "tests/auth/googleOnlyLaunch.test.ts",
  "tests/auth/googleTeacherSignup.test.ts",
  "tests/auth/onboardingRoleChoice.test.ts",
  "tests/auth/studentOnboardingConsentGate.test.ts",
  "app/api/student/onboarding-consent/route.ts",
  "components/student/StudentOnboardingConsentGate.tsx",
  "lib/auth/profileEnsure.ts",
  "lib/auth/clientAccessToken.ts",
  "lib/auth/supabaseRouteClient.ts",
  "tests/auth/adminAuthorization.test.ts",
  "tests/auth/oauthRedirectOrigin.test.ts",
  "tests/auth/teacherOnboardingIntent.test.ts",
  "tests/auth/emailPasswordAuth.test.ts",
  "lib/auth/authenticatedLoginDestination.ts",
  "lib/auth/oauthCallback.ts",
  "lib/auth/oauthReturnHandoff.ts",
  "proxy.ts",
  "components/marketing/LandingAuthGate.tsx",
  "components/marketing/LandingHeader.tsx",
  "app/connexion/page.tsx",
  "tests/auth/deterministicGoogleCallback.test.ts",
  "tests/auth/teacherSetupFlow.test.ts",
  "tests/commission/commissionModelCopy.test.ts",
  "tests/marketing/trouverUnProfPage.test.ts",
  "tests/yo/yopratiqoDominicanResponsiveLayout.test.ts",
];

const restrictedPatterns = [
  /^app\/api\/stripe\//,
  /^supabase\//,
  /^content\/legal\//,
  /^app\/\(app\)\/legal\//,
  /^lib\/payments\//,
  /^lib\/config\/membrePro\.ts$/,
  /^scripts\/generate-yopratiqo-audio\.ts$/,
  /\.mp3$/,
  /^app\/sitemap\.ts$/,
  /^app\/robots\.ts$/,
  /CourseJsonLd|CourseSchema/,
];

for (const file of changed) {
  if (ignoredUntracked.has(file)) continue;
  assert.ok(allowedPrefixes.includes(file), `unexpected file touched by PWA task: ${file}`);
  for (const pattern of restrictedPatterns) {
    assert.ok(!pattern.test(file), `restricted file touched by PWA task: ${file}`);
  }
}
ok("PWA task does not touch restricted systems");

console.log("[ops:pwa-app-readiness] tests passed");
