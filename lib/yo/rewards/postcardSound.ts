import { SOUND_SAMPLE_RATE, type FeedbackCue } from "../feedback/woodSound";

// Original plucked-string motifs: a muted pick for travel and a cadence for milestones.
const scores: Record<FeedbackCue, ReadonlyArray<readonly [number, number, number, number]>> = {
  step: [[0, 196, .105, .46]],
  correct: [[0, 440, .14, .72], [.082, 554.37, .23, .88]],
  mission: [[0, 329.63, .20, .66], [.105, 440, .21, .75], [.228, 554.37, .28, .92], [.243, 277.18, .25, .32]],
  stamp: [[0, 220, .21, .72], [.043, 329.63, .22, .63], [.102, 440, .23, .72], [.245, 659.25, .31, .87]],
  unlock: [[0, 329.63, .17, .6], [.09, 415.30, .18, .7], [.193, 493.88, .21, .8], [.327, 659.25, .29, .84]],
};

export function postcardSamples(kind: FeedbackCue): Float32Array<ArrayBuffer> {
  const notes = scores[kind];
  const pcm = new Float32Array(Math.ceil(SOUND_SAMPLE_RATE * Math.max(...notes.map(([s, , d]) => s + d))) + 1);
  for (const [start, hz, length, strength] of notes) {
    const offset = Math.round(start * SOUND_SAMPLE_RATE);
    for (let i = 0; i < Math.floor(length * SOUND_SAMPLE_RATE); i++) {
      const t = i / SOUND_SAMPLE_RATE, phase = 2 * Math.PI * hz * t;
      const envelope = Math.min(1, t / .004, (length - t) / .024) * Math.exp(-3.1 * t / length);
      const body = Math.sin(phase) + .36 * Math.sin(phase * 2.002) + .18 * Math.sin(phase * 3);
      const pick = Math.exp(-t / .018) * .28 * Math.sin(phase * 5.02);
      pcm[offset + i] += .19 * strength * envelope * (body + pick);
    }
  }
  return pcm;
}
