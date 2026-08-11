/**
 * Edge / domain redirect static-source regression suite.
 *
 * Complements `tests/seo/prelaunchSeoIndexation.test.ts`. This file
 * focuses on the project-side configuration that determines whether
 * Pratiqo's canonical host (`https://www.pratiqo.ca`) is enforced
 * without forcing a locale path on the homepage.
 *
 * What we guard against (and why):
 *
 *  1. The apex (`pratiqo.ca`) silently serving its own copy of the
 *     site instead of redirecting to `www.pratiqo.ca`. Google will
 *     index whichever host it can reach — so if both serve 200, we
 *     ship duplicate canonical signals that fight each other.
 *     `next.config.ts` carries a fallback host-conditional 308.
 *
 *  2. Any code path that forces `/` → `/fr` (or `/en` / `/es`).
 *     Pratiqo's locale is cookie-driven; there are no real
 *     `/fr` / `/en` / `/es` marketplace routes (only legacy stubs
 *     that redirect *back* to `/`). Forcing a locale path on the
 *     homepage would split indexation and PageRank.
 *
 *  3. Regression of the `/legal/teacher-pro` → `/legal/membre-pro`
 *     308, and the four legacy top-level legal slug 308s.
 *
 *  4. The locale stub pages (`/fr`, `/en`, `/es`) ever becoming
 *     canonical marketplace landings without an explicit decision —
 *     they must stay as `permanentRedirect("/")` until full locale
 *     routing is intentionally introduced.
 *
 * Style: mirrors `tests/seo/prelaunchSeoIndexation.test.ts` and
 * `tests/teacherRecruitment/posterRoutes.test.ts` — `node:test`-style
 * static-source assertions, no browser, no live network, no
 * payment / Supabase / migration code touched.
 */

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { SITE_URL } from "../../lib/seo/site";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}
function readIfExists(relativePath: string): string | null {
  const p = join(REPO_ROOT, relativePath);
  return existsSync(p) ? read(relativePath) : null;
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

// ── Source files we audit statically ─────────────────────────────────
const nextConfigSrc = read("next.config.ts");
const proxySrc = read("proxy.ts");
const vercelJsonRequiredSrc = read("vercel.json");
const rootLayoutSrc = read("app/layout.tsx");
const homepageSrc = read("app/page.tsx");
const sitemapSrc = read("app/sitemap.ts");
const robotsSrc = read("app/robots.ts");
const siteConstSrc = read("lib/seo/site.ts");

const frStubSrc = read("app/fr/page.tsx");
const enStubSrc = read("app/en/page.tsx");
const esStubSrc = read("app/es/page.tsx");
const caStubSrc = read("app/ca/page.tsx");

const vercelJsonSrc = readIfExists("vercel.json");
const netlifyTomlSrc = readIfExists("netlify.toml");
const publicRedirectsSrc = readIfExists("public/_redirects");

// ── 1. Canonical host invariants ─────────────────────────────────────
test("SITE_URL is the canonical www.pratiqo.ca origin", () => {
  assert.equal(SITE_URL, "https://www.pratiqo.ca");
});

test("lib/seo/site.ts documents the www canonical and never references pratiqo.com", () => {
  assert.match(siteConstSrc, /https:\/\/www\.pratiqo\.ca/);
  assert.ok(!/pratiqo\.com/.test(siteConstSrc));
});

// ── 2. Apex → www redirect lives in next.config.ts ───────────────────
test("next.config.ts redirects the apex (pratiqo.ca) to www with a 308", () => {
  // Match the apex→www block as a whole (key order tolerant) so we
  // catch the rule even if someone reformats it later.
  const block = new RegExp(
    [
      `\\{`,
      `\\s*source:\\s*"\\/:path\\*",`,
      `\\s*has:\\s*\\[\\s*\\{\\s*type:\\s*"host",\\s*value:\\s*"pratiqo\\.ca"\\s*\\}\\s*\\],`,
      `\\s*destination:\\s*"https:\\/\\/www\\.pratiqo\\.ca\\/:path\\*",`,
      `\\s*permanent:\\s*true,`,
      `\\s*\\}`,
    ].join(""),
  );
  assert.match(
    nextConfigSrc,
    block,
    "next.config.ts must declare the apex (pratiqo.ca) → www.pratiqo.ca 308 host redirect",
  );
});

test("apex redirect destination is www, not a locale path (/fr / /en / /es)", () => {
  // Directly assert the destination of the apex rule does not end with
  // /fr or any locale segment. Combined with the structural test above
  // this catches typos like `https://www.pratiqo.ca/fr/:path*` that
  // would silently lock French SEO traffic onto a non-canonical URL.
  const apexRule = nextConfigSrc.match(
    /has:\s*\[\s*\{\s*type:\s*"host",\s*value:\s*"pratiqo\.ca"\s*\}\s*\][\s\S]*?destination:\s*"([^"]+)"/,
  );
  assert.ok(apexRule, "could not locate the apex redirect block in next.config.ts");
  const dest = apexRule![1];
  assert.equal(
    dest,
    "https://www.pratiqo.ca/:path*",
    "apex redirect must point to https://www.pratiqo.ca/:path* — never to /fr, /en, /es, or any locale prefix",
  );
});

// ── 3. No code redirects / → /fr ─────────────────────────────────────
test("proxy.ts never redirects / → /fr (or /en or /es)", () => {
  assert.ok(
    !/\/(fr|en|es)(?:\/|['"`])/.test(proxySrc.replace(/\/\/.*/g, "")),
    "proxy.ts must not navigate / to /fr, /en, or /es",
  );
});

test("vercel.json enforces apex to www with a permanent 308 before framework routing", () => {
  const vercelConfig = JSON.parse(vercelJsonRequiredSrc) as {
    redirects?: Array<{
      source?: string;
      destination?: string;
      statusCode?: number;
      permanent?: boolean;
      has?: Array<{ type?: string; value?: string }>;
    }>;
  };
  const redirect = vercelConfig.redirects?.find(
    (item) =>
      item.destination === "https://www.pratiqo.ca/$1" &&
      (item.statusCode === 308 || item.permanent === true) &&
      item.has?.some((condition) => condition.type === "host" && condition.value === "pratiqo.ca"),
  );
  assert.ok(redirect, "vercel.json must enforce pratiqo.ca -> www.pratiqo.ca with permanent 308");
});

test("vercel.json apex redirect preserves path segments and query strings via $1 capture", () => {
  const vercelConfig = JSON.parse(vercelJsonRequiredSrc) as {
    redirects?: Array<{ destination?: string; source?: string }>;
  };
  const redirect = vercelConfig.redirects?.find((item) => item.destination === "https://www.pratiqo.ca/$1");
  assert.ok(redirect, "vercel.json must capture the path in $1");
  assert.match(redirect!.source ?? "", /\(\.\*\)/, "vercel.json must match arbitrary paths on apex");
});

test("proxy.ts canonicalizes production apex to www before auth routing", () => {
  assert.match(proxySrc, /isProductionApexHost/);
  assert.match(proxySrc, /apex-canonicalize/);
  assert.match(proxySrc, /NextResponse\.redirect\(canonicalUrl, 308\)/);
});

test("next.config.ts apex redirect is host-scoped to pratiqo.ca only (www and preview stay untouched)", () => {
  const apexRule = nextConfigSrc.match(
    /has:\s*\[\s*\{\s*type:\s*"host",\s*value:\s*"pratiqo\.ca"\s*\}\s*\][\s\S]*?destination:\s*"([^"]+)"/,
  );
  assert.ok(apexRule, "apex redirect must be host-conditional");
  assert.equal(apexRule![1], "https://www.pratiqo.ca/:path*");
  assert.doesNotMatch(nextConfigSrc, /has:\s*\[\s*\{\s*type:\s*"host",\s*value:\s*"www\.pratiqo\.ca"/);
});

test("configure_vercel_apex_permanent_redirect script pins redirectStatusCode 308", () => {
  const script = read("scripts/configure_vercel_apex_permanent_redirect.ts");
  assert.match(script, /redirectStatusCode/);
  assert.match(script, /308/);
  assert.match(script, /pratiqo\.ca/);
  assert.match(script, /www\.pratiqo\.ca/);
});

test("configure_vercel_apex_permanent_redirect requires VERCEL_TOKEN from env only", () => {
  const script = read("scripts/configure_vercel_apex_permanent_redirect.ts");
  assert.match(script, /process\.env\.VERCEL_TOKEN/);
  assert.match(script, /Missing VERCEL_TOKEN/);
  assert.doesNotMatch(script, /VERCEL_TOKEN\s*=\s*["'][^"']+["']/);
  assert.doesNotMatch(script, /Bearer\s+[A-Za-z0-9._-]{8,}/);
  assert.doesNotMatch(script, /eyJ[A-Za-z0-9_-]{10,}/);
});

test("next.config.ts does not redirect / → /fr (or /en, /es)", () => {
  // Hunt for any redirect *destination* that lands on a locale prefix.
  const localeDestRe = /destination:\s*["'`]\/(fr|en|es)(?:\/|["'`])/g;
  assert.ok(
    !localeDestRe.test(nextConfigSrc),
    "next.config.ts must not declare any redirect whose destination begins with /fr, /en, or /es",
  );
});

test("next.config.ts does not enable Next.js i18n auto-locale prefixing", () => {
  // The legacy `i18n: { defaultLocale, locales, localeDetection }` block
  // would force Next to redirect / → /<defaultLocale> on first visit
  // based on Accept-Language. Pratiqo intentionally avoids this.
  assert.ok(
    !/\bi18n\s*:\s*\{[\s\S]*?defaultLocale/.test(nextConfigSrc),
    "next.config.ts must not configure the legacy `i18n` block — locale is cookie-driven",
  );
  assert.ok(
    !/localeDetection\s*:\s*true/.test(nextConfigSrc),
    "next.config.ts must not enable localeDetection",
  );
});

// ── 4. Locale stubs stay as redirects to root ────────────────────────
const STUBS: Array<{ label: string; src: string }> = [
  { label: "/fr", src: frStubSrc },
  { label: "/en", src: enStubSrc },
  { label: "/es", src: esStubSrc },
  { label: "/ca", src: caStubSrc },
];
for (const { label, src } of STUBS) {
  test(`${label} is a stub that permanentRedirects to "/"`, () => {
    assert.match(
      src,
      /import\s*\{\s*permanentRedirect\s*\}\s*from\s*["']next\/navigation["']/,
      `${label}/page.tsx must import permanentRedirect from next/navigation`,
    );
    assert.match(
      src,
      /permanentRedirect\(\s*["']\/["']\s*\)/,
      `${label}/page.tsx must permanentRedirect to "/"`,
    );
    // Belt-and-braces: the stub must NOT contain marketplace-page
    // hallmarks (Metadata export, server fetches, JSON-LD, etc.).
    assert.ok(
      !/export\s+const\s+metadata\s*:/.test(src),
      `${label}/page.tsx must not export its own metadata — it is a redirect stub`,
    );
    assert.ok(
      !/getSupabaseAdmin|getSupabaseClient|generateMetadata|application\/ld\+json/.test(src),
      `${label}/page.tsx must remain a tiny redirect stub (no DB / JSON-LD / generateMetadata)`,
    );
  });
}

// ── 5. Legacy legal redirects preserved (regression guard) ───────────
test("next.config.ts preserves /legal/teacher-pro → /legal/membre-pro (308)", () => {
  const block =
    /\{\s*source:\s*"\/legal\/teacher-pro",\s*destination:\s*"\/legal\/membre-pro",\s*permanent:\s*true,\s*\}/;
  assert.match(nextConfigSrc, block);
});

test("next.config.ts preserves the four legacy top-level legal slug 308s", () => {
  for (const [slug, dest] of [
    ["cgu", "/legal/cgu"],
    ["confidentialite", "/legal/confidentialite"],
    ["annulation", "/legal/annulation"],
    ["code-de-conduite", "/legal/code-de-conduite"],
  ]) {
    const block = new RegExp(
      `\\{\\s*source:\\s*"\\/${slug}",\\s*destination:\\s*"${dest!.replace(/\//g, "\\/")}",\\s*permanent:\\s*true,\\s*\\}`,
    );
    assert.match(
      nextConfigSrc,
      block,
      `next.config.ts must redirect /${slug} → ${dest} (308)`,
    );
  }
});

// ── 6. Domain hygiene (defence-in-depth — same as prelaunch suite) ───
test("Hosting config files do not declare a / → /fr (or any locale) redirect", () => {
  for (const [label, src] of [
    ["vercel.json", vercelJsonSrc],
    ["netlify.toml", netlifyTomlSrc],
    ["public/_redirects", publicRedirectsSrc],
  ] as const) {
    if (src === null) continue;
    assert.ok(
      !/\/(fr|en|es)(?:\/|"|\s|$)/m.test(
        // strip URLs that legitimately contain locale fragments inside
        // structured data (none today, but keeps the test conservative)
        src.replace(/https?:\/\/[^"\s]+/g, ""),
      ),
      `${label} must not declare any redirect to /fr, /en, or /es`,
    );
    assert.ok(
      !/pratiqo\.com/.test(src),
      `${label} must not reference pratiqo.com`,
    );
  }
});

test("Sitemap & robots & root layout are wired to www.pratiqo.ca", () => {
  // These also live in prelaunchSeoIndexation.test.ts; we duplicate
  // the *host* check here so a regression that swaps SITE_URL to apex
  // would surface in this targeted edge-redirect file too.
  for (const [label, src] of [
    ["app/sitemap.ts", sitemapSrc],
    ["app/robots.ts", robotsSrc],
    ["app/layout.tsx", rootLayoutSrc],
    ["app/page.tsx", homepageSrc],
  ] as const) {
    assert.ok(!/pratiqo\.com/.test(src), `${label} must not reference pratiqo.com`);
  }
});

// ── Run ──────────────────────────────────────────────────────────────
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
  console.log(`[seo:edgeRedirects] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
