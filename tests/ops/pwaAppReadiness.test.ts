import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import manifestRoute from "../../app/manifest";

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function ok(name: string) {
  console.log(`ok - ${name}`);
}

const manifestPath = path.join(root, "public/manifest.json");
assert.ok(existsSync(manifestPath), "public/manifest.json exists");
const publicManifest = JSON.parse(read("public/manifest.json"));
const manifest = manifestRoute();
assert.deepEqual(publicManifest, manifest);
assert.equal(manifest.name, "Pratiqo");
assert.equal(manifest.short_name, "Pratiqo");
assert.equal(manifest.description, "Trouve un professeur local ou développe tes compétences avec Pratiqo.");
assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.background_color, "#F1EFE8");
assert.equal(manifest.theme_color, "#1D9E75");
assert.equal(manifest.lang, "fr-CA");
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2);
assert.ok(manifest.icons.some((icon) => icon.src === "/icons/icon-512-maskable.png" && icon.purpose === "maskable"));
ok("generated manifest has required installability fields and public manifest mirrors it");

for (const icon of ["public/icons/icon-192.png", "public/icons/icon-512.png", "public/icons/icon-512-maskable.png"]) {
  assert.ok(existsSync(path.join(root, icon)), `${icon} exists`);
}
ok("PWA icons exist");

const layout = read("app/layout.tsx");
assert.match(layout, /import type \{ Metadata, Viewport \} from "next"/);
assert.match(layout, /applicationName:\s*"Pratiqo"/);
assert.match(layout, /manifest:\s*"\/manifest\.webmanifest"/);
assert.match(layout, /appleWebApp:\s*\{/);
assert.match(layout, /capable:\s*true/);
assert.match(layout, /title:\s*"Pratiqo"/);
assert.match(layout, /statusBarStyle:\s*"default"/);
assert.match(layout, /export const viewport: Viewport = \{/);
assert.match(layout, /viewportFit:\s*"cover"/);
assert.match(layout, /themeColor:\s*"#1D9E75"/);
assert.match(layout, /url: "\/icons\/icon-192\.png", sizes: "192x192"/);
assert.doesNotMatch(layout, /<meta name="theme-color"/);
assert.doesNotMatch(layout, /<link rel="manifest"/);
ok("root layout uses Next metadata and viewport exports for PWA and Apple app tags");

assert.ok(existsSync(path.join(root, "app/offline/page.tsx")), "offline page exists");
assert.match(read("app/offline/page.tsx"), /Vous semblez hors ligne/);
ok("offline fallback page exists");

const sw = read("public/sw.js");
assert.doesNotMatch(sw, /PushManager|showNotification|pushsubscriptionchange/);
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
  // Phase 2a mobile-first polish: visual spacing/tap-target changes only.
  "components/AppShell.tsx",
  "components/Dashboard.tsx",
  "app/(app)/student/choose-companion/page.tsx",
  "app/(app)/onboarding/teacher/page.tsx",
  "tests/auth/teacherOnboardingFlow.test.ts",
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
