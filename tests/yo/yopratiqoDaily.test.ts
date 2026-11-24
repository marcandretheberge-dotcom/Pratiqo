import assert from "node:assert/strict";
import { dailyStreak, italianTodayNavigation, learningDayKey } from "@/lib/yo/daily/today";
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
assert.equal(dailyStreak([], "2026-11-24"), 0);
assert.equal(dailyStreak(["2026-03-07", "2026-03-08", "2026-03-09"], "2026-03-09"), 3);
assert.equal(dailyStreak(["2026-11-23", "2026-11-24", "2026-11-24"], "2026-11-24"), 2);
assert.equal(dailyStreak(["2026-11-23", "2026-11-25"], "2026-11-25"), 2, "freeze bridges, does not increment");
assert.equal(dailyStreak(["2026-11-23", "2026-11-25", "2026-11-27"], "2026-11-27"), 1);
assert.equal(dailyStreak(["2026-11-23", "2026-11-25"], "2026-11-27"), 0);
assert.equal(dailyStreak(["2026-11-20", "2026-11-22", "2026-11-24"], "2026-11-24"), 3, "new week allows a second bridge");
console.log("Italian active catalog, Today navigation, calendar boundaries and weekly freeze passed");

async function routeDefaults() {
  const { GET } = await import("../../app/api/yo/today/route");
  const original = process.env.YO_SRS_SERVER_ENABLED;
  try {
    delete process.env.YO_SRS_SERVER_ENABLED;
    const off = await GET(new Request("http://localhost/api/yo/today"));
    assert.equal(off.status, 404);
    assert.equal(off.headers.get("Cache-Control"), "private, no-store");
    process.env.YO_SRS_SERVER_ENABLED = "true";
    const unauth = await GET(new Request("http://localhost/api/yo/today"));
    assert.equal(unauth.status, 401);
  } finally {
    if (original === undefined) delete process.env.YO_SRS_SERVER_ENABLED;
    else process.env.YO_SRS_SERVER_ENABLED = original;
  }
}
void routeDefaults();
