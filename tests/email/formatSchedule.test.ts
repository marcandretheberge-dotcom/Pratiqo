import assert from "node:assert/strict";
import { EMAIL_FALLBACK_LOCALE } from "@/lib/email/locale";
import {
  formatEmailLessonDateLabel,
  formatEmailLessonScheduleLabels,
  formatEmailLessonTimeLabel,
} from "@/lib/email/formatSchedule";

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const SAMPLE_DATE = "2026-05-20";
const SAMPLE_BOOKING = {
  slot_date: SAMPLE_DATE,
  time_slot: "18:30",
  duration_minutes: 60,
};

test("FR date uses fr-CA long weekday format", () => {
  const label = formatEmailLessonDateLabel(SAMPLE_DATE, "fr");
  assert.match(label, /mercredi/i);
  assert.match(label, /20/);
  assert.match(label, /2026/);
  assert.match(label, /mai/i);
});

test("EN date uses en-CA long weekday format", () => {
  const label = formatEmailLessonDateLabel(SAMPLE_DATE, "en");
  assert.match(label, /Wednesday/i);
  assert.match(label, /May/i);
  assert.match(label, /20/);
  assert.match(label, /2026/);
});

test("ES date uses es-UY long weekday format", () => {
  const label = formatEmailLessonDateLabel(SAMPLE_DATE, "es");
  assert.match(label, /miércoles|miercoles/i);
  assert.match(label, /mayo/i);
  assert.match(label, /2026/);
});

test("EN time uses 12-hour clock", () => {
  const label = formatEmailLessonTimeLabel(SAMPLE_BOOKING, "en");
  assert.match(label, /6:30/i);
  assert.match(label, /PM|p\.m\./i);
});

test("FR time uses 24-hour style", () => {
  const label = formatEmailLessonTimeLabel(SAMPLE_BOOKING, "fr");
  assert.match(label, /18/);
  assert.match(label, /30/);
  assert.doesNotMatch(label, /PM/i);
});

test("ES time uses 24-hour style", () => {
  const label = formatEmailLessonTimeLabel(SAMPLE_BOOKING, "es");
  assert.match(label, /18/);
  assert.match(label, /30/);
});

test("missing locale falls back to fr labels", () => {
  const schedule = formatEmailLessonScheduleLabels({ slot_date: null, time_slot: null });
  assert.equal(schedule.dateLabel, "Date à confirmer");
  assert.equal(EMAIL_FALLBACK_LOCALE, "fr");
});

test("schedule labels respect recipient locale", () => {
  const fr = formatEmailLessonScheduleLabels(SAMPLE_BOOKING, "fr");
  const en = formatEmailLessonScheduleLabels(SAMPLE_BOOKING, "en");
  assert.notEqual(fr.dateLabel, en.dateLabel);
  assert.notEqual(fr.timeLabel, en.timeLabel);
});

for (const { name, fn } of tests) {
  fn();
  console.log(`ok - ${name}`);
}
console.log(`[email:formatSchedule] ${tests.length} tests passed`);
