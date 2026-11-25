import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Module, { createRequire } from "node:module";
import { JSDOM } from "jsdom";
import "tsx/cjs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const loadComponent = createRequire(import.meta.url);
global.React = React;
const dictionaries = Object.fromEntries(["fr", "en", "es"].map(locale => [
  locale, JSON.parse(readFileSync(resolve(`lib/i18n/locales/${locale}.json`), "utf8")),
]));
let locale = "fr";
const originalLoad = Module._load;
Module._load = function(id, ...rest) {
  if (id === "@/lib/locale-context") return { useLocale: () => ({ locale, t: key => dictionaries[locale][key] }) };
  return originalLoad.call(this, id, ...rest);
};
const { LandingHeroStatic } = loadComponent(resolve("components/marketing/LandingHeroStatic.tsx"));
const { LandingHowItWorks } = loadComponent(resolve("components/marketing/LandingHowItWorks.tsx"));
const { LandingResourcesSection } = loadComponent(resolve("components/marketing/LandingResourcesSection.tsx"));
const { MarketplaceFinalCta } = loadComponent(resolve("components/marketing/MarketplaceFinalCta.tsx"));
const { LandingDiscoverySearch } = loadComponent(resolve("components/marketing/LandingDiscoverySearch.tsx"));
Module._load = originalLoad;

for (locale of ["fr", "en", "es"]) {
  const dict = dictionaries[locale];
  const hero = new JSDOM(renderToStaticMarkup(React.createElement(LandingHeroStatic, { locale }))).window.document;
  assert.equal(hero.querySelectorAll("h1").length, 1);
  assert.equal(hero.querySelector("h1").textContent, dict.landingNeighborhoodHeadline);
  assert.equal(hero.querySelector("h1 span").textContent, dict.landingHomepageHeadlineAccent);
  assert.ok(hero.querySelector("h1 span").classList.contains("italic"));
  assert.match(hero.querySelector("h1 span").style.fontFamily, /Georgia/);
  assert.equal(hero.querySelectorAll("p").length, 1, "One supporting sentence, no repeated slogans");
  assert.equal(hero.querySelector("p").textContent, dict.landingHomepageIntro);
  assert.ok(hero.body.textContent.trim().split(/\s+/).length <= 26, "Hero stays concise in each locale");

  const noop = () => {};
  const search = new JSDOM(renderToStaticMarkup(React.createElement(LandingDiscoverySearch, {
    searchQuery: "", onSearchQueryChange: noop, locationSearch: "", onLocationSearchChange: noop,
    geo: null, onSelectTeacher: noop, onSelectDiscipline: noop, onSelectCity: noop,
    formatFilter: "all", onFormatFilterChange: noop, onSearchSubmit: noop,
    searchInputPlaceholderKey: "landingSearchDisciplinePlaceholder", teachersForSearch: [],
  }))).window.document;
  assert.equal(search.querySelectorAll('form[role="search"]').length, 1);
  assert.equal(search.querySelector('button[type="submit"]').textContent, dict.landingSearchSubmit);
  assert.equal(search.querySelectorAll("[autofocus]").length, 0, "Do not open the mobile keyboard before interaction");
  for (const id of ["landing-discipline", "landing-location", "landing-format"]) {
    assert.ok(search.getElementById(id));
    assert.ok(search.querySelector(`label[for="${id}"]`), `${id} has an associated label`);
  }
  assert.deepEqual([...search.querySelectorAll("select option")].map(option => option.value), ["all", "online", "in_person", "hybrid"]);

  const how = new JSDOM(renderToStaticMarkup(React.createElement(LandingHowItWorks))).window.document;
  assert.equal(how.querySelectorAll("li").length, 3);
  assert.ok(how.body.textContent.trim().split(/\s+/).length <= 50);
  assert.ok(how.body.textContent.includes(dict.landingHowStep3Body), "Requests remain distinct from booking");

  const guides = new JSDOM(renderToStaticMarkup(React.createElement(LandingResourcesSection))).window.document;
  assert.deepEqual([...guides.querySelectorAll("a")].map(a => a.getAttribute("href")), [
    "/ressources", "/blog/comment-choisir-tuteur-enfant-quebec",
    "/blog/tuteur-en-ligne-ou-a-domicile", "/blog/donner-cours-prives-quebec",
  ]);
  assert.equal(guides.querySelectorAll("h3").length, 3);
  assert.ok(!guides.body.textContent.includes(dict.landingResourcesSubtitle));
  const cta = new JSDOM(renderToStaticMarkup(React.createElement(MarketplaceFinalCta))).window.document;
  assert.equal(cta.querySelector("h2").textContent, dict.landingHomepageNextStep);
  assert.deepEqual([...cta.querySelectorAll("a")].map(a => a.getAttribute("href")), [
    "/login?next=/student/search", "/become-teacher",
  ]);
  console.log(`PASS ${locale}: concise rendered hero, three steps, guide links and entry points`);
}
const client = readFileSync(resolve("app/LandingPageClient.tsx"), "utf8");
assert.match(client, /t\("landingNeighborhoodHeadline"\)/);
assert.match(client, /t\("landingHomepageIntro"\)/);
assert.doesNotMatch(client, /t\("landingMobileNearYou"\)|t\("landingEyebrowLocal"\)|<LandingHeroTrustStrip|<LandingNeighborhoodSignals/);
assert.match(client, /<LandingDiscoverySearch/);
assert.match(client, /<TeacherSearchAdvancedPanel/);
assert.match(client, /<LandingTeacherListingCard/);
assert.match(client, /data-testid="landing-map"/);
assert.match(client, /data-testid="landing-teacher-cards"/);
assert.match(client, /requestLocationOnMount=\{false\}/);
assert.match(client, /getTeacherPublicFormatIds\(teacher\)\.some/);
assert.doesNotMatch(client, /viewMode === "map"/);
assert.match(client, /<TrustSafetySection/);
assert.doesNotMatch(client, /<ToggleSegment|<SocialProofTestimonials/);
assert.match(client, /const SUBJECT_EXAMPLES = \["piano", "francais", "mathematiques"\]/);
assert.match(client, /<details[\s\S]*?<TrustSafetySection[\s\S]*?<\/details>/);
console.log("PASS homepage search, profiles and detailed trust information preserved");
