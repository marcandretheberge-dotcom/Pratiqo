import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildCourseJourney } from "@/lib/yo/courseJourney";
import { emptyCourseProgress, recordCourseAssessment } from "@/lib/yo/italian/course/courseProgress";
import { personalizedItalianCatalog, personalizedItalianUnits } from "@/lib/yo/personalized/courseData";
import { projectItalianWorlds } from "@/lib/yo/italian/worlds";
import { ItalianWorldAtlas } from "@/components/yo/italian/guided/ItalianWorldAtlas";
import { ItalianCityArrival } from "@/components/yo/italian/guided/ItalianCityArrival";
import { ItalianCityBossGate } from "@/components/yo/italian/guided/ItalianCityBossGate";

const render = (component: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(component);
const href = (id: string) => `/yo/langues/italien/parcours/${id}`;
const noReview = () => false;

let progress = emptyCourseProgress();
const emptyWorlds = projectItalianWorlds(buildCourseJourney(personalizedItalianCatalog, progress));
assert.equal(emptyWorlds.length, 3);
for (const locale of ["fr", "en", "es"] as const) {
  for (const world of emptyWorlds) {
    const html = render(createElement(ItalianWorldAtlas, {
      world, locale, currentUnitId: "u01", hrefForUnit: href, canReview: noReview,
    }));
    assert.ok(html.includes(`data-yoppo-immersive-atlas="${world.id}"`));
    assert.ok(html.includes(`data-atlas-landscape="${world.id}"`));
    assert.equal((html.match(/data-yoppo-world-gate="closed"/g) ?? []).length, 1);
    for (const city of world.cities) assert.ok(html.includes(city.name), `${locale} ${city.name} must remain visible`);
    assert.equal((html.match(/<a /g) ?? []).length, world.id === "discover" ? 1 : 0,
      `${locale}: never link to a locked city`);
    assert.equal((html.match(/<li /g) ?? []).length, 4, "each world contains four accessible stops");
  }
}
for (const unit of personalizedItalianUnits) {
  for (const locale of ["fr", "en", "es"] as const) {
    const arrival = render(createElement(ItalianCityArrival, { unitId: unit.id, locale, mastered: false }));
    const boss = render(createElement(ItalianCityBossGate, { unitId: unit.id, locale, variant: "challenge" }));
    const victory = render(createElement(ItalianCityBossGate, { unitId: unit.id, locale, variant: "victory" }));
    assert.ok(arrival.includes(`data-yoppo-city-arrival="${unit.id}"`), unit.id);
    assert.ok(arrival.includes('yo-yoppo-city-arrival'));
    assert.ok(arrival.includes("prefers-reduced-motion"));
    assert.ok(boss.includes(`data-yoppo-city-boss="${unit.id}"`));
    assert.ok(boss.includes('data-boss-outcome="challenge"'));
    assert.ok(victory.includes('data-boss-outcome="victory"'));
    assert.ok(victory.includes("yo-city-gate-door-open"));
    assert.ok(victory.includes("prefers-reduced-motion"));
    assert.notEqual(boss, victory, "victory state changes the gate only after assessed success");
  }
}
for (const unit of personalizedItalianCatalog.units.slice(0,4)) {
  const exam = personalizedItalianCatalog.assessments.find(item => item.id === unit.quizId)!;
  progress = recordCourseAssessment(progress, personalizedItalianCatalog, exam.id,
    Math.ceil(exam.questionCount * exam.passPercent / 100), exam.questionCount, false);
}
const progressed = projectItalianWorlds(buildCourseJourney(personalizedItalianCatalog, progress));
assert.equal(progressed[0].complete, true);
assert.equal(progressed[1].citiesWithProgress[0].unlocked, true);
const opened = render(createElement(ItalianWorldAtlas, {
  world: progressed[0], locale: "fr", currentUnitId: "u04", hrefForUnit: href, canReview: noReview,
}));
assert.ok(opened.includes('data-yoppo-world-gate="open"'));
assert.equal((opened.match(/<a /g) ?? []).length, 4);

const sourceFiles = [
 "components/yo/italian/guided/ItalianWorldAtlas.tsx",
 "components/yo/italian/guided/ItalianCityArrival.tsx",
 "components/yo/italian/guided/ItalianCityBossGate.tsx",
];
for(const file of sourceFiles) {
  const code = readFileSync(file, "utf8");
  assert.doesNotMatch(code, /fetch\(|\.rpc\(|localStorage|recordCourseAssessment|recordCourseActivity|stripe|yoppo.?credit/i,
    `${file} must only project existing progress`);
}
const atlasNavigator = readFileSync("components/yo/italian/guided/ItalianWorldNavigator.tsx", "utf8");
assert.match(atlasNavigator, /<ItalianWorldAtlas world=\{world\}/);
const player = readFileSync("components/yo/italian/guided/GuidedItalianCourse.tsx", "utf8");
assert.match(player, /<ItalianCityArrival unitId=\{unit.id\} locale=\{locale\} mastered=\{passed\}/);
assert.match(player, /variant="challenge"/);
assert.match(player, /resultPassed\?<div[^>]*><ItalianCityBossGate unitId=\{unit.id\}/,
  "boss-victory scene is only rendered after a verified, current independent pass");
console.log("YoPratiqo phase 3: 3 original world atlases, 12 arrival scenes, boss gate victory, unlock security and FR/EN/ES: PASS");
