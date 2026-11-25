/** Exercise actual player entry points with published files and no Supabase configuration. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { IntroAudio } from "@/components/yo/shared/IntroAudio";
import { ItalianModuleAudio } from "@/components/yo/italian/ItalianModuleAudio";
import { ItalianAudioProvider } from "@/components/yo/italian/ItalianAudioProvider";
import { introCourses } from "@/lib/yo/shared/course";
import { introAudioPaths } from "@/lib/yo/shared/audio.server";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { interestCorpus } from "@/lib/yo/interests/content";
import { interestAudioPath } from "@/lib/yo/interests/audio";
import { lessonAudioIsBusy } from "@/lib/yo/audio/lessonAudioActivity";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://pratiqo.example/yo", pretendToBeVisual: true });
const bindings = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, MutationObserver: dom.window.MutationObserver, IS_REACT_ACT_ENVIRONMENT: true };
const originals = new Map(Object.keys(bindings).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(bindings)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { render, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");
const priorOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
let audioCalls: FakeAudio[] = [];
let voiceReads = 0;
class FakeAudio extends dom.window.EventTarget {
  src: string; initialSrc: string; preload = ""; playbackRate = 1; preservesPitch = false; currentTime = 0; playCalls = 0; pauseCalls = 0;
  constructor(src: string) { super(); this.src = src; this.initialSrc = src; audioCalls.push(this); }
  play() { this.playCalls++; return Promise.resolve(); }
  pause() { this.pauseCalls++; }
  load() {}
  removeAttribute(name: string) { if (name === "src") this.src = ""; }
  emit(name: string) { this.dispatchEvent(new Event(name)); }
}
Object.defineProperty(window, "Audio", { configurable: true, value: FakeAudio });
Object.defineProperty(window, "speechSynthesis", { configurable: true, get() { voiceReads++; return undefined; } });
const cases: Array<[string, () => void | Promise<void>]> = [];
const test = (name: string, run: () => void | Promise<void>) => cases.push([name, run]);

test("the actual intro resolver supplies a local recording, with no eager audio or device voice", () => {
  const course = introCourses.find(course => course.language === "en")!;
  const paths = introAudioPaths(course);
  const phrase = course.phrases.find(phrase => paths[phrase.text]?.startsWith("/audio/yo/premium/"))!;
  let listened = 0;
  const view = render(<IntroAudio text={phrase.text} speechLocale={course.speechLocale} path={paths[phrase.text]} locale="en" onListen={() => listened++}/>);
  assert.equal(audioCalls.length, 0);
  fireEvent.click(view.getByRole("button", { name: "Listen to the message" }));
  const audio = audioCalls[0];
  assert.equal(audio.initialSrc, paths[phrase.text]);
  assert.equal(audio.preload, "none");
  assert.equal(listened, 0);
  act(() => audio.emit("playing"));
  assert.equal(listened, 1);
  act(() => { audio.emit("waiting"); audio.emit("playing"); });
  assert.equal(listened, 1);
  assert.equal(voiceReads, 0);
  view.unmount();
  assert.equal(audio.src, "");
  assert.ok(audio.pauseCalls > 0);
  act(() => audio.emit("playing"));
  assert.equal(listened, 1, "stale events cannot award listening after unmount");
  assert.equal(lessonAudioIsBusy(), false);
});

test("the Italian provider plays its published local MP3 and stops cleanly", () => {
  const text = "Sto così così.";
  const paths = courseAudioPaths([text]);
  assert.ok(paths[text]?.startsWith("/audio/yo/premium/"));
  let listened = 0;
  const view = render(<ItalianAudioProvider paths={paths}><ItalianModuleAudio text={text} locale="en" onListen={() => listened++}/></ItalianAudioProvider>);
  assert.equal(audioCalls.length, 0);
  fireEvent.click(view.getByRole("button", { name: `Listen : ${text}` }));
  const audio = audioCalls[0];
  assert.equal(audio.initialSrc, paths[text]);
  assert.equal(listened, 0);
  act(() => audio.emit("playing"));
  assert.equal(listened, 1);
  fireEvent.click(view.getByRole("button", { name: `Stop : ${text}` }));
  assert.equal(audio.src, "");
  assert.equal(voiceReads, 0);
  assert.equal(lessonAudioIsBusy(), false);
});

test("interest practice uses the exact locale recording in each of its eight corpora", () => {
  for (const corpus of Object.values(interestCorpus)) {
    const text = corpus.venues.art.question.text;
    const path = interestAudioPath(corpus.speechLocale, text);
    assert.ok(path?.startsWith("/audio/yo/premium/"), corpus.speechLocale);
    const before = audioCalls.length;
    const view = render(<IntroAudio text={text} speechLocale={corpus.speechLocale} path={path} locale="en"/>);
    fireEvent.click(view.getByRole("button", { name: "Listen to the message" }));
    assert.equal(audioCalls.length, before + 1);
    assert.equal(audioCalls[before].initialSrc, path);
    act(() => audioCalls[before].emit("playing"));
    view.unmount();
  }
  assert.equal(voiceReads, 0);
  assert.equal(lessonAudioIsBusy(), false);
});

test("an unregistered premium path cannot bypass validation through the intro local-path shortcut", () => {
  let listened = 0;
  const view = render(<IntroAudio text="Unpublished phrase" speechLocale="en-CA" path={`/audio/yo/premium/en-CA/${"0".repeat(64)}.mp3`} locale="en" onListen={() => listened++}/>);
  fireEvent.click(view.getByRole("button", { name: "Listen to the message" }));
  assert.equal(audioCalls.length, 0);
  assert.equal(listened, 0);
  assert.ok(view.getByRole("status").textContent?.includes("Audio is unavailable"));
  assert.equal(lessonAudioIsBusy(), false);
});

async function main() {
  let failed = 0;
  try {
    for (const [name, run] of cases) {
      audioCalls = []; voiceReads = 0;
      try { await run(); console.log(`ok - ${name}`); }
      catch (error) { failed++; console.error(`not ok - ${name}`, error); }
      finally { cleanup(); }
    }
  } finally {
    if (priorOrigin === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = priorOrigin;
    dom.window.close();
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  }
  console.log(`Premium audio playback: ${cases.length - failed}/${cases.length} passed.`);
  if (failed) process.exitCode = 1;
}
void main();
