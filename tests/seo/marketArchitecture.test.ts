import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { emptySupplySitemap as sitemap } from "./emptySupplySitemap";
import { PRATIQO_MARKETS } from "../../lib/config/markets";
import { SITE_URL } from "../../lib/seo/site";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function exists(relativePath: string): boolean {
  return existsSync(join(REPO_ROOT, relativePath));
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const marketConfigSrc = read("lib/config/markets.ts");
const uyPageSrc = read("app/uy/page.tsx");
const sitemapSrc = read("app/sitemap.ts");
const robotsSrc = read("app/robots.ts");
const proxySrc = read("proxy.ts");
const nextConfigSrc = read("next.config.ts");
const caPageSrc = read("app/ca/page.tsx");
const frPageSrc = read("app/fr/page.tsx");
const clasesRootSrc = read("app/clases/page.tsx");
const clasesMontevideoSrc = read("app/clases/montevideo/page.tsx");
const clasesBarrioSrc = read("app/clases/montevideo/[barrioSlug]/page.tsx");
const teacherProfileLayoutSrc = read("app/teacher/profile/layout.tsx");
const architectureDocSrc = read("docs/MARKET_ARCHITECTURE_QUEBEC_CANADA_URUGUAY.md");

test("market config models Canada as launched and Uruguay as next market", () => {
  assert.equal(PRATIQO_MARKETS.CA.status, "LAUNCHED");
  assert.equal(PRATIQO_MARKETS.CA.capabilities.seoEnabled, true);
  assert.equal(PRATIQO_MARKETS.CA.capabilities.teacherPublishingEnabled, true);
  assert.equal(PRATIQO_MARKETS.CA.capabilities.bookingEnabled, true);
  assert.equal(PRATIQO_MARKETS.CA.capabilities.paymentsEnabled, true);
  assert.equal(PRATIQO_MARKETS.CA.capabilities.payoutsEnabled, true);
  assert.equal(PRATIQO_MARKETS.CA.capabilities.membreProEnabled, true);

  assert.equal(PRATIQO_MARKETS.UY.status, "NEXT_MARKET");
  assert.equal(PRATIQO_MARKETS.UY.capabilities.seoEnabled, true);
  assert.equal(PRATIQO_MARKETS.UY.capabilities.teacherSignupEnabled, false);
  assert.equal(PRATIQO_MARKETS.UY.capabilities.teacherPublishingEnabled, false);
  assert.equal(PRATIQO_MARKETS.UY.capabilities.studentSearchEnabled, false);
  assert.equal(PRATIQO_MARKETS.UY.capabilities.bookingEnabled, false);
  assert.equal(PRATIQO_MARKETS.UY.capabilities.paymentsEnabled, false);
  assert.equal(PRATIQO_MARKETS.UY.capabilities.payoutsEnabled, false);
  assert.equal(PRATIQO_MARKETS.UY.capabilities.membreProEnabled, false);
});

test("market config exposes explicit product states and capabilities", () => {
  assert.match(marketConfigSrc, /type PratiqoMarketStatus/);
  for (const status of ["LAUNCHED", "NEXT_MARKET", "PLANNED", "DISABLED"]) {
    assert.match(marketConfigSrc, new RegExp(`"${status}"`));
  }
  for (const capability of [
    "seoEnabled",
    "teacherSignupEnabled",
    "teacherPublishingEnabled",
    "studentSearchEnabled",
    "bookingEnabled",
    "paymentsEnabled",
    "payoutsEnabled",
    "membreProEnabled",
  ]) {
    assert.match(marketConfigSrc, new RegExp(`${capability}: boolean`));
  }
});

test("/uy route exists as a real next-market SEO page", () => {
  assert.equal(exists("app/uy/page.tsx"), true);
  assert.match(uyPageSrc, /Pratiqo arrive en Uruguay/);
  assert.match(uyPageSrc, /Pratiqo llega pronto a Uruguay/);
  assert.match(uyPageSrc, /canonical:\s*`\$\{SITE_URL\}\/uy`/);
  assert.match(uyPageSrc, /PRATIQO_MARKETS\.UY\.capabilities\.seoEnabled/);
  assert.doesNotMatch(uyPageSrc, /request\.geo|x-vercel-ip-country|cf-ipcountry|Accept-Language/);
});

test("/uy copy does not claim active Uruguay bookings, payouts, or Membre Pro", () => {
  assert.match(uyPageSrc, /r.servations pay.es[\s\S]{0,120}pas encore/i);
  assert.match(uyPageSrc, /versements aux professeurs[\s\S]{0,120}pas encore/i);
  assert.match(uyPageSrc, /Membre Pro[\s\S]{0,120}pas encore/i);
  assert.match(uyPageSrc, /reservas pagas[\s\S]{0,120}todav.a no/i);
  assert.match(uyPageSrc, /pagos a profesores[\s\S]{0,120}todav.a no/i);
  assert.doesNotMatch(uyPageSrc, /Reservez maintenant|Reservar ahora|Book now|checkout|stripe/i);
  assert.doesNotMatch(uyPageSrc, /profesores verificados en Montevideo|fake teachers/i);
});

test("sitemap includes /uy and excludes redirect/private/broken market URLs", async () => {
  const entries = await sitemap();
  const urls = entries.map((entry) => entry.url);

  assert.ok(urls.includes(`${SITE_URL}/uy`), "sitemap must include the real /uy page");
  for (const forbidden of [
    `${SITE_URL}/fr`,
    `${SITE_URL}/en`,
    `${SITE_URL}/es`,
    `${SITE_URL}/ca`,
    `${SITE_URL}/teacher/profile`,
    `${SITE_URL}/clases`,
    `${SITE_URL}/clases/montevideo`,
  ]) {
    assert.ok(!urls.includes(forbidden), `sitemap must not include redirect/private URL ${forbidden}`);
  }
  assert.ok(
    !urls.some((url) => /\/clases\/montevideo\//.test(url)),
    "sitemap must not include old Uruguay barrio experiment URLs",
  );
  assert.ok(
    !urls.some((url) => /\/(admin|student|dashboard|messages|booking|upgrade)(?:\/|$)/.test(url)),
    "sitemap must exclude private app routes",
  );
});

test("legacy market/language routes have explicit redirect behavior", () => {
  assert.match(frPageSrc, /permanentRedirect\(\s*["']\/["']\s*\)/);
  assert.match(caPageSrc, /permanentRedirect\(\s*["']\/["']\s*\)/);
  assert.match(clasesRootSrc, /permanentRedirect\(\s*["']\/uy["']\s*\)/);
  assert.match(clasesMontevideoSrc, /permanentRedirect\(\s*["']\/uy["']\s*\)/);
  assert.match(clasesBarrioSrc, /permanentRedirect\(\s*["']\/uy["']\s*\)/);
});

test("legacy /teacher/profile surface is noindex and absent from sitemap source", () => {
  assert.match(teacherProfileLayoutSrc, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,?\s*\}/);
  assert.doesNotMatch(sitemapSrc, /\/teacher\/profile`/);
});

test("SEO routing does not use IP or Accept-Language based market cloaking", () => {
  for (const [label, src] of [
    ["proxy.ts", proxySrc],
    ["next.config.ts", nextConfigSrc],
    ["app/sitemap.ts", sitemapSrc],
    ["app/robots.ts", robotsSrc],
    ["app/uy/page.tsx", uyPageSrc],
  ] as const) {
    const executable = src.replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(
      executable,
      /request\.geo|x-vercel-ip-country|cf-ipcountry|Accept-Language|geo\s*IP/i,
      `${label} must not branch indexable SEO by IP, country header, or Accept-Language`,
    );
  }
});

test("robots keeps private surfaces blocked and does not block /uy", () => {
  assert.match(robotsSrc, /\/admin/);
  assert.match(robotsSrc, /\/student\/choose-companion/);
  assert.match(robotsSrc, /\/teacher\/settings/);
  assert.doesNotMatch(robotsSrc, /["']\/uy["']/);
});

test("hreflang policy is conservative", () => {
  assert.doesNotMatch(uyPageSrc, /languages\s*:/);
  assert.doesNotMatch(uyPageSrc, /hreflang/i);
  assert.match(architectureDocSrc, /hreflang only when valid/);
});

test("required market architecture policy document exists", () => {
  assert.match(
    architectureDocSrc,
    /Pratiqo does not use IP-based SEO cloaking or locale-adaptive content for indexable pages\./,
  );
  assert.match(
    architectureDocSrc,
    /Quebec and Canada are launched\. Uruguay is the next planned market\.|Québec and Canada are launched\. Uruguay is the next planned market\./,
  );
  assert.match(architectureDocSrc, /Payment \/ Payout \/ Booking Separation/);
  assert.match(architectureDocSrc, /Search Console Cleanup Plan/);
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
  console.log(`[seo:marketArchitecture] ${tests.length} tests passed`);
}

void run();
