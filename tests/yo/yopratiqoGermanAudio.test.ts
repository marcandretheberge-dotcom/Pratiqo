import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import sharp from "sharp";
import { germanCourseAudio } from "@/lib/yo/audio/germanCourseAudio";
import { germanPublishedAudio } from "@/lib/yo/german/courseAudioPublished";
import {
  germanAudioPaths,
  germanUnitSpeech,
} from "@/lib/yo/german/courseAudio.server";
import {
  germanCourseUnits,
  germanFinal,
  germanCultureFinal,
} from "@/lib/yo/german/courseData";
import { germanCultureStops } from "@/lib/yo/german/courseCulture";
import { assessmentSpeech } from "@/lib/yo/italian/course/courseSpeech";
import {
  validateMp3,
  preflightManifest,
} from "@/scripts/generate-yopratiqo-audio";

test("every German audio path points to a real complete bundled MP3, never a planned asset", () => {
  preflightManifest(germanCourseAudio);
  assert.equal(
    Object.keys(germanPublishedAudio).length,
    germanCourseAudio.length,
  );
  let seconds = 0;
  for (const item of germanCourseAudio) {
    const path = germanPublishedAudio[item.text];
    assert.equal(path, "/audio/" + item.storagePath);
    const data = readFileSync("public" + path);
    const result = validateMp3(data);
    assert.ok(result.durationSeconds > 0.2);
    seconds += result.durationSeconds;
  }
  assert.ok(seconds > 0);
  console.log(
    "German MP3 files validated: " +
      germanCourseAudio.length +
      ", minutes: " +
      (seconds / 60).toFixed(2),
  );
});
test("unit and final audio payloads contain only the exact required speech", () => {
  for (const content of [
    ...germanCourseUnits,
    germanFinal,
    germanCultureFinal,
  ]) {
    const texts =
      "lessons" in content
        ? germanUnitSpeech(content)
        : assessmentSpeech(content);
    assert.deepEqual(
      Object.keys(germanAudioPaths(content)).sort(),
      [...new Set(texts)].sort(),
    );
  }
});
test("real photo dimensions match their authored metadata and only four supplied photos are used", async () => {
  assert.equal(readdirSync("public/images/yo/german").length, 4);
  for (const stop of Object.values(germanCultureStops)) {
    const metadata = await sharp("public" + stop.photo.src).metadata();
    assert.equal(metadata.width, stop.photo.width);
    assert.equal(metadata.height, stop.photo.height);
  }
});
test("offline generation defaults to an estimate, caps paid requests durably and cannot upload", () => {
  const source = readFileSync(
    "scripts/generate-german-course-local-audio.ts",
    "utf8",
  );
  assert.match(source, /if \(!args.length\) process.exit\(0\)/);
  assert.match(source, /budgetMicroUsd = 3_000_000/);
  assert.match(source, /ledger.reservedMicroUsd \+ cost > budgetMicroUsd/);
  assert.ok(
    source.indexOf('await rename(ledgerPath + ".tmp", ledgerPath)') <
      source.indexOf("await fetch("),
  );
  assert.match(source, /flag: "wx"/);
  assert.doesNotMatch(
    source,
    /createClient|\.storage\.from|runAudioPipeline\(/,
  );
});
