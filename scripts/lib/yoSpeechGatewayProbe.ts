import WebSocket from "ws";

// Fixed diagnostic only. Neither these targets nor the payload can come from a request.
export const GATEWAY_PROBE_BRANCH = "feat/yo-speech-gateway-20261125";
export const GATEWAY_PROBE_PROJECT = "prj_14E3Ld4IArR3RTdJQmXKlzo9sB93";
export const GATEWAY_PROBE_TEAM = "team_uc6u8hEe6Ws19aexLUN6uL7a";
export const GATEWAY_PROBE_MODEL = "gpt-realtime-2.1";
export const GATEWAY_PROBE_URL = "wss://ai-gateway.vercel.sh/v4/ai/realtime-model?ai-model-id=openai%2Fgpt-realtime-2.1";
export const GATEWAY_PROBE_CREDITS_URL = `https://ai-gateway.vercel.sh/v1/credits?teamId=${GATEWAY_PROBE_TEAM}`;
export const GATEWAY_PROBE_DEADLINE_MS = 10_000;
const MAX_FRAME_BYTES = 32_768;
const INSTRUCTIONS = "Configuration check only. Do not generate a response.";

export type GatewayProbeEnvironment = Record<string, string | undefined>;
export type GatewayProbeFindings = {
  requested: boolean; eligiblePreview: boolean; oidcPresent: boolean; oidcScopeMatches: boolean;
  creditsAuthenticated: boolean; creditsParsed: boolean; hasReservationCredit: boolean;
  socketOpened: boolean; sessionCreated: boolean; sessionUpdated: boolean;
  modelMatches: boolean; instructionsMatch: boolean; outputCapMatches: boolean;
  reasoningMinimal: boolean; toolsDisabled: boolean; manualTurns: boolean;
  inputFormatMatches: boolean; outputFormatMatches: boolean; transcriptionMatches: boolean;
  voiceMatches: boolean; outputModalityMatches: boolean;
  protocolRecognized: boolean; noGenerationObserved: boolean; noInferenceRequested: boolean;
  withinDeadline: boolean; connectionClosed: boolean; passed: boolean;
};
type Deadline = { signal: AbortSignal; clear: () => void };
export type GatewayProbeDependencies = {
  fetch: typeof fetch;
  socket: (url: string, options: WebSocket.ClientOptions) => WebSocket;
  deadline: () => Deadline;
  now: () => number;
};

const defaults: GatewayProbeDependencies = {
  fetch: (url, init) => fetch(url, init),
  socket: (url, options) => new WebSocket(url, options),
  deadline: () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GATEWAY_PROBE_DEADLINE_MS);
    return { signal: controller.signal, clear: () => clearTimeout(timer) };
  },
  now: () => Date.now(),
};

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const record = (value: unknown): Record<string, unknown> => object(value) ? value : {};
const only = (value: unknown, expected: string) => Array.isArray(value) && value.length === 1 && value[0] === expected;

function initialFindings(requested: boolean, eligiblePreview: boolean): GatewayProbeFindings {
  return {
    requested, eligiblePreview, oidcPresent: false, oidcScopeMatches: false,
    creditsAuthenticated: false, creditsParsed: false, hasReservationCredit: false,
    socketOpened: false, sessionCreated: false, sessionUpdated: false,
    modelMatches: false, instructionsMatch: false, outputCapMatches: false,
    reasoningMinimal: false, toolsDisabled: false, manualTurns: false,
    inputFormatMatches: false, outputFormatMatches: false, transcriptionMatches: false,
    voiceMatches: false, outputModalityMatches: false,
    protocolRecognized: true, noGenerationObserved: true, noInferenceRequested: true,
    withinDeadline: true, connectionClosed: true, passed: false,
  };
}

/** Decode only for an additional scope guard. Gateway verifies the JWT signature. */
function oidcScopeMatches(token: string, now: number): boolean {
  try {
    if (token.length > 16_384 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return false;
    const claims = record(JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")));
    return claims.project_id === GATEWAY_PROBE_PROJECT && claims.owner_id === GATEWAY_PROBE_TEAM
      && claims.environment === "preview" && typeof claims.exp === "number" && Number.isSafeInteger(claims.exp)
      && claims.exp > Math.floor((now + GATEWAY_PROBE_DEADLINE_MS) / 1000)
      && (claims.nbf === undefined || (typeof claims.nbf === "number" && Number.isSafeInteger(claims.nbf) && claims.nbf <= Math.floor(now / 1000)));
  } catch { return false; }
}

/** A fixed French transcription hint tests the array field, not learner speech. */
export function gatewayProbeSessionUpdate() {
  const format = { type: "audio/pcm", rate: 24_000 };
  return {
    type: "session-update",
    config: {
      instructions: INSTRUCTIONS,
      outputModalities: ["audio"],
      inputAudioFormat: format,
      outputAudioFormat: format,
      voice: "marin",
      // The OpenAI SDK mapper omits null; this explicit normalized value disables VAD.
      turnDetection: { type: "disabled" },
      tools: [],
      // The published OpenAI codec merges these native session fields at the top level.
      // This probe exists to establish whether Gateway actually preserves them.
      providerOptions: {
        max_output_tokens: 256,
        reasoning: { effort: "minimal" },
        tools: [],
        tool_choice: "none",
        audio: {
          input: { format, turn_detection: null, transcription: { model: "gpt-transcribe", languages: ["fr"] } },
          output: { format, voice: "marin" },
        },
      },
    },
  };
}

function inspectSession(raw: unknown, result: GatewayProbeFindings) {
  if (record(raw).type !== "session.updated") { result.protocolRecognized = false; return; }
  const session = record(record(raw).session), audio = record(session.audio);
  const input = record(audio.input), output = record(audio.output);
  const inputFormat = record(input.format), outputFormat = record(output.format);
  const transcription = record(input.transcription);
  result.modelMatches = session.type === "realtime" && session.model === GATEWAY_PROBE_MODEL;
  result.instructionsMatch = session.instructions === INSTRUCTIONS;
  result.outputCapMatches = session.max_output_tokens === 256;
  result.reasoningMinimal = record(session.reasoning).effort === "minimal";
  result.toolsDisabled = Array.isArray(session.tools) && session.tools.length === 0 && session.tool_choice === "none";
  result.manualTurns = input.turn_detection === null;
  result.inputFormatMatches = inputFormat.type === "audio/pcm" && inputFormat.rate === 24_000;
  result.outputFormatMatches = outputFormat.type === "audio/pcm" && outputFormat.rate === 24_000;
  result.transcriptionMatches = transcription.model === "gpt-transcribe" && only(transcription.languages, "fr");
  result.voiceMatches = output.voice === "marin";
  result.outputModalityMatches = only(session.output_modalities, "audio");
}

function configurationMatches(result: GatewayProbeFindings) {
  return result.modelMatches && result.instructionsMatch && result.outputCapMatches && result.reasoningMinimal
    && result.toolsDisabled && result.manualTurns && result.inputFormatMatches && result.outputFormatMatches
    && result.transcriptionMatches && result.voiceMatches && result.outputModalityMatches;
}

async function readBoundedJson(response: Response, signal: AbortSignal): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("probe_body");
  const chunks: Uint8Array[] = [];
  let total = 0;
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      if (signal.aborted) throw new Error("probe_timeout");
      const part = await reader.read();
      if (part.done) return JSON.parse(Buffer.concat(chunks).toString("utf8"));
      total += part.value.byteLength;
      if (total > MAX_FRAME_BYTES) { cancel(); throw new Error("probe_body"); }
      chunks.push(part.value);
    }
  } finally { signal.removeEventListener("abort", cancel); reader.releaseLock(); }
}

function hasReservationCredit(value: unknown): boolean | null {
  const balance = record(value).balance;
  if (typeof balance !== "string" || balance.length > 64 || !/^\d+(?:\.\d+)?$/.test(balance)) return null;
  const [integer, fraction = ""] = balance.split(".");
  const microUsd = BigInt(integer) * BigInt(1_000_000) + BigInt((fraction + "000000").slice(0, 6));
  return microUsd >= BigInt(200_000);
}

/**
 * A single opt-in preview/commit preflight. No audio, text item, inference,
 * retry, account mutation, runtime feature activation, or secret output.
 */
export async function probeSpeechGateway(
  env: GatewayProbeEnvironment,
  dependencies: GatewayProbeDependencies = defaults,
): Promise<GatewayProbeFindings> {
  const flag = env.YO_SPEECH_GATEWAY_PROBE;
  const requested = Boolean(flag);
  const eligible = Boolean(flag && /^[a-f0-9]{40}$/.test(flag) && flag === env.VERCEL_GIT_COMMIT_SHA
    && env.VERCEL === "1" && env.VERCEL_ENV === "preview" && env.VERCEL_TARGET_ENV === "preview"
    && env.VERCEL_GIT_COMMIT_REF === GATEWAY_PROBE_BRANCH);
  const result = initialFindings(requested, eligible);
  if (!eligible) return result;
  // Do not even read a credential unless all explicit build guards passed.
  const token = env.VERCEL_OIDC_TOKEN;
  result.oidcPresent = typeof token === "string" && token.length > 0;
  if (!token || !result.oidcPresent) return result;
  result.oidcScopeMatches = oidcScopeMatches(token, dependencies.now());
  if (!result.oidcScopeMatches) return result;
  const deadline = dependencies.deadline();
  const headers = {
    Authorization: `Bearer ${token}`,
    "ai-gateway-auth-method": "oidc",
    "ai-gateway-protocol-version": "0.0.1",
    "x-vercel-ai-gateway-team": GATEWAY_PROBE_TEAM,
  };
  let socket: WebSocket | undefined;
  const onAbort = () => { result.withinDeadline = false; socket?.terminate(); };
  deadline.signal.addEventListener("abort", onAbort, { once: true });
  try {
    if (deadline.signal.aborted) { result.withinDeadline = false; return result; }
    const response = await dependencies.fetch(GATEWAY_PROBE_CREDITS_URL, {
      method: "GET", headers, redirect: "error", cache: "no-store", signal: deadline.signal,
    });
    result.creditsAuthenticated = response.ok;
    if (!response.ok) { void response.body?.cancel().catch(() => undefined); return result; }
    const credit = hasReservationCredit(await readBoundedJson(response, deadline.signal));
    result.creditsParsed = credit !== null;
    result.hasReservationCredit = credit === true;
    if (credit !== true || deadline.signal.aborted) return result;

    await new Promise<void>((resolve) => {
      let settled = false, sent = false, received = 0;
      const finish = () => {
        if (settled) return;
        settled = true;
        deadline.signal.removeEventListener("abort", stopForDeadline);
        // Terminate immediately: no close/reconnect or delayed work can start inference.
        socket?.terminate();
        result.connectionClosed = true;
        resolve();
      };
      const stopForDeadline = () => { result.withinDeadline = false; finish(); };
      if (deadline.signal.aborted) { stopForDeadline(); return; }
      deadline.signal.addEventListener("abort", stopForDeadline, { once: true });
      try {
        socket = dependencies.socket(GATEWAY_PROBE_URL, {
          headers, followRedirects: false, handshakeTimeout: GATEWAY_PROBE_DEADLINE_MS,
          maxPayload: MAX_FRAME_BYTES, perMessageDeflate: false,
        });
        result.connectionClosed = false;
        socket.on("open", () => {
          if (settled || deadline.signal.aborted) return;
          if (sent) { result.protocolRecognized = false; finish(); return; }
          sent = true; result.socketOpened = true;
          try { socket!.send(JSON.stringify(gatewayProbeSessionUpdate())); }
          catch { result.protocolRecognized = false; finish(); }
        });
        socket.on("message", (data, isBinary) => {
          if (settled) return;
          try {
            if (isBinary || ++received > 16 || Buffer.byteLength(data.toString()) > MAX_FRAME_BYTES) throw new Error("probe_frame");
            const event = record(JSON.parse(data.toString()));
            if (event.type === "session-created" && !result.sessionCreated && record(event.raw).type === "session.created") {
              result.sessionCreated = true; return;
            }
            if (event.type === "custom" && record(event.raw).type === "rate_limits.updated") return;
            if (event.type === "session-updated" && sent && result.sessionCreated) {
              result.sessionUpdated = true;
              inspectSession(event.raw, result);
              result.passed = configurationMatches(result) && result.noGenerationObserved && result.withinDeadline;
              finish(); return;
            }
            if ([event.type, record(event.raw).type].some((type) => typeof type === "string"
              && /response|audio|transcript|text|conversation|usage|speech/.test(type))) result.noGenerationObserved = false;
            result.protocolRecognized = false; finish();
          } catch { result.protocolRecognized = false; finish(); }
        });
        // Never log a provider message, close reason, HTTP body or exception.
        socket.on("error", () => { if (!settled) { result.protocolRecognized = false; finish(); } });
        socket.on("close", () => finish());
      } catch { result.protocolRecognized = false; finish(); }
    });
  } catch { result.passed = false; }
  finally {
    deadline.signal.removeEventListener("abort", onAbort);
    deadline.clear();
    socket?.terminate();
    result.connectionClosed = true;
  }
  result.passed = result.passed && result.protocolRecognized && result.withinDeadline;
  return result;
}
