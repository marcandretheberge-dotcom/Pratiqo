/** Same-origin module: no microphone access, uploads or third-party code in the worklet. */
export function GET() {
  return new Response(`class YoSpeechCapture extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) { const copy = new Float32Array(channel); this.port.postMessage(copy, [copy.buffer]); }
    return true;
  }
}
registerProcessor('yo-speech-capture', YoSpeechCapture);`, {
    headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
