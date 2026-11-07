import { lessonAudioIsBusy, subscribeLessonAudio } from "../audio/lessonAudioActivity";
import { SOUND_SAMPLE_RATE, woodSamples, type FeedbackCue } from "./woodSound";

/** At most one short pending cue. Never stops, ducks or overlaps lesson speech. */
export class FeedbackPlayer {
  private context?: AudioContext;
  private voice?: AudioBufferSourceNode;
  private pending?: { kind: FeedbackCue; expires: number; epoch: number };
  private epoch = 0;
  private disposed = false;
  private timer?: ReturnType<typeof setTimeout>;
  private unsubscribe: () => void;
  private buffers = new Map<FeedbackCue, AudioBuffer>();
  private events = ["yo-audio-stop", "yo-italian-audio-stop", "yo-japanese-audio-stop", "yo-mandarin-audio-stop", "yo-speech-cancel", "yo-arrival-playback-start", "pagehide"];
  constructor() {
    this.unsubscribe = subscribeLessonAudio(() => {
      if (lessonAudioIsBusy()) this.stopVoice(); else this.flush();
    });
    this.events.forEach(event => window.addEventListener(event, this.cancel));
    document.addEventListener("visibilitychange", this.visibility);
  }
  private stopVoice() {
    if (!this.voice) return;
    const voice = this.voice; this.voice = undefined;
    try { voice.stop(); } catch { /* Already ended. */ }
    voice.disconnect();
  }
  cancel = () => {
    this.epoch++; this.pending = undefined;
    clearTimeout(this.timer); this.stopVoice();
  };
  private visibility = () => { if (document.visibilityState !== "visible") this.cancel(); };
  async play(kind: FeedbackCue = "correct") {
    if (this.disposed || document.visibilityState !== "visible") return;
    this.cancel();
    const epoch = this.epoch;
    // AudioContext is created/resumed in a real answer or explicit sample button handler.
    try {
      const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.context ??= new Ctor();
      this.pending = { kind, expires: Date.now() + 2500, epoch };
      if (this.context.state === "suspended") await this.context.resume();
      if (this.disposed || epoch !== this.epoch) return;
      this.flush();
    } catch { this.cancel(); /* Audio failure must never block answering. */ }
  }
  private flush() {
    clearTimeout(this.timer);
    const cue = this.pending, context = this.context;
    if (!cue || !context || this.disposed) return;
    if (cue.epoch !== this.epoch || Date.now() > cue.expires || document.visibilityState !== "visible") { this.pending = undefined; return; }
    if (lessonAudioIsBusy() || window.speechSynthesis?.speaking || window.speechSynthesis?.pending) {
      this.timer = setTimeout(() => this.flush(), 50); return;
    }
    if (context.state !== "running") { this.pending = undefined; return; }
    this.pending = undefined;
    try {
      let buffer = this.buffers.get(cue.kind);
      if (!buffer) {
        const data = woodSamples(cue.kind);
        buffer = context.createBuffer(1, data.length, SOUND_SAMPLE_RATE);
        buffer.copyToChannel(data, 0); this.buffers.set(cue.kind, buffer);
      }
      this.stopVoice();
      const voice = context.createBufferSource();
      voice.buffer = buffer; voice.connect(context.destination); this.voice = voice;
      voice.onended = () => { voice.disconnect(); if (this.voice === voice) this.voice = undefined; };
      voice.start();
    } catch { this.cancel(); }
  }
  dispose() {
    this.disposed = true; this.cancel(); this.unsubscribe();
    this.events.forEach(event => window.removeEventListener(event, this.cancel));
    document.removeEventListener("visibilitychange", this.visibility);
    try { void this.context?.close().catch(() => {}); } catch { /* No usable context. */ }
    this.buffers.clear();
  }
}

/** Native apps need their own haptic bridge. No iOS vibration workaround or hidden control. */
export function vibrateSuccess(kind: FeedbackCue = "correct") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function" || document.visibilityState !== "visible") return false;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return false;
  try { return navigator.vibrate(kind === "stamp" ? [12, 45, 18] : 12); } catch { return false; }
}
