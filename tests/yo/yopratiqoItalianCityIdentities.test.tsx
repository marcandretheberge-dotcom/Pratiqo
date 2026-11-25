import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ITALIAN_CITY_IDENTITIES, italianCityIdentity } from "@/lib/yo/italian/cityIdentity";
import { ITALIAN_WORLDS, projectItalianWorlds } from "@/lib/yo/italian/worlds";
import { emptyCourseProgress, recordCourseAssessment } from "@/lib/yo/italian/course/courseProgress";
import { buildCourseJourney } from "@/lib/yo/courseJourney";
import { personalizedItalianCatalog } from "@/lib/yo/personalized/courseData";
import { ItalianCityArtwork } from "@/components/yo/italian/guided/ItalianCityArtwork";
import { ItalianCityArrival } from "@/components/yo/italian/guided/ItalianCityArrival";
import { ItalianAchievementPrintable } from "@/components/yo/italian/guided/ItalianAchievementPrintable";
import { ItalianWorldAtlas } from "@/components/yo/italian/guided/ItalianWorldAtlas";

const render = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);
const visibleText = (html:string) => html.replace(/&#x27;|&#39;|&apos;/g, "\u0027").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const units = personalizedItalianCatalog.units.map(unit => unit.id);
assert.equal(ITALIAN_CITY_IDENTITIES.length, 12, "each of 12 modules gets an identity");
assert.deepEqual(ITALIAN_CITY_IDENTITIES.map(city => city.unitId), units, "city identities preserve canonical unit IDs");
assert.deepEqual(ITALIAN_WORLDS.flatMap(world => world.cities.map(city => city.unitId)), units);
assert.equal(new Set(ITALIAN_CITY_IDENTITIES.map(city => city.motif)).size, 12, "no reused city landmarks");
assert.equal(new Set(ITALIAN_CITY_IDENTITIES.map(city => city.city)).size, 12, "no repeated city names");
assert.equal(italianCityIdentity("u13"), undefined, "unknown unit may not invent city");
const hrefForUnit = (id:string) => `/yo/langues/italien/parcours/${id}`;

for(const identity of ITALIAN_CITY_IDENTITIES) {
  for(const locale of ["fr","en","es"] as const) {
    assert.ok(identity.inspiration[locale].trim().length > 8, `${identity.city}: missing cultural motif in ${locale}`);
    for(const variant of [false,true]) {
      const html = render(createElement(ItalianCityArtwork,{unitId:identity.unitId,locale,compact:variant}));
      assert.ok(html.includes(`data-yoppo-city-art="${identity.unitId}"`));
      assert.ok(html.includes(`data-city-motif="${identity.motif}"`));
      assert.ok(html.includes(`data-italian-landmark="${identity.motif}"`));
      assert.ok(visibleText(html).includes(identity.inspiration[locale]), `${identity.unitId}: locale text survives HTML escaping`);
      assert.ok(html.includes('viewBox="0 0 640 220"'));
      assert.ok(!html.includes('http'), "art must not call external image hosts");
    }
    const decorative = render(createElement(ItalianCityArtwork,{unitId:identity.unitId,locale,decorative:true}));
    assert.ok(decorative.includes('aria-hidden="true"'), "repeated atlas art is decorative");
    assert.ok(!decorative.includes('role="img"'), "decorative art may not repeat screen reader captions");
    const printable = render(createElement(ItalianAchievementPrintable,{
      unit:personalizedItalianCatalog.units.find(item=>item.id===identity.unitId)!,
      catalog:personalizedItalianCatalog,locale,
    }));
    assert.ok(printable.includes(`data-yoppo-printed-postcard="${identity.unitId}"`));
    assert.ok(printable.includes(`data-city-motif="${identity.motif}"`));
    assert.ok(visibleText(printable).includes(identity.inspiration[locale]));
    const arrival = render(createElement(ItalianCityArrival,{unitId:identity.unitId,locale,mastered:false}));
    assert.ok(arrival.includes(`data-yoppo-city-arrival="${identity.unitId}"`));
    assert.ok(arrival.includes(`data-city-motif="${identity.motif}"`));
    assert.ok(visibleText(arrival).includes(identity.inspiration[locale]));
    assert.ok(arrival.includes("yo-yoppo-city-arrival"), "arrival animation remains");
    assert.ok(arrival.includes("prefers-reduced-motion"), "arrival respects accessibility settings");
  }
}

let progress = emptyCourseProgress();
let projected = projectItalianWorlds(buildCourseJourney(personalizedItalianCatalog, progress));
for(const locale of ["fr","en","es"] as const) {
  for(const world of projected) {
    const html = render(createElement(ItalianWorldAtlas,{
      world, locale, currentUnitId:"u01",hrefForUnit,canReview:()=>false,
    }));
    for(const city of world.cities) {
      assert.ok(html.includes(`data-yoppo-map-token="${city.unitId}"`));
      assert.ok(html.includes(city.name));
    }
    assert.equal((html.match(/data-yoppo-map-token=/g)??[]).length,4);
    assert.equal((html.match(/<a /g)??[]).length,world.id==="discover"?1:0,
      "city art must never make a locked city clickable");
  }
}
for(const unit of personalizedItalianCatalog.units.slice(0,4)) {
  const assessment = personalizedItalianCatalog.assessments.find(item=>item.id===unit.quizId)!;
  progress=recordCourseAssessment(progress, personalizedItalianCatalog, unit.quizId,
    Math.ceil(assessment.questionCount*assessment.passPercent/100),assessment.questionCount,false);
}
projected=projectItalianWorlds(buildCourseJourney(personalizedItalianCatalog,progress));
assert.equal(projected[0].complete,true);
const complete = render(createElement(ItalianWorldAtlas,{
  world:projected[0],locale:"fr",currentUnitId:"u04",hrefForUnit,canReview:()=>false,
}));
assert.equal((complete.match(/<a /g)??[]).length,4);
assert.ok(!complete.includes('data-status="locked"'));

for(const file of [
  "lib/yo/italian/cityIdentity.ts",
  "components/yo/italian/guided/ItalianCityArtwork.tsx",
  "components/yo/italian/guided/ItalianCityArrival.tsx",
]) {
  const source = readFileSync(file,"utf8");
  assert.doesNotMatch(source,/fetch\(|\.rpc\(|localStorage|recordCourseAssessment|recordCourseActivity|stripe|yoppo.?credit/i,
    `${file} must remain a pure presentation layer`);
}
console.log("YoPratiqo phase 4: 12 cultural city identities, 36 locale scenes, world links and mastery preserved: PASS");
