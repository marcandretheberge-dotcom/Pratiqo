/** Coordinate recorded audio and browser speech without changing any progress. */
export function stopLessonAudio() {
  for (const event of ["yo-audio-stop", "yo-italian-audio-stop", "yo-japanese-audio-stop", "yo-speech-cancel"]) {
    window.dispatchEvent(new Event(event));
  }
}
