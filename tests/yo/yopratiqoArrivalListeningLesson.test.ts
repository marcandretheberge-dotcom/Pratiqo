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

test("ready preview keeps the listening-review notice visible in every stage and locale", async () => {
  const copy = {
    fr: {
      notice: "Voix de synthèse · version à valider à l’écoute",
      pending: "Audio en préparation",
      steps: ["1 · Écouter", "2 · Comprendre", "3 · Lire", "4 · Parler"],
    },
    en: {
      notice: "Synthetic voices · awaiting listening review",
      pending: "Audio in preparation",
      steps: ["1 · Listen", "2 · Understand", "3 · Read", "4 · Speak"],
    },
    es: {
      notice: "Voces sintéticas · versión pendiente de escucha y validación",
      pending: "Audio en preparación",
      steps: ["1 · Escuchar", "2 · Comprender", "3 · Leer", "4 · Hablar"],
    },
  } as const;
  arrivalListeningScenes.hotel.audioReady = true;
  for (const locale of ["fr", "en", "es"] as const) {
    const view = render(node("hotel", locale));
    assert.equal(view.queryByText(copy[locale].pending), null);
    for (const step of copy[locale].steps) {
      await click(view.getByRole("button", { name: step }));
      assert.ok(view.getByText(copy[locale].notice));
      assert.equal(FakeAudio.instances.length, 0, "Stage navigation must not start media");
    }
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

test("committing an answer moves focus from the disabled choice to localized feedback, then retry restores the question", async () => {
  const labels = {
    fr: { stage: "2 · Comprendre", incorrect: "À revoir", correct: "Bien repéré !", retry: "Réessayer cette question" },
    en: { stage: "2 · Understand", incorrect: "Review this", correct: "You caught it!", retry: "Try this question again" },
    es: { stage: "2 · Comprender", incorrect: "Para repasar", correct: "¡Bien identificado!", retry: "Reintentar esta pregunta" },
  } as const;
  const question = arrivalListeningScenes.airport.questions[0];
  for (const locale of ["fr", "en", "es"] as const) {
    const view = render(node("airport", locale));
    await click(view.getByRole("button", { name: labels[locale].stage }));
    for (const correct of [false, true]) {
      const option = question.options.find((item) => (item.id === question.correctOptionId) === correct)!;
      const choice = view.getByRole("button", { name: option.target }) as HTMLButtonElement;
      choice.focus();
      await click(choice);
      assert.equal(choice.disabled, true);
      assert.ok(document.activeElement === view.getByRole("heading", { name: correct ? labels[locale].correct : labels[locale].incorrect }));
      const retry = view.getByRole("button", { name: labels[locale].retry });
      retry.focus();
      await click(retry);
      assert.ok(document.activeElement === view.getByRole("heading", { name: question.prompt[locale]! }));
      assert.equal(choice.disabled, false);
    }
    cleanup();
  }
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

test("hotel questions can be reviewed backwards with answers preserved and focus on the question", async () => {
  const labels = {
    fr: { stage: "2 · Comprendre", next: "Question suivante", previous: "Question précédente", retry: "Réessayer cette question" },
    en: { stage: "2 · Understand", next: "Next question", previous: "Previous question", retry: "Try this question again" },
    es: { stage: "2 · Comprender", next: "Siguiente pregunta", previous: "Pregunta anterior", retry: "Reintentar esta pregunta" },
  } as const;
  const [first, second] = arrivalListeningScenes.hotel.questions;
  for (const locale of ["fr", "en", "es"] as const) {
    const view = render(node("hotel", locale));
    const activate = async (name: string) => {
      const button = view.getByRole("button", { name });
      button.focus();
      await click(button);
    };
    await activate(labels[locale].stage);
    const wrong = first.options.find((option) => option.id !== first.correctOptionId)!;
    await activate(wrong.target);
    await activate(labels[locale].next);
    assert.ok(document.activeElement === view.getByRole("heading", { name: second.prompt[locale]! }));
    await activate(second.options.find((option) => option.id === second.correctOptionId)!.target);
    await activate(labels[locale].previous);
    assert.ok(document.activeElement === view.getByRole("heading", { name: first.prompt[locale]! }));
    assert.equal(view.getByRole("button", { name: wrong.target }).getAttribute("aria-pressed"), "true");
    assert.ok(view.getByText(first.feedback[locale]!));
    await activate(labels[locale].retry);
    assert.ok(document.activeElement === view.getByRole("heading", { name: first.prompt[locale]! }));
    assert.equal(view.queryByText(first.feedback[locale]!), null);
    assert.equal((view.getByRole("button", { name: wrong.target }) as HTMLButtonElement).disabled, false);
    await activate(first.options.find((option) => option.id === first.correctOptionId)!.target);
    await activate(labels[locale].next);
    assert.ok(view.getByText(second.feedback[locale]!), "Returning to a question must preserve its answer");
    assert.equal(FakeAudio.instances.length, 0);
    cleanup();
  }
});

test("explicit roleplay transitions keep keyboard focus on the model, instruction or completion", async () => {
  const view = render(node("hotel", "en"));
  const activate = async (name: string) => {
    const button = view.getByRole("button", { name });
    button.focus();
    await click(button);
  };
  await activate("4 · Speak");
  await activate("Read the line and respond");
  await activate("I've answered — show the model");
  assert.ok(document.activeElement === view.getByRole("heading", { name: "One possible response" }));
  await activate("Next exchange");
  assert.ok(document.activeElement === view.getByRole("heading", { name: arrivalListeningScenes.hotel.roleplay[1].instruction.en }));
  await activate("Previous exchange");
  assert.ok(document.activeElement === view.getByRole("heading", { name: arrivalListeningScenes.hotel.roleplay[0].instruction.en }));
  for (let i = 0; i < arrivalListeningScenes.hotel.roleplay.length; i += 1) {
    await activate("Read the line and respond");
    await activate("I've answered — show the model");
    await activate(i === arrivalListeningScenes.hotel.roleplay.length - 1 ? "Finish practice" : "Next exchange");
  }
  assert.ok(document.activeElement === view.getByText("Practice complete. Replay the exchanges you found difficult."));
  await activate("Replay the roleplay");
  assert.ok(document.activeElement === view.getByRole("heading", { name: arrivalListeningScenes.hotel.roleplay[0].instruction.en }));
  assert.equal(FakeAudio.instances.length, 0);
});

test("content navigation moves focus into the new stage while persistent stage buttons retain focus", async () => {
  const view = render(node("hotel", "en"));
  const activate = async (name: string) => {
    const button = view.getByRole("button", { name });
    button.focus();
    await click(button);
    return button;
  };
  await activate("Open the transcript");
  assert.ok(document.activeElement === view.getByRole("heading", { name: "1 / 8 · Receptionist" }));
  await activate("My turn to speak");
  assert.ok(document.activeElement === view.getByRole("heading", { name: arrivalListeningScenes.hotel.roleplay[0].instruction.en }));
  const listen = await activate("1 · Listen");
  assert.ok(document.activeElement === listen);
  await activate("Check my understanding");
  assert.ok(document.activeElement === view.getByRole("heading", { name: arrivalListeningScenes.hotel.questions[0].prompt.en }));
  await activate("Read the conversation");
  assert.ok(document.activeElement === view.getByRole("heading", { name: "1 / 8 · Receptionist" }));
});

test("opening the current transcript after an audio error consumes its focus request immediately", async () => {
  arrivalListeningScenes.hotel.audioReady = true;
  const view = render(node("hotel", "en"));
  const activate = async (name: string) => {
    const button = view.getByRole("button", { name });
    button.focus();
    await click(button);
    return button;
  };
  await activate("3 · Read");
  FakeAudio.rejectNext = true;
  await activate("Play this line");
  assert.ok(view.getByRole("alert"));
  await activate("Open the transcript");
  assert.equal(view.queryByRole("alert"), null);
  assert.ok(document.activeElement === view.getByRole("heading", { name: "1 / 8 · Receptionist" }));
  const nextLine = await activate("Next line");
  assert.ok(document.activeElement === nextLine, "Later transcript state must not replay a consumed focus request");
  const play = await activate("Play this line");
  await end(FakeAudio.instances[0]);
  assert.ok(document.activeElement === play, "Later playback completion must not replay a consumed focus request");
  view.rerender(node("hotel", "fr"));
  assert.ok(document.activeElement === play, "A later locale render must not replay a consumed focus request");
});

test("mount, locale changes, audio completion and hidden deck transitions do not steal focus", async () => {
  arrivalListeningScenes.hotel.audioReady = true;
  const tree = (locale: "fr" | "en") => React.createElement(React.Fragment, null,
    React.createElement("button", { type: "button" }, "Outside the lesson"),
    React.createElement("div", { "data-yo-lesson-deck-screen-host-id": "hotel", "data-yo-lesson-deck-screen-host-active": "true" }, node("hotel", locale)),
  );
  const view = render(tree("fr"));
  assert.ok(document.activeElement === document.body);
  const outside = view.getByRole("button", { name: "Outside the lesson" });
  outside.focus();
  view.rerender(tree("en"));
  assert.ok(document.activeElement === outside);
  const stage = view.getByRole("button", { name: "4 · Speak" });
  stage.focus();
  await click(stage);
  assert.ok(document.activeElement === stage);
  const prompt = view.getByRole("button", { name: "Play the other person's line" });
  prompt.focus();
  await click(prompt);
  await end(FakeAudio.instances[0]);
  assert.ok(document.activeElement === prompt, "Async audio completion must not move the learner's focus");
  await click(view.getByRole("button", { name: "I've answered — show the model" }));
  const host = view.container.querySelector("[data-yo-lesson-deck-screen-host-id]")!;
  await act(async () => { host.setAttribute("data-yo-lesson-deck-screen-host-active", "false"); });
  outside.focus();
  await click(view.getByRole("button", { name: "Next exchange" }));
  assert.ok(document.activeElement === outside, "A hidden deck screen must never capture focus");
});

async function main() {
  let failed = 0;
  const originalAudioReady = {
    airport: arrivalListeningScenes.airport.audioReady,
    hotel: arrivalListeningScenes.hotel.audioReady,
  };
  try {
    for (const [name, fn] of cases) {
      // Every case starts with an explicit pending fixture, regardless of
      // whether the checked-in production scenes already have recordings.
      arrivalListeningScenes.airport.audioReady = false;
      arrivalListeningScenes.hotel.audioReady = false;
      try { await fn(); console.log(`ok - ${name}`); }
      catch (error) { failed += 1; console.error(`FAIL - ${name}`, error); }
      finally {
        cleanup();
        FakeAudio.instances = [];
        FakeAudio.failConstruction = false;
        FakeAudio.rejectNext = false;
        FakeAudio.pendingNext = null;
      }
    }
    assert.equal(failed, 0, `${failed} listening lesson cases failed`);
    console.log(`\n${cases.length} rendered arrival listening cases passed.`);
  } finally {
    cleanup();
    arrivalListeningScenes.airport.audioReady = originalAudioReady.airport;
    arrivalListeningScenes.hotel.audioReady = originalAudioReady.hotel;
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
