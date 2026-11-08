import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { italianCourseUnits, italianCourseCatalog } from "@/lib/yo/italian/course/courseData";
import { emptyCourseProgress, recordCourseActivity, recordCourseAssessment, serializeCourseProgress, parseCourseProgress } from "@/lib/yo/italian/course/courseProgress";
import { guidedSteps, initialGuided, emptyGame, parseGuided, nextGuidedStep, guidedPassed, guidedPoints, checkGuided, tokenPool, listeningText } from "@/lib/yo/italian/course/guidedItalian";
import { guidedCopy } from "@/components/yo/italian/guided/copy";
const unit = italianCourseUnits[0], steps = guidedSteps(unit);
let tests = 0;
function test(name: string, run: () => void) { run(); console.log(`✓ ${name}`); tests++; }
test("all 19 canonical exercise identifiers are retained once", () => {
 assert.deepEqual(steps.flatMap(s => s.activity ? [s.id] : []), unit.lessons.flatMap(l => l.activities.map(a => a.id)));
 assert.equal(steps.filter(s => s.activity).length, 19);
 assert.equal(new Set(steps.map(s => s.id)).size, steps.length);
});
test("every mission retains scene, vocabulary, grammar and pronunciation before its exercises", () => {
 unit.lessons.forEach((_, i) => assert.deepEqual(steps.filter(s => s.lesson === i).slice(0, 4).map(s => s.stage), ["scene", "words", "language", "sounds"]));
});
test("all six written practice tasks plus final question have a keyboard-free answer", () => {
 const typed = [...unit.lessons.flatMap(l => l.activities), ...unit.quiz.questions].filter(a => a.kind === "type");
 assert.equal(typed.length, 7);
 typed.forEach(a => assert.equal(checkGuided(a, { ...emptyGame(), tiles: tokenPool(a).map((_, i) => i) }), true));
});
test("dictation retains its recorded listening text", () => {
 unit.lessons.forEach(l => { const a = l.activities.find(a => a.kind === "type" && a.listeningText)!; assert.ok(listeningText(a)); });
});
test("wrong tiles are not automatically successful", () => {
 const a = unit.lessons[2].activities.find(a => a.kind === "type")!;
 assert.equal(checkGuided(a, { ...emptyGame(), tiles: [] }), false);
 assert.equal(checkGuided(a, { ...emptyGame(), tiles: tokenPool(a).map((_, i) => i).reverse() }), false);
});
test("visits and production checkboxes cannot earn a stamp", () => {
 const progress = emptyCourseProgress(); progress.productions[unit.production.id] = true;
 assert.equal(guidedPassed(unit, progress), false); assert.equal(guidedPoints(unit, progress), 0);
});
test("passing threshold stays 4/5 independently", () => {
 let p = recordCourseAssessment(emptyCourseProgress(), italianCourseCatalog, unit.quiz.id, 3, 5, false);
 assert.equal(guidedPassed(unit, p), false);
 p = recordCourseAssessment(p, italianCourseCatalog, unit.quiz.id, 5, 5, true);
 assert.equal(guidedPassed(unit, p), false);
 p = recordCourseAssessment(p, italianCourseCatalog, unit.quiz.id, 4, 5, false);
 assert.equal(guidedPassed(unit, p), true);
});
test("replays do not duplicate learning points or remove a previous stamp", () => {
 let p = emptyCourseProgress(); const id = unit.lessons[0].activities[0].id;
 p = recordCourseActivity(p, italianCourseCatalog, id, true, false);
 const points = guidedPoints(unit, p);
 p = recordCourseActivity(p, italianCourseCatalog, id, true, false);
 assert.equal(guidedPoints(unit, p), points);
 p = recordCourseAssessment(p, italianCourseCatalog, unit.quiz.id, 4, 5, false);
 const passedPoints = guidedPoints(unit, p);
 p = recordCourseAssessment(p, italianCourseCatalog, unit.quiz.id, 1, 5, false);
 assert.equal(guidedPassed(unit, p), true); assert.equal(guidedPoints(unit, p), passedPoints);
});
test("legacy progress is read unchanged", () => {
 let p = recordCourseActivity(emptyCourseProgress(), italianCourseCatalog, unit.lessons[0].activities[0].id, true, true);
 p = recordCourseAssessment(p, italianCourseCatalog, unit.quiz.id, 5, 5, false);
 const serialized = serializeCourseProgress(p);
 assert.equal(serializeCourseProgress(parseCourseProgress(serialized, italianCourseCatalog)), serialized);
});
test("UI draft round-trip retains exact selected tiles and helped flag", () => {
 const s = initialGuided(); s.step = steps.findIndex(s => s.activity?.kind === "type"); s.view = "mission"; s.resumeView = "mission";
 s.game = { ...emptyGame(), tiles: [0], assisted: true };
 assert.deepEqual(parseGuided(JSON.stringify(s), unit, 0), s);
});
test("paused quiz round-trip retains its index and draft", () => {
 const s = initialGuided(); s.view = "map"; s.resumeView = "challenge"; s.quizIndex = 1; s.runStartedAt = Date.now(); s.answers = [{ correct: true, assisted: false }]; s.game.selected = "a";
 assert.deepEqual(parseGuided(JSON.stringify(s), unit, 0), s);
});
test("invalid, stale-reset and out-of-range drafts reset without affecting canonical progress", () => {
 assert.deepEqual(parseGuided("not json", unit, 0), initialGuided());
 assert.deepEqual(parseGuided(JSON.stringify(initialGuided()), unit, 42), initialGuided(42));
 const s = { ...initialGuided(), step: 999 };
 assert.deepEqual(parseGuided(JSON.stringify(s), unit, 0), initialGuided());
});
test("duplicate/out-of-range tiles and invalid dialogue position are rejected", () => {
 const s = initialGuided(); s.step = steps.findIndex(s => s.activity?.kind === "type"); s.game.tiles = [0, 0];
 assert.deepEqual(parseGuided(JSON.stringify(s), unit, 0), initialGuided());
 s.game.tiles = [999]; assert.deepEqual(parseGuided(JSON.stringify(s), unit, 0), initialGuided());
 s.game = { ...emptyGame(), turn: 99 }; assert.deepEqual(parseGuided(JSON.stringify(s), unit, 0), initialGuided());
});
test("next action is a required task, not an optional tool", () => {
 const s = initialGuided(), p = emptyCourseProgress(); assert.equal(nextGuidedStep(steps, s, p), 0);
 s.seen = steps.filter(s => !s.activity).map(s => s.id);
 assert.equal(steps[nextGuidedStep(steps, s, p)].id, unit.lessons[0].activities[0].id);
});
test("all three locales expose identical navigation vocabulary", () => {
 assert.deepEqual(Object.keys(guidedCopy.fr).sort(), Object.keys(guidedCopy.en).sort());
 assert.deepEqual(Object.keys(guidedCopy.fr).sort(), Object.keys(guidedCopy.es).sort());
});
test("new learner components contain no writing fields, self-rating or financial side effects", () => {
 const source = ["GuidedItalianCourse", "GuidedGame"].map(name => readFileSync(`components/yo/italian/guided/${name}.tsx`, "utf8")).join("\n");
 assert.doesNotMatch(source, /<textarea|<input|type=["']checkbox|markProduction\(|stripe|\.rpc\(|fetch\(/);
 assert.match(source, /getYoPratiqoModuleBySlug\("italien"\)/);
});
console.log(`${tests} guided Italian checks passed`);
