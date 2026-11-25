import { SPEECH_MAX_INPUT_SECONDS, SPEECH_SAMPLE_RATE } from "./contract";

export function encodePcm24k(samples: Float32Array, sampleRate: number): string {
  if (!Number.isFinite(sampleRate) || sampleRate < 8_000 || sampleRate > 192_000 || samples.length > sampleRate * SPEECH_MAX_INPUT_SECONDS) throw new Error("invalid_audio");
  const length = Math.floor(samples.length * SPEECH_SAMPLE_RATE / sampleRate);
  const bytes = new Uint8Array(length * 2), view = new DataView(bytes.buffer);
  for (let i = 0; i < length; i++) {
    const position = i * sampleRate / SPEECH_SAMPLE_RATE, start = Math.floor(position), fraction = position - start;
    const sample = Math.max(-1, Math.min(1, samples[start] * (1 - fraction) + (samples[start + 1] ?? samples[start]) * fraction));
    view.setInt16(i * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8_192) binary += String.fromCharCode(...bytes.subarray(i, i + 8_192));
  return btoa(binary);
}

export function pcmWavBlob(base64: string): Blob {
  const raw = atob(base64), buffer = new ArrayBuffer(44 + raw.length), view = new DataView(buffer);
  const label = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  label(0, "RIFF"); view.setUint32(4, 36 + raw.length, true); label(8, "WAVE"); label(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, SPEECH_SAMPLE_RATE, true); view.setUint32(28, SPEECH_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); label(36, "data"); view.setUint32(40, raw.length, true);
  for (let i = 0; i < raw.length; i++) view.setUint8(44 + i, raw.charCodeAt(i));
  return new Blob([buffer], { type: "audio/wav" });
}

export type SpeechRecording = { stop: () => string; cancel: () => void };
export function speechRequestId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
/** Called only from the user's record gesture. Audio stays in memory until stop/send. */
export async function startSpeechRecording(signal: AbortSignal, onLimit: () => void): Promise<SpeechRecording> {
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext || !window.AudioWorkletNode) throw new Error("unsupported_browser");
  let context: AudioContext;
  try { context = new AudioContext({ sampleRate: SPEECH_SAMPLE_RATE }); }
  catch { context = new AudioContext(); }
  let stream: MediaStream | undefined, source: MediaStreamAudioSourceNode | undefined, node: AudioWorkletNode | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined, stopped = false, count = 0;
  const chunks: Float32Array[] = [];
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    signal.removeEventListener("abort", cleanup);
    node?.disconnect(); source?.disconnect(); stream?.getTracks().forEach((track) => track.stop());
    void context.close().catch(() => {});
  };
  signal.addEventListener("abort", cleanup, { once: true });
  try {
    if (signal.aborted) throw new Error("cancelled");
    await context.resume();
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false });
    if (signal.aborted || stopped) { stream.getTracks().forEach((track) => track.stop()); throw new Error("cancelled"); }
    await context.audioWorklet.addModule("/api/yo/speech/worklet");
    if (signal.aborted || stopped) throw new Error("cancelled");
    source = context.createMediaStreamSource(stream);
    node = new AudioWorkletNode(context, "yo-speech-capture", { channelCount: 1, channelCountMode: "explicit" });
    const max = Math.floor(context.sampleRate * SPEECH_MAX_INPUT_SECONDS);
    node.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (stopped || !(event.data instanceof Float32Array)) return;
      const chunk = event.data.subarray(0, Math.max(0, max - count));
      if (chunk.length) { chunks.push(chunk); count += chunk.length; }
    };
    source.connect(node); node.connect(context.destination); // Processor emits silence; no microphone monitoring.
    timer = setTimeout(onLimit, SPEECH_MAX_INPUT_SECONDS * 1000);
    return {
      cancel: () => { cleanup(); chunks.length = 0; },
      stop: () => {
        if (stopped) throw new Error("cancelled");
        cleanup();
        const samples = new Float32Array(count);
        let offset = 0;
        for (const chunk of chunks) { samples.set(chunk, offset); offset += chunk.length; }
        chunks.length = 0;
        return encodePcm24k(samples, context.sampleRate);
      },
    };
  } catch (error) { cleanup(); throw error; }
}
