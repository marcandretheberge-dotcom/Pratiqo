import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dateInTeacherTimeZone, teacherDayBounds, teacherSlotMeetsNotice, zonedWallTimeToUtc, addCalendarDays } from "@/lib/timezones";
import { normalizeTeacherSubjectIds } from "@/lib/taxonomy/teacherSubjectNormalization";
import { deriveTeacherBookingCapability, teacherBookingActionKey } from "@/lib/teachers/bookingCapability";
import { parseAvailabilityPreviewQuery } from "@/lib/bookings/availabilityPreview";

function assertions() {
  for (const [timeZone, expected] of [["America/Toronto", "2026-10-12"], ["Asia/Tokyo", "2026-10-13"]]) {
    const preview = parseAvailabilityPreviewQuery({ startDate: null, days: null, durationMinutes: null,
      teacherDefaultDuration: 60, timeZone, now: new Date("2026-10-13T01:00:00Z") });
    assert.ok(preview.ok);
    assert.equal(preview.startDate, expected);
  }
  assert.equal(dateInTeacherTimeZone(new Date("2026-10-13T01:00:00Z")), "2026-10-12");
  assert.equal(addCalendarDays("2026-03-07", 1), "2026-03-08");
  for (const [day, hours] of [["2026-03-08", 23], ["2026-11-01", 25]] as const) {
    const { start, end } = teacherDayBounds(day);
    assert.equal((end.getTime() - start.getTime()) / 3600000, hours);
  }
  assert.equal(zonedWallTimeToUtc({ dateIso: "2026-03-08", slot: "2h30", timeZone: "America/Toronto" }), null);
  assert.equal(zonedWallTimeToUtc({ dateIso: "2026-11-01", slot: "1h30", timeZone: "America/Toronto" })?.toISOString(), "2026-11-01T05:30:00.000Z");
  const boundary = new Date("2026-10-12T13:00:00Z");
  assert.equal(teacherSlotMeetsNotice("2026-10-13", "9h00", boundary), true);
  assert.equal(teacherSlotMeetsNotice("2026-10-13", "09:00", boundary), true);
  assert.equal(teacherSlotMeetsNotice("2026-10-13", "9h00", new Date(boundary.getTime() + 1)), false);
  assert.equal(teacherSlotMeetsNotice("2026-03-08", "9h00", new Date("2026-03-07T14:00:00Z")), false);
  assert.equal(teacherSlotMeetsNotice("2026-11-01", "9h00", new Date("2026-10-31T13:00:00Z")), true);
  assert.deepEqual(normalizeTeacherSubjectIds([{ discipline_id: "langues" }]), ["langues"]);
  assert.deepEqual(normalizeTeacherSubjectIds([{ discipline_id: "langues", specialite: "Français" }]), ["langues", "francais"]);
  assert.deepEqual(normalizeTeacherSubjectIds([{ discipline_id: "langues", specialite: "Espagnol" }]), ["langues", "espagnol"]);
  assert.deepEqual(normalizeTeacherSubjectIds([{ discipline_id: "musique", specialite: "Piano" }, { discipline_id: "piano" }]), ["musique", "piano"]);
  assert.deepEqual(normalizeTeacherSubjectIds([{ discipline_id: "langues", specialite: "Autre" }]), ["langues"]);
  assert.deepEqual(normalizeTeacherSubjectIds([{ discipline_id: "musique", specialite: "chant populaire" }]), ["musique", "chant"]);
  assert.deepEqual(normalizeTeacherSubjectIds([{ discipline_id: "musique", specialite: "Ukulélé" }, { discipline_id: "musique", specialite: "Basse" }]), ["musique"]);
  for (const action of ["book", "request", "contact", "waitlist"] as const) {
    for (const locale of ["fr", "en", "es"]) {
      const strings = JSON.parse(readFileSync(`lib/i18n/locales/${locale}.json`, "utf8"));
      assert.ok(strings[teacherBookingActionKey(action)]);
    }
  }
  assert.equal(deriveTeacherBookingCapability({ validRate: true, paymentReady: false, hasSlot: true, canContact: true }).action, "request");
  assert.equal(deriveTeacherBookingCapability({ validRate: true, paymentReady: true, hasSlot: false, canContact: true }).action, "contact");
  const bookingRoute = readFileSync("app/api/bookings/route.ts", "utf8");
  assert.match(bookingRoute, /if \(!requestId\) \{\s*return NextResponse.json\(\{ error: "server_error" \}, \{ status: 500 \}\)/);
  assert.ok(bookingRoute.indexOf("if (!requestId)") < bookingRoute.indexOf("if (teacher.user_id && !emailSent)"));
}
assertions();
if (!process.env.SEO_TZ_CHILD) {
  for (const TZ of ["UTC", "America/Toronto", "Asia/Tokyo"]) {
    const child = spawnSync(process.execPath, ["--import", "tsx", "tests/seo/localSeoBookingSemantics.test.ts"], {
      env: { ...process.env, TZ, SEO_TZ_CHILD: "1" }, encoding: "utf8",
    });
    assert.equal(child.status, 0, `${TZ}: ${child.stderr}`);
  }
  console.log("PASS CTA/locales, exact historical specialties, DST, notice boundary, three process timezones");
}
