import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { getYoPublicLanguages } = require("../../lib/yo/publicCatalog.ts");
const { buildYoLocaleHref } = require("../../lib/yo/localize.ts");

// Run against a real local production build, never a hosted/private backend.
const origin = process.env.YO_SEO_QA_ORIGIN ?? "http://127.0.0.1:55650";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const records = [];
const sitemapResponse = await fetch(origin + "/sitemap.xml");
assert.equal(sitemapResponse.status, 200);
const xml = await sitemapResponse.text();
const sitemap = new JSDOM(xml, { contentType: "text/xml" }).window.document;
const urls = [...sitemap.querySelectorAll("loc")].map(node => node.textContent);
const courses = getYoPublicLanguages();
for (const page of [
  { landingRoute: "/yo", presentationLocales: ["fr", "en"] },
  { landingRoute: "/yo/langues", presentationLocales: ["fr", "en", "es"] },
  ...courses,
]) {
  assert.ok(urls.includes("https://www.pratiqo.ca" + page.landingRoute));
  for (const locale of page.presentationLocales) {
    const path = buildYoLocaleHref(page.landingRoute, locale);
    const response = await fetch(origin + path, { redirect: "manual" });
    assert.equal(response.status, 200, path);
    const doc = new JSDOM(await response.text()).window.document;
    assert.equal(doc.querySelectorAll("h1").length, 1, path + " unique H1");
    assert.equal(doc.querySelector("h1").closest("[lang]")?.getAttribute("lang"), locale, path + " SSR content language");
    assert.equal(doc.querySelector("link[rel=canonical]")?.getAttribute("href"), "https://www.pratiqo.ca" + path);
    assert.equal(doc.querySelector('meta[name="robots"]')?.content, "index, follow");
    assert.ok(doc.querySelector('meta[name="description"]')?.content.length > 60);
    assert.ok(doc.querySelector('meta[property="og:title"]')?.content);
    const alternates = [...doc.querySelectorAll("link[hreflang]")].map(node => node.href);
    assert.equal(alternates.length, page.presentationLocales.length);
    assert.ok(alternates.includes("https://www.pratiqo.ca" + path));
    const schemas = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent));
    const courseSchema = schemas.find(schema => schema["@type"] === "Course");
    if (courseSchema) {
      const visibleText = doc.body.textContent;
      assert.ok(visibleText.includes(courseSchema.description), path + " visible schema description");
      for (const objective of courseSchema.teaches ?? []) assert.ok(visibleText.includes(objective), path + " visible objective");
      assert.ok(!/aggregateRating|reviewCount|offers|priceCurrency/.test(JSON.stringify(courseSchema)));
    }
    const links = [...doc.querySelectorAll("a[href]")].map(node => node.getAttribute("href"));
    if (page.path) assert.ok(links.includes(buildYoLocaleHref(page.path, locale)), path + " direct activity link");
    records.push({ path, status: response.status, robots: "index, follow", canonical: "https://www.pratiqo.ca" + path, contentLanguage: locale, title: doc.title, h1: doc.querySelector("h1").textContent, schemas: schemas.map(schema => schema["@type"]), sitemap: true });
  }
}
for (const course of courses) {
  const response = await fetch(origin + course.path);
  assert.equal(response.status, 200, course.path);
  const doc = new JSDOM(await response.text()).window.document;
  assert.match(doc.querySelector('meta[name="robots"]')?.content ?? "", /noindex/, course.path);
  assert.ok(!urls.includes("https://www.pratiqo.ca" + course.path));
  records.push({ path: course.path, status: response.status, robots: doc.querySelector('meta[name="robots"]')?.content, sitemap: false });
}
const invalid = await fetch(origin + "/yo/langues/langue-inexistante", { redirect: "manual" });
assert.equal(invalid.status, 404);
const tracked = new JSDOM(await (await fetch(origin + "/yo/langues/mandarin?lang=en&utm_source=qa")).text()).window.document;
assert.equal(tracked.querySelector("link[rel=canonical]")?.href, "https://www.pratiqo.ca/yo/langues/mandarin?lang=en");
const robots = await fetch(origin + "/robots.txt");
assert.equal(robots.status, 200);
assert.ok(!(await robots.text()).includes("Disallow: /yo"));
assert.ok(!urls.some(url => /\/(admin|student|teacher|checkout|onboarding|dashboard)(\/|$)/.test(new URL(url).pathname)));
console.log(JSON.stringify({ records, sitemapTotal: urls.length, yoUrls: urls.filter(url => new URL(url).pathname.startsWith("/yo")), invalid: invalid.status, robots: robots.status }, null, 2));
console.log("PASS: anonymous SSR/HTTP, localized canonical and alternates, real activities, sitemap and privacy");
