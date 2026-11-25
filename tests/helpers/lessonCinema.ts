import { act } from "react";

/** jsdom has no media engine. Playback lifecycle is covered by the cinema player suite. */
export function prepareCinemaMedia() {
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};
  window.HTMLMediaElement.prototype.load = () => {};
}

/** Exercise the visible Skip control so course assertions run after optional interludes. */
export function dismissMissionFilms() {
  for (let i = 0; i < 20; i++) {
    const skip = document.querySelector<HTMLButtonElement>("[data-mission-film] .yo-film-skip");
    if (!skip) return;
    act(() => skip.click());
  }
  throw new Error("The mission cinema queue did not finish after twenty skips.");
}
