/** Render the real lesson with deterministic media events; no network or microphone. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import { arrivalListeningScenes } from "@/lib/yo/dominicanArrivalListening";
import { YoArrivalListeningLesson } from "@/components/yo/YoArrivalListeningLesson";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://www.pratiqo.ca/yo", pretendToBeVisual: true });
const bindings = {
  window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, MutationObserver: dom.window.MutationObserver,
  CustomEvent: dom.window.CustomEvent, IS_REACT_ACT_ENVIRONMENT: true,
};
const originals = new Map(Object.keys(bindings).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(bindings)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { render, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");

class FakeAudio extends dom.window.EventTarget {
  static instances: FakeAudio[] = [];
  static failConstruction = false;
  static rejectNext = false;
  static pendingNext: Promise<void> | null = null;
  src = "";
  preload = "";
  currentTime = 0;
  playbackRate = 1;
  preservesPitch = false;
  paused = true;
  pauseCount = 0;
  played: string[] = [];
  constructor() {
    super();
    if (FakeAudio.failConstruction) { FakeAudio.failConstruction = false; throw new Error("Audio unavailable"); }
    FakeAudio.instances.push(this);
  }
  play() {
    this.played.push(this.src);
    this.paused = false;
    if (FakeAudio.rejectNext) { FakeAudio.rejectNext = false; return Promise.reject(new Error("blocked")); }
    if (FakeAudio.pendingNext) { const pending = FakeAudio.pendingNext; FakeAudio.pendingNext = null; return pending; }
    return Promise.resolve();
  }
  pause() { this.paused = true; this.pauseCount += 1; }
  end() { this.dispatchEvent(new dom.window.Event("ended")); }
  fail() { this.dispatchEvent(new dom.window.Event("error")); }
}
dom.window.Audio = FakeAudio;
const node = (sceneId: "airport" | "hotel", locale: "fr" | "en" | "es" = "fr") => React.createElement(YoArrivalListeningLesson, { sceneId, locale });
async function click(element: HTMLElement) { await act(async () => { fireEvent.click(element); }); }
async function end(audio: FakeAudio) { await act(async () => { audio.end(); }); }
const cases: Array<[string, () => Promise<void>]> = [];
function test(name: string, fn: () => Promise<void>) { cases.push([name, fn]); }

test("pending scenes make no media request and remain readable in FR/EN/ES", async () => {
  const copy = {
    fr: ["Audio en préparation", "Ouvrir la transcription", "Écouter le dialogue"],
    en: ["Audio in preparation", "Open the transcript", "Play the conversation"],
    es: ["Audio en preparación", "Abrir la transcripción", "Escuchar el diálogo"],
  } as const;
  for (const locale of ["fr", "en", "es"] as const) {
    const view = render(node("hotel", locale));
    assert.ok(view.getByText(copy[locale][0]));
    assert.equal((view.getByRole("button", { name: copy[locale][2] }) as HTMLButtonElement).disabled, true);
    assert.equal(FakeAudio.instances.length, 0);
    await click(view.getByRole("button", { name: copy[locale][1] }));
    assert.ok(view.getByTestId("arrival-transcript"));
    assert.match(view.container.textContent ?? "", /Buenas tardes\./);
    assert.equal(FakeAudio.instances.length, 0);
    cleanup();
  }
});

test("listening starts without text leakage or autoplay and sequences all scene clips", async () => {
  arrivalListeningScenes.airport.audioReady = true;
  const view = render(node("airport", "en"));
  assert.equal(FakeAudio.instances.length, 0);
  for (const line of arrivalListeningScenes.airport.lines) {
    assert.ok(!view.container.textContent?.includes(line.target));
    assert.ok(!view.container.innerHTML.includes(line.target));
    assert.ok(!view.container.textContent?.includes(line.translation.en));
  }
  await click(view.getByRole("button", { name: "Play the conversation" }));
  const audio = FakeAudio.instances[0];
  assert.equal(audio.played.length, 1);
  assert.equal(audio.preservesPitch, true);
  for (let i = 0; i < arrivalListeningScenes.airport.lines.length; i += 1) {
    assert.equal(audio.played[i], arrivalListeningScenes.airport.lines[i].audioSrc);
    await end(audio);
  }
  assert.equal(audio.played.length, 5);
  assert.equal(view.queryByRole("button", { name: "Stop audio" }), null);
});

test("normal/slower controls change rate without starting or restarting audio", async () => {
  arrivalListeningScenes.airport.audioReady = true;
  const view = render(node("airport"));
  await click(view.getByRole("button", { name: "Plus lent" }));
  assert.equal(FakeAudio.instances.length, 0);
  await click(view.getByRole("button", { name: "Écouter le dialogue" }));
  const audio = FakeAudio.instances[0];
  assert.equal(audio.playbackRate, 0.8);
  await click(view.getByRole("button", { name: "Vitesse normale" }));
  assert.equal(audio.playbackRate, 1);
  assert.equal(audio.played.length, 1);
  await end(audio);
  assert.equal(audio.playbackRate, 1);
});

test("stage changes cancel the queue and late play resolution cannot restart it", async () => {
  arrivalListeningScenes.airport.audioReady = true;
  let resolve!: () => void;
  FakeAudio.pendingNext = new Promise<void>((done) => { resolve = done; });
  const view = render(node("airport"));
  await click(view.getByRole("button", { name: "Écouter le dialogue" }));
  const audio = FakeAudio.instances[0];
  await click(view.getByRole("button", { name: "2 · Comprendre" }));
  assert.equal(audio.paused, true);
  await act(async () => { resolve(); audio.end(); });
  assert.equal(audio.played.length, 1);
  assert.equal(view.queryByText("Lecture en cours…"), null);
});

test("a sibling lesson stops the first player's queue", async () => {
  arrivalListeningScenes.airport.audioReady = true;
  arrivalListeningScenes.hotel.audioReady = true;
  const view = render(React.createElement(React.Fragment, null, node("airport"), node("hotel")));
  const buttons = view.getAllByRole("button", { name: "Écouter le dialogue" });
  await click(buttons[0]);
  const airport = FakeAudio.instances[0];
  await click(buttons[1]);
  const hotel = FakeAudio.instances[1];
  assert.equal(airport.paused, true);
  assert.equal(hotel.paused, false);
  await end(airport);
  assert.equal(airport.played.length, 1);
});

test("hiding a mounted classic deck screen cancels its queue", async () => {
  arrivalListeningScenes.airport.audioReady = true;
  const view = render(React.createElement("div", { "data-yo-lesson-deck-screen-host-id": "airport", "data-yo-lesson-deck-screen-host-active": "true" }, node("airport")));
  await click(view.getByRole("button", { name: "Écouter le dialogue" }));
  const audio = FakeAudio.instances[0];
  await act(async () => { view.container.firstElementChild!.setAttribute("data-yo-lesson-deck-screen-host-active", "false"); });
  assert.equal(audio.paused, true);
  await end(audio);
  assert.equal(audio.played.length, 1);
});

test("page visibility and unmount stop audio and remove sequencing listeners", async () => {
  arrivalListeningScenes.airport.audioReady = true;
  const view = render(node("airport"));
  await click(view.getByRole("button", { name: "Écouter le dialogue" }));
  const audio = FakeAudio.instances[0];
  const descriptor = Object.getOwnPropertyDescriptor(document, "visibilityState");
  try {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    await act(async () => { document.dispatchEvent(new dom.window.Event("visibilitychange")); });
    assert.equal(audio.paused, true);
    await end(audio);
    assert.equal(audio.played.length, 1);
  } finally {
    if (descriptor) Object.defineProperty(document, "visibilityState", descriptor);
    else Reflect.deleteProperty(document, "visibilityState");
  }
  await click(view.getByRole("button", { name: "Écouter le dialogue" }));
  const count = audio.played.length;
  view.unmount();
  assert.equal(audio.paused, true);
  await end(audio);
  assert.equal(audio.played.length, count);
});

test("audio initialization, play rejection and asset errors expose retry and transcript paths", async () => {
  arrivalListeningScenes.airport.audioReady = true;
  FakeAudio.failConstruction = true;
  const view = render(node("airport"));
  await click(view.getByRole("button", { name: "Écouter le dialogue" }));
  assert.ok(view.getByRole("alert"));
  assert.equal(FakeAudio.instances.length, 0);
  FakeAudio.rejectNext = true;
  await click(view.getByRole("button", { name: "Réessayer l'audio" }));
  assert.ok(view.getByRole("alert"));
  await click(view.getByRole("button", { name: "Réessayer l'audio" }));
  assert.equal(view.queryByRole("alert"), null);
  const audio = FakeAudio.instances[0];
  await act(async () => { audio.fail(); });
  assert.ok(view.getByRole("alert"));
  await click(view.getAllByRole("button", { name: "Ouvrir la transcription" })[0]);
  assert.ok(view.getByTestId("arrival-transcript"));
  assert.equal(audio.paused, true);
});

test("questions show Spanish choices before localized feedback and allow retry", async () => {
  const view = render(node("airport", "en"));
  await click(view.getByRole("button", { name: "2 · Understand" }));
  const question = arrivalListeningScenes.airport.questions[0];
  assert.ok(!view.container.textContent?.includes(question.feedback.en));
  for (const option of question.options) assert.equal(view.getByRole("button", { name: option.target }).getAttribute("lang"), "es");
  const wrong = question.options.find((option) => option.id !== question.correctOptionId)!;
  await click(view.getByRole("button", { name: wrong.target }));
  assert.ok(view.getByText("Review this"));
  assert.ok(view.getByText(question.feedback.en));
  await click(view.getByRole("button", { name: "Try this question again" }));
  assert.equal(view.queryByText(question.feedback.en), null);
  const correct = question.options.find((option) => option.id === question.correctOptionId)!;
  await click(view.getByRole("button", { name: correct.target }));
  assert.ok(view.getByText("You caught it!"));
});

test("both hotel listening questions are reachable without exposing transcripts", async () => {
  const view = render(node("hotel"));
  await click(view.getByRole("button", { name: "2 · Comprendre" }));
  for (let i = 0; i < arrivalListeningScenes.hotel.questions.length; i += 1) {
    const question = arrivalListeningScenes.hotel.questions[i];
    assert.ok(view.getByText(question.prompt.fr));
    assert.equal(view.queryByTestId("arrival-transcript"), null);
    await click(view.getByRole("button", { name: question.options.find((option) => option.id === question.correctOptionId)!.target }));
    if (i < arrivalListeningScenes.hotel.questions.length - 1) await click(view.getByRole("button", { name: "Question suivante" }));
  }
});

test("roleplay waits for the learner after the employee audio before revealing a model", async () => {
  arrivalListeningScenes.hotel.audioReady = true;
  const view = render(node("hotel"));
  await click(view.getByRole("button", { name: "4 · Parler" }));
  const turn = arrivalListeningScenes.hotel.roleplay[0];
  assert.equal(view.queryByTestId("arrival-roleplay-model"), null);
  await click(view.getByRole("button", { name: "Écouter la réplique" }));
  const audio = FakeAudio.instances[0];
  for (const id of turn.promptLineIds) { assert.ok(audio.src.endsWith(`/${id}.mp3`)); await end(audio); }
  assert.ok(view.getByText("À toi : réponds à voix haute. Prends le temps qu'il te faut."));
  assert.equal(view.queryByTestId("arrival-roleplay-model"), null);
  assert.equal(view.queryByRole("button", { name: "Échange suivant" }), null);
  await click(view.getByRole("button", { name: "J'ai répondu — voir le modèle" }));
  assert.ok(view.getByTestId("arrival-roleplay-model"));
  assert.ok(view.getByRole("button", { name: "Échange suivant" }));
});

test("changing a failed question, transcript line or roleplay turn clears stale retries", async () => {
  arrivalListeningScenes.hotel.audioReady = true;
  const view = render(node("hotel", "en"));
  await click(view.getByRole("button", { name: "2 · Understand" }));
  FakeAudio.rejectNext = true;
  await click(view.getByRole("button", { name: "Replay" }));
  assert.ok(view.getByRole("alert"));
  const first = arrivalListeningScenes.hotel.questions[0];
  await click(view.getByRole("button", { name: first.options.find((option) => option.id === first.correctOptionId)!.target }));
  await click(view.getByRole("button", { name: "Next question" }));
  assert.equal(view.queryByRole("alert"), null);
  await click(view.getByRole("button", { name: "Replay" }));
  const audio = FakeAudio.instances[0];
  assert.ok(audio.src.endsWith(`/${arrivalListeningScenes.hotel.questions[1].replayLineId}.mp3`));

  await click(view.getByRole("button", { name: "3 · Read" }));
  FakeAudio.rejectNext = true;
  await click(view.getByRole("button", { name: "Play this line" }));
  assert.ok(view.getByRole("alert"));
  await click(view.getByRole("button", { name: "Next line" }));
  assert.equal(view.queryByRole("alert"), null);
  await click(view.getByRole("button", { name: "Play this line" }));
  assert.ok(audio.src.endsWith("/hotel-02.mp3"));

  await click(view.getByRole("button", { name: "4 · Speak" }));
  await click(view.getByRole("button", { name: "Read the line and respond" }));
  await click(view.getByRole("button", { name: "I've answered — show the model" }));
  FakeAudio.rejectNext = true;
  await click(view.getByRole("button", { name: "Play the model response" }));
  assert.ok(view.getByRole("alert"));
  await click(view.getByRole("button", { name: "Next exchange" }));
  assert.equal(view.queryByRole("alert"), null);
  assert.equal(view.queryByRole("button", { name: "Retry audio" }), null);
});

test("pending audio still permits text-based roleplay without media calls", async () => {
  const view = render(node("hotel", "en"));
  await click(view.getByRole("button", { name: "4 · Speak" }));
  assert.equal((view.getByRole("button", { name: "Play the other person's line" }) as HTMLButtonElement).disabled, true);
  await click(view.getByRole("button", { name: "Read the line and respond" }));
  assert.equal(view.queryByTestId("arrival-roleplay-model"), null);
  await click(view.getByRole("button", { name: "I've answered — show the model" }));
  assert.ok(view.getByTestId("arrival-roleplay-model"));
  assert.equal(FakeAudio.instances.length, 0);
});

async function main() {
  let failed = 0;
  try {
    for (const [name, fn] of cases) {
      try { await fn(); console.log(`ok - ${name}`); }
      catch (error) { failed += 1; console.error(`FAIL - ${name}`, error); }
      finally {
        cleanup();
        arrivalListeningScenes.airport.audioReady = false;
        arrivalListeningScenes.hotel.audioReady = false;
        FakeAudio.instances = [];
        FakeAudio.failConstruction = false;
        FakeAudio.rejectNext = false;
        FakeAudio.pendingNext = null;
      }
    }
    assert.equal(failed, 0, `${failed} listening lesson cases failed`);
    console.log(`\n${cases.length} rendered arrival listening cases passed.`);
  } finally {
    cleanup(); dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
