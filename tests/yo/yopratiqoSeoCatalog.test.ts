import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getYoPublicLanguages, yoPublicCatalog } from "../../lib/yo/publicCatalog";
import { buildYoCatalogItemList, buildYoPratiqoMetadata, getYoPratiqoLanguageAlternates, isYoPratiqoRouteIndexable, resolveYoPratiqoPageLocale, yopratiqoSeoEntries, type YoPratiqoSeoRouteId } from "../../lib/yo/yopratiqoSeo";
import { yopratiqoProductConfig } from "../../lib/yo/yopratiqoProductConfig";
import { buildYoLocaleHref } from "../../lib/yo/localize";
import { emptySupplySitemap } from "../seo/emptySupplySitemap";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
async function main() {
  const courses = getYoPublicLanguages();
  assert.equal(new Set(courses.map(course => course.slug)).size, courses.length);
  for (const locale of ["fr", "en", "es"] as const) {
    const schema = buildYoCatalogItemList(locale);
    assert.equal(schema["@type"], "ItemList");
    assert.equal(schema.itemListElement.length, courses.length);
    courses.forEach((course, index) => {
      const presentationLocale = course.presentationLocales.includes(locale) ? locale : "fr";
      assert.equal(schema.itemListElement[index].url, "https://www.pratiqo.ca" + buildYoLocaleHref(course.landingRoute, presentationLocale));
      assert.equal(schema.itemListElement[index].position, index + 1);
    });
  }
  for (const legacy of yopratiqoProductConfig.currentFreeIntroModules) {
    assert.ok(courses.some(course => course.slug === legacy.slug));
  }
  for (const slug of ["allemand", "portugais-bresil", "mandarin"]) assert.ok(courses.some(course => course.slug === slug));
  const entries = await emptySupplySitemap();
  const routes = Object.keys(yopratiqoSeoEntries) as YoPratiqoSeoRouteId[];
  for (const course of yoPublicCatalog) {
    for (const path of [course.path, course.landingRoute]) assert.ok(existsSync(join(process.cwd(), "app", path, "page.tsx")), path);
    const routeId = routes.find(id => yopratiqoSeoEntries[id].route === course.landingRoute)!;
    assert.ok(routeId, course.slug);
    assert.equal(isYoPratiqoRouteIndexable(routeId), true);
    const item = entries.find(entry => entry.url === "https://www.pratiqo.ca" + course.landingRoute);
    assert.ok(item, course.landingRoute);
    assert.equal(item.lastModified, undefined, "no fake freshness");
    assert.deepEqual(item.alternates?.languages, getYoPratiqoLanguageAlternates(routeId));
    for (const locale of course.presentationLocales) {
      const metadata = buildYoPratiqoMetadata(routeId, locale);
      assert.equal(metadata.alternates?.canonical, "https://www.pratiqo.ca" + buildYoLocaleHref(course.landingRoute, locale));
      assert.deepEqual(metadata.robots, { index: true, follow: true });
    }
    if (!course.presentationLocales.includes("es")) {
      assert.equal(resolveYoPratiqoPageLocale(routeId, "es"), "fr");
      assert.ok(!("es" in getYoPratiqoLanguageAlternates(routeId)));
    }
    assert.ok(!entries.some(entry => entry.url.includes(course.path + "/") || entry.url === "https://www.pratiqo.ca" + course.path), "activities remain excluded");
  }
  for (const path of ["/yo", "/yo/langues"]) assert.ok(entries.some(entry => entry.url === "https://www.pratiqo.ca" + path));
  for (const id of routes.filter(id => !isYoPratiqoRouteIndexable(id))) {
    assert.ok(!entries.some(entry => entry.url === "https://www.pratiqo.ca" + yopratiqoSeoEntries[id].route));
    assert.deepEqual(getYoPratiqoLanguageAlternates(id), {});
  }
  const catalog = read("components/yo/YoLanguageQuickStart.tsx");
  assert.match(catalog, /getYoPublicLanguages/);
  assert.match(catalog, /buildYoLocaleHref\(item.path, locale\)/);
  assert.match(catalog, /buildYoLocaleHref\(item.landingRoute, presentationLocale\)/);
  assert.ok(!catalog.includes("const presentation ="), "no second language list");
  const overview = read("components/yo/YoCourseOverview.tsx");
  assert.match(overview, /mandarinUnits/);
  assert.match(overview, /germanCourseUnits/);
  assert.match(overview, /portugueseCourseUnits/);
  assert.match(overview, /unit.objectives/);
  assert.match(overview, /serializeJsonLd/);
  assert.ok(!/aggregateRating|reviewCount|offers:|price:/.test(overview));
  const hub = read("app/yo/page.tsx");
  assert.ok(!/cinq parcours|five intro paths|Audio à venir|Audio coming soon|voix natives/i.test(hub));
  assert.match(hub, /getYoPublicLanguages\(\).length/);
  assert.equal(yopratiqoProductConfig.premiumModulesEnabled, false);
  assert.equal(yopratiqoProductConfig.introPageIndexingEnabled, false);
  console.log(`PASS: ${courses.length} public languages, metadata/translations, direct links, sitemap and unchanged access gates`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
