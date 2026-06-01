/**
 * Post-deploy YoPratiqo SEO verification.
 *
 * This is an OPT-IN, LIVE-NETWORK script. It fetches the production
 * site (https://www.pratiqo.ca by default) and asserts the controlled
 * indexation contract shipped in `feat(yo): enable controlled
 * indexation for language landing pages`:
 *
 *   - /yo/langues + the five /yo/langues/{language} landing pages are
 *     indexable (HTTP 200, canonical pinned to www.pratiqo.ca, no
 *     `noindex` in robots meta).
 *   - /yo/langues/{language}/intro pages stay noindex (robots meta
 *     contains `noindex`) even though they answer 200.
 *   - Course JSON-LD is published ONLY on the five language landing
 *     pages. The hub and the intro pages must NOT advertise a Course.
 *   - The Course schema provider is Cours Pratiqo Inc. / Pratiqo and
 *     contains no fake commercial signals (aggregateRating, review,
 *     offers, price, courseInstance, certification, accreditation, or
 *     guaranteed outcomes).
 *   - /sitemap.xml advertises /yo/langues + the five landing pages and
 *     never lists an /intro URL. /robots.txt references the sitemap,
 *     does not disallow /yo/langues, and never references pratiqo.com.
 *
 * The script is intentionally NOT wired into `validate:launch` or
 * `test:launch-critical` — both run in CI / offline contexts where
 * outbound requests would either fail or hit a different environment.
 *
 * Run it manually after a production deploy:
 *
 *     npm run verify:yopratiqo-seo-deploy
 *     # or, against a preview deploy:
 *     tsx scripts/verify_yopratiqo_seo_deploy.ts --base https://staging.pratiqo.ca
 *
 * Exit code 0 on success, 1 on any failed expectation. Prints a brief
 * `ok - …` / `not ok - …` line per check (TAP-ish, matches the rest
 * of the Pratiqo test/script suite).
 *
 * No heavy dependencies, no Playwright, no headless browser — uses
 * Node's built-in fetch + a few targeted regexes against the rendered
 * HTML of each page.
 */

const DEFAULT_BASE = "https://www.pratiqo.ca";

const LANGUAGE_SLUGS = [
  "anglais",
  "francais-quebec",
  "espagnol",
  "japonais",
  "italien",
] as const;

type CheckResult = {
  name: string;
  ok: boolean;
  details?: string;
};

type FetchedPage = {
  url: string;
  status: number;
  finalUrl: string;
  body: string;
};

function parseArgs(argv: readonly string[]): { base: string; json: boolean } {
  let base = DEFAULT_BASE;
  let json = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if ((arg === "--base" || arg === "-b") && argv[i + 1]) {
      base = argv[i + 1].replace(/\/$/, "");
      i += 1;
    } else if (arg === "--json") {
      json = true;
    }
  }
  return { base, json };
}

function recordCheck(
  results: CheckResult[],
  name: string,
  ok: boolean,
  details?: string,
): void {
  results.push({ name, ok, details });
  if (ok) {
    console.log(`ok - ${name}${details ? ` :: ${details}` : ""}`);
  } else {
    console.error(`not ok - ${name}${details ? ` :: ${details}` : ""}`);
  }
}

async function fetchPage(url: string): Promise<FetchedPage> {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      // Identify the request honestly so it shows up in logs as a QA probe
      // rather than a generic Node fetch.
      "user-agent": "PratiqoSeoVerifier/1.0 (+post-deploy-qa)",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  const body = await res.text();
  return { url, status: res.status, finalUrl: res.url || url, body };
}

// ── HTML extractors ──────────────────────────────────────────────────
//
// Next.js renders metadata into the document head as deterministic
// `<meta>` and `<link>` tags, and JSON-LD into `<script type=
// "application/ld+json">`. The regexes below tolerate single/double
// quotes and arbitrary attribute order but are intentionally narrow
// — the goal is post-deploy verification, not a generic HTML parser.

function attrValue(tag: string, attr: string): string | null {
  const re = new RegExp(`${attr}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i");
  const match = tag.match(re);
  if (!match) return null;
  return (match[2] ?? match[3] ?? "").trim();
}

function extractCanonical(html: string): string | null {
  const re = /<link\b[^>]*rel\s*=\s*("|')canonical\1[^>]*>/gi;
  const match = re.exec(html);
  if (!match) return null;
  return attrValue(match[0], "href");
}

function extractMeta(html: string, name: string): string | null {
  // Match <meta name="..."> or <meta property="..."> in either order.
  const re = new RegExp(
    `<meta\\b[^>]*(?:name|property)\\s*=\\s*("|')${name}\\1[^>]*>`,
    "i",
  );
  const match = html.match(re);
  if (!match) return null;
  return attrValue(match[0], "content");
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  return match[1].trim();
}

function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  const re =
    /<script\b[^>]*type\s*=\s*("|')application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    blocks.push(m[2].trim());
  }
  return blocks;
}

type ParsedJsonLd = Record<string, unknown> | null;

function findCourseSchema(html: string): ParsedJsonLd {
  for (const block of extractJsonLdBlocks(html)) {
    try {
      const parsed = JSON.parse(block);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of candidates) {
        if (
          entry &&
          typeof entry === "object" &&
          (entry as Record<string, unknown>)["@type"] === "Course"
        ) {
          return entry as Record<string, unknown>;
        }
      }
    } catch {
      // Malformed JSON-LD blocks are reported separately by their host
      // pages — ignore here so a single broken block does not mask the
      // Course schema check we actually care about.
    }
  }
  return null;
}

function htmlHasCourseJsonLd(html: string): boolean {
  return findCourseSchema(html) !== null;
}

const FORBIDDEN_COMMERCIAL_FIELDS = [
  "aggregateRating",
  "review",
  "offers",
  "price",
  "priceCurrency",
  "courseInstance",
  "hasCourseInstance",
  "certification",
  "accreditation",
  "guaranteedOutcome",
] as const;

function checkRouteIndexable(
  results: CheckResult[],
  page: FetchedPage,
  expectedCanonical: string,
  routeLabel: string,
): void {
  // 1. HTTP 200
  recordCheck(
    results,
    `${routeLabel} responds 200`,
    page.status === 200,
    `status=${page.status}${page.url !== page.finalUrl ? ` finalUrl=${page.finalUrl}` : ""}`,
  );

  // 2. canonical pinned to www.pratiqo.ca + exact route
  const canonical = extractCanonical(page.body);
  recordCheck(
    results,
    `${routeLabel} canonical = ${expectedCanonical}`,
    canonical === expectedCanonical,
    `canonical=${canonical ?? "(none)"}`,
  );

  // 3. robots meta does not contain "noindex"
  const robots = extractMeta(page.body, "robots");
  const robotsNoindex = robots !== null && /\bnoindex\b/i.test(robots);
  recordCheck(
    results,
    `${routeLabel} robots meta has no "noindex"`,
    !robotsNoindex,
    `robots=${robots ?? "(none — Next.js default = indexable)"}`,
  );

  // 4. <title> exists + mentions Pratiqo / YoPratiqo
  const title = extractTitle(page.body);
  const titleMentionsBrand = !!title && /pratiqo/i.test(title);
  recordCheck(
    results,
    `${routeLabel} title exists and mentions Pratiqo / YoPratiqo`,
    titleMentionsBrand,
    `title=${title ?? "(none)"}`,
  );

  // 5. description present
  const description = extractMeta(page.body, "description");
  recordCheck(
    results,
    `${routeLabel} description meta present`,
    !!description && description.length > 0,
    `length=${description?.length ?? 0}`,
  );

  // 6. OG title + URL (best-effort — metadata helper sets both)
  const ogTitle = extractMeta(page.body, "og:title");
  const ogUrl = extractMeta(page.body, "og:url");
  recordCheck(
    results,
    `${routeLabel} OpenGraph title + url present`,
    !!ogTitle && !!ogUrl,
    `og:title=${ogTitle ? "yes" : "no"} og:url=${ogUrl ?? "(none)"}`,
  );
}

function checkCourseSchemaPresent(
  results: CheckResult[],
  page: FetchedPage,
  routeLabel: string,
): void {
  const schema = findCourseSchema(page.body);
  recordCheck(
    results,
    `${routeLabel} Course JSON-LD present`,
    schema !== null,
    schema ? "Course found" : "no Course block",
  );

  if (!schema) return;

  // Provider identity
  const provider = (schema["provider"] ?? null) as Record<string, unknown> | null;
  const providerName = provider ? String(provider["name"] ?? "") : "";
  const providerAlt = provider ? String(provider["alternateName"] ?? "") : "";
  const okProvider =
    providerName === "Cours Pratiqo Inc." && providerAlt === "Pratiqo";
  recordCheck(
    results,
    `${routeLabel} Course provider = Cours Pratiqo Inc. / Pratiqo`,
    okProvider,
    `provider.name="${providerName}" provider.alternateName="${providerAlt}"`,
  );

  // Canonical URL stays on www.pratiqo.ca
  const schemaUrl = String(schema["url"] ?? "");
  recordCheck(
    results,
    `${routeLabel} Course schema url uses https://www.pratiqo.ca`,
    schemaUrl.startsWith("https://www.pratiqo.ca/"),
    `url=${schemaUrl || "(none)"}`,
  );

  // No fake commercial signals
  const serialized = JSON.stringify(schema);
  const violations = FORBIDDEN_COMMERCIAL_FIELDS.filter((field) =>
    new RegExp(`"${field}"`, "i").test(serialized),
  );
  recordCheck(
    results,
    `${routeLabel} Course schema has no fake aggregateRating/review/offers/price/courseInstance/certification/accreditation/guarantee`,
    violations.length === 0,
    violations.length === 0
      ? "ok"
      : `forbidden fields detected: ${violations.join(", ")}`,
  );
}

function checkCourseSchemaAbsent(
  results: CheckResult[],
  page: FetchedPage,
  routeLabel: string,
): void {
  const present = htmlHasCourseJsonLd(page.body);
  recordCheck(
    results,
    `${routeLabel} does NOT advertise a Course schema`,
    !present,
    present ? "Course block present (must be removed)" : "no Course block",
  );
}

function checkRouteNoindex(
  results: CheckResult[],
  page: FetchedPage,
  expectedCanonical: string,
  routeLabel: string,
): void {
  // 1. HTTP 200 — pages still answer, they just stay out of the index.
  recordCheck(
    results,
    `${routeLabel} responds 200`,
    page.status === 200,
    `status=${page.status}`,
  );

  // 2. canonical correct
  const canonical = extractCanonical(page.body);
  recordCheck(
    results,
    `${routeLabel} canonical = ${expectedCanonical}`,
    canonical === expectedCanonical,
    `canonical=${canonical ?? "(none)"}`,
  );

  // 3. robots meta MUST contain "noindex"
  const robots = extractMeta(page.body, "robots");
  const hasNoindex = !!robots && /\bnoindex\b/i.test(robots);
  recordCheck(
    results,
    `${routeLabel} robots meta contains "noindex"`,
    hasNoindex,
    `robots=${robots ?? "(none — DEFAULTING TO INDEXABLE)"}`,
  );
}

async function checkSitemap(
  results: CheckResult[],
  base: string,
): Promise<{ urls: string[]; raw: string; status: number }> {
  const url = `${base}/sitemap.xml`;
  let raw = "";
  let status = 0;
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    status = res.status;
    raw = await res.text();
  } catch (err) {
    recordCheck(results, `/sitemap.xml fetch`, false, String(err));
    return { urls: [], raw: "", status: 0 };
  }
  recordCheck(
    results,
    `/sitemap.xml responds 200`,
    status === 200,
    `status=${status}`,
  );

  const urls = Array.from(raw.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) =>
    m[1].trim(),
  );

  recordCheck(
    results,
    `/sitemap.xml includes /yo/langues`,
    urls.includes(`${base}/yo/langues`),
    urls.includes(`${base}/yo/langues`) ? "found" : "NOT FOUND",
  );

  const missingLanding = LANGUAGE_SLUGS.filter(
    (slug) => !urls.includes(`${base}/yo/langues/${slug}`),
  );
  recordCheck(
    results,
    `/sitemap.xml includes the five /yo/langues/{language} landing pages`,
    missingLanding.length === 0,
    missingLanding.length === 0
      ? "all five present"
      : `missing: ${missingLanding.join(", ")}`,
  );

  const introLeaks = LANGUAGE_SLUGS.filter((slug) =>
    urls.includes(`${base}/yo/langues/${slug}/intro`),
  );
  recordCheck(
    results,
    `/sitemap.xml does NOT include any /yo/langues/{language}/intro page`,
    introLeaks.length === 0,
    introLeaks.length === 0
      ? "no intro URLs"
      : `intro URLs leaked: ${introLeaks.join(", ")}`,
  );

  recordCheck(
    results,
    `/sitemap.xml uses https://www.pratiqo.ca and never pratiqo.com`,
    /<loc>https:\/\/www\.pratiqo\.ca/.test(raw) && !/pratiqo\.com/.test(raw),
    `www=${/<loc>https:\/\/www\.pratiqo\.ca/.test(raw) ? "yes" : "no"} pratiqo.com=${
      /pratiqo\.com/.test(raw) ? "PRESENT" : "absent"
    }`,
  );

  return { urls, raw, status };
}

async function checkRobotsTxt(
  results: CheckResult[],
  base: string,
): Promise<{ raw: string; status: number }> {
  const url = `${base}/robots.txt`;
  let raw = "";
  let status = 0;
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    status = res.status;
    raw = await res.text();
  } catch (err) {
    recordCheck(results, `/robots.txt fetch`, false, String(err));
    return { raw: "", status: 0 };
  }
  recordCheck(
    results,
    `/robots.txt responds 200`,
    status === 200,
    `status=${status}`,
  );

  const referencesSitemap =
    /^sitemap\s*:\s*https:\/\/www\.pratiqo\.ca\/sitemap\.xml/im.test(raw);
  recordCheck(
    results,
    `/robots.txt advertises https://www.pratiqo.ca/sitemap.xml`,
    referencesSitemap,
    referencesSitemap ? "ok" : "Sitemap line missing or wrong host",
  );

  // Look for an explicit Disallow: /yo/langues line — must NOT exist.
  const disallowLines = raw
    .split(/\r?\n/)
    .filter((line) => /^\s*disallow\s*:/i.test(line))
    .map((line) => line.replace(/^\s*disallow\s*:\s*/i, "").trim());
  const disallowsHub = disallowLines.some((path) => {
    if (!path) return false;
    return (
      path === "/yo" ||
      path === "/yo/" ||
      path === "/yo/langues" ||
      path === "/yo/langues/" ||
      // a wildcard rule that strictly blocks the hub or every landing page
      /^\/yo\/langues\/?\*?$/.test(path)
    );
  });
  recordCheck(
    results,
    `/robots.txt does NOT disallow /yo/langues`,
    !disallowsHub,
    disallowsHub
      ? `Disallow rules currently block /yo/langues: ${disallowLines.join(", ")}`
      : "no blocking Disallow",
  );

  recordCheck(
    results,
    `/robots.txt does not reference pratiqo.com`,
    !/pratiqo\.com/i.test(raw),
    /pratiqo\.com/i.test(raw) ? "PRESENT" : "absent",
  );

  return { raw, status };
}

async function main(): Promise<void> {
  const { base, json } = parseArgs(process.argv.slice(2));
  const results: CheckResult[] = [];

  console.log(`[verify:yopratiqo-seo] base=${base}`);

  // ── Hub ───────────────────────────────────────────────────────────
  const hubUrl = `${base}/yo/langues`;
  let hubPage: FetchedPage | null = null;
  try {
    hubPage = await fetchPage(hubUrl);
  } catch (err) {
    recordCheck(results, `/yo/langues fetch`, false, String(err));
  }
  if (hubPage) {
    checkRouteIndexable(results, hubPage, hubUrl, "/yo/langues (hub)");
    checkCourseSchemaAbsent(results, hubPage, "/yo/langues (hub)");
  }

  // ── Five language landing pages ──────────────────────────────────
  for (const slug of LANGUAGE_SLUGS) {
    const url = `${base}/yo/langues/${slug}`;
    const label = `/yo/langues/${slug} (landing)`;
    try {
      const page = await fetchPage(url);
      checkRouteIndexable(results, page, url, label);
      checkCourseSchemaPresent(results, page, label);
    } catch (err) {
      recordCheck(results, `${label} fetch`, false, String(err));
    }
  }

  // ── Five intro lesson pages (must remain noindex) ─────────────────
  for (const slug of LANGUAGE_SLUGS) {
    const url = `${base}/yo/langues/${slug}/intro`;
    const label = `/yo/langues/${slug}/intro (intro)`;
    try {
      const page = await fetchPage(url);
      checkRouteNoindex(results, page, url, label);
      checkCourseSchemaAbsent(results, page, label);
    } catch (err) {
      recordCheck(results, `${label} fetch`, false, String(err));
    }
  }

  // ── /sitemap.xml ──────────────────────────────────────────────────
  await checkSitemap(results, base);

  // ── /robots.txt ───────────────────────────────────────────────────
  await checkRobotsTxt(results, base);

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n[verify:yopratiqo-seo] ${results.length - failed.length}/${results.length} checks passed${
      failed.length ? ` (${failed.length} failed)` : ""
    }`,
  );

  if (json) {
    console.log(JSON.stringify({ base, total: results.length, failed: failed.length, results }, null, 2));
  }

  if (failed.length > 0) {
    console.error(
      `\n${failed.length} failing check(s) — see "not ok -" lines above.`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[verify:yopratiqo-seo] unexpected error:", err);
  process.exit(1);
});

// Make this file a TypeScript module so its top-level type aliases
// (e.g. `CheckResult`) do not collide with similarly-named types
// declared in other top-level script files (e.g.
// `scripts/check_seo_edge_redirects.ts`).
export {};
