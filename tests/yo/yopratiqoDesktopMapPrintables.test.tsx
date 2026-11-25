import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ItalianAdventureLandscape } from "@/components/yo/italian/guided/ItalianAdventureLandscape";
import { ItalianAdventureLandscapeWide } from "@/components/yo/italian/guided/ItalianAdventureLandscapeWide";
import { ItalianPrintableMenu } from "@/components/yo/italian/guided/ItalianPrintableMenu";
import { ItalianWorldAtlas } from "@/components/yo/italian/guided/ItalianWorldAtlas";
import { projectItalianWorlds } from "@/lib/yo/italian/worlds";
import { buildCourseJourney } from "@/lib/yo/courseJourney";
import { emptyCourseProgress } from "@/lib/yo/italian/course/courseProgress";
import { personalizedItalianCatalog } from "@/lib/yo/personalized/courseData";

const source = (path: string) => readFileSync(path, "utf8");
const portraitSource = source("components/yo/italian/guided/ItalianAdventureLandscape.tsx");
const desktopSource = source("components/yo/italian/guided/ItalianAdventureLandscapeWide.tsx");
const atlasSource = source("components/yo/italian/guided/ItalianWorldAtlas.tsx");
const navigatorSource = source("components/yo/italian/guided/ItalianWorldNavigator.tsx");
const guidedSource = source("components/yo/italian/guided/GuidedItalianCourse.tsx");
const printsSource = source("components/yo/italian/guided/ItalianPrintableMenu.tsx");
const achievementSource = source("components/yo/italian/guided/ItalianAchievementPrintable.tsx");
assert.match(achievementSource, /status\.mastered \? c\.subtitle : c\.upcoming/,
  "a pre-completion printout must show learning goals, not pretend they were mastered");

const experienceCss = source("components/yo/italian/guided/ItalianCourseExperience.css");
assert.match(experienceCss, /aspect-ratio:4\/5/, "all map art uses its native portrait ratio");
assert.match(experienceCss, /max-width:960px/, "desktop has a bounded two-column composition");
assert.match(experienceCss, /grid-template-columns:minmax\(0,520px\)/);
assert.match(atlasSource, /yo-world-art/);
assert.match(navigatorSource, /yo-world-action/);
assert.match(portraitSource, /preserveAspectRatio="xMidYMid meet"/);
assert.match(desktopSource, /preserveAspectRatio="xMidYMid meet"/);
assert.doesNotMatch(portraitSource + desktopSource, /preserveAspectRatio="none"/);
assert.doesNotMatch(portraitSource + desktopSource + printsSource, /fetch\(|\.rpc\(|recordCourseAssessment|recordCourseActivity|stripe|yoppo.?credit/i,
  "art and printables cannot change progress, credits or paid rights");

for (const worldId of ["discover", "daily-life", "independence"]) {
  const portrait = renderToStaticMarkup(createElement(ItalianAdventureLandscape, {worldId, complete: false}));
  const wide = renderToStaticMarkup(createElement(ItalianAdventureLandscapeWide, {worldId, complete: false}));
  assert.ok(portrait.includes('viewBox="0 0 480 840"'), "portrait geometry must remain original");
  assert.ok(wide.includes('viewBox="0 0 960 640"'), "desktop has its own wide geometry");
  assert.ok(wide.includes('data-atlas-landscape-wide="' + worldId + '"'));
  assert.ok(wide.includes("yo-adventure-dotted-road") && wide.includes("data-yoppo-world-castle"));
  assert.ok(wide.includes("prefers-reduced-motion"), "laptop motion honors reduced-motion preference");
  assert.notEqual(wide, portrait, "wide art isn't a scaled or copied portrait scene");
}

const worlds = projectItalianWorlds(buildCourseJourney(personalizedItalianCatalog, emptyCourseProgress()));
for (const world of worlds) {
  const map = renderToStaticMarkup(createElement(ItalianWorldAtlas, {
    world, locale: "fr", currentUnitId: "u01",
    hrefForUnit: id => `/yo/langues/italien/parcours/${id}`, canReview: () => false,
  }));
  assert.equal((map.match(/data-yoppo-map-token=/g) ?? []).length, 4, "each art direction reuses the exact same four mission markers");
  assert.equal((map.match(/<a /g) ?? []).length, world.id === "discover" ? 1 : 0, "decor never unlocks cities");
  assert.ok(map.includes(`${world.id}.webp`) && map.includes("yo-illustrated-atlas"));
}

assert.match(guidedSource, /data-yoppo-printables-trigger/);
assert.match(guidedSource, /onClick=\{openPrintables\} disabled=\{challengeMode\}/,
  "reference material is disabled while the final challenge is in progress");
assert.match(guidedSource, /function openStudyMaterial[\s\S]*?ui\.view === "mission" && exercise && !ui\.game\.complete[\s\S]*?assisted: true/,
  "reading study material during a live exercise is explicitly assisted");
assert.match(guidedSource, /<ItalianPrintableMenu locale=\{locale\}/, "map printables open in the existing accessible dialog");
assert.match(guidedSource, /Imprimer les mots avant de commencer/, "learner receives the printable at mission start");
assert.match(guidedSource, /Imprimer mon bilan/, "achievement sheet remains available on final victory");

for (const locale of ["fr","en","es"] as const) for (const mastered of [true, false]) {
  const html = renderToStaticMarkup(createElement(ItalianPrintableMenu, { locale, unitId: "u01", mastered }));
  assert.ok(html.includes("data-yoppo-printables-menu"));
  assert.equal((html.match(/<a /g) ?? []).length, 2);
  assert.ok(html.includes("/yo/langues/italien/parcours/u01/vocabulaire?lang=" + locale));
  assert.ok(html.includes("/yo/langues/italien/parcours/u01/bilan?lang=" + locale));
  assert.ok(html.includes('target="_blank"') && html.includes('rel="noopener"'));
  assert.ok(!html.includes("download="), "printable routes never promise nonexistent PDFs");
  if (!mastered) assert.ok(html.includes(locale === "fr" ? "sans tampon" : locale === "en" ? "no stamp" : "sin sello"));
}
console.log("Yoppo desktop & printables: proportional illustrated maps, 3 worlds, localized study sheets and real access rules PASS");
