import assert from "node:assert/strict";
import { test } from "node:test";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { getItalianCourseAudioItem } from "@/lib/yo/audio/italianCourseAudio";
import { courseSpeechLanguage } from "@/lib/yo/shared/speechLanguage";
import { introCourses } from "@/lib/yo/shared/course";

test("current Italian words reuse the same recorded words despite presentation case or terminal punctuation", () => {
  const pairs = [
    ["Nina", "Nina."], ["Omar", "Omar."], ["Roma", "Roma."], ["Lei", "Lei."],
    ["uno", "Uno."], ["due", "Due."], ["tre", "Tre."], ["ventotto", "Ventotto"],
  ];
  for (const [display, recorded] of pairs) {
    const item = getItalianCourseAudioItem(recorded);
    assert.ok(item, recorded);
    assert.equal(item.targetLanguage, "it");
    assert.equal(item.accentProfile, "italian_standard");
    assert.equal(courseAudioPaths([display])[display], item.storagePath);
  }
});

test("recording reuse never substitutes another name, numeral, accent or free-form utterance", () => {
  const unknown = ["Ninà", "Omar due", "Roma tre", "21007", "ventottò", "My private writing draft", "Bonjour Nina"];
  assert.deepEqual(courseAudioPaths(unknown), {});
  const exact = getItalianCourseAudioItem("Nina.")!;
  assert.equal(courseAudioPaths(["Nina."])["Nina."], exact.storagePath);
});

test("all eight curriculum languages map explicitly to speech without a default language", () => {
  assert.deepEqual(new Set([...introCourses.map(course => courseSpeechLanguage(course.language)), courseSpeechLanguage("it")]), new Set(["en", "fr", "es", "de", "pt", "ja", "zh", "it"]));
  assert.equal(courseSpeechLanguage("fr-CA"), "fr");
  assert.equal(courseSpeechLanguage("pt-BR"), "pt");
  assert.equal(courseSpeechLanguage("zh-Hans"), "zh");
  assert.equal(courseSpeechLanguage("ko"), null);
  assert.equal(courseSpeechLanguage(""), null);
});
