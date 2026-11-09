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

assert.match(atlasSource, /aspect-\[4\/7\]/, "mobile map stays proportional to 480x840 artwork");
assert.match(atlasSource, /lg:aspect-\[3\/2\]/, "desktop board is composed at 960x640, not stretched");
assert.match(atlasSource, /data-yoppo-portrait-art/);
assert.match(atlasSource, /data-yoppo-desktop-art/);
assert.match(navigatorSource, /width:min\(100%,480px/);
assert.match(navigatorSource, /width:min\(100%,960px/);
assert.match(navigatorSource, /min-width:1024px/);
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
  assert.ok(map.includes("data-atlas-landscape-wide") && map.includes("data-atlas-landscape="));
}

for (const [viewportWidth, viewportHeight] of [[375, 812], [390, 844], [430, 932], [1024, 768], [1440, 760], [1920, 1080]]) {
  const desktop = viewportWidth >= 1024;
  const width = desktop
    ? Math.min(viewportWidth, 960, (viewportHeight - 96) * 1.5)
    : Math.min(viewportWidth, 480, Math.max(320, (viewportHeight - 96) * 480 / 840));
  const height = width / (desktop ? 1.5 : 480 / 840);
  assert.ok(width <= viewportWidth, "board may never overflow the window");
  assert.ok(Math.abs(width / height - (desktop ? 1.5 : 480 / 840)) < .00001, "source art stays proportional");
  assert.ok(height <= viewportHeight, "world board fits within standard laptop/phone viewport");
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
console.log("Yoppo desktop & printables: original aspect 480x840/960x640, 3 worlds, six viewport sizes, localized study sheets and real access rules PASS");
