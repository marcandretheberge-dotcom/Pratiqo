import { mkdirSync, writeFileSync } from "node:fs";
import { SOUND_SAMPLE_RATE as rate } from "../../lib/yo/feedback/woodSound";
import { postcardSamples } from "../../lib/yo/rewards/postcardSound";

// The same PCM used by the player, with silence between cues for listening review.
const cues = (["step", "correct", "mission", "stamp", "unlock"] as const).map(postcardSamples);
const gap = Math.round(rate * .45);
const size = (cues.reduce((n, cue) => n + cue.length, 0) + gap * (cues.length - 1)) * 2;
const wav = Buffer.alloc(44 + size);
wav.write("RIFF"); wav.writeUInt32LE(36 + size, 4); wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(size, 40);
let offset = 44;
for (const cue of cues) {
  for (const value of cue) { wav.writeInt16LE(Math.round(value * 32767), offset); offset += 2; }
  offset += gap * 2;
}
mkdirSync(".qa-guided/italian-rewards", { recursive: true });
writeFileSync(".qa-guided/italian-rewards/postcard-sounds.wav", wav);
