import assert from "node:assert/strict";
import { italianTodayNavigation, learningDayKey } from "@/lib/yo/daily/today";
import { dailyChallenge, artifacts } from "@/lib/yo/daily/challenges";
import { parseDailyClaim, parseDailyGoal } from "@/lib/yo/daily/contract";
import { italianCourseCatalog } from "@/lib/yo/italian/course/courseData";
import { emptyCourseProgress, recordCourseActivity, serializeCourseProgress, setCourseResume } from "@/lib/yo/italian/course/courseProgress";
import { personalizedItalianCatalog } from "@/lib/yo/personalized/courseData";
import { italianCatalogItemIds } from "@/lib/yo/srs/adapters/italian";
import { parseSrsImportPayload, parseSrsRecordPayload } from "@/lib/yo/srs/srsPersistence";

const active = italianCatalogItemIds(personalizedItalianCatalog);
const old = italianCatalogItemIds(italianCourseCatalog);
const newIds = [...active].filter(id => !old.has(id));
assert.equal(newIds.length, 19);
for (const itemId of active) {
  assert.ok(parseSrsRecordPayload({ itemId, attemptId:"e65efa8d-c1df-4725-8194-a2235e21c877", correct:true, assisted:false }).ok, itemId);
}
const now = Date.parse("2026-11-24T15:00:00Z");
const unit = personalizedItalianCatalog.units[0];
const lesson = unit.lessons.find(item => item.activityIds.includes(newIds[0]))!;
let progress = recordCourseActivity(emptyCourseProgress(), personalizedItalianCatalog, newIds[0], false, false, now);
progress = setCourseResume(progress, personalizedItalianCatalog, unit.id, lesson.id, newIds[0], now);
const imported = parseSrsImportPayload({ progress: serializeCourseProgress(progress) }, now);
assert.ok(imported.ok && imported.value.imported === 1 && imported.value.records[newIds[0]]);
const nav = italianTodayNavigation(personalizedItalianCatalog, progress, "en", unit.id, now);
assert.equal(nav.due, 1);
assert.match(nav.continueHref, /lang=en.*activite=it2-/);
assert.equal(nav.continueHref, nav.reviewHref);

assert.equal(learningDayKey(Date.parse("2026-11-01T03:59:00Z")), "2026-10-31");
assert.equal(learningDayKey(Date.parse("2026-11-01T04:01:00Z")), "2026-11-01");
for (const instant of ["2026-11-01T05:30:00Z", "2026-11-01T06:30:00Z"]) {
  assert.equal(learningDayKey(Date.parse(instant)), "2026-11-01");
}
const missionIds = new Set<string>();
const triviaIds = new Set<string>();
for (let day = 1; day <= 30; day++) {
  const key = `2026-11-${String(day).padStart(2,"0")}`;
  for (const kind of ["mission", "trivia"] as const) {
    const result = dailyChallenge(key, kind);
    assert.deepEqual(dailyChallenge(key, kind), result);
    assert.ok(result.answer >= 0 && result.answer < result.challenge.choices.length);
    assert.ok(!Object.hasOwn(result.challenge, "answer"));
    if (kind === "mission") {
      assert.ok(artifacts.some(artifact => artifact.id === result.artifactId));
      missionIds.add(result.challenge.id);
    } else triviaIds.add(result.challenge.id);
    if (day > 1) {
      const previous = `2026-11-${String(day - 1).padStart(2,"0")}`;
      assert.notEqual(dailyChallenge(previous, kind).challenge.id, result.challenge.id);
    }
  }
}
assert.equal(missionIds.size, 12);
assert.ok(triviaIds.size >= 10);
const valid = { day: "2026-11-24", kind: "mission", itemId: "daily-mission-it-u01", choice: 0 };
assert.deepEqual(parseDailyClaim(valid), valid);
for (const bad of [{...valid, userId: "other"}, {...valid, tz: "Europe/Rome"}, {...valid, xp: 30},
    {...valid, choice: -1}, {...valid, day: "tomorrow"}, {...valid, kind: "review"}]) assert.equal(parseDailyClaim(bad), null);
assert.deepEqual(parseDailyGoal({ goal: null }), { goal: null });
assert.deepEqual(parseDailyGoal({ goal: 5 }), { goal: 5 });
for (const goal of [0, 51, 2.5, "5", true]) assert.equal(parseDailyGoal({goal}), null);
assert.equal(parseDailyGoal({ goal: 5, activeSeconds: 600 }), null);
console.log("Italian active catalogue, Today navigation, daily rotation and payload validation passed");

async function routeDefaults() {
  const { GET } = await import("../../app/api/yo/today/route");
  const { POST } = await import("../../app/api/yo/daily/complete/route");
  const { PUT } = await import("../../app/api/yo/daily/goal/route");
  const original = process.env.YO_SRS_SERVER_ENABLED;
  const oldDaily = process.env.YO_DAILY_SERVER_ENABLED;
  try {
    delete process.env.YO_DAILY_SERVER_ENABLED;
    process.env.YO_SRS_SERVER_ENABLED = "true";
    const off = await GET(new Request("http://localhost/api/yo/today"));
    assert.equal(off.status, 404);
    assert.equal(off.headers.get("Cache-Control"), "private, no-store");
    process.env.YO_DAILY_SERVER_ENABLED = "true";
    const unauth = await GET(new Request("http://localhost/api/yo/today"));
    assert.equal(unauth.status, 401);
    for (const handler of [POST, PUT]) {
      const response = await handler(new Request("http://localhost/api/yo/daily/test", { method: handler === POST ? "POST" : "PUT" }));
      assert.equal(response.status, 401);
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    }
  } finally {
    if (oldDaily === undefined) delete process.env.YO_DAILY_SERVER_ENABLED;
    else process.env.YO_DAILY_SERVER_ENABLED = oldDaily;
    if (original === undefined) delete process.env.YO_SRS_SERVER_ENABLED;
    else process.env.YO_SRS_SERVER_ENABLED = original;
  }
}
void routeDefaults();
