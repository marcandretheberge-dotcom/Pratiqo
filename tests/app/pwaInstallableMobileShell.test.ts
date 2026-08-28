import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import manifestRoute from "../../app/manifest";

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

const manifest = manifestRoute() as Record<string, unknown>;
const publicManifest = readJson("public/manifest.json");
assert.deepEqual(publicManifest, manifest, "public/manifest.json and app/manifest.ts must stay aligned");
assert.equal(manifest.name, "Pratiqo");
assert.equal(manifest.short_name, "Pratiqo");
assert.equal(manifest.description, "Trouvez et réservez des professeurs indépendants près de chez vous.");
assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.orientation, "portrait");
assert.equal(manifest.background_color, "#ffffff");
assert.equal(manifest.theme_color, "#1D9E75");
assert.deepEqual(manifest.categories, ["education", "lifestyle", "productivity"]);
ok("manifest has the required installable app fields");

const icons = manifest.icons as Array<{ src?: string; sizes?: string; purpose?: string }>;
for (const expected of [
  ["public/icons/icon-192.png", "192x192"],
  ["public/icons/icon-512.png", "512x512"],
  ["public/icons/icon-192-maskable.png", "192x192"],
  ["public/icons/icon-512-maskable.png", "512x512"],
  ["public/apple-touch-icon.png", "180x180"],
] as const) {
  assert.ok(existsSync(path.join(root, expected[0])), `${expected[0]} exists`);
  const [width, height] = expected[1].split("x").map(Number);
  assert.deepEqual(pngDimensions(expected[0]), { width, height }, `${expected[0]} dimensions`);
}
assert.ok(icons.some((icon) => icon.src === "/icons/icon-192-maskable.png" && icon.purpose === "maskable"));
assert.ok(icons.some((icon) => icon.src === "/icons/icon-512-maskable.png" && icon.purpose === "maskable"));
ok("required normal, maskable, and Apple icon assets exist");

const layout = read("app/layout.tsx");
assert.match(layout, /manifest:\s*"\/manifest\.json"/);
assert.match(layout, /appleWebApp:\s*\{[\s\S]*capable:\s*true/);
assert.match(layout, /title:\s*"Pratiqo"/);
assert.match(layout, /url: "\/apple-touch-icon\.png"/);
assert.match(layout, /viewportFit:\s*"cover"/);
assert.match(layout, /themeColor:\s*PRATIQO_PWA_THEME_COLOR/);
assert.doesNotMatch(layout, /alternates:\s*\{/);
ok("root metadata exposes mobile app manifest, Apple metadata, and safe viewport settings without root canonical changes");

const prompt = read("components/app/InstallAppPrompt.tsx");
assert.match(prompt, /^"use client"/);
assert.match(prompt, /beforeinstallprompt/);
assert.match(prompt, /localStorage\.setItem\(DISMISSED_KEY/);
assert.match(prompt, /display-mode: standalone/);
assert.match(prompt, /max-width: 767px/);
assert.match(prompt, /isCrawler/);
assert.match(prompt, /isSensitivePath/);
assert.match(prompt, /env\(safe-area-inset-bottom/);
assert.match(prompt, /return null/);
assert.match(prompt, /href="\/app"/);
for (const sensitive of ["/api", "/booking", "/checkout", "/login", "/student", "/teacher", "/yo/checkout"]) {
  assert.match(prompt, new RegExp(`"${sensitive.replace("/", "\\/")}"`), `install prompt must hide on ${sensitive}`);
}
ok("install prompt is mobile-only, dismissible, SSR-safe, and hidden on sensitive routes");

const appPage = read("app/app/page.tsx");
const appHelp = read("components/app/AppInstallHelpContent.tsx");
assert.match(appPage, /AppInstallHelpContent/);
assert.match(appPage, /index:\s*false/);
assert.match(appHelp, /installHeading/);
assert.match(appHelp, /installIos/);
assert.match(appHelp, /installAndroid/);
assert.match(appHelp, /benefitQuickAccess/);
assert.doesNotMatch(appHelp, /push notifications/i);
ok("/app install help page exists without promising push notifications");

const offline = read("components/app/OfflineFallback.tsx");
assert.match(offline, /offlineTitle/);
assert.match(offline, /offlineBody/);
assert.match(offline, /offlineRetry/);
assert.match(offline, /min-h-\[100dvh\]/);
ok("offline fallback uses localized copy and mobile-safe sizing");

const sw = read("public/sw.js");
const precache = sw.slice(sw.indexOf("const PRECACHE_URLS"), sw.indexOf("const AUTHENTICATED_PREFIXES"));
for (const safe of ["/offline", "/manifest.json", "/apple-touch-icon.png", "/icons/icon-192-maskable.png"]) {
  assert.match(precache, new RegExp(safe.replace(/[/.]/g, "\\$&")));
}
for (const forbidden of ["/api", "/booking", "/checkout", "/messages", "/student", "/teacher", "/upgrade", "/yo/checkout"]) {
  assert.match(sw, new RegExp(`"${forbidden.replace("/", "\\/")}"`), `SW must bypass ${forbidden}`);
  assert.doesNotMatch(precache, new RegExp(forbidden.replace("/", "\\/")), `SW must not precache ${forbidden}`);
}
assert.doesNotMatch(sw, /PushManager|showNotification|pushsubscriptionchange/);
ok("service worker keeps offline fallback and excludes private/payment routes");

const pwaCopy = read("lib/pwa/copy.ts");
for (const requiredCopy of [
  "Installer Pratiqo",
  "Install Pratiqo",
  "Instalar Pratiqo",
  "Sur iPhone",
  "On iPhone",
  "En iPhone",
  "Sur Android",
  "On Android",
  "En Android",
  "Vous êtes hors ligne.",
  "You are offline.",
  "Estás sin conexión.",
]) {
  assert.match(pwaCopy, new RegExp(requiredCopy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
ok("PWA copy exists in FR/EN/ES");

const sitemap = read("app/sitemap.ts");
assert.doesNotMatch(sitemap, /\/app["']/);
ok("/app help route is intentionally not added to public sitemap");

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

const restrictedPatterns = [
  /^app\/api\/stripe\//,
  /^app\/api\/.*checkout/i,
  /^lib\/payments\//,
  /^lib\/config\/membrePro\.ts$/,
  /^supabase\//,
  /^content\/legal\//,
  /^app\/\(app\)\/legal\//,
  /^app\/sitemap\.ts$/,
  /^app\/robots\.ts$/,
  /CourseJsonLd|CourseSchema/i,
];

for (const file of changed) {
  if (ignoredUntracked.has(file)) continue;
  for (const pattern of restrictedPatterns) {
    assert.ok(!pattern.test(file), `restricted system touched by PWA mobile shell task: ${file}`);
  }
}
ok("PWA mobile shell task avoids restricted systems");

console.log("[app:pwa-installable-mobile-shell] tests passed");
