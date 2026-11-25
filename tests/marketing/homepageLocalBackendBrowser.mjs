// Production-build QA with the real local Supabase. Only failure injection is mocked.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
// Browser tooling may be supplied by the existing external QA runtime via NODE_PATH.
const { chromium, expect } = createRequire(import.meta.url)("playwright/test");

const base = process.env.HOMEPAGE_QA_URL || "http://127.0.0.1:55580";
assert.equal(new URL(base).hostname, "127.0.0.1", "Never run fault injection on a remote deployment");
const output = resolve(process.env.HOMEPAGE_QA_OUTPUT || ".next/homepage-local-qa");
const dict = JSON.parse(readFileSync(new URL("../../lib/i18n/locales/fr.json", import.meta.url), "utf8"));
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEPAGE_QA_CHROMIUM });
const results = [];
try {
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: "fr-CA", reducedMotion: "reduce" });
    await context.addCookies([{ name: "pratiqo-locale", value: "fr", url: base }]);
    await context.addInitScript(() => {
      localStorage.setItem("pratiqo-locale", "fr");
      localStorage.setItem("pratiqo-pwa-install-dismissed", "1");
    });
    const page = await context.newPage();
    const errors = [], backend = [], consoleErrors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.hostname.endsWith("supabase.co") || url.hostname === "www.pratiqo.ca" || url.hostname === "pratiqo.ca") {
        errors.push("Unexpected production request: " + url.pathname);
        return route.abort();
      }
      return route.continue();
    });
    page.on("response", response => {
      const url = new URL(response.url());
      if (url.pathname.includes("/rest/v1/") || url.pathname === "/api/teachers/plans") backend.push({ path: url.pathname, status: response.status() });
    });
    const loaded = page.waitForResponse(r => new URL(r.url()).pathname === "/api/teachers/plans" && r.ok());
    const publicRead = page.waitForResponse(r => new URL(r.url()).pathname.endsWith("/rest/v1/teachers_public") && r.ok());
    assert.equal((await page.goto(base)).status(), 200);
    const publicRows = await (await publicRead).json();
    const metadata = await (await loaded).json();
    assert.ok(metadata.eligibleTeacherIds.length > 0, "Real metadata handler returns eligible local fixtures");
    const cards = page.getByTestId("landing-teacher-cards");
    await expect(cards.getByRole("button").first()).toBeVisible();
    const map = page.getByTestId("landing-map");
    await expect(map.locator(".gm-style")).toBeVisible({ timeout: 30000 });
    await expect(map).toContainText(dict.landingHomepageMapCount.replace("{count}", "1"));
    await expect(page.locator("h1 span")).toHaveText(dict.landingHomepageHeadlineAccent);
    await expect(page.getByTestId("landing-mobile-login-link")).toBeVisible();
    const necessary = page.getByRole("button", { name: /Nécessaires seulement|Necessary only/ });
    if (await necessary.count()) await necessary.click();
    const mapBox = await map.boundingBox(), cardsBox = await cards.boundingBox();
    assert.ok(width >= 1024 ? cardsBox.x >= mapBox.x + mapBox.width : cardsBox.y >= mapBox.y + mapBox.height);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.ok(backend.length >= 4 && backend.every(r => r.status === 200), "All real teacher/zones/disciplines/metadata requests succeed");
    await page.screenshot({ path: resolve(output, `real-${width}.png`), fullPage: true });

    await page.locator("#landing-format").selectOption("in_person");
    const expectedLocal = publicRows.filter(row => metadata.eligibleTeacherIds.includes(row.id) && ["both", "all", "person", "home"].includes(row.teaching_mode));
    await expect(cards.getByRole("button")).toHaveCount(Math.min(4, expectedLocal.length));
    await expect(cards.getByRole("img", { name: "Photo de profil de Profil synthetique accueil" })).toBeVisible();
    await page.locator("#landing-format").selectOption("online");
    await expect(map).toContainText(dict.landingHomepageMapEmpty);
    await expect(map.getByRole("button", { name: dict.searchAreaButton })).toHaveCount(0);
    const subject = page.locator("#landing-discipline");
    await subject.fill("zz-no-such-local-discipline");
    await subject.press("Escape");
    await expect(cards.getByRole("button").filter({ hasText: "Profil" })).toHaveCount(0);
    await expect(cards.getByRole("alert")).toHaveCount(0);
    await page.getByRole("button", { name: dict.landingHomepageReset, exact: true }).click();
    await expect(cards.getByRole("button").first()).toBeVisible();
    assert.deepEqual(errors, []);
    assert.deepEqual(consoleErrors, [], "No console errors in the normal real-backend path");

    // Delay the actual read to verify loading, then inject a transport failure.
    let release;
    const held = new Promise(resolve => { release = resolve; });
    const teacherRoute = "**/_supabase/rest/v1/teachers_public?*";
    await page.route(teacherRoute, async route => { await held; await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Local QA transport failure" }) }); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("#teacher-results")).toContainText(dict.loading);
    await expect(cards.getByRole("alert")).toHaveCount(0);
    release();
    // PostgREST retries 503 three times with exponential backoff before failing.
    await expect(cards.getByRole("alert")).toContainText(dict.landingHomepageLoadError, { timeout: 20000 });
    await expect(page.locator("#teacher-results")).toContainText(dict.landingHomepageLoadErrorTitle);
    await page.unroute(teacherRoute);
    await cards.getByRole("button", { name: dict.landingHomepageRetry }).click();
    await expect(cards.getByRole("alert")).toHaveCount(0);
    await expect(cards.getByRole("button").first()).toBeVisible();
    assert.deepEqual(errors, [], "Network failure is handled, not an unhandled exception");
    results.push({ width, status: "PASS", realBackend: true, mapVisible: true, eligibleFixtures: metadata.eligibleTeacherIds.length, requests: backend.slice(0, 4), loadingEmptyErrorRetry: true });
    console.log(JSON.stringify(results.at(-1)));
    await context.close();
  }
  writeFileSync(resolve(output, "results.json"), JSON.stringify(results, null, 2));
} finally { await browser.close(); }
