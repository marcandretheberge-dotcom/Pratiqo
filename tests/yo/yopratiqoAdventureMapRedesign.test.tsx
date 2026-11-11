import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildCourseJourney } from "@/lib/yo/courseJourney";
import { emptyCourseProgress, recordCourseAssessment } from "@/lib/yo/italian/course/courseProgress";
import { personalizedItalianCatalog } from "@/lib/yo/personalized/courseData";
import { projectItalianWorlds } from "@/lib/yo/italian/worlds";
import { ItalianWorldNavigator } from "@/components/yo/italian/guided/ItalianWorldNavigator";
import { ItalianWorldAtlas } from "@/components/yo/italian/guided/ItalianWorldAtlas";
import { ItalianAdventureLandscape } from "@/components/yo/italian/guided/ItalianAdventureLandscape";

const hrefForUnit = (unitId: string) => "/yo/langues/italien/parcours/" + unitId;
const noReview = () => false;
const getHtml = (world: ReturnType<typeof projectItalianWorlds>[number], locale: "fr" | "en" | "es", unitId: string) =>
  renderToStaticMarkup(createElement(ItalianWorldAtlas, {
    world, locale, currentUnitId: unitId, hrefForUnit, canReview: noReview,
  }));
const landscapes = new Set<string>();
const themes = ["discover", "daily-life", "independence"] as const;
for (const theme of themes) {
  const html = renderToStaticMarkup(createElement(ItalianAdventureLandscape, { worldId: theme, complete: false }));
  assert.ok(html.includes('data-atlas-landscape="' + theme + '"'));
  assert.ok(html.includes('data-yoppo-world-castle'));
  assert.ok(html.includes('preserveAspectRatio="xMidYMid meet"'), "the portrait SVG must never be non-uniformly stretched");
  assert.ok(html.includes("yo-adventure-dotted-road"), "the actual path must remain visible");
  assert.ok(html.includes("prefers-reduced-motion"), "ambient motion is optional");
  assert.ok(html.includes("<svg"), "world landscape is an original vector scene");
  landscapes.add(html);
}
assert.equal(landscapes.size, 3, "each world gets a distinct dramatic atmosphere");

let progress = emptyCourseProgress();
let worlds = projectItalianWorlds(buildCourseJourney(personalizedItalianCatalog, progress));
for (const locale of ["fr", "en", "es"] as const) {
  for (const world of worlds) {
    const html = getHtml(world, locale, "u01");
    assert.ok(html.includes('data-yoppo-immersive-atlas="' + world.id + '"'));
    assert.ok(html.includes('data-yoppo-world-cities="' + world.id + '"'));
    assert.equal((html.match(/<li /g) ?? []).length, 4);
    assert.equal((html.match(/data-yoppo-map-token=/g) ?? []).length, 4);
    assert.ok(html.includes(`${world.id}.webp`), "each world uses its own illustrated landscape");
    assert.ok(html.includes('alt=""'), "decorative art never replaces accessible city names");
    assert.ok(html.includes('viewBox="0 0 480 600"'), "route shares the artwork ratio");
    assert.equal((html.match(/<a /g) ?? []).length, world.id === "discover" ? 1 : 0,
      "no unlocked-by-animation exploit");
    if (world.id === "discover") {
      assert.ok(html.includes('aria-current="step"'));
      assert.equal((html.match(/class="yo-yoppo-map-guide"/g) ?? []).length, 1,
        "one Yoppo guide, regardless of the number of animation rules");
      assert.ok(html.includes('data-yoppo-map-token="u01"'));
      assert.ok(html.includes('data-yoppo-path-progress="0.08"'), "new learner route glows only to the first active city");
      assert.ok(html.includes('data-yoppo-active-city="true"'));
    }
  }
}
const firstUnit = personalizedItalianCatalog.units[0];
const firstAssessment = personalizedItalianCatalog.assessments.find(a => a.id === firstUnit.quizId)!;
progress = recordCourseAssessment(progress, personalizedItalianCatalog,
  firstAssessment.id,
  Math.ceil(firstAssessment.questionCount * firstAssessment.passPercent / 100),
  firstAssessment.questionCount, false);
worlds = projectItalianWorlds(buildCourseJourney(personalizedItalianCatalog, progress));
assert.equal(worlds[0].citiesWithProgress[1].unlocked, true);
const nextHtml = getHtml(worlds[0], "fr", "u01");
assert.equal((nextHtml.match(/<a /g) ?? []).length, 2, "reaching Parma requires authentic Bologna mastery");
const secondStop = nextHtml.split("<li ")[2]?.split("</li>")[0] ?? "";
assert.ok(secondStop.includes('aria-current="step"') && secondStop.includes('data-yoppo-map-token="u02"'),
  "Yoppo follows the first unmastered unlocked city, even on an older route");
assert.ok(nextHtml.includes('data-yoppo-path-progress="0.34"'), "mastery advances the illuminated route to the next city");

for (const unit of personalizedItalianCatalog.units.slice(1, 4)) {
  const assessment = personalizedItalianCatalog.assessments.find(a => a.id === unit.quizId)!;
  progress = recordCourseAssessment(progress, personalizedItalianCatalog,
    assessment.id,
    Math.ceil(assessment.questionCount * assessment.passPercent / 100),
    assessment.questionCount, false);
}
worlds = projectItalianWorlds(buildCourseJourney(personalizedItalianCatalog, progress));
assert.equal(worlds[0].complete, true);
const completedNavigator = renderToStaticMarkup(createElement(ItalianWorldNavigator, {
  journey: buildCourseJourney(personalizedItalianCatalog, progress), locale: "fr", currentUnitId: "u04", hrefForUnit, canReview: noReview,
}));
assert.ok(completedNavigator.includes('data-yoppo-world-gate="open"'));
assert.ok(completedNavigator.includes('data-yoppo-flute="discover"'));
const finished = getHtml(worlds[0], "fr", "u04");

assert.equal((finished.match(/<a /g) ?? []).length, 4);
assert.ok(!finished.includes('data-yoppo-world-gate="closed"'));
assert.ok(finished.includes('data-yoppo-path-progress="1.00"'), "completed world illuminates the full route to the castle");

const mapSource = readFileSync("components/yo/italian/guided/ItalianWorldAtlas.tsx", "utf8");
const sceneSource = readFileSync("components/yo/italian/guided/ItalianAdventureLandscape.tsx", "utf8");
const navigatorSource = readFileSync("components/yo/italian/guided/ItalianWorldNavigator.tsx", "utf8");
const progressPathSource = readFileSync("components/yo/italian/guided/ItalianAdventureProgressPath.tsx", "utf8");
const atmosphereSource = readFileSync("components/yo/italian/guided/ItalianAtlasAtmosphere.tsx", "utf8");
assert.match(navigatorSource, /<ItalianWorldAtlas world=\{world\}/);
assert.doesNotMatch(navigatorSource, /grid-cols-2/);
assert.match(progressPathSource, /motion\.path/);
assert.match(progressPathSource, /useReducedMotion/);
assert.match(navigatorSource, /data-yoppo-world-gate/);
assert.match(atmosphereSource, /prefers-reduced-motion:reduce/);
for (const [name, source] of [["map", mapSource], ["scene", sceneSource], ["progress path", progressPathSource], ["atmosphere", atmosphereSource]] as const) {
  assert.doesNotMatch(source, /recordCourseAssessment|recordCourseActivity|localStorage|fetch\(|\.rpc\(|stripe|yoppo.?credit/i,
    name + " never changes entitlement, evaluation, purchase or progress");
}
console.log("Yoppo map redesign: illustrated worlds, 4 actual pathway stops, next-city guidance, locked cities and reduced motion: PASS");
