import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function readJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(read(relativePath)) as Record<string, unknown>;
}

function ok(name: string): void {
  console.log(`ok - ${name}`);
}

function pngDimensions(relativePath: string): { width: number; height: number } {
  const buffer = readFileSync(path.join(root, relativePath));
  assert.equal(buffer.toString("ascii", 1, 4), "PNG", `${relativePath} must be a PNG`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const manifest = readJson("public/manifest.json");
const appManifestSrc = read("app/manifest.ts");
const layoutSrc = read("app/layout.tsx");
const swSrc = read("public/sw.js");
const pwaServiceWorkerSrc = read("components/PwaServiceWorker.tsx");
const offlineSrc = read("app/offline/page.tsx");
const packageJson = readJson("package.json") as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

assert.equal(manifest.name, "Pratiqo");
assert.equal(manifest.short_name, "Pratiqo");
assert.equal(manifest.description, "Trouve un professeur local ou développe tes compétences avec Pratiqo.");
assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.background_color, "#F1EFE8");
assert.equal(manifest.theme_color, "#1D9E75");
assert.equal(manifest.orientation, "portrait");
assert.equal(manifest.lang, "fr-CA");
ok("public manifest has required installability fields");

for (const required of [
  'name: "Pratiqo"',
  'short_name: "Pratiqo"',
  'start_url: "/"',
  'scope: "/"',
  'display: "standalone"',
  'background_color: "#F1EFE8"',
  'theme_color: "#1D9E75"',
  'orientation: "portrait"',
  'lang: "fr-CA"',
  'src: "/icons/icon-192.png"',
  'src: "/icons/icon-512.png"',
  'src: "/icons/icon-512-maskable.png"',
  'purpose: "maskable"',
]) {
  assert.ok(appManifestSrc.includes(required), `app/manifest.ts missing ${required}`);
}
ok("app manifest route mirrors installable PWA metadata");

const icons = manifest.icons as Array<{ src?: string; sizes?: string; type?: string; purpose?: string }>;
assert.ok(Array.isArray(icons), "manifest icons must be an array");
for (const expected of [
  { src: "/icons/icon-192.png", sizes: "192x192", file: "public/icons/icon-192.png", width: 192 },
  { src: "/icons/icon-512.png", sizes: "512x512", file: "public/icons/icon-512.png", width: 512 },
  {
    src: "/icons/icon-512-maskable.png",
    sizes: "512x512",
    file: "public/icons/icon-512-maskable.png",
    width: 512,
    purpose: "maskable",
  },
]) {
  const icon = icons.find((entry) => entry.src === expected.src);
  assert.ok(icon, `manifest missing ${expected.src}`);
  assert.equal(icon.sizes, expected.sizes);
  assert.equal(icon.type, "image/png");
  if (expected.purpose) assert.equal(icon.purpose, expected.purpose);
  assert.ok(existsSync(path.join(root, expected.file)), `${expected.file} exists`);
  assert.deepEqual(pngDimensions(expected.file), { width: expected.width, height: expected.width });
}
ok("PWA icons exist with correct sizes, including maskable icon");

assert.match(layoutSrc, /manifest:\s*"\/manifest\.json"/);
assert.match(layoutSrc, /<link rel="manifest" href="\/manifest\.json" \/>/);
assert.match(layoutSrc, /meta name="theme-color" content="#1D9E75"/);
assert.match(layoutSrc, /apple-mobile-web-app-capable" content="yes"/);
assert.match(layoutSrc, /apple-mobile-web-app-title" content="Pratiqo"/);
assert.match(layoutSrc, /apple-mobile-web-app-status-bar-style" content="default"/);
assert.match(layoutSrc, /rel="apple-touch-icon" href="\/icons\/icon-192\.png"/);
assert.match(layoutSrc, /url: "\/icons\/icon-192\.png", sizes: "192x192"/);
ok("root metadata and head reference manifest, theme color, and Apple icon");

assert.match(pwaServiceWorkerSrc, /^"use client"/);
assert.match(pwaServiceWorkerSrc, /useEffect\(\(\) =>/);
assert.match(pwaServiceWorkerSrc, /"serviceWorker" in navigator/);
assert.match(pwaServiceWorkerSrc, /window\.location\.protocol !== "https:" && window\.location\.hostname !== "localhost"/);
assert.match(pwaServiceWorkerSrc, /navigator\.serviceWorker\.register\("\/sw\.js", \{ scope: "\/" \}\)/);
assert.match(pwaServiceWorkerSrc, /best-effort/);
ok("service worker registration is browser-only and safe in development");

const precacheSlice = swSrc.slice(swSrc.indexOf("const PRECACHE_URLS"), swSrc.indexOf("const AUTHENTICATED_PREFIXES"));
for (const safe of ["/offline", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-512-maskable.png"]) {
  assert.match(precacheSlice, new RegExp(safe.replace(/[/.]/g, "\\$&")));
}
for (const forbidden of [
  "/api",
  "/account",
  "/admin",
  "/booking",
  "/checkout",
  "/dashboard",
  "/legal",
  "/loyalty",
  "/messages",
  "/onboarding",
  "/profile",
  "/resolution",
  "/student",
  "/teacher",
  "/upgrade",
  "/yo/checkout",
]) {
  assert.match(swSrc, new RegExp(`"${forbidden.replace("/", "\\/")}"`), `SW must bypass ${forbidden}`);
  assert.doesNotMatch(precacheSlice, new RegExp(forbidden.replace("/", "\\/")), `SW must not precache ${forbidden}`);
}
assert.match(swSrc, /request\.method !== "GET" \|\| url\.origin !== self\.location\.origin \|\| isSensitivePath\(url\.pathname\)/);
assert.match(swSrc, /request\.mode === "navigate"[\s\S]*caches\.match\("\/offline"\)/);
assert.match(swSrc, /if \(!isStaticAsset\(url\.pathname\)\) \{\s*return;\s*\}/);
ok("service worker bypasses sensitive routes and only caches safe static assets");

assert.ok(existsSync(path.join(root, "app/offline/page.tsx")), "offline page exists");
assert.match(offlineSrc, /Vous semblez hors ligne/);
assert.match(offlineSrc, /pages de compte, de réservation et de paiement exigent une connexion\s+active/);
assert.match(offlineSrc, /min-h-\[100dvh\]/);
ok("offline fallback exists and explains protected routes require an active connection");

const allDeps = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {}),
};
assert.ok(!("@ducanh2912/next-pwa" in allDeps), "Do not add @ducanh2912/next-pwa for this QA branch");
assert.ok(!("next-pwa" in allDeps), "Do not add next-pwa for this QA branch");
ok("no next-pwa dependency was added");

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
  "app/layout.tsx",
  "app/manifest.ts",
  "public/manifest.json",
  "tests/ops/pwaAppReadiness.test.ts",
  "tests/ops/pwaInstallabilityVerification.test.ts",
  "tests/teacherProfile/homeLessonsMinorLaunchGate.test.ts",
  // Google-only login restore on /login — uses full-page OAuth redirect (PWA/mobile safe).
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
]);

const restrictedPatterns = [
  /^app\/api\/stripe\//,
  /^app\/api\/.*checkout/,
  /^app\/api\/.*payment/,
  /^supabase\//,
  /^content\/legal\//,
  /^app\/\(app\)\/legal\//,
  /^lib\/payments\//,
  /^lib\/config\/membrePro\.ts$/,
  /^app\/sitemap\.ts$/,
  /^app\/robots\.ts$/,
  /CourseJsonLd|CourseSchema/,
  /\.mp3$/,
  /^scripts\/generate-yopratiqo-audio\.ts$/,
];

for (const file of changed) {
  if (ignoredUntracked.has(file)) continue;
  assert.ok(allowed.has(file), `unexpected file touched by PWA installability QA: ${file}`);
  for (const pattern of restrictedPatterns) {
    assert.ok(!pattern.test(file), `restricted file touched by PWA installability QA: ${file}`);
  }
}
ok("PWA installability QA does not touch restricted systems");

console.log("[ops:pwa-installability-verification] tests passed");
