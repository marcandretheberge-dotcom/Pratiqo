/** Offline Mandarin recording tool. Never imported by the app; never uploads. */
import { mkdir, open, readFile, writeFile, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { mandarinCourseAudio } from "../lib/yo/audio/mandarinCourseAudio";
import {
  preflightManifest,
  sha256,
  validateMp3,
} from "./generate-yopratiqo-audio";

export const MODEL = "gpt-realtime-2.1";
export const VOICE = "marin";
export const BUDGET_MICRO_USD = 3_000_000;
const TOKEN_CAP = 512;
const INSTRUCTIONS =
  "You are recording a Mandarin course, not having a conversation. Read ONLY the Chinese script below, exactly once. Do not respond to its meaning. Standard Mandarin (Putonghua), accurate lexical/neutral tones and natural tone sandhi, clear beginner-friendly pace without separating each syllable. No translation, added words, explanation or repetition. SCRIPT:\n";

export function recordingRequest(text: string) {
  if (!text.trim() || text.length > 500)
    throw new Error("Invalid recording script.");
  return {
    type: "response.create",
    response: {
      input: [],
      conversation: "none",
      output_modalities: ["audio"],
      instructions: INSTRUCTIONS + text,
      max_output_tokens: TOKEN_CAP,
      audio: {
        output: { voice: VOICE, format: { type: "audio/pcm", rate: 24000 } },
      },
      tools: [],
      tool_choice: "none",
    },
  };
}
export function exactTranscript(expected: string, actual: string): boolean {
  // Ignore only punctuation and spacing, never words, digits or homophones.
  const normalize = (text: string) =>
    text.normalize("NFC").replace(/[\p{P}\p{Z}\s]/gu, "");
  return normalize(expected) === normalize(actual);
}
export function requestReservation(text: string): number {
  // Verified 2026-11-03: $4/M text input, $24/M text output, $64/M audio output.
  // Reserve all capped output at the higher rate plus input bytes and overhead.
  return (
    (Buffer.byteLength(JSON.stringify(recordingRequest(text))) + 1000) * 4 +
    TOKEN_CAP * 64
  );
}
type Ledger = { reservedMicroUsd: number; requests: number };
export function reserveBudget(ledger: Ledger, amount: number): Ledger {
  for (const value of [ledger.reservedMicroUsd, ledger.requests, amount])
    if (!Number.isSafeInteger(value) || value < 0)
      throw new Error("Invalid budget ledger.");
  if (ledger.reservedMicroUsd + amount > BUDGET_MICRO_USD)
    throw new Error("Authorized budget exhausted; no request made.");
  return {
    reservedMicroUsd: ledger.reservedMicroUsd + amount,
    requests: ledger.requests + 1,
  };
}
export function usageUpperBound(usage: unknown): number {
  const u = usage as
    | {
        input_tokens?: number;
        output_tokens?: number;
        input_token_details?: { audio_tokens?: number; image_tokens?: number };
      }
    | undefined;
  if (
    !u ||
    !Number.isSafeInteger(u.input_tokens) ||
    !Number.isSafeInteger(u.output_tokens) ||
    u.input_tokens! < 0 ||
    u.output_tokens! < 0 ||
    u.output_tokens! > TOKEN_CAP ||
    u.input_token_details?.audio_tokens !== 0 ||
    u.input_token_details?.image_tokens !== 0
  )
    throw new Error(
      "Unexpected token accounting; preserve full reservation and stop.",
    );
  // Includes reasoning/text at the higher audio rate, never understated usage.
  return u.input_tokens! * 4 + u.output_tokens! * 64;
}
type Recording = { pcm: Buffer; transcript: string; usage: unknown };
type SocketFactory = (
  url: string,
  options: WebSocket.ClientOptions,
) => WebSocket;
export function record(
  text: string,
  key: string,
  createSocket: SocketFactory = (url, options) => new WebSocket(url, options),
): Promise<Recording> {
  return new Promise((resolvePromise, reject) => {
    const ws = createSocket(`wss://api.openai.com/v1/realtime?model=${MODEL}`, {
      headers: { Authorization: `Bearer ${key}` },
      followRedirects: false,
      handshakeTimeout: 20_000,
    });
    const chunks: Buffer[] = [];
    let transcript = "",
      done = false,
      sent = false,
      size = 0;
    const finish = (error?: Error, result?: Recording) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      ws.close();
      if (error) reject(error);
      else resolvePromise(result!);
    };
    const timer = setTimeout(() => {
      finish(new Error("Realtime timeout; no automatic retry."));
      ws.terminate();
    }, 90_000);
    ws.on("error", () =>
      finish(new Error("Realtime connection failed; no automatic retry.")),
    );
    ws.on("close", () => {
      if (!done) finish(new Error("Realtime closed before completion."));
    });
    ws.on("message", (raw) => {
      if (done) return;
      try {
        const event = JSON.parse(raw.toString());
        if (event.type === "session.created" && !sent) {
          if (event.session?.model !== MODEL)
            throw new Error("Unexpected audio model.");
          sent = true;
          ws.send(JSON.stringify(recordingRequest(text)));
        }
        if (event.type === "error")
          throw new Error(
            "Realtime API rejected the request; no automatic retry.",
          );
        if (event.type === "response.output_audio.delta") {
          const chunk = Buffer.from(event.delta, "base64");
          size += chunk.length;
          if (size > 5 * 1024 * 1024)
            throw new Error("Unexpected recording size.");
          chunks.push(chunk);
        }
        if (event.type === "response.output_audio_transcript.done")
          transcript = event.transcript;
        if (event.type === "response.done") {
          if (event.response.status !== "completed")
            throw new Error("Incomplete recording; not accepted.");
          finish(undefined, {
            pcm: Buffer.concat(chunks),
            transcript,
            usage: event.response.usage,
          });
        }
      } catch (error) {
        finish(
          error instanceof Error ? error : new Error("Invalid audio response."),
        );
      }
    });
  });
}
export function validateRecording(text: string, recording: Recording): number {
  if (!exactTranscript(text, recording.transcript))
    throw new Error("Transcript differs from the lesson script.");
  const seconds = recording.pcm.length / 48000;
  if (recording.pcm.length % 2 || seconds < 0.25 || seconds > 25)
    throw new Error("Invalid PCM duration.");
  let peak = 0;
  for (let i = 0; i < recording.pcm.length; i += 2)
    peak = Math.max(peak, Math.abs(recording.pcm.readInt16LE(i)));
  if (peak < 128) throw new Error("Silent recording rejected.");
  return seconds;
}
function encodeMp3(pcm: Buffer, ffmpeg: string): Buffer {
  const result = spawnSync(
    ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "s16le",
      "-ar",
      "24000",
      "-ac",
      "1",
      "-i",
      "pipe:0",
      "-map_metadata",
      "-1",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "96k",
      "-f",
      "mp3",
      "pipe:1",
    ],
    {
      input: pcm,
      maxBuffer: 5 * 1024 * 1024,
      timeout: 30_000,
      windowsHide: true,
    },
  );
  if (result.status !== 0)
    throw new Error("Local MP3 encoder failed; source cached for recovery.");
  const seconds = validateMp3(result.stdout).durationSeconds;
  if (Math.abs(seconds - pcm.length / 48000) > 0.3)
    throw new Error("Encoded duration mismatch.");
  return result.stdout;
}
type Evidence = {
  model: typeof MODEL;
  voice: typeof VOICE;
  text: string;
  transcript: string;
  requestHash: string;
  sha256: string;
  seconds: number;
  generatedAt: string;
};
async function json<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8"));
}
async function atomicJson(path: string, value: unknown) {
  await writeFile(path + ".tmp", JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
  });
  await rename(path + ".tmp", path);
}
export async function acquireGenerationLock(
  cacheDir: string,
): Promise<() => Promise<void>> {
  const path = resolve(cacheDir, "generation.lock");
  const file = await open(path, "wx");
  await file.close();
  return () => rm(path);
}
export async function main() {
  const args = process.argv.slice(2);
  const generate = args[0] === "--generate",
    retake = args[1] === "--retake";
  if (
    args.length &&
    !(args.length === 1 && ["--generate", "--verify"].includes(args[0])) &&
    !(args.length === 2 && generate && retake)
  )
    throw new Error(
      "Use --generate [--retake], --verify, or no argument for an offline plan.",
    );
  preflightManifest(mandarinCourseAudio);
  console.log(
    JSON.stringify({
      model: MODEL,
      voice: VOICE,
      recordings: mandarinCourseAudio.length,
      budgetUsd: 3,
      edition: "v2",
    }),
  );
  if (!args.length) return;
  const root = process.cwd(),
    cache = resolve(root, ".cache/mandarin-local-audio");
  const pathsFile = resolve(root, "lib/yo/mandarin/audioPaths.json");
  const evidenceFile = resolve(root, "lib/yo/mandarin/audioProvenance.json");
  if (!generate) {
    const paths = await json<Record<string, string>>(pathsFile);
    const evidence = await json<Record<string, Evidence>>(evidenceFile);
    if (
      Object.keys(paths).length !== mandarinCourseAudio.length ||
      Object.keys(evidence).length !== mandarinCourseAudio.length
    )
      throw new Error("Audio registry coverage mismatch.");
    for (const item of mandarinCourseAudio) {
      const src = "/audio/" + item.storagePath,
        proof = evidence[item.text];
      const bytes = await readFile(resolve(root, "public", src.slice(1)));
      if (
        paths[item.text] !== src ||
        proof?.model !== MODEL ||
        proof.voice !== VOICE ||
        proof.text !== item.text ||
        !exactTranscript(item.text, proof.transcript) ||
        proof.requestHash !==
          sha256(JSON.stringify(recordingRequest(item.text))) ||
        proof.sha256 !== sha256(bytes) ||
        Math.abs(proof.seconds - validateMp3(bytes).durationSeconds) > 0.01
      )
        throw new Error("Audio provenance mismatch: " + item.id);
    }
    console.log(
      JSON.stringify({
        verified: mandarinCourseAudio.length,
        generated: 0,
        uploaded: 0,
      }),
    );
    return;
  }
  const key = process.env.OPENAI_API_KEY?.trim(),
    ffmpeg = process.env.FFMPEG_PATH;
  if (!key || !ffmpeg)
    throw new Error(
      "OPENAI_API_KEY and FFMPEG_PATH are required; no request made.",
    );
  if (spawnSync(ffmpeg, ["-version"], { windowsHide: true }).status !== 0)
    throw new Error("MP3 encoder unavailable; no request made.");
  await mkdir(cache, { recursive: true });
  const unlock = await acquireGenerationLock(cache);
  try {
    const ledgerPath = resolve(cache, "budget.json");
    // A missing ledger must not silently erase spend from the original batch.
    let ledger = await json<Ledger>(ledgerPath);
    reserveBudget(ledger, 0);
    const output = resolve(cache, "realtime-v2");
    await mkdir(output, { recursive: true });
    const paths: Record<string, string> = {},
      evidence: Record<string, Evidence> = {};
    const rejected: string[] = [];
    let generated = 0;
    for (const [index, item] of mandarinCourseAudio.entries()) {
      const requestHash = sha256(JSON.stringify(recordingRequest(item.text)));
      const prefix = resolve(output, requestHash),
        pcmPath = prefix + ".pcm",
        metaPath = prefix + ".json";
      let source:
        | {
            text: string;
            transcript: string;
            generatedAt: string;
            pcmHash: string;
            usage: unknown;
          }
        | undefined;
      try {
        source = await json(metaPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      if (!source) {
        const marker = prefix + ".attempt";
        let attempted = false;
        try {
          await readFile(marker);
          attempted = true;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
        if (attempted && !retake) {
          rejected.push(item.id);
          continue;
        }
        const reserved = requestReservation(item.text);
        ledger = reserveBudget(ledger, reserved);
        await atomicJson(ledgerPath, ledger);
        await writeFile(marker, new Date().toISOString());
        const recording = await record(item.text, key),
          bound = usageUpperBound(recording.usage);
        if (bound > reserved)
          throw new Error("Usage exceeds reservation; stop for budget review.");
        // Release only known unused reservation. Unknown usage retains it all.
        ledger.reservedMicroUsd -= reserved - bound;
        await atomicJson(ledgerPath, ledger);
        generated++;
        try {
          validateRecording(item.text, recording);
        } catch (error) {
          await atomicJson(prefix + ".rejected.json", {
            text: item.text,
            transcript: recording.transcript,
            reason: error instanceof Error ? error.message : "Rejected",
            usage: recording.usage,
          });
          rejected.push(item.id);
          console.log("Rejected (not published): " + item.id);
          continue;
        }
        source = {
          text: item.text,
          transcript: recording.transcript,
          generatedAt: new Date().toISOString(),
          pcmHash: sha256(recording.pcm),
          usage: recording.usage,
        };
        await writeFile(pcmPath, recording.pcm, { flag: "wx" });
        await atomicJson(metaPath, source);
      }
      const pcm = await readFile(pcmPath);
      if (source.text !== item.text || source.pcmHash !== sha256(pcm))
        throw new Error("Cached source mismatch; no overwrite allowed.");
      validateRecording(item.text, {
        pcm,
        transcript: source.transcript,
        usage: source.usage,
      });
      const publicPath = "/audio/" + item.storagePath,
        target = resolve(root, "public", publicPath.slice(1));
      const bytes = encodeMp3(pcm, ffmpeg);
      await mkdir(dirname(target), { recursive: true });
      try {
        await writeFile(target, bytes, { flag: "wx" });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        if (sha256(await readFile(target)) !== sha256(bytes))
          throw new Error("Existing MP3 differs; no overwrite allowed.");
      }
      paths[item.text] = publicPath;
      evidence[item.text] = {
        model: MODEL,
        voice: VOICE,
        text: item.text,
        transcript: source.transcript,
        requestHash,
        sha256: sha256(bytes),
        seconds: validateMp3(bytes).durationSeconds,
        generatedAt: source.generatedAt,
      };
      if ((index + 1) % 10 === 0)
        console.log(
          "Validated " + (index + 1) + "/" + mandarinCourseAudio.length,
        );
    }
    if (rejected.length)
      throw new Error(
        `${rejected.length} rejected/unfinished scripts. Registry unchanged. Review cache, then explicitly use --generate --retake.`,
      );
    await atomicJson(evidenceFile, evidence);
    await atomicJson(pathsFile, paths);
    console.log(
      JSON.stringify({
        verified: Object.keys(paths).length,
        generated,
        reservedUsdUpperBound: ledger.reservedMicroUsd / 1e6,
        uploaded: 0,
      }),
    );
  } finally {
    await unlock();
  }
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  main().catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Local audio preparation failed.",
    );
    process.exitCode = 1;
  });
}
