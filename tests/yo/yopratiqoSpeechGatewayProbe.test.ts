import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type WebSocket from "ws";
import {
  GATEWAY_PROBE_BRANCH, GATEWAY_PROBE_CREDITS_URL, GATEWAY_PROBE_DEADLINE_MS,
  GATEWAY_PROBE_MODEL, GATEWAY_PROBE_PROJECT, GATEWAY_PROBE_TEAM, GATEWAY_PROBE_URL,
  gatewayProbeSessionUpdate, probeSpeechGateway,
  type GatewayProbeDependencies, type GatewayProbeEnvironment,
} from "../../scripts/lib/yoSpeechGatewayProbe";

const NOW = 1_795_564_800_000;
const SHA = "a".repeat(40);
const jwt = (overrides: Record<string, unknown> = {}) => [
  Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ project_id: GATEWAY_PROBE_PROJECT, owner_id: GATEWAY_PROBE_TEAM,
    environment: "preview", exp: NOW / 1000 + 3_600, nbf: NOW / 1000 - 1, ...overrides })).toString("base64url"),
  "offline_fixture_signature",
].join(".");
const environment = (): GatewayProbeEnvironment => ({
  YO_SPEECH_GATEWAY_PROBE: SHA, VERCEL_GIT_COMMIT_SHA: SHA,
  VERCEL: "1", VERCEL_ENV: "preview", VERCEL_TARGET_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: GATEWAY_PROBE_BRANCH, VERCEL_OIDC_TOKEN: jwt(),
});

// Native acknowledgement, deliberately authored independently of the outgoing mapper.
function nativeSession() {
  return {
    type: "realtime", model: "gpt-realtime-2.1",
    instructions: "Configuration check only. Do not generate a response.",
    max_output_tokens: 256, reasoning: { effort: "minimal" },
    tools: [] as Record<string, unknown>[], tool_choice: "none", output_modalities: ["audio"],
    audio: {
      input: { format: { type: "audio/pcm", rate: 24_000 },
        turn_detection: null as null | { type: string },
        transcription: { model: "gpt-transcribe", languages: ["fr"] } },
      output: { format: { type: "audio/pcm", rate: 24_000 }, voice: "marin" },
    },
  };
}
const ack = (session = nativeSession()) => ({ type: "session-updated", raw: { type: "session.updated", session } });
const created = { type: "session-created", raw: { type: "session.created", session: { model: GATEWAY_PROBE_MODEL } } };

class FakeSocket extends EventEmitter {
  sent: unknown[] = [];
  terminated = false;
  terminateCalls = 0;
  constructor(private onSend: (socket: FakeSocket) => void) { super(); }
  send(value: string) {
    this.sent.push(JSON.parse(value));
    queueMicrotask(() => this.onSend(this));
  }
  event(value: unknown, binary = false) { this.emit("message", Buffer.from(JSON.stringify(value)), binary); }
  terminate() { this.terminated = true; this.terminateCalls += 1; }
}

function harness(options: {
  response?: () => Response | Promise<Response>;
  fetcher?: typeof fetch;
  onSend?: (socket: FakeSocket) => void;
  onOpen?: (socket: FakeSocket) => void;
  socketError?: boolean;
} = {}) {
  const controller = new AbortController();
  const requests: { url: string; init: RequestInit | undefined }[] = [];
  const connections: { url: string; options: WebSocket.ClientOptions; socket: FakeSocket }[] = [];
  let cleared = 0;
  const dependencies: GatewayProbeDependencies = {
    now: () => NOW,
    deadline: () => ({ signal: controller.signal, clear: () => { cleared += 1; } }),
    fetch: async (url, init) => {
      requests.push({ url: String(url), init });
      if (options.fetcher) return options.fetcher(url, init);
      return options.response ? options.response() : new Response(JSON.stringify({ balance: "1.234567", total_used: "0" }));
    },
    socket: (url, config) => {
      if (options.socketError) throw new Error("untrusted error containing a credential");
      const socket = new FakeSocket(options.onSend ?? ((current) => current.event(ack())));
      connections.push({ url, options: config, socket });
      queueMicrotask(() => {
        if (options.onOpen) options.onOpen(socket);
        else { socket.emit("open"); socket.event(created); }
      });
      return socket as unknown as WebSocket;
    },
  };
  return { controller, dependencies, requests, connections, cleared: () => cleared };
}

test("probe remains inert outside the explicitly opted-in preview commit, without reading OIDC", async () => {
  const variants: Partial<GatewayProbeEnvironment>[] = [
    { YO_SPEECH_GATEWAY_PROBE: undefined }, { YO_SPEECH_GATEWAY_PROBE: "true" },
    { YO_SPEECH_GATEWAY_PROBE: "b".repeat(40) }, { VERCEL_GIT_COMMIT_SHA: undefined },
    { VERCEL: undefined }, { VERCEL_ENV: "production" }, { VERCEL_ENV: "development" },
    { VERCEL_TARGET_ENV: "production" }, { VERCEL_TARGET_ENV: undefined },
    { VERCEL_GIT_COMMIT_REF: "main" },
  ];
  for (const overrides of variants) {
    let tokenReads = 0;
    const env = { ...environment(), ...overrides };
    Object.defineProperty(env, "VERCEL_OIDC_TOKEN", { get() { tokenReads += 1; throw new Error("must not read OIDC"); } });
    const h = harness(), result = await probeSpeechGateway(env, h.dependencies);
    assert.equal(result.eligiblePreview, false); assert.equal(result.passed, false);
    assert.equal(tokenReads, 0); assert.equal(h.requests.length, 0); assert.equal(h.connections.length, 0);
    assert.equal(h.cleared(), 0);
  }
});

test("missing, malformed, expired or foreign OIDC is rejected before any HTTP request", async () => {
  const tokens = [undefined, "", "not-a-jwt", "a".repeat(16_385),
    jwt({ project_id: "foreign" }), jwt({ owner_id: "foreign" }), jwt({ environment: "production" }),
    jwt({ exp: NOW / 1000 }), jwt({ exp: NOW / 1000 + GATEWAY_PROBE_DEADLINE_MS / 1000 }),
    jwt({ exp: "future" }), jwt({ nbf: NOW / 1000 + 1 })];
  for (const token of tokens) {
    const h = harness(), result = await probeSpeechGateway({ ...environment(), VERCEL_OIDC_TOKEN: token }, h.dependencies);
    assert.equal(result.eligiblePreview, true); assert.equal(result.oidcScopeMatches, false);
    assert.equal(result.passed, false); assert.equal(h.requests.length, 0); assert.equal(h.connections.length, 0);
  }
});

test("one scoped credit read and one fixed session update verify caps then terminate without inference", async () => {
  const h = harness(), env = environment(), result = await probeSpeechGateway(env, h.dependencies);
  assert.equal(result.passed, true); assert.equal(h.requests.length, 1); assert.equal(h.connections.length, 1);
  const request = h.requests[0], connection = h.connections[0];
  assert.equal(request.url, GATEWAY_PROBE_CREDITS_URL);
  assert.equal(request.init?.method, "GET"); assert.equal(request.init?.redirect, "error");
  assert.equal(request.init?.cache, "no-store"); assert.equal(request.init?.signal, h.controller.signal);
  const headers = new Headers(request.init?.headers);
  assert.equal(headers.get("Authorization"), `Bearer ${env.VERCEL_OIDC_TOKEN}`);
  assert.equal(headers.get("ai-gateway-auth-method"), "oidc");
  assert.equal(headers.get("ai-gateway-protocol-version"), "0.0.1");
  assert.equal(headers.get("x-vercel-ai-gateway-team"), GATEWAY_PROBE_TEAM);
  assert.equal(connection.url, GATEWAY_PROBE_URL); assert.equal(connection.options.followRedirects, false);
  assert.equal(connection.options.handshakeTimeout, 10_000); assert.equal(connection.options.maxPayload, 32_768);
  assert.equal(connection.options.perMessageDeflate, false);
  assert.deepEqual(connection.options.headers, request.init?.headers);
  assert.deepEqual(connection.socket.sent, [gatewayProbeSessionUpdate()]);
  assert.equal(connection.socket.terminated, true); assert.equal(h.cleared(), 1);
  assert.ok(Object.values(result).every((value) => typeof value === "boolean"));
  assert.doesNotMatch(JSON.stringify(result), /offline_fixture_signature|1\.234567|total_used|Bearer/);
  // The outgoing command is declarative configuration only: no item, audio or response command.
  const update = gatewayProbeSessionUpdate();
  assert.equal(update.type, "session-update"); assert.equal(update.config.providerOptions.max_output_tokens, 256);
  assert.deepEqual(update.config.turnDetection, { type: "disabled" });
  assert.equal(update.config.providerOptions.audio.input.turn_detection, null);
  assert.deepEqual(update.config.providerOptions.audio.input.transcription, { model: "gpt-transcribe", languages: ["fr"] });
  assert.deepEqual(update.config.providerOptions.tools, []);
  assert.equal(update.config.providerOptions.tool_choice, "none");
});

test("unavailable credits, redirects, invalid bodies and insufficient balance never open a socket or retry", async () => {
  const responses: (() => Response)[] = [
    ...[301, 401, 402, 500].map((status) => () => new Response("private provider details", { status })),
    () => new Response("not JSON"), () => new Response("x".repeat(32_769)),
    ...[null, {}, { balance: 1 }, { balance: "NaN" }, { balance: "-1" }, { balance: "0.1999999" },
      { balance: "1e2" }, { balance: "9".repeat(65) }].map((body) => () => new Response(JSON.stringify(body))),
  ];
  for (const response of responses) {
    const h = harness({ response }), result = await probeSpeechGateway(environment(), h.dependencies);
    assert.equal(result.passed, false); assert.equal(h.requests.length, 1); assert.equal(h.connections.length, 0);
    assert.equal(h.cleared(), 1); assert.ok(Object.values(result).every((value) => typeof value === "boolean"));
  }
  const h = harness({ response: () => new Response(JSON.stringify({ balance: "0.200000" })) });
  assert.equal((await probeSpeechGateway(environment(), h.dependencies)).passed, true);
});

test("every native session control must be echoed exactly", async (t) => {
  const changes: [string, (session: ReturnType<typeof nativeSession>) => void][] = [
    ["model", (s) => { s.model = "gpt-realtime"; }],
    ["session type", (s) => { s.type = "transcription"; }],
    ["instructions", (s) => { s.instructions = "Different instructions"; }],
    ["output cap", (s) => { s.max_output_tokens = 4_096; }],
    ["reasoning", (s) => { s.reasoning.effort = "high"; }],
    ["tools", (s) => { s.tools = [{ type: "function", name: "unexpected" }]; }],
    ["tool choice", (s) => { s.tool_choice = "auto"; }],
    ["VAD", (s) => { s.audio.input.turn_detection = { type: "server_vad" }; }],
    ["input codec", (s) => { s.audio.input.format.type = "audio/pcmu"; }],
    ["input rate", (s) => { s.audio.input.format.rate = 16_000; }],
    ["output codec", (s) => { s.audio.output.format.type = "audio/pcma"; }],
    ["output rate", (s) => { s.audio.output.format.rate = 48_000; }],
    ["transcription model", (s) => { s.audio.input.transcription.model = "whisper-1"; }],
    ["transcription language", (s) => { s.audio.input.transcription.languages = ["en"]; }],
    ["extra transcription language", (s) => { s.audio.input.transcription.languages = ["fr", "en"]; }],
    ["voice", (s) => { s.audio.output.voice = "alloy"; }],
    ["modality", (s) => { s.output_modalities = ["text"]; }],
  ];
  for (const [name, change] of changes) await t.test(name, async () => {
    const session = nativeSession(); change(session);
    const h = harness({ onSend: (socket) => socket.event(ack(session)) });
    const result = await probeSpeechGateway(environment(), h.dependencies);
    assert.equal(result.passed, false); assert.equal(result.sessionUpdated, true);
    assert.equal(h.connections[0].socket.terminated, true); assert.equal(h.connections[0].socket.sent.length, 1);
  });
});

test("missing raw data, wrong protocol, generation and malformed frames fail closed without echoing content", async () => {
  const frames: unknown[] = [
    { type: "session-updated" }, { type: "session-updated", raw: { type: "session.created", session: nativeSession() } },
    { type: "session.updated", session: nativeSession() },
    { type: "error", raw: { message: "private credential or provider details" } },
    { type: "response-created", responseId: "unexpected" }, { type: "audio-delta", delta: "private audio" },
    { type: "input-transcription-completed", transcript: "private transcript" },
    { type: "transcript-fragment", delta: "private transcript" },
    { type: "custom", raw: { type: "response.created" } },
  ];
  for (const frame of frames) {
    const h = harness({ onSend: (socket) => socket.event(frame) });
    const result = await probeSpeechGateway(environment(), h.dependencies);
    assert.equal(result.passed, false); assert.equal(result.protocolRecognized, false);
    assert.equal(h.connections[0].socket.terminated, true);
    assert.doesNotMatch(JSON.stringify(result), /private|credential|transcript"/);
  }
  for (const onSend of [
    (socket: FakeSocket) => socket.emit("message", Buffer.from("{"), false),
    (socket: FakeSocket) => socket.event(ack(), true),
    (socket: FakeSocket) => socket.emit("message", Buffer.from("x".repeat(32_769)), false),
    (socket: FakeSocket) => { for (let i = 0; i < 17; i += 1) socket.event({ type: "custom", raw: { type: "rate_limits.updated" } }); },
  ]) {
    const h = harness({ onSend });
    assert.equal((await probeSpeechGateway(environment(), h.dependencies)).passed, false);
    assert.equal(h.connections[0].socket.terminated, true);
  }
});

test("only native rate-limit metadata is tolerated before the native session acknowledgement", async () => {
  const h = harness({ onSend: (socket) => {
    socket.event({ type: "custom", raw: { type: "rate_limits.updated", rate_limits: [] } });
    socket.event(ack());
  } });
  assert.equal((await probeSpeechGateway(environment(), h.dependencies)).passed, true);
  const missingCreated = harness({ onOpen: (socket) => socket.emit("open") });
  const result = await probeSpeechGateway(environment(), missingCreated.dependencies);
  assert.equal(result.passed, false); assert.equal(result.sessionCreated, false);
});

test("socket errors, premature close and duplicate open cannot trigger a retry or second send", async () => {
  for (const onOpen of [
    (socket: FakeSocket) => socket.emit("error", new Error("private token")),
    (socket: FakeSocket) => socket.emit("close", 1008, Buffer.from("private reason")),
    (socket: FakeSocket) => { socket.emit("open"); socket.emit("open"); },
  ]) {
    const h = harness({ onOpen }), result = await probeSpeechGateway(environment(), h.dependencies);
    assert.equal(result.passed, false); assert.equal(h.connections.length, 1);
    assert.ok(h.connections[0].socket.sent.length <= 1); assert.equal(h.connections[0].socket.terminated, true);
    assert.doesNotMatch(JSON.stringify(result), /private/);
  }
  const h = harness({ socketError: true });
  assert.equal((await probeSpeechGateway(environment(), h.dependencies)).passed, false);
  assert.equal(h.cleared(), 1);
});

test("one global deadline covers credit HTTP, a stalled response body, and the socket", async () => {
  const fetching = harness({ fetcher: async (_url, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    queueMicrotask(() => fetching.controller.abort());
  }) });
  const first = await probeSpeechGateway(environment(), fetching.dependencies);
  assert.equal(first.withinDeadline, false); assert.equal(first.passed, false); assert.equal(fetching.connections.length, 0);

  let cancelled = false;
  const stalled = harness({ response: () => new Response(new ReadableStream<Uint8Array>({
    pull() { queueMicrotask(() => stalled.controller.abort()); },
    cancel() { cancelled = true; },
  })) });
  const second = await probeSpeechGateway(environment(), stalled.dependencies);
  assert.equal(second.withinDeadline, false); assert.equal(second.passed, false); assert.equal(cancelled, true);
  assert.equal(stalled.connections.length, 0);

  const connecting = harness({ onSend: () => connecting.controller.abort() });
  const third = await probeSpeechGateway(environment(), connecting.dependencies);
  assert.equal(third.withinDeadline, false); assert.equal(third.passed, false);
  assert.equal(connecting.connections[0].socket.terminated, true);
  for (const current of [fetching, stalled, connecting]) assert.equal(current.cleared(), 1);
});

test("termination seals the result against late acknowledgement, audio or transport errors", async () => {
  const successful = harness(), result = await probeSpeechGateway(environment(), successful.dependencies);
  const frozen = JSON.stringify(result), socket = successful.connections[0].socket;
  socket.event({ type: "audio-delta", delta: "late" }); socket.emit("error", new Error("late")); socket.emit("open");
  assert.equal(JSON.stringify(result), frozen); assert.equal(socket.sent.length, 1);

  const failed = harness({ onSend: (current) => current.emit("error", new Error("failed")) });
  const failure = await probeSpeechGateway(environment(), failed.dependencies);
  failed.connections[0].socket.event(ack());
  assert.equal(failure.passed, false); assert.equal(failed.connections[0].socket.sent.length, 1);
});
