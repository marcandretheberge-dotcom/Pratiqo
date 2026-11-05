import type { AdventureKind } from "./adventure";
import { stopLessonAudio } from "./audio/stopLessonAudio";

// Original short timbres, synthesised offline in the browser. No media service or tracking.
export const adventureScore: Record<AdventureKind | "retry" | "correct", readonly number[]> = {
  unlock: [392, 523.25, 659.25], checkpoint: [440, 587.33], recap: [440, 523.25, 659.25],
  mastery: [349.23, 440, 587.33, 698.46], finale: [293.66, 392, 493.88, 587.33, 783.99], retry: [392, 349.23], correct: [659.25],
};
type AdventureNote = { frequency: number; at: number; duration: number; volume: number; type: OscillatorType };
/** Original quiet paper taps followed by three path lights and a destination chime. */
export const italianVictoryScore: readonly AdventureNote[] = [
  { frequency: 196, at: 0.18, duration: 0.1, volume: 0.025, type: "triangle" },
  { frequency: 164.81, at: 0.36, duration: 0.1, volume: 0.02, type: "triangle" },
  { frequency: 392, at: 0.85, duration: 0.2, volume: 0.04, type: "sine" },
  { frequency: 523.25, at: 1.1, duration: 0.2, volume: 0.04, type: "sine" },
  { frequency: 659.25, at: 1.35, duration: 0.22, volume: 0.04, type: "sine" },
  { frequency: 783.99, at: 1.7, duration: 0.32, volume: 0.035, type: "sine" },
];
export const EFFECTS_KEY = "yopratiqo.audio.muted";
let context: AudioContext | undefined;
let generation = 0;
const voices = new Set<OscillatorNode>();

export function stopAdventureSound() {
  generation++;
  for (const voice of voices) { try { voice.stop(); } catch { /* Already ended. */ } voice.disconnect(); }
  voices.clear();
}

export async function prepareAdventureSound() {
  if (typeof window === "undefined") return false;
  const AudioContextCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return false;
  try {
    context ??= new AudioContextCtor();
    if (context.state === "suspended") await context.resume();
    return context.state === "running";
  } catch { return false; }
}

export async function playAdventureSound(kind: keyof typeof adventureScore, scene?: "italian-u01") {
  // Starting a celebration is an explicit learning/replay action; no simultaneous speech.
  stopLessonAudio();
  stopAdventureSound();
  const run = generation;
  if (!await prepareAdventureSound() || run !== generation || document.visibilityState === "hidden" || !context) return false;
  const start = context.currentTime;
  const notes: readonly AdventureNote[] = scene === "italian-u01" && kind === "mastery" ? italianVictoryScore
    : adventureScore[kind].map((frequency, index) => ({ frequency, at: index * 0.16, duration: 0.26, volume: 0.055, type: "sine" }));
  for (const note of notes) {
    const voice = context.createOscillator();
    const envelope = context.createGain();
    voice.type = note.type;
    voice.frequency.value = note.frequency;
    const at = start + note.at;
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(note.volume, at + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.001, at + note.duration - 0.02);
    voice.connect(envelope); envelope.connect(context.destination);
    voices.add(voice);
    voice.onended = () => { voices.delete(voice); voice.disconnect(); envelope.disconnect(); };
    voice.start(at); voice.stop(at + note.duration);
  }
  return true;
}

export function listenForAdventureInterruptions() {
  const events = ["yo-audio-stop", "yo-italian-audio-stop", "yo-japanese-audio-stop", "yo-mandarin-audio-stop", "yo-arrival-playback-start", "yo-speech-cancel", "pagehide"];
  const hidden = () => { if (document.visibilityState !== "visible") stopAdventureSound(); };
  events.forEach(event => window.addEventListener(event, stopAdventureSound));
  document.addEventListener("visibilitychange", hidden);
  return () => { events.forEach(event => window.removeEventListener(event, stopAdventureSound)); document.removeEventListener("visibilitychange", hidden); stopAdventureSound(); };
}
