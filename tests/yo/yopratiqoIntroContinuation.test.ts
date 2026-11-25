import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { introCourses } from "@/lib/yo/shared/course";
import { introContinuation, introGoalReview, introWeeklyPlan } from "@/lib/yo/shared/continuation";
import { introAnswerExplanation } from "@/lib/yo/shared/questionFeedback";
import { emptyDraft, freshIntro } from "@/lib/yo/shared/state";
import { courseSteps } from "@/lib/yo/shared/steps";
import type { IntroProfile } from "@/lib/yo/shared/types";

const goals: IntroProfile["goal"][] = ["travel", "family", "work", "conversation", "thorough"];
const locales = ["fr", "en", "es"] as const;
const expectedDefault: Record<string, string> = {
  anglais: "/yo/langues/anglais/intro",
  "francais-quebec": "/yo/langues/francais-quebec/intro",
  espagnol: "/yo/langues/espagnol/intro",
  allemand: "/yo/langues/allemand/parcours",
  "portugais-bresil": "/yo/langues/portugais-bresil/parcours",
  japonais: "/yo/langues/japonais/parcours",
  mandarin: "/yo/langues/mandarin/parcours",
};
let destinations = 0;
for (const course of introCourses) {
  const snapshot = JSON.stringify(course);
  for (const goal of goals) for (const locale of locales) {
    const next = introContinuation(course, goal, locale);
    const expected = course.slug === "francais-quebec" && goal === "work"
      ? "/yo/langues/francais-quebec/module-1/lecon-3"
      : course.slug === "espagnol" && goal === "travel"
        ? "/yo/langues/espagnol/pays/republique-dominicaine"
        : expectedDefault[course.slug];
    assert.equal(next.path, expected, `${course.slug}/${goal} must lead to its existing activity`);
    assert.equal(next.href, `${expected}?lang=${locale}`, "Keep the interface language on continuation");
    assert.ok(existsSync(path.join(process.cwd(), "app", next.path, "page.tsx")), `Missing continuation route: ${next.path}`);
    assert.ok(next.title[locale].length > 15 && next.description[locale].length > 35);
    assert.doesNotMatch(`${next.title[locale]} ${next.description[locale]}`, /\b(?:B2|C1|C2|certif\w*|unlocked|débloqué)\b/i);
    destinations++;
  }
  assert.equal(JSON.stringify(course), snapshot, "A recommendation must not change course content or access");
}
console.log(`PASS ${destinations} continuation choices target existing localized routes without invented levels`);

assert.equal(introWeeklyPlan(0), null, "Own pace does not become a forced time goal");
assert.deepEqual(introWeeklyPlan(15), { sessions: 1, minutes: 15 });
assert.deepEqual(introWeeklyPlan(30), { sessions: 1, minutes: 30 });
assert.deepEqual(introWeeklyPlan(60), { sessions: 2, minutes: 30 });
assert.deepEqual(introWeeklyPlan(120), { sessions: 4, minutes: 30 });
for (const budget of [15, 16, 31, 90, 210, 240, 1200]) {
  const plan = introWeeklyPlan(budget)!;
  assert.ok(plan.sessions >= 1 && plan.sessions <= 7);
  assert.ok(Math.abs(plan.sessions * plan.minutes - budget) <= plan.sessions / 2, "Suggested rhythm respects the learner’s weekly budget after minute rounding");
}
for (const invalid of [-1, 1, 14, 30.5, 1201, NaN, Infinity]) assert.equal(introWeeklyPlan(invalid), null);
console.log("PASS weekly rhythms respect the selected budget and preserve own-pace mode");

for (const course of introCourses) {
  const steps = courseSteps(course), state = freshIntro(course);
  assert.equal(introGoalReview(course, state), null);
  state.profile = { experience: "some", goal: "travel", minutes: 60, entry: 1 };
  assert.equal(introGoalReview(course, state), null, "Do not offer unseen content as a revision");
  state.visited = steps.filter(step => step.mission < 2).map(step => step.id);
  state.completed = course.missions[0].practice.map(exercise => exercise.id);
  state.best = course.final.length;
  for (const goal of goals) {
    state.profile.goal = goal;
    const before = JSON.stringify(state), review = introGoalReview(course, state)!;
    assert.ok(review, `${course.slug}/${goal} has reached material to revisit`);
    assert.ok(state.visited.includes(steps[review.step].id));
    assert.equal(steps[review.step].kind, goal === "thorough" ? "concept" : goal === "work" ? "exercise" : "scene");
    assert.equal(steps[review.step].mission, goal === "family" ? 0 : 1, "Family starts with greetings; other goals revisit the latest reached material");
    assert.equal(JSON.stringify(state), before, "Suggestions preserve stamps, answers and legacy completion");
  }
  for (const resume of ["lesson", "final"] as const) {
    state.resume = resume;
    state.draft = { ...emptyDraft(), selected: "name", assisted: true };
    state.answers = [{ correct: true, assisted: false }];
    state.finalIndex = 1;
    const before = JSON.stringify(state);
    assert.equal(introGoalReview(course, state), null, "An unfinished answer takes priority over suggested revision");
    assert.equal(JSON.stringify(state), before);
  }
}
console.log("PASS goal-based revision uses reached content and never replaces unfinished lesson/final drafts");

let explanations = 0;
for (const course of introCourses) {
  const all = course.missions.flatMap(mission => [...mission.preparation, ...mission.practice]);
  for (const exercise of all) {
    const phrase = course.phrases.find(item => item.id === exercise.answer)!;
    const chosen = exercise.options.find(option => option !== exercise.answer) ?? null;
    const parts = phrase.parts?.map((_, index) => index) ?? [];
    const feedback = introAnswerExplanation(course, exercise, { selected: chosen, tiles: [...parts].reverse() })!;
    assert.equal(feedback.target, phrase, "Feedback uses the exact authored target, including accents and script");
    assert.equal(feedback.chosen?.id, chosen ?? undefined);
    if (feedback.concept) {
      assert.ok(course.missions.some(mission => mission.concepts.includes(feedback.concept!)));
      assert.ok(feedback.concept.examples.includes(phrase.id));
    }
    for (const locale of locales) assert.ok(feedback.guidance[locale].length > 25);
    if (exercise.kind === "order") {
      assert.equal(feedback.orderCorrection?.position, 1);
      assert.equal(feedback.orderCorrection?.expected, phrase.parts![0]);
      assert.equal(feedback.orderCorrection?.chosen, phrase.parts!.at(-1));
    }
    explanations++;
  }
  const exercise = all[0];
  assert.equal(introAnswerExplanation(course, { ...exercise, answer: "missing" }, emptyDraft()), null);
  assert.equal(introAnswerExplanation(course, exercise, { selected: "untrusted-value", tiles: [] })?.chosen, undefined);
}
console.log(`PASS ${explanations} explanations preserve authored phrases, localized guidance and applicable concepts`);
