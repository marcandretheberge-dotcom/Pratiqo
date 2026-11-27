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
import { FinalChallengeIntro, FinalChallengeResult } from "@/components/yo/challenge/FinalChallengeStage";
import { ItalianBossBattleHud } from "@/components/yo/italian/guided/ItalianBossBattleHud";

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
    assert.ok(html.includes(`${world.id}.webp`));
    assert.equal(world.complete, false);
    for (const city of world.cities) assert.ok(html.includes(city.name), `${locale} ${city.name} must remain visible`);
    assert.equal((html.match(/<a /g) ?? []).length, world.id === "discover" ? 1 : 0,
      `${locale}: never link to a locked city`);
    assert.equal((html.match(/<li /g) ?? []).length, 4, "each world contains four accessible stops");
  }
}
for (const unit of personalizedItalianUnits) {
  for (const locale of ["fr", "en", "es"] as const) {
    const city = emptyWorlds.flatMap(world => world.cities).find(item => item.unitId === unit.id)!.name;
    const total = unit.quiz.questions.length, required = Math.ceil(total * unit.quiz.passPercent / 100);
    const actions = { headingRef: null, onReview: () => {} };
    const arrival = render(createElement(ItalianCityArrival, { unitId: unit.id, locale, mastered: false }));
    const boss = render(createElement(FinalChallengeIntro, { ...actions, city, locale, total, required, briefing: unit.quiz.description[locale], rules: "", onStart: () => {} }));
    const victory = render(createElement(FinalChallengeResult, { ...actions, city, locale, total, required, correct: total, passed: true, assisted: false, stampEarned: true, onContinue: () => {}, onRetry: () => {} }));
    assert.ok(arrival.includes(`data-yoppo-city-arrival="${unit.id}"`), unit.id);
    assert.ok(arrival.includes('yo-yoppo-city-arrival'));
    assert.ok(arrival.includes("prefers-reduced-motion"));
    assert.ok(boss.includes(city));
    assert.ok(boss.includes('data-challenge-stage="intro"'));
    assert.ok(boss.includes('data-earned="false"'));
    assert.ok(victory.includes('data-challenge-stage="success"'));
    assert.ok(victory.includes('data-earned="true"'));
    assert.ok(readFileSync("components/yo/challenge/finalChallenge.css", "utf8").includes("prefers-reduced-motion"));
    assert.notEqual(boss, victory, "victory state reveals the stamp only after assessed success");
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
assert.ok(!opened.includes('data-status="locked"'));
assert.equal((opened.match(/<a /g) ?? []).length, 4);

for (const locale of ["fr","en","es"] as const) {
  const emptyBattle = render(createElement(ItalianBossBattleHud,
    { locale, correct: 0, answered: 0, total: 5, passPercent: 80, assisted: false }));
  const advanced = render(createElement(ItalianBossBattleHud,
    { locale, correct: 4, answered: 5, total: 5, passPercent: 80, assisted: false, answers: Array.from({ length: 5 }, (_, index) => ({ correct: index < 4, assisted: false })) }));
  const assisted = render(createElement(ItalianBossBattleHud,
    { locale, correct: 5, answered: 5, total: 5, passPercent: 80, assisted: true, answers: Array.from({ length: 5 }, () => ({ correct: true, assisted: true })) }));
  assert.ok(emptyBattle.includes('data-boss-stones-lit="0"'));
  assert.ok(advanced.includes('data-boss-stones-lit="4"'));
  assert.equal((advanced.match(/data-state="correct"/g) ?? []).length, 4, "four questions were answered correctly");
  assert.equal((advanced.match(/data-state="review"/g) ?? []).length, 1, "the missed answer remains visible for review");
  assert.ok(assisted.includes('data-boss-stones-lit="5"'));
  assert.notEqual(assisted, advanced, "help must be transparent without changing canonical score");
}
const sourceFiles = [
 "components/yo/italian/guided/ItalianBossBattleHud.tsx",
 "components/yo/italian/guided/ItalianWorldAtlas.tsx",
 "components/yo/italian/guided/ItalianCityArrival.tsx",
 "components/yo/challenge/FinalChallengeStage.tsx",
];
for(const file of sourceFiles) {
  const code = readFileSync(file, "utf8");
  assert.doesNotMatch(code, /fetch\(|\.rpc\(|localStorage|recordCourseAssessment|recordCourseActivity|stripe|yoppo.?credit/i,
    `${file} must only project existing progress`);
}
const atlasNavigator = readFileSync("components/yo/italian/guided/ItalianWorldNavigator.tsx", "utf8");
assert.match(atlasNavigator, /<ItalianWorldAtlas world=\{world\}/);
const player = readFileSync("components/yo/italian/guided/GuidedItalianCourse.tsx", "utf8");
assert.match(player, /<ItalianWorldNavigator journey=\{journey\}/, "the adventure map is now the sole persistent course screen");
assert.match(player, /data-yoppo-mission-window/, "the city lesson opens above the mounted map");
assert.match(player, /<FinalChallengeIntro/);
assert.match(player, /<ItalianBossBattleHud locale=\{locale\} correct=\{completedAnswers\}/);
assert.match(player, /passed=\{resultPassed\} assisted=\{resultHelp\} stampEarned=\{passed\}/,
  "the result receives both current independent success and the canonical earned stamp");
assert.match(readFileSync("components/yo/challenge/FinalChallengeStage.tsx", "utf8"), /celebrate = passed && stampEarned/,
  "the stamp celebration still requires a verified, current independent pass");
console.log("YoPratiqo phase 3: 3 original world atlases, 12 arrival scenes, challenge celebration, unlock security and FR/EN/ES: PASS");
