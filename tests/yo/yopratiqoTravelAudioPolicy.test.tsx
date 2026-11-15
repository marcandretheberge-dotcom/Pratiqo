import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import React from "react";
import { LearningAudio, OnDemandLearningAudio } from "../../components/yo/personalized/LearningAudio";
import { ItalianAudioProvider } from "../../components/yo/italian/ItalianAudioProvider";
const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><body/>", { url: "http://localhost:55810", pretendToBeVisual: true });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Event", "MutationObserver"])
  Object.defineProperty(globalThis, key, { configurable: true, value: key === "window" ? dom.window : dom.window[key] });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { render, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");
let plays = 0;
class TestAudio {
  preload = ""; playbackRate = 1; preservesPitch = true; currentTime = 0;
  addEventListener() {} removeEventListener() {} removeAttribute() {} pause() {} load() {}
  play() { plays++; return Promise.resolve(); }
}
Object.defineProperty(window, "Audio", { configurable: true, value: TestAudio });
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://audio.example.invalid";
async function main() {
const clip = <ItalianAudioProvider paths={{ "Gira a destra.": "yo/it/test.mp3" }}><LearningAudio text="Gira a destra." locale="fr" autoPlay/></ItalianAudioProvider>;
const view = render(<OnDemandLearningAudio>{clip}</OnDemandLearningAudio>);
await act(async () => { await Promise.resolve(); });
assert.equal(plays, 0, "Preview policy must suppress an inherited autoplay request");
fireEvent.click(view.getByRole("button", { name: "Écouter : Gira a destra." }));
await act(async () => { await Promise.resolve(); });
assert.equal(plays, 1, "Explicit listening still works");
cleanup();
render(clip);
await act(async () => { await Promise.resolve(); });
assert.equal(plays, 2, "Courses outside the opt-in preview retain their existing behavior");
cleanup(); dom.window.close();
console.log("PASS: preview audio on demand, explicit playback, existing course defaults preserved");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
