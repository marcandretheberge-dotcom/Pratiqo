/**
 * Production-only SEO edge / domain redirect checker.
 *
 * This is an OPT-IN, LIVE-NETWORK script. It is intentionally NOT wired
 * into `npm run validate:launch` or `npm run test:launch-critical`,
 * because both run in CI and offline contexts where outbound requests
 * to pratiqo.ca would either fail (no internet) or hit a different
 * environment (Preview vs Production).
 *
 * Run it manually after a production deploy:
 *
 *     npm run check:seo-edge
 *     # or
 *     tsx scripts/check_seo_edge_redirects.ts
 *
 * Optionally point it at a different host (e.g. preview deploy):
 *
 *     tsx scripts/check_seo_edge_redirects.ts --base https://staging.pratiqo.ca
 *
 * What it verifies (matches the SEO contract documented in
 * `lib/seo/site.ts`, `app/sitemap.ts`, `app/robots.ts`, and
 * `next.config.ts`):
 *
 *   1. https://pratiqo.ca           → 301 / 308 → https://www.pratiqo.ca
 *   2. https://www.pratiqo.ca       → 200, NOT a redirect to /fr or any locale
 *   3. https://www.pratiqo.ca/legal/teacher-pro
 *                                    → 308 → /legal/membre-pro
 *   4. https://www.pratiqo.ca/robots.txt
 *                                    → 200, references the sitemap
 *   5. https://www.pratiqo.ca/sitemap.xml
 *                                    → 200, contains pratiqo.ca, never
 *                                      pratiqo.com, never /login, never
 *                                      /legal/teacher-pro
 *
 * Exit code 0 on success, 1 on any failed expectation. Prints a brief
 * `ok - …` / `not ok - …` line per check (TAP-ish, matches the rest
 * of the test suite).
 */

const APEX = "https://pratiqo.ca";
const WWW_DEFAULT = "https://www.pratiqo.ca";

type CheckResult = { name: string; ok: boolean; details?: string };

function parseArgs(argv: readonly string[]): { base: string } {
  let base = WWW_DEFAULT;
  for (let i = 0; i < argv.length; i += 1) {
    if ((argv[i] === "--base" || argv[i] === "-b") && argv[i + 1]) {
      base = argv[i + 1].replace(/\/$/, "");
      i += 1;
    }
  }
  return { base };
}

/** HEAD with manual redirect handling so we observe the redirect status & Location. */
async function head(url: string): Promise<Response> {
  return fetch(url, { method: "HEAD", redirect: "manual" });
}

/** GET (manual redirect) — used when we need the body, e.g. robots.txt / sitemap.xml. */
async function getNoRedirect(url: string): Promise<Response> {
  return fetch(url, { method: "GET", redirect: "manual" });
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 307 || status === 308;
}

function recordCheck(results: CheckResult[], name: string, ok: boolean, details?: string): void {
  results.push({ name, ok, details });
  if (ok) {
    console.log(`ok - ${name}`);
  } else {
    console.error(`not ok - ${name}${details ? ` :: ${details}` : ""}`);
  }
}

async function main(): Promise<void> {
  const { base } = parseArgs(process.argv.slice(2));
  const results: CheckResult[] = [];

  // 1. apex → www
  try {
    const res = await head(APEX);
    const loc = res.headers.get("location") ?? "";
    const okStatus = res.status === 301 || res.status === 308;
    const okLoc = /^https:\/\/www\.pratiqo\.ca\/?$/.test(loc) || loc.startsWith("https://www.pratiqo.ca/");
    const noLocaleForce = !/\/(fr|en|es)(?:\/|$)/.test(new URL(loc, APEX).pathname);
    recordCheck(
      results,
      "apex (https://pratiqo.ca) → 301/308 → https://www.pratiqo.ca",
      okStatus && okLoc && noLocaleForce,
      `status=${res.status} location=${loc || "(none)"}`,
    );
  } catch (err) {
    recordCheck(results, "apex (https://pratiqo.ca) → 301/308 → https://www.pratiqo.ca", false, String(err));
  }

  // 2. www serves homepage (200, not redirect to /fr)
  try {
    const res = await head(base);
    const loc = res.headers.get("location") ?? "";
    const ok =
      res.status === 200 ||
      // Some hosting setups send a 308 normalize on bare host even with no path —
      // accept that only when the destination stays on the same www host root.
      (isRedirect(res.status) && /^https:\/\/www\.pratiqo\.ca\/?$/.test(loc));
    const noLocaleForce =
      !isRedirect(res.status) ||
      !/\/(fr|en|es)(?:\/|$)/.test(new URL(loc || "/", base).pathname);
    recordCheck(
      results,
      `www (${base}) responds 200 and does NOT redirect to /fr|/en|/es`,
      ok && noLocaleForce,
      `status=${res.status} location=${loc || "(none)"}`,
    );
  } catch (err) {
    recordCheck(
      results,
      `www (${base}) responds 200 and does NOT redirect to /fr|/en|/es`,
      false,
      String(err),
    );
  }

  // 3. /legal/teacher-pro → /legal/membre-pro
  try {
    const res = await head(`${base}/legal/teacher-pro`);
    const loc = res.headers.get("location") ?? "";
    const ok =
      res.status === 308 &&
      (loc === "/legal/membre-pro" ||
        loc === `${base}/legal/membre-pro` ||
        loc.endsWith("/legal/membre-pro"));
    recordCheck(
      results,
      `/legal/teacher-pro → 308 → /legal/membre-pro`,
      ok,
      `status=${res.status} location=${loc || "(none)"}`,
    );
  } catch (err) {
    recordCheck(results, "/legal/teacher-pro → 308 → /legal/membre-pro", false, String(err));
  }

  // 4. /robots.txt
  try {
    const res = await getNoRedirect(`${base}/robots.txt`);
    const body = res.ok ? await res.text() : "";
    const referencesSitemap = /sitemap\s*:\s*https:\/\/www\.pratiqo\.ca\/sitemap\.xml/i.test(body);
    const noPratiqoCom = !/pratiqo\.com/.test(body);
    recordCheck(
      results,
      "/robots.txt 200 + references sitemap + no pratiqo.com",
      res.status === 200 && referencesSitemap && noPratiqoCom,
      `status=${res.status} sitemap=${referencesSitemap ? "yes" : "no"} pratiqo.com=${
        noPratiqoCom ? "absent" : "PRESENT"
      }`,
    );
  } catch (err) {
    recordCheck(results, "/robots.txt 200 + references sitemap + no pratiqo.com", false, String(err));
  }

  // 5. /sitemap.xml
  try {
    const res = await getNoRedirect(`${base}/sitemap.xml`);
    const body = res.ok ? await res.text() : "";
    const usesWww = /<loc>https:\/\/www\.pratiqo\.ca/.test(body);
    const noPratiqoCom = !/pratiqo\.com/.test(body);
    const noLogin = !/<loc>https:\/\/www\.pratiqo\.ca\/login<\/loc>/.test(body);
    const noTeacherPro = !/\/legal\/teacher-pro</.test(body);
    const noStalePrivacy = !/\/legal\/privacy</.test(body);
    recordCheck(
      results,
      "/sitemap.xml 200 + www origin + excludes /login + /legal/teacher-pro + /legal/privacy + no pratiqo.com",
      res.status === 200 && usesWww && noPratiqoCom && noLogin && noTeacherPro && noStalePrivacy,
      `status=${res.status} www=${usesWww} login=${noLogin ? "absent" : "PRESENT"} teacher-pro=${
        noTeacherPro ? "absent" : "PRESENT"
      } privacy=${noStalePrivacy ? "absent" : "PRESENT"} pratiqo.com=${noPratiqoCom ? "absent" : "PRESENT"}`,
    );
  } catch (err) {
    recordCheck(results, "/sitemap.xml 200 + www origin + excludes stale URLs", false, String(err));
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    `[seo:edge] ${results.length - failed.length}/${results.length} checks passed${
      failed.length ? ` (${failed.length} failed)` : ""
    }`,
  );
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[seo:edge] unexpected error:", err);
  process.exit(1);
});
