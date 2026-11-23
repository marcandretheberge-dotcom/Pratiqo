import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { personalizedItalianUnits as units, personalizedItalianCatalog as catalog } from "../../lib/yo/personalized/courseData";
import { emptyCourseProgress, recordCourseActivity, recordCourseAssessment, ITALIAN_COURSE_PROGRESS_KEY } from "../../lib/yo/italian/course/courseProgress";
import { buildCourseJourney } from "../../lib/yo/courseJourney";
import { emptyRewards, reconcileRewards, parseRewards, rewardSummary, rewardDay, rewardWeek, demoRanking, PREVIEW_PROGRESS_KEY } from "../../lib/yo/rewards/italianPreviewRewards";
import { italianRewardsPreviewEnabled } from "../../lib/yo/rewards/previewGate";
import { postcardSamples } from "../../lib/yo/rewards/postcardSound";
import { SOUND_SAMPLE_RATE } from "../../lib/yo/feedback/woodSound";
const now = Date.parse("2026-11-22T16:00:00Z"), first = units[0].lessons[0].activities[0];

test("postcard motifs stay identifiable, deterministic and short with quiet edges and no clipping", () => {
  const lengths = new Set<number>();
  for (const cue of ["step","correct","stamp","mission","unlock"] as const) {
    const pcm = postcardSamples(cue);
    assert.deepEqual(postcardSamples(cue), pcm);
    assert.ok(pcm.every(n => Number.isFinite(n) && Math.abs(n) < .7));
    assert.ok(pcm.some(n => Math.abs(n) > .05));
    assert.equal(pcm[0], 0); assert.equal(pcm.at(-1), 0);
    assert.ok(pcm.length < SOUND_SAMPLE_RATE * .7);
    lengths.add(pcm.length);
  }
  assert.equal(lengths.size, 5);
});

test("only a completed real activity earns XP; mistakes and unknown IDs earn nothing", () => {
  let p = recordCourseActivity(emptyCourseProgress(), catalog, first.id, false, false, now);
  assert.equal(reconcileRewards(emptyRewards(), p, units).events.length, 0);
  p = recordCourseActivity(p, catalog, "invented", true, false, now);
  assert.equal(reconcileRewards(emptyRewards(), p, units).events.length, 0);
  p = recordCourseActivity(p, catalog, first.id, true, true, now);
  const ledger = reconcileRewards(emptyRewards(), p, units);
  assert.equal(rewardSummary(ledger, now).total, 5);
  p = recordCourseActivity(p, catalog, first.id, true, false, now + 1);
  const independent = reconcileRewards(ledger, p, units);
  assert.equal(rewardSummary(independent, now).total, 10);
  assert.deepEqual(reconcileRewards(independent, p, units), independent);
});

test("retry/reload never re-awards XP or moves it to a later day", () => {
  let p = recordCourseActivity(emptyCourseProgress(), catalog, first.id, true, false, now);
  const ledger = reconcileRewards(emptyRewards(), p, units);
  const reloaded = parseRewards(JSON.stringify(ledger), units, now);
  p = recordCourseActivity(p, catalog, first.id, true, false, now + 86400000);
  assert.deepEqual(reconcileRewards(reloaded, p, units), ledger);
  assert.equal(rewardSummary(ledger, now + 86400000).today, 0);
  assert.equal(rewardSummary(ledger, now + 86400000).total, 10);
});

test("lesson bonus follows all real activities and does not modify learning or unlocks", () => {
  let p = emptyCourseProgress();
  for (const a of units[0].lessons[0].activities) p = recordCourseActivity(p, catalog, a.id, true, false, now);
  const before = structuredClone(p), journey = buildCourseJourney(catalog, p);
  const ledger = reconcileRewards(emptyRewards(), p, units);
  assert.equal(ledger.events.filter(e => e.kind === "lesson").length, 1);
  assert.deepEqual(p, before);
  assert.deepEqual(buildCourseJourney(catalog, p), journey);
  assert.equal(journey.steps[1].unlocked, false);
  assert.equal(rewardSummary(ledger, now).goals[2].count, 1);
});

test("mastery bonus requires canonical independent passing evidence, not XP or assisted passes", () => {
  const quiz = units[0].quiz, total = quiz.questions.length;
  let p = recordCourseAssessment(emptyCourseProgress(), catalog, quiz.id, total, total, true, now);
  assert.equal(reconcileRewards(emptyRewards(), p, units).events.length, 0);
  p = recordCourseAssessment(p, catalog, quiz.id, 0, total, false, now + 1);
  assert.equal(reconcileRewards(emptyRewards(), p, units).events.length, 0);
  p = recordCourseAssessment(p, catalog, quiz.id, total, total, false, now + 2);
  const ledger = reconcileRewards(emptyRewards(), p, units);
  assert.equal(ledger.events.filter(e => e.kind === "mastery").length, 1);
  assert.equal(rewardSummary(ledger, now).total, 50);
});

test("listening goal counts distinct completed listening activities, not audio taps", () => {
  const activities = units.flatMap(u => u.lessons.flatMap(l => l.activities)).filter(a => a.kind === "listen");
  let p = emptyCourseProgress();
  for (const a of activities.slice(0, 2)) p = recordCourseActivity(p, catalog, a.id, true, false, now);
  const summary = rewardSummary(reconcileRewards(emptyRewards(), p, units), now);
  assert.equal(summary.goals[1].count, 2);
});

test("Toronto day and Monday week remain stable across DST and process timezone", () => {
  assert.equal(rewardDay(Date.parse("2026-11-23T02:00Z")), "2026-11-22");
  assert.equal(rewardWeek(Date.parse("2026-11-23T04:59Z")), "2026-11-16");
  assert.equal(rewardWeek(Date.parse("2026-11-23T05:00Z")), "2026-11-23");
  assert.equal(rewardDay(Date.parse("2026-03-08T06:59Z")), rewardDay(Date.parse("2026-03-08T07:01Z")));
  assert.equal(rewardDay(Date.parse("2026-11-01T05:59Z")), rewardDay(Date.parse("2026-11-01T06:01Z")));
  const old = process.env.TZ;
  try { process.env.TZ = "Asia/Tokyo"; assert.equal(rewardWeek(now), "2026-11-16"); }
  finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old; }
});

test("ledger parsing rejects unknown/duplicate entries and never trusts stored point amounts", () => {
  const ledger = parseRewards(JSON.stringify({ version: 1, events: [
    { id: `practice:${first.id}`, xp: 999999, at: now },
    { id: `practice:${first.id}`, xp: 999999, at: now },
    { id: "mastery:fake", xp: 999999, at: now },
  ] }), units, now);
  assert.equal(ledger.events.length, 1); assert.equal(ledger.events[0].xp, 5);
  assert.deepEqual(parseRewards("{", units), emptyRewards());
  assert.notEqual(PREVIEW_PROGRESS_KEY, ITALIAN_COURSE_PROGRESS_KEY);
});

test("weekly demo ranking responds to actual preview XP and is deterministic", () => {
  assert.equal(demoRanking(0).at(-1)?.id, "you");
  assert.equal(demoRanking(100)[1].id, "you");
  assert.deepEqual(demoRanking(45), demoRanking(45));
});

test("review is unavailable by default, on Vercel, or with a hosted database", () => {
  const local = { YO_ITALIAN_REWARDS_PREVIEW: "true", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:55421" };
  assert.equal(italianRewardsPreviewEnabled(local), true);
  assert.equal(italianRewardsPreviewEnabled({}), false);
  assert.equal(italianRewardsPreviewEnabled({ ...local, VERCEL: "1" }), false);
  assert.equal(italianRewardsPreviewEnabled({ ...local, VERCEL_ENV: "production" }), false);
  assert.equal(italianRewardsPreviewEnabled({ ...local, NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" }), false);
});

test("review shares real course/map and has no reward-writing API or entitlement dependency", () => {
  const ui = readFileSync("components/yo/rewards/ItalianRewardsPreview.tsx", "utf8");
  assert.match(ui, /GuidedItalianCourse/); assert.match(ui, /ItalianTravelNavigator/);
  assert.match(ui, /fictional/); assert.match(ui, /storageNamespace={REWARD_NAMESPACE}/);
  assert.doesNotMatch(ui, /fetch\(|supabase|stripe|createClient/);
  const css = readFileSync("components/yo/rewards/italianRewards.css", "utf8");
  assert.match(css, /prefers-reduced-motion:no-preference/);
});
