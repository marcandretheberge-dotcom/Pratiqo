import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import recordings from "@/lib/yo/audio/premiumPublished.json";
import publicIndex from "@/lib/yo/audio/premiumIndex.json";
import provenance from "../../docs/product/yopratiqo-premium-recordings-provenance.json";
import { isPublishedPremiumLocalAudioPath, publishedPremiumAudioPath } from "@/lib/yo/audio/premiumPublished";
import { buildPublicAudioUrl } from "@/lib/yo/audio/audioUrl";
import { introCourses } from "@/lib/yo/shared/course";
import { introAudioPaths } from "@/lib/yo/shared/audio.server";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { interestCorpus } from "@/lib/yo/interests/content";
import { interestAudioPath } from "@/lib/yo/interests/audio";
import { validateMp3 } from "../../scripts/generate-yopratiqo-audio";
import { buildPremiumAudioPlan } from "../../scripts/lib/premiumAudioPlan";

test("every published local path has the exact reviewed MP3 bytes and source evidence", () => {
  assert.equal(recordings.length, 255);
  assert.equal(provenance.counts.published, recordings.length);
  assert.equal(provenance.clips.length, recordings.length);
  assert.equal(new Set(recordings.map(item => `${item.locale}:${item.text}`)).size, recordings.length);
  assert.equal(Object.values(publicIndex).reduce((total, texts) => total + Object.keys(texts).length, 0), recordings.length,
    "the compact browser index cannot add unreviewed recordings");
  const actualFiles = readdirSync(resolve("public/audio/yo/premium"), { recursive: true })
    .map(String).filter(name => name.endsWith(".mp3")).map(name => `/audio/yo/premium/${name}`);
  assert.deepEqual(new Set(actualFiles), new Set(recordings.map(item => item.storagePath)));
  const clips = new Map(provenance.clips.map(item => [item.storagePath, item]));
  let bytes = 0;
  for (const item of recordings) {
    assert.equal(item.storagePath, `/audio/yo/premium/${item.locale}/${item.sha256}.mp3`);
    assert.equal(isPublishedPremiumLocalAudioPath(item.storagePath), true);
    const data = readFileSync(resolve("public", item.storagePath.slice(1)));
    assert.equal(createHash("sha256").update(data).digest("hex"), item.sha256, item.text);
    const mp3 = validateMp3(data);
    assert.ok(Math.abs(mp3.durationSeconds - item.seconds) < .06, item.text);
    const clip = clips.get(item.storagePath);
    assert.ok(clip, item.text);
    assert.equal(clip.text, item.text);
    assert.equal(clip.locale, item.locale);
    assert.equal(clip.sha256, item.sha256);
    assert.equal(clip.bytes, data.byteLength);
    assert.equal(clip.status, "verified_clip");
    assert.equal(clip.fullDecodeVerified, true);
    assert.equal(clip.nativeAccentReviewed, false);
    assert.equal(item.nativeAccentReviewed, false);
    assert.ok(clip.independentTranscript.trim());
    assert.ok(clip.leadingSilenceSeconds >= .1 && clip.trailingSilenceSeconds >= .15);
    const batch = provenance.batches.find(batch => batch.index === clip.batch);
    assert.ok(batch, item.text);
    assert.equal(item.sourceBatchSha256, batch.sha256);
    assert.equal(item.model, batch.model);
    assert.equal(item.voice, batch.voice);
    bytes += data.byteLength;
  }
  assert.equal(bytes, provenance.counts.bytes);
  const serialized = JSON.stringify(provenance);
  assert.ok(!serialized.includes("/workspace/") && !serialized.includes("https://"), "no temporary paths or signed source URLs in published evidence");
});

test("bundled recordings work without Supabase and only exact approved paths resolve", () => {
  const prior = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    for (const item of recordings) assert.equal(buildPublicAudioUrl(item.storagePath), item.storagePath);
    const path = recordings[0].storagePath;
    assert.equal(buildPublicAudioUrl(path, { version: "review & 2" }), `${path}?v=review%20%26%202`);
    assert.equal(buildPublicAudioUrl("yo/not-published.mp3"), null);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://audio.example.test/";
    const unknown = `/audio/yo/premium/en-CA/${"0".repeat(64)}.mp3`;
    for (const invalid of [unknown, path.slice(1), `/${path}`, `${path}?download=1`, `${path}#fragment`, path.replace(".mp3", ".wav"), "/audio/yo/premium/../private.mp3", path.replace("premium/", "premium/%2e%2e/")]) {
      assert.equal(isPublishedPremiumLocalAudioPath(invalid), false, invalid);
      assert.equal(buildPublicAudioUrl(invalid), null, invalid);
    }
    assert.equal(buildPublicAudioUrl("yo/it/existing.mp3"), "https://audio.example.test/storage/v1/object/public/yopratiqo-audio/yo/it/existing.mp3");
    assert.equal(buildPublicAudioUrl(path, { bucket: "unrelated-bucket" }), path);
  } finally {
    if (prior === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = prior;
  }
});

test("all seven introductions and all eight interest corpora resolve their actual displayed phrases", () => {
  for (const course of introCourses) {
    const paths = introAudioPaths(course);
    for (const phrase of course.phrases) assert.ok(paths[phrase.text.normalize("NFC").trim()], `${course.slug}: ${phrase.text}`);
  }
  for (const corpus of Object.values(interestCorpus)) {
    const texts = [...Object.values(corpus.venues).map(venue => venue.question.text), ...Object.values(corpus.directions).map(direction => direction.text), corpus.exit.text, corpus.thanks.text, corpus.repeat.text];
    assert.equal(texts.length, 12);
    for (const text of texts) assert.ok(interestAudioPath(corpus.speechLocale, text), `${corpus.speechLocale}: ${text}`);
  }
  const italian = recordings.filter(item => item.locale === "it-IT");
  const paths = courseAudioPaths(italian.map(item => item.text));
  for (const item of italian) assert.equal(paths[item.text], item.storagePath);
  const french = recordings.find(item => item.locale === "fr-CA" && item.text.includes("é"));
  assert.ok(french);
  assert.equal(publishedPremiumAudioPath(french.locale, ` ${french.text.normalize("NFD")} `), french.storagePath);
  assert.equal(publishedPremiumAudioPath("fr-FR", french.text), undefined, "never substitute a different regional locale");
  assert.equal(publishedPremiumAudioPath("en-CA", "This exact text was never recorded."), undefined);
  assert.equal(publishedPremiumAudioPath("en-CA", "constructor"), undefined);
  assert.equal(publishedPremiumAudioPath("__proto__", "text"), undefined);
});

test("the fifteen rejected slash lists remain missing and never acquire a guessed MP3 path", () => {
  const remaining = buildPremiumAudioPlan("all");
  assert.equal(remaining.items.length, 15);
  assert.equal(provenance.counts.rejectedAndNotPublished, 15);
  assert.ok(remaining.items.every(item => item.locale === "it-IT" && item.text.includes(" / ")));
  for (const item of remaining.items) {
    assert.equal(publishedPremiumAudioPath(item.locale, item.text), undefined);
    assert.equal(courseAudioPaths([item.text])[item.text], undefined);
  }
  assert.ok(buildPremiumAudioPlan("introductions").coverage.every(row => row.missing === 0));
  assert.ok(buildPremiumAudioPlan("interests").coverage.every(row => row.recorded === 12 && row.missing === 0));
});
