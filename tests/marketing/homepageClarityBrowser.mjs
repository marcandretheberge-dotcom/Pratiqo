// UI-only QA: synthetic responses, no auth, booking, analytics or database writes.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
// Browser tooling may be supplied by the existing external QA runtime via NODE_PATH.
const { chromium, expect } = createRequire(import.meta.url)("playwright/test");
const base = process.env.HOMEPAGE_QA_URL || "http://127.0.0.1:55570";
const baseline = process.env.HOMEPAGE_QA_BASELINE === "1";
const output = resolve(process.env.HOMEPAGE_QA_OUTPUT || ".next/homepage-qa");
const dictionaries = Object.fromEntries(["fr", "en", "es"].map(locale => [locale, JSON.parse(readFileSync(new URL(`../../lib/i18n/locales/${locale}.json`, import.meta.url), "utf8"))]));
const teachers = ["Piano", "Espagnol", "Mathématiques"].map((discipline, i) => ({
  id: `11111111-1111-4111-8111-11111111111${i}`,
  user_id: `22222222-2222-4222-8222-22222222222${i}`,
  name: `Profil démo ${i + 1}`, discipline, category: ["Musique", "Langues", "Académique"][i],
  price_per_lesson: 45, bio: "Profil synthétique pour la vérification de la mise en page uniquement.",
  location: { lat: 46.12, lng: -70.67, neighborhood: "Saint-Georges" }, city: "Saint-Georges",
  teaching_mode: ["both", "online", "person"][i], availability: [], is_verified: false, rating: 0, reviews: 0,
  image_url: null, languages: ["fr"], levels: [],
}));
(async () => {
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEPAGE_QA_CHROMIUM });
  const results = [];
  try {
    for (const locale of ["fr", "en", "es"]) {
      for (const width of (baseline ? [390, 1440] : [320, 390, 640, 768, 1024, 1440])) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, locale, reducedMotion: "reduce" });
        await context.addCookies([{ name: "pratiqo-locale", value: locale, url: base }]);
        await context.addInitScript(locale => {
          localStorage.setItem("pratiqo-locale", locale);
          // Keep the unrelated install prompt out of layout comparison screenshots.
          localStorage.setItem("pratiqo-pwa-install-dismissed", "1");
        }, locale);
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        await page.route("**/*", async route => {
          const req = route.request(), url = new URL(req.url());
          const json = data => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
          if (url.pathname.includes("/rest/v1/teachers_public")) return json(teachers);
          if (url.pathname.includes("/rest/v1/")) return json([]);
          if (url.pathname === "/api/teachers/plans") return json({ plans: {} });
          if (url.pathname === "/api/geo") return json({ locale, currency: "CAD", country: "CA" });
          if (url.pathname.startsWith("/api/") || req.method() !== "GET") return json({});
          if (url.origin !== new URL(base).origin) return route.abort();
          return route.continue();
        });
        const response = await page.goto(base, { waitUntil: "networkidle" });
        assert.equal(response.status(), 200);
        await page.locator("#teacher-results button").filter({ hasText: "Profil" }).first().waitFor({ timeout: 15000 });
        const dict = dictionaries[locale];
        await page.getByRole("heading", { level: 1 }).waitFor();
        if (!baseline) await page.getByText(dict.landingHomepageIntro, { exact: true }).waitFor();
        // Close only the local mocked page's consent banner, with necessary cookies only.
        const necessary = page.getByRole("button", { name: /Nécessaires seulement|Necessary only|Solo necesarias|Only necessary|Solo los necesarios/i });
        if (await necessary.count()) await necessary.click();
        const metrics = await page.evaluate(() => ({
          width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
          h1Count: document.querySelectorAll("h1").length,
          introWords: document.querySelector("main section")?.textContent.trim().split(/\s+/).length,
          resultsTop: document.querySelector("#teacher-results").getBoundingClientRect().top + window.scrollY,
          mainWords: document.querySelector("main").innerText.trim().split(/\s+/).length,
        }));
        assert.equal(metrics.h1Count, 1);
        assert.ok(metrics.scrollWidth <= width + 1, `Overflow at ${locale}/${width}`);
        await page.screenshot({ path: resolve(output, `${locale}-${width}.png`), fullPage: true });
        await page.screenshot({ path: resolve(output, `${locale}-${width}-viewport.png`) });
        if (!baseline) {
          const map = page.getByTestId("landing-map");
          const list = page.getByTestId("landing-teacher-cards");
          await expect(map).toBeVisible();
          await expect(map).toContainText(dict.landingHomepageMapCount.replace("{count}", "2"));
          const mapBox = await map.boundingBox(), listBox = await list.boundingBox();
          if (width >= 1024) {
            assert.ok(listBox.x >= mapBox.x + mapBox.width, "Desktop cards beside the map");
            assert.ok(Math.abs(mapBox.y - listBox.y) < 2, "Desktop columns align");
          } else {
            assert.ok(listBox.y >= mapBox.y + mapBox.height, "Mobile cards below the map");
          }
          assert.ok(await page.getByTestId("landing-mobile-login-link").isVisible());
          assert.equal(await page.getByTestId("landing-mobile-login-link").getAttribute("href"), "/connexion");
          const subject = page.getByRole("combobox", { name: dict.landingSearchDisciplinePlaceholder });
          const cards = page.locator("#teacher-results button").filter({ hasText: "Profil" });
          const reset = page.getByRole("button", { name: dict.landingHomepageReset, exact: true });
          assert.equal(await subject.evaluate(el => el === document.activeElement), false, "No mobile keyboard on arrival");
          await page.getByRole("button", { name: "Piano", exact: true }).click();
          await expect(subject).toHaveValue("Piano");
          await expect(cards).toHaveCount(1);
          assert.equal(await page.getByText(dict.landingHomepageQuizCta, { exact: true }).count(), 0);
          await reset.click();
          await expect(cards).toHaveCount(3);

          // Broad-category selection must not be undone by a later empty-query callback.
          await subject.fill("lang");
          const languages = { fr: "Langues", en: "Languages", es: "Idiomas" }[locale];
          await page.getByRole("option", { name: new RegExp(languages) }).first().click();
          await expect(cards).toHaveCount(1);
          await expect(page.locator("#teacher-results")).toContainText("Espagnol");
          await expect(page.locator("#teacher-results h2")).toContainText(languages);

          // A new query replaces the previous category; city and format stay independent.
          await subject.fill("Piano");
          await subject.press("Escape");
          await expect(cards).toHaveCount(1);
          await expect(cards.first()).toContainText("Piano");
          const place = page.locator("#landing-location");
          await place.fill("Saint-Georges");
          await page.getByRole("option", { name: /Saint-Georges.*QC/ }).first().click();
          await expect(place).toHaveValue(/Saint-Georges.*QC/);
          await page.locator("#landing-format").selectOption("online");
          await expect(map).toContainText(dict.landingHomepageMapEmpty);
          await expect(subject).toHaveValue("Piano");
          await expect(cards).toHaveCount(1);
          await reset.click();
          await expect(subject).toHaveValue("");
          await expect(place).toHaveValue("");
          await expect(page.locator("#landing-format")).toHaveValue("all");
          await expect(cards).toHaveCount(3);

          const filters = page.getByRole("button", { name: dict.landingHomepageFilters, exact: true });
          await filters.click();
          await expect(filters).toHaveAttribute("aria-expanded", "true");
          await page.getByRole("spinbutton", { name: dict.searchFieldMaxPrice }).fill("20");
          await expect(cards).toHaveCount(0);
          await expect(page.getByText(dict.landingHomepageFiltersActive, { exact: true })).toHaveCount(1);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Expanded filters fit");
          await reset.click();
          await expect(cards).toHaveCount(3);
          await filters.click();

          // Enter with no highlighted suggestion submits; selecting a suggestion does not.
          await subject.fill("pi");
          await expect(page.getByRole("option", { name: /Piano/ }).first()).toBeVisible();
          await page.evaluate(() => {
            window.__searchScrolls = 0;
            const results = document.querySelector("#teacher-results");
            const scroll = results.scrollIntoView.bind(results);
            results.scrollIntoView = (...args) => { window.__searchScrolls++; scroll(...args); };
          });
          await subject.press("ArrowDown");
          await subject.press("Enter");
          assert.equal(await page.evaluate(() => window.__searchScrolls), 0);
          await subject.fill("piano");
          await expect(page.getByRole("option", { name: /Piano/ }).first()).toBeVisible();
          await expect(subject).not.toHaveAttribute("aria-activedescendant", /.+/);
          await subject.press("Enter");
          assert.equal(await page.evaluate(() => window.__searchScrolls), 1);
          await expect(cards).toHaveCount(1);
          await subject.fill("zznomatch");
          await expect(subject).toHaveAttribute("aria-expanded", "false");
          await subject.press("Enter");
          assert.equal(await page.evaluate(() => window.__searchScrolls), 2, "Native form submit works with suggestions closed");
          await reset.click();

          const details = page.locator("details").filter({ has: page.getByText(dict.landingHomepageTrustDetails, { exact: true }) });
          await details.locator("summary").click();
          await expect(details).toHaveAttribute("open", "");
          await expect(details.getByText(dict.creditsDisclaimer, { exact: true })).toBeVisible();
          await details.locator("summary").click();
          if (width < 1024) {
            await page.getByTestId("landing-mobile-menu-button").click();
            await expect(page.getByTestId("landing-mobile-menu").getByRole("link", { name: dict.becomeTeacher, exact: true })).toHaveAttribute("href", "/devenir-enseignant");
            await page.getByTestId("landing-mobile-menu-button").click();
          }
          await page.getByRole("button", { name: dict.landingHomepageQuizCta, exact: true }).click();
          await page.getByRole("dialog").waitFor();
        }
        assert.deepEqual(errors, [], "No browser runtime errors");
        results.push({ locale, ...metrics });
        console.log(JSON.stringify(results.at(-1)));
        await context.close();
      }
      if (!baseline) {
        const noJs = await browser.newContext({ javaScriptEnabled: false });
        await noJs.addCookies([{ name: "pratiqo-locale", value: locale, url: base }]);
        const page = await noJs.newPage();
        await page.goto(base);
        assert.equal(await page.locator("h1").textContent(), dictionaries[locale].landingNeighborhoodHeadline);
        assert.ok(await page.getByText(dictionaries[locale].landingHomepageIntro, { exact: true }).isVisible());
        const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
        assert.equal(new URL(canonical).href, "https://www.pratiqo.ca/");
        await noJs.close();
      }
    }
    writeFileSync(resolve(output, "metrics.json"), JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
