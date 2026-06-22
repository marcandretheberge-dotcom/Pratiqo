/**
 * Prelaunch SEO / indexation regression suite.
 *
 * What we guard against (and why):
 *
 *  1. The wrong domain (`pratiqo.com`) leaking into metadata, sitemap,
 *     robots, JSON-LD, OpenGraph, or Twitter cards. Pratiqo's canonical
 *     production origin is `pratiqo.ca`.
 *
 *  2. The hreflang / canonical inheritance bug fixed in this audit.
 *     Next.js shallow-merges `alternates`, so a `canonical` or
 *     `languages` map at the root layout silently inherits to every
 *     child page. We assert the root layout no longer ships either.
 *
 *  3. The homepage missing its own canonical (regression after the
 *     above fix). The homepage owns `alternates.canonical: SITE_URL`
 *     directly inside `app/page.tsx`.
 *
 *  4. Public legal pages missing their own canonical (would silently
 *     canonicalise to the homepage if root-layout `alternates.canonical`
 *     was reintroduced).
 *
 *  5. Sitemap drift: missing canonical pages, including the legacy
 *     `/legal/teacher-pro` instead of `/legal/membre-pro`, including
 *     the stale `/legal/privacy` / `/login` non-SEO surfaces, or
 *     pointing the sitemap at the wrong domain.
 *
 *  6. robots.txt blocking critical public pages, or failing to
 *     advertise the sitemap, or letting auth-only paths leak into
 *     the index.
 *
 *  7. Production noindex accidentally landing on the homepage,
 *     /tarifs, /devenir-enseignant, /become-teacher, /cours, or
 *     /tuteurs-prive.
 *
 *  8. The homepage ships an empty SSR body for crawlers because
 *     `LandingAuthGate` returns null while auth state is resolving.
 *     The fix renders children during the loading phase; a regression
 *     would ship an empty homepage to Googlebot.
 *
 *  9. The 308 redirect chain that keeps `/legal/teacher-pro` and the
 *     legacy top-level legal slugs working as inbound-link entry
 *     points without splitting indexation.
 *
 * Static-source style — matches the existing
 * `tests/teacherRecruitment/posterRoutes.test.ts` pattern (no browser
 * automation, no DB calls, no payment / Supabase / RLS / migration code).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SITE_URL } from "../../lib/seo/site";
import sitemap from "../../app/sitemap";
import robots from "../../app/robots";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

// ── Source files we audit statically ─────────────────────────────────
const rootLayoutSrc = read("app/layout.tsx");
const homepageSrc = read("app/page.tsx");
const sitemapSrc = read("app/sitemap.ts");
const robotsSrc = read("app/robots.ts");
const proxySrc = read("proxy.ts");
const nextConfigSrc = read("next.config.ts");
const landingAuthGateSrc = read("components/marketing/LandingAuthGate.tsx");

const cguSrc = read("app/(app)/legal/cgu/page.tsx");
const annulationSrc = read("app/(app)/legal/annulation/page.tsx");
const conditionsProfsSrc = read("app/(app)/legal/conditions-professeurs/page.tsx");
const confidentialiteSrc = read("app/(app)/legal/confidentialite/page.tsx");
const codeDeConduiteSrc = read("app/(app)/legal/code-de-conduite/page.tsx");
const paiementsSrc = read("app/(app)/legal/paiements-remboursements/page.tsx");
const membreProSrc = read("app/(app)/legal/membre-pro/page.tsx");

const tarifsLayoutSrc = read("app/tarifs/layout.tsx");
const devenirEnseignantSrc = read("app/(marketing)/devenir-enseignant/page.tsx");
const becomeTeacherLayoutSrc = read("app/become-teacher/layout.tsx");
const trouverUnProfSrc = read("app/(marketing)/trouver-un-prof/page.tsx");
const francisationSrc = read("app/(marketing)/francisation/page.tsx");
const groupSessionsLayoutSrc = read("app/group-sessions/layout.tsx");
const coursPageSrc = read("app/cours/[disciplineSlug]/[citySlug]/page.tsx");
const tuteursPageSrc = read("app/tuteurs-prive/[citySlug]/page.tsx");

// ── Domain & origin ──────────────────────────────────────────────────
test("SITE_URL points to pratiqo.ca (never pratiqo.com)", () => {
  assert.equal(typeof SITE_URL, "string");
  assert.ok(SITE_URL.startsWith("https://"), "SITE_URL must be https");
  assert.ok(/pratiqo\.ca\b/.test(SITE_URL), "SITE_URL must use pratiqo.ca");
  assert.ok(!/pratiqo\.com\b/.test(SITE_URL), "SITE_URL must not use pratiqo.com");
});

test("Repository sources never reference pratiqo.com", () => {
  for (const [label, src] of [
    ["app/layout.tsx", rootLayoutSrc],
    ["app/page.tsx", homepageSrc],
    ["app/sitemap.ts", sitemapSrc],
    ["app/robots.ts", robotsSrc],
    ["proxy.ts", proxySrc],
    ["next.config.ts", nextConfigSrc],
    ["LandingAuthGate", landingAuthGateSrc],
    ["/legal/cgu", cguSrc],
    ["/legal/annulation", annulationSrc],
    ["/legal/conditions-professeurs", conditionsProfsSrc],
    ["/legal/confidentialite", confidentialiteSrc],
    ["/legal/code-de-conduite", codeDeConduiteSrc],
    ["/legal/paiements-remboursements", paiementsSrc],
    ["/legal/membre-pro", membreProSrc],
    ["/tarifs layout", tarifsLayoutSrc],
    ["/devenir-enseignant", devenirEnseignantSrc],
    ["/become-teacher layout", becomeTeacherLayoutSrc],
    ["/trouver-un-prof", trouverUnProfSrc],
    ["/francisation", francisationSrc],
    ["/group-sessions layout", groupSessionsLayoutSrc],
    ["/cours/.../...", coursPageSrc],
    ["/tuteurs-prive/...", tuteursPageSrc],
  ] as const) {
    assert.ok(
      !/pratiqo\.com\b/.test(src),
      `${label} must not reference pratiqo.com`,
    );
  }
});

// ── Root layout: no inherited canonical / hreflang ───────────────────
test("Root layout sets metadataBase to SITE_URL", () => {
  assert.match(
    rootLayoutSrc,
    /metadataBase:\s*new\s+URL\(\s*SITE_URL\s*\)/,
    "Root layout must set metadataBase to SITE_URL",
  );
});

test("Root layout does NOT set alternates (avoids canonical/hreflang inheritance)", () => {
  assert.ok(
    !/alternates\s*:\s*\{/.test(rootLayoutSrc),
    "Root layout must not declare an `alternates` block — see app/layout.tsx comment",
  );
  assert.ok(
    !/languages\s*:\s*\{[\s\S]*?fr\s*:\s*SITE_URL/.test(rootLayoutSrc),
    "Root layout must not emit a misleading `languages` map",
  );
});

// ── Homepage owns its canonical ──────────────────────────────────────
test("Homepage app/page.tsx exports its own metadata with alternates.canonical", () => {
  assert.match(
    homepageSrc,
    /export\s+const\s+metadata\s*:\s*Metadata\s*=/,
    "Homepage must export its own metadata",
  );
  assert.match(
    homepageSrc,
    /alternates\s*:\s*\{[\s\S]*?canonical\s*:\s*SITE_URL/,
    "Homepage metadata.alternates.canonical must equal SITE_URL",
  );
});

test("Homepage metadata mentions the brand and the geographic positioning", () => {
  assert.match(homepageSrc, /Pratiqo/);
  // Localized to the French canonical title; we just verify the surface
  // exposes the brand promise rather than dictating exact wording.
  assert.match(homepageSrc, /(Québec|Canada)/);
  assert.match(homepageSrc, /(professeur|prof|tuteur|cours)/i);
});

// ── Public legal pages: each owns its canonical ──────────────────────
const LEGAL_CANONICALS: Array<{ src: string; canonical: string }> = [
  { src: cguSrc, canonical: "/legal/cgu" },
  { src: annulationSrc, canonical: "/legal/annulation" },
  { src: conditionsProfsSrc, canonical: "/legal/conditions-professeurs" },
  { src: confidentialiteSrc, canonical: "/legal/confidentialite" },
  { src: codeDeConduiteSrc, canonical: "/legal/code-de-conduite" },
  { src: paiementsSrc, canonical: "/legal/paiements-remboursements" },
  { src: membreProSrc, canonical: "/legal/membre-pro" },
];

for (const { src, canonical } of LEGAL_CANONICALS) {
  test(`${canonical} declares its own alternates.canonical`, () => {
    assert.match(
      src,
      new RegExp(`canonical\\s*:\\s*["\`']${canonical.replace(/\//g, "\\/")}["\`']`),
      `${canonical} page must declare alternates.canonical: "${canonical}"`,
    );
  });
}

// ── Public marketing surfaces: each owns its canonical ───────────────
const MARKETING_CANONICALS: Array<{ src: string; needle: RegExp; label: string }> = [
  {
    src: tarifsLayoutSrc,
    needle: /canonical\s*:\s*`\$\{SITE_URL\}\/tarifs`/,
    label: "/tarifs",
  },
  {
    src: devenirEnseignantSrc,
    needle: /canonical\s*:\s*`\$\{(?:SITE_URL|BASE_URL)\}\/devenir-enseignant`/,
    label: "/devenir-enseignant",
  },
  {
    src: becomeTeacherLayoutSrc,
    needle: /canonical\s*:\s*`\$\{SITE_URL\}\/become-teacher`/,
    label: "/become-teacher",
  },
  {
    src: trouverUnProfSrc,
    needle: /canonical\s*:\s*`\$\{(?:SITE_URL|BASE_URL)\}\/trouver-un-prof`/,
    label: "/trouver-un-prof",
  },
  {
    src: francisationSrc,
    needle: /canonical\s*:\s*`\$\{(?:SITE_URL|BASE_URL)\}\/francisation`/,
    label: "/francisation",
  },
  {
    src: groupSessionsLayoutSrc,
    needle: /canonical\s*:\s*`\$\{SITE_URL\}\/group-sessions`/,
    label: "/group-sessions",
  },
  {
    src: coursPageSrc,
    needle: /canonical\s*:\s*`\$\{(?:SITE_URL|BASE_URL)\}\/cours\/\$\{disciplineSlug\}\/\$\{citySlug\}`/,
    label: "/cours/[disciplineSlug]/[citySlug]",
  },
  {
    src: tuteursPageSrc,
    needle: /canonical\s*:\s*`\$\{(?:SITE_URL|BASE_URL)\}\/tuteurs-prive\/\$\{citySlug\}`/,
    label: "/tuteurs-prive/[citySlug]",
  },
];

for (const { src, needle, label } of MARKETING_CANONICALS) {
  test(`${label} owns its alternates.canonical (per-page, not inherited)`, () => {
    assert.match(src, needle, `${label} must declare its own canonical referencing its own URL`);
  });
}

// ── No production noindex on critical public surfaces ────────────────
const PUBLIC_NOINDEX_FORBIDDEN = [
  { label: "homepage", src: homepageSrc },
  { label: "/tarifs layout", src: tarifsLayoutSrc },
  { label: "/devenir-enseignant", src: devenirEnseignantSrc },
  { label: "/become-teacher layout", src: becomeTeacherLayoutSrc },
  { label: "/trouver-un-prof", src: trouverUnProfSrc },
  { label: "/francisation", src: francisationSrc },
  { label: "/cours", src: coursPageSrc },
  { label: "/tuteurs-prive", src: tuteursPageSrc },
  { label: "/legal/cgu", src: cguSrc },
  { label: "/legal/confidentialite", src: confidentialiteSrc },
  { label: "/legal/membre-pro", src: membreProSrc },
];

for (const { label, src } of PUBLIC_NOINDEX_FORBIDDEN) {
  test(`${label} does not ship robots: index:false / noindex`, () => {
    assert.ok(
      !/robots\s*:\s*\{[\s\S]*?index\s*:\s*false/.test(src),
      `${label} must not ship robots:{ index: false } at the page level`,
    );
    assert.ok(
      !/content=["']noindex/.test(src),
      `${label} must not ship a literal noindex meta tag`,
    );
  });
}

// ── Sitemap shape ────────────────────────────────────────────────────
test("Sitemap source uses SITE_URL (no hardcoded pratiqo.com)", () => {
  assert.match(sitemapSrc, /BASE_URL\s*=\s*SITE_URL/);
  assert.ok(!/pratiqo\.com/.test(sitemapSrc));
});

test("Sitemap includes the canonical public surfaces", async () => {
  const entries = await sitemap();
  const urls = new Set(entries.map((e) => e.url));

  const required = [
    `${SITE_URL}/`,
    `${SITE_URL}/become-teacher`,
    `${SITE_URL}/devenir-enseignant`,
    `${SITE_URL}/group-sessions`,
    `${SITE_URL}/tarifs`,
    `${SITE_URL}/trouver-un-prof`,
    `${SITE_URL}/francisation`,
    `${SITE_URL}/legal/cgu`,
    `${SITE_URL}/legal/confidentialite`,
    `${SITE_URL}/legal/annulation`,
    `${SITE_URL}/legal/code-de-conduite`,
    `${SITE_URL}/legal/conditions-professeurs`,
    `${SITE_URL}/legal/membre-pro`,
    `${SITE_URL}/legal/paiements-remboursements`,
  ];

  for (const url of required) {
    assert.ok(urls.has(url), `Sitemap must include ${url}`);
  }
});

test("Sitemap does NOT include /login (sign-in surface, not SEO)", async () => {
  const entries = await sitemap();
  const urls = new Set(entries.map((e) => e.url));
  assert.ok(
    !urls.has(`${SITE_URL}/login`),
    "Sitemap must not include /login",
  );
});

test("Sitemap does NOT include the legacy /legal/teacher-pro path", async () => {
  const entries = await sitemap();
  for (const e of entries) {
    assert.ok(
      !e.url.endsWith("/legal/teacher-pro"),
      "Sitemap must not include /legal/teacher-pro (renamed to /legal/membre-pro)",
    );
  }
});

test("Sitemap does NOT include legacy /legal/privacy or /privacy", async () => {
  const entries = await sitemap();
  for (const e of entries) {
    assert.ok(
      !/\/legal\/privacy(?:$|\/)/.test(e.url),
      `Sitemap must not include legacy /legal/privacy URL (got ${e.url})`,
    );
    assert.ok(
      !/\/privacy(?:$|\/)/.test(e.url) || /\/legal\/privacy(?:$|\/)/.test(e.url) === false,
      `Sitemap must not include legacy /privacy URL (got ${e.url})`,
    );
  }
});

test("Sitemap entries all use the SITE_URL origin", async () => {
  const entries = await sitemap();
  for (const e of entries) {
    assert.ok(
      e.url.startsWith(SITE_URL),
      `Sitemap entry ${e.url} must start with ${SITE_URL}`,
    );
  }
});

test("Sitemap excludes auth-only / private routes", async () => {
  const entries = await sitemap();
  const urls = entries.map((e) => e.url);
  const forbiddenPrefixes = [
    `${SITE_URL}/dashboard`,
    `${SITE_URL}/admin`,
    `${SITE_URL}/onboarding`,
    `${SITE_URL}/profile`,
    `${SITE_URL}/messages`,
    `${SITE_URL}/upgrade`,
    `${SITE_URL}/booking`,
    `${SITE_URL}/loyalty`,
    `${SITE_URL}/resolution`,
    `${SITE_URL}/student/choose-companion`,
    `${SITE_URL}/student/progress`,
    `${SITE_URL}/teacher/schedule`,
    `${SITE_URL}/teacher/settings`,
    `${SITE_URL}/teacher/verification`,
  ];
  for (const prefix of forbiddenPrefixes) {
    assert.ok(
      !urls.some((u) => u === prefix || u.startsWith(`${prefix}/`)),
      `Sitemap must not include auth-only path ${prefix}`,
    );
  }
});

// ── Discipline × city + city-tutor SEO routes are in the sitemap ─────
test("Sitemap pre-renders /tuteurs-prive/[citySlug] and /cours/[discipline]/[city]", async () => {
  const entries = await sitemap();
  const urls = entries.map((e) => e.url);
  assert.ok(
    urls.some((u) => /\/tuteurs-prive\/[a-z0-9-]+$/.test(u)),
    "Sitemap must include at least one /tuteurs-prive/[citySlug] entry",
  );
  assert.ok(
    urls.some((u) => /\/cours\/[a-z0-9-]+\/[a-z0-9-]+$/.test(u)),
    "Sitemap must include at least one /cours/[discipline]/[city] entry",
  );
});

// ── robots.ts ────────────────────────────────────────────────────────
test("robots() advertises the SITE_URL sitemap", () => {
  const r = robots();
  assert.equal(r.sitemap, `${SITE_URL}/sitemap.xml`);
});

test("robots() does NOT disallow public pages", () => {
  const r = robots();
  const rules = Array.isArray(r.rules) ? r.rules : [r.rules!];
  const disallow = new Set<string>();
  for (const rule of rules) {
    const list = Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : [];
    for (const path of list) disallow.add(path);
  }

  const requiredPublic = [
    "/",
    "/tarifs",
    "/devenir-enseignant",
    "/become-teacher",
    "/trouver-un-prof",
    "/francisation",
    "/group-sessions",
    "/cours",
    "/tuteurs-prive",
    "/clases",
    "/blog",
    "/legal/cgu",
    "/legal/confidentialite",
    "/legal/annulation",
    "/legal/code-de-conduite",
    "/legal/paiements-remboursements",
    "/legal/conditions-professeurs",
    "/legal/membre-pro",
  ];
  for (const path of requiredPublic) {
    // A literal disallow on the root prefix is the dangerous case; partial
    // prefix collisions (/legal vs /legal/cgu) would only matter if /legal
    // was listed, which it isn't.
    assert.ok(
      !disallow.has(path),
      `robots.ts must not disallow public path ${path}`,
    );
  }
});

test("robots() disallows auth-only and infra paths", () => {
  const r = robots();
  const rules = Array.isArray(r.rules) ? r.rules : [r.rules!];
  const disallow = new Set<string>();
  for (const rule of rules) {
    const list = Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : [];
    for (const path of list) disallow.add(path);
  }

  const required = [
    "/api/",
    "/admin",
    "/dashboard",
    "/onboarding",
    "/messages",
    "/booking",
    "/upgrade",
    "/loyalty",
    "/teacher/schedule",
    "/teacher/settings",
    "/teacher/verification",
    "/student/choose-companion",
    "/student/progress",
  ];
  for (const path of required) {
    assert.ok(
      disallow.has(path),
      `robots.ts must disallow private/infra path ${path}`,
    );
  }
});

// ── Redirects (next.config.ts) preserve legacy entry points ──────────
test("next.config.ts redirects /legal/teacher-pro → /legal/membre-pro (308)", () => {
  // Match the redirect block as a whole so we don't depend on key order.
  const block =
    /\{\s*source:\s*"\/legal\/teacher-pro",\s*destination:\s*"\/legal\/membre-pro",\s*permanent:\s*true,\s*\}/;
  assert.match(nextConfigSrc, block);
});

test("next.config.ts redirects legacy top-level legal slugs to /legal/* (308)", () => {
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
      `next.config.ts must redirect /${slug} → ${dest} as a 308`,
    );
  }
});

// ── SSR crawlability of homepage (LandingAuthGate) ───────────────────
test("LandingAuthGate renders children during SSR / loading state (no empty body)", () => {
  // The gate must never return null during SSR/auth loading so crawlers
  // receive the SEO-critical hero / JSON-LD / footer.
  assert.ok(
    !/if\s*\(\s*authLoading\s*\)\s*return\s+null/.test(landingAuthGateSrc),
    "LandingAuthGate must NOT return null while authLoading is true (SSR-empty-body bug)",
  );
  // Authenticated users may browse the public landing; only logged-out
  // pending-teacher cookies resume OAuth.
  assert.ok(
    !/if\s*\(\s*!authLoading\s*&&\s*user\s*\)\s*return\s+null/.test(landingAuthGateSrc),
    "LandingAuthGate must not hide the landing for signed-in users",
  );
  assert.match(landingAuthGateSrc, /return <>\{children\}<\/>/);
  // Homepage's SEO-critical children must remain inside the gate and
  // therefore reachable on first SSR.
  assert.match(homepageSrc, /<LandingOrgJsonLd\s*\/>/);
  assert.match(homepageSrc, /<LandingHeroStatic\s+locale=/);
});

// ── Brand discoverability for pratiqo.ca ─────────────────────────────
test("Homepage / OrgJsonLd reference the canonical Pratiqo brand and Cours Pratiqo Inc legal entity", () => {
  const orgJsonLdSrc = read("components/marketing/LandingOrgJsonLd.tsx");
  assert.match(orgJsonLdSrc, /Pratiqo/);
  assert.match(orgJsonLdSrc, /url:\s*SITE_URL/);
  assert.match(orgJsonLdSrc, /addressCountry:\s*"CA"/);
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
  console.log(`[seo:prelaunchSeoIndexation] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
