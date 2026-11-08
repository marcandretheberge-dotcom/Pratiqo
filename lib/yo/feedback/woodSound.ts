/** Original sound A (bois doux), synthesized locally. No downloaded media or service. */
export type FeedbackCue = "correct" | "stamp" | "step" | "mission" | "unlock";
export const SOUND_SAMPLE_RATE = 44100;
export function woodSamples(kind: FeedbackCue = "correct"): Float32Array<ArrayBuffer> {
  const rate = SOUND_SAMPLE_RATE, samples = new Float64Array(Math.floor(.8 * rate));
  const notes = {
    correct: [[0, 587.33, .23], [.105, 783.99, .28]],
    stamp: [[0, 587.33, .23], [.105, 783.99, .28], [.24, 987.77, .32]],
    step: [[0, 293.66, .13], [.09, 392, .14]],
    mission: [[0, 392, .20], [.14, 587.33, .24], [.30, 783.99, .30]],
    unlock: [[0, 523.25, .15], [.12, 659.25, .19], [.27, 1046.5, .30]],
  }[kind];
  for (const [onset, frequency, duration] of notes) {
    const count = Math.floor(duration * rate), start = Math.floor((.035 + onset) * rate);
    for (let i = 0; i < count; i++) {
      const time = i / rate, release = Math.max(0, Math.min(1, ((count - 1) / rate - time) / .025));
      const envelope = (attack: number, decay: number) => Math.min(time / attack, 1) * Math.exp(-time / decay) * release;
      samples[start + i] += Math.sin(2 * Math.PI * frequency * time) * envelope(.004, .075)
        + .20 * Math.sin(2 * Math.PI * frequency * 3.96 * time) * envelope(.002, .019)
        + .08 * Math.sin(2 * Math.PI * frequency * 7.91 * time) * envelope(.002, .012);
    }
  }
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  return Float32Array.from(samples, sample => peak ? sample * (kind === "step" ? .09 : kind === "mission" || kind === "unlock" ? .18 : .22) / peak : 0);
}
