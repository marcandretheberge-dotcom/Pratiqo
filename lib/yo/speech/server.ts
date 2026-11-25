import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidSrsRecord, recordAttempt } from "@/lib/yo/srs/engine";
import { isSpeechLanguage } from "./catalog";
import { isUuid, parseSpeechTurn, SPEECH_MAX_BODY_BYTES, SPEECH_MAX_PCM_BYTES, SPEECH_RESERVED_MICRO_USD, type SpeechStatus, type SpeechTurn } from "./contract";
import { runSpeechTurn, type SpeechProviderResult } from "./provider";

const headers = { "Cache-Control": "private, no-store", Vary: "Authorization", "X-Content-Type-Options": "nosniff" };
export const speechJson = (data: unknown, status = 200) => Response.json(data, { status, headers });
export const speechEnabled = () => process.env.YO_SPEECH_ENABLED === "true";
export const speechConfigured = () => Boolean(process.env.OPENAI_API_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function authenticateSpeech(request: Request): Promise<string | null> {
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token || token.length > 8_192) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const client = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` },
    fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8_000) }) },
    auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser();
  return !error && data.user && !data.user.is_anonymous ? data.user.id : null;
}

export async function readSpeechJson(request: Request, max = SPEECH_MAX_BODY_BYTES): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("invalid_body");
  const claimed = request.headers.get("content-length");
  if (claimed && (!/^\d+$/.test(claimed) || Number(claimed) > max)) throw new Error("body_limit");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_body");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > max) { await reader.cancel(); throw new Error("body_limit"); }
      chunks.push(chunk.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { reader.releaseLock(); }
}

export function validatePcm(audio: string): boolean {
  const pcm = Buffer.from(audio, "base64");
  if (pcm.length < 4_800 || pcm.length > SPEECH_MAX_PCM_BYTES || pcm.length % 2 || pcm.toString("base64") !== audio) return false;
  let energy = 0;
  for (let i = 0; i < pcm.length; i += 2) energy += (pcm.readInt16LE(i) / 32768) ** 2;
  return Math.sqrt(energy / (pcm.length / 2)) >= 0.0005;
}

type CorrectionToSave = { locale: string; target: string; hint: string; srs: ReturnType<typeof recordAttempt>; dueAt: number } | null;
export type SpeechServices = {
  enabled: () => boolean; configured: () => boolean;
  authenticate: (request: Request) => Promise<string | null>;
  reserve: (owner: string, turn: SpeechTurn) => Promise<string>;
  finish: (owner: string, turn: SpeechTurn, success: boolean, cost: number | null, correction: CorrectionToSave, block: boolean) => Promise<string>;
  run: (turn: SpeechTurn, signal: AbortSignal) => Promise<SpeechProviderResult>;
};
const services: SpeechServices = {
  enabled: speechEnabled, configured: speechConfigured, authenticate: authenticateSpeech,
  async reserve(owner, turn) {
    const { data, error } = await getSupabaseAdmin().rpc("yo_speech_reserve", {
      p_user_id: owner, p_request_id: turn.requestId, p_language: turn.language, p_scenario: turn.scenarioId,
      p_consent: turn.consent, p_remember: turn.rememberCorrections,
    });
    if (error || typeof data !== "string") throw new Error("reservation_failed");
    return data;
  },
  async finish(owner, turn, success, cost, correction, block) {
    const { data, error } = await getSupabaseAdmin().rpc("yo_speech_finish", {
      p_user_id: owner, p_request_id: turn.requestId, p_success: success, p_cost: cost, p_correction: correction, p_block: block,
    });
    if (error || typeof data !== "string") throw new Error("completion_failed");
    return data;
  },
  run: (turn, signal) => runSpeechTurn(turn, process.env.OPENAI_API_KEY!, signal),
};

export function createSpeechTurnHandler(dependencies: SpeechServices = services) {
  return async (request: Request): Promise<Response> => {
    if (!dependencies.enabled()) return speechJson({ error: "disabled" }, 404);
    if (!dependencies.configured()) return speechJson({ error: "unavailable" }, 503);
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return speechJson({ error: "forbidden" }, 403);
    let owner: string | null;
    try { owner = await dependencies.authenticate(request); } catch { return speechJson({ error: "unavailable" }, 503); }
    if (!owner) return speechJson({ error: "sign_in" }, 401);
    let turn: SpeechTurn | null;
    try { turn = parseSpeechTurn(await readSpeechJson(request)); } catch { return speechJson({ error: "invalid_body" }, 400); }
    if (!turn || !validatePcm(turn.audio)) return speechJson({ error: "invalid_audio" }, 400);
    if (request.signal.aborted) return speechJson({ error: "cancelled" }, 409);
    let reservation: string;
    try { reservation = await dependencies.reserve(owner, turn); } catch { return speechJson({ error: "unavailable" }, 503); }
    if (reservation !== "reserved") {
      const known = ["duplicate", "busy", "rate_limit", "trial_complete", "pilot_complete", "unavailable"].includes(reservation);
      return speechJson({ error: known ? reservation : "unavailable" }, ["duplicate", "busy"].includes(reservation) ? 409 : reservation === "unavailable" || !known ? 503 : 429);
    }
    try {
      const result = await dependencies.run(turn, request.signal);
      if (!Number.isSafeInteger(result.usageMicroUsd) || result.usageMicroUsd < 0 || result.usageMicroUsd > SPEECH_RESERVED_MICRO_USD) {
        await dependencies.finish(owner, turn, false, Number.isSafeInteger(result.usageMicroUsd) && result.usageMicroUsd >= 0 ? result.usageMicroUsd : null, null, true);
        return speechJson({ error: "unavailable" }, 503);
      }
      const state = recordAttempt(null, false, false, Date.now());
      const correction = turn.rememberCorrections && result.feedback?.correction
        ? { locale: turn.locale, target: result.feedback.correction.better, hint: result.feedback.correction.hint, srs: state, dueAt: state.nextReviewAt } : null;
      const completed = await dependencies.finish(owner, turn, true, result.usageMicroUsd, correction, false);
      if (completed !== "saved" && completed !== "finished") return speechJson({ error: "completion_unavailable" }, 503);
      return speechJson({ requestId: turn.requestId, transcript: result.transcript, reply: result.reply, audio: result.audio,
        feedback: result.feedback, reviewSaved: completed === "saved" });
    } catch (error) {
      // No provider retry or refund. Even a process crash leaves its reservation counted.
      const block = error instanceof Error && ["usage_missing", "usage_invalid", "usage_bound", "audio_bound", "extra_response", "unexpected_response"].includes(error.message);
      try { await dependencies.finish(owner, turn, false, null, null, block); } catch { /* Reservation remains pending and charged. */ }
      return speechJson({ error: "voice_unavailable" }, 503);
    }
  };
}

export const handleSpeechTurn = createSpeechTurnHandler();
export async function handleSpeechStatus(request: Request) {
  if (!speechEnabled()) return speechJson({ available: false, reason: "disabled" } satisfies SpeechStatus);
  if (!speechConfigured()) return speechJson({ available: false, reason: "unavailable" } satisfies SpeechStatus);
  try {
    const owner = await authenticateSpeech(request);
    if (!owner) return speechJson({ error: "sign_in" }, 401);
    const { data, error } = await getSupabaseAdmin().rpc("yo_speech_status", { p_user_id: owner });
    if (error || typeof data?.available !== "boolean") return speechJson({ available: false, reason: "unavailable" });
    return speechJson(data);
  } catch { return speechJson({ available: false, reason: "unavailable" }); }
}

export async function handleSpeechReviews(request: Request) {
  try {
    const owner = await authenticateSpeech(request);
    if (!owner) return speechJson({ error: "sign_in" }, 401);
    const db = getSupabaseAdmin();
    const account = await db.rpc("yo_speech_account_available", { p_user_id: owner });
    if (account.error || account.data !== true) return speechJson({ error: "unavailable" }, 503);
    if (request.method === "GET") {
      const language = new URL(request.url).searchParams.get("language");
      if (!isSpeechLanguage(language)) return speechJson({ error: "invalid_body" }, 400);
      const { data, error } = await db.from("yo_error_events").select("id,target,hint,locale,due_at,revision")
        .eq("user_id", owner).eq("language", language).lte("due_at", Date.now()).order("due_at").order("id").limit(10);
      if (error) return speechJson({ error: "unavailable" }, 503);
      return speechJson({ items: (data ?? []).map((row) => ({ id: row.id, target: row.target, hint: row.hint, locale: row.locale, dueAt: row.due_at, revision: String(row.revision) })) });
    }
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return speechJson({ error: "forbidden" }, 403);
    const body = await readSpeechJson(request, 1_500) as Record<string, unknown>;
    if (!body || typeof body !== "object" || !isUuid(body.id)) return speechJson({ error: "invalid_body" }, 400);
    if (request.method === "DELETE") {
      if (Object.keys(body).join(",") !== "id") return speechJson({ error: "invalid_body" }, 400);
      const { error } = await db.from("yo_error_events").delete().eq("user_id", owner).eq("id", body.id);
      return speechJson(error ? { error: "unavailable" } : { status: "deleted" }, error ? 503 : 200);
    }
    if (Object.keys(body).sort().join(",") !== "assisted,attemptId,correct,id,revision" || !isUuid(body.attemptId)
      || typeof body.correct !== "boolean" || typeof body.assisted !== "boolean" || typeof body.revision !== "string" || !/^[1-9]\d{0,8}$/.test(body.revision)) return speechJson({ error: "invalid_body" }, 400);
    const { data: item, error } = await db.from("yo_error_events").select("srs,revision").eq("user_id", owner).eq("id", body.id).maybeSingle();
    if (error) return speechJson({ error: "unavailable" }, 503);
    if (!item || !isValidSrsRecord(item.srs)) return speechJson({ error: "missing" }, 404);
    const state = recordAttempt(item.srs, body.correct, body.assisted, Math.max(Date.now(), item.srs.lastAt));
    const result = await db.rpc("yo_speech_review", { p_user_id: owner, p_item_id: body.id, p_attempt_id: body.attemptId,
      p_revision: Number(body.revision), p_state: state });
    if (result.error) return speechJson({ error: "unavailable" }, 503);
    return speechJson({ status: result.data }, result.data === "reviewed" || result.data === "duplicate" ? 200 : 409);
  } catch { return speechJson({ error: "unavailable" }, 503); }
}
