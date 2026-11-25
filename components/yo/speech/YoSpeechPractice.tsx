"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { YoLocale } from "@/lib/yo/types";
import { SPEECH_LANGUAGES, SPEECH_SCENARIOS, type SpeechLanguage, type SpeechScenarioId } from "@/lib/yo/speech/catalog";
import { SPEECH_CONSENT_VERSION, type SpeechHistory, type SpeechReviewItem, type SpeechStatus, type SpeechTurnResult } from "@/lib/yo/speech/contract";
import { speechCopy } from "@/lib/yo/speech/copy";
import { pcmWavBlob, speechRequestId, startSpeechRecording, type SpeechRecording } from "@/lib/yo/speech/recorder";

type Props = { language: SpeechLanguage; locale: YoLocale; scenarioId?: SpeechScenarioId };
const button = "rounded-xl border border-indigo-200 px-4 py-2.5 text-sm font-semibold text-indigo-950 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

/** Opening the disclosure is required before auth/status queries; recording needs separate consent and a gesture. */
export function YoSpeechPractice(props: Props) {
  const [open, setOpen] = useState(false);
  const copy = speechCopy(props.locale);
  return <details className="my-5 rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm sm:p-5" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer rounded-lg text-base font-bold text-indigo-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">
      {copy.title} <span className="font-normal text-slate-500">· {SPEECH_LANGUAGES[props.language].name[props.locale]}</span>
    </summary>
    <p className="mt-2 text-sm text-slate-600">{copy.subtitle}</p>
    {open && <Practice key={`${props.language}:${props.locale}`} {...props} />}
  </details>;
}

function Practice({ language, locale, scenarioId = "cafe" }: Props) {
  const instance = useId();
  const root = useRef<HTMLElement | null>(null);
  const copy = speechCopy(locale);
  const [scenario, setScenario] = useState<SpeechScenarioId>(scenarioId);
  const [status, setStatus] = useState<SpeechStatus | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [consent, setConsent] = useState(false), [remember, setRemember] = useState(false);
  const [phase, setPhase] = useState<"ready" | "starting" | "recording" | "sending">("ready");
  const [error, setError] = useState("");
  const [result, setResult] = useState<(SpeechTurnResult & { audioUrl: string }) | null>(null);
  const audioUrl = result?.audioUrl ?? "";
  const [reviews, setReviews] = useState<SpeechReviewItem[]>([]);
  const [revealed, setRevealed] = useState(false), [reviewBusy, setReviewBusy] = useState(false);
  const owner = useRef<string | null>(null), token = useRef("");
  const lifetime = useRef(0), history = useRef<SpeechHistory>([]);
  const active = useRef<AbortController | null>(null), recording = useRef<SpeechRecording | null>(null);
  const sendRef = useRef<() => void>(() => {}), audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let live = true;
    const generations = lifetime;
    const lifecycle = new AbortController();
    let unsubscribe: (() => void) | undefined;
    const clear = () => {
      lifetime.current++; active.current?.abort(); recording.current?.cancel(); recording.current = null;
      audio.current?.pause();
      history.current = []; setResult(null); setConsent(false); setRemember(false); setPhase("ready"); setError("");
      setReviews([]); setRevealed(false); setReviewBusy(false);
    };
    const load = (id: string | null, accessToken: string) => {
      if (!live) return;
      token.current = accessToken;
      if (id === owner.current && id !== null) return;
      clear(); owner.current = id; setSignedOut(!id); setStatus(null);
      if (!id) return;
      const generation = lifetime.current;
      const request = { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" as const, signal: lifecycle.signal };
      void Promise.all([
        fetch("/api/yo/speech/status", request).then(async (r) => r.ok ? await r.json() : { available: false, reason: "unavailable" }),
        fetch(`/api/yo/speech/reviews?language=${language}`, request).then(async (r) => r.ok ? (await r.json()).items : []),
      ]).then(([nextStatus, items]) => {
        if (!live || generation !== lifetime.current) return;
        setStatus(nextStatus); setReviews(Array.isArray(items) ? items : []);
      }).catch(() => { if (live && generation === lifetime.current) setStatus({ available: false, reason: "unavailable" }); });
    };
    try {
      const client = getSupabaseClient();
      const initialGeneration = lifetime.current;
      const subscription = client.auth.onAuthStateChange((_event, session) => load(session?.user.id ?? null, session?.access_token ?? ""));
      unsubscribe = () => subscription.data.subscription.unsubscribe();
      void client.auth.getSession().then(({ data }) => {
        if (initialGeneration === lifetime.current) load(data.session?.user.id ?? null, data.session?.access_token ?? "");
      }).catch(() => { if (live && initialGeneration === lifetime.current) setStatus({ available: false, reason: "unavailable" }); });
    } catch { queueMicrotask(() => { if (live) setStatus({ available: false, reason: "unavailable" }); }); }
    const stop = (event?: Event) => {
      if (event instanceof CustomEvent && event.detail?.source === instance) return;
      active.current?.abort(); active.current = null; recording.current?.cancel(); recording.current = null; audio.current?.pause(); setPhase("ready");
    };
    const visibility = () => { if (document.hidden) stop(); };
    const stopEvents = ["yo-cinema-open", "yo-speech-cancel", "yo-arrival-playback-start", "pagehide"];
    stopEvents.forEach((name) => window.addEventListener(name, stop));
    const observer = typeof MutationObserver !== "undefined" ? new MutationObserver(() => {
      if (root.current?.closest("[hidden], [inert], [aria-hidden='true']")) stop();
    }) : null;
    for (let ancestor: Element | null = root.current; ancestor; ancestor = ancestor.parentElement) observer?.observe(ancestor, { attributes: true, attributeFilter: ["hidden", "inert", "aria-hidden"] });
    document.addEventListener("visibilitychange", visibility);
    return () => { live = false; generations.current++; lifecycle.abort(); active.current?.abort(); recording.current?.cancel(); owner.current = null; token.current = ""; history.current = []; unsubscribe?.(); observer?.disconnect(); stopEvents.forEach((name) => window.removeEventListener(name, stop)); document.removeEventListener("visibilitychange", visibility); };
  }, [language, instance]);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  useEffect(() => {
    if (!audioUrl || document.hidden || root.current?.closest("[hidden], [inert], [aria-hidden='true']") || active.current?.signal.aborted || !active.current) return;
    // The learner initiated this exchange. Browsers that require another gesture retain native controls.
    void audio.current?.play().catch(() => {});
  }, [audioUrl]);

  async function currentToken(expectedOwner: string): Promise<string> {
    const { data } = await getSupabaseClient().auth.getSession();
    if (!data.session || data.session.user.id !== expectedOwner || owner.current !== expectedOwner) throw new Error("account_changed");
    return data.session.access_token;
  }

  async function send() {
    const capture = recording.current, expectedOwner = owner.current, generation = lifetime.current;
    if (!capture || !expectedOwner) return;
    recording.current = null;
    let pcm: string;
    try { pcm = capture.stop(); } catch { setPhase("ready"); return; }
    setPhase("sending"); setError("");
    const controller = active.current;
    try {
      const accessToken = await currentToken(expectedOwner);
      if (!controller || controller.signal.aborted || generation !== lifetime.current) return;
      const response = await fetch("/api/yo/speech/turn", { method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ requestId: speechRequestId(), language, scenarioId: scenario, locale,
          consent: SPEECH_CONSENT_VERSION, rememberCorrections: remember, audio: pcm, history: history.current }),
      });
      const data = await response.json();
      if (generation !== lifetime.current || owner.current !== expectedOwner || controller.signal.aborted) return;
      if (!response.ok) {
        if (data.error === "trial_complete" || data.error === "pilot_complete") setStatus({ available: false, reason: data.error });
        throw new Error("voice_unavailable");
      }
      const next = data as SpeechTurnResult;
      setResult({ ...next, audioUrl: URL.createObjectURL(pcmWavBlob(next.audio)) });
      history.current = [...history.current, { role: "user" as const, text: next.transcript.slice(0, 700) }, { role: "assistant" as const, text: next.reply.slice(0, 700) }].slice(-6);
      // Enforce the server's byte budget even for Japanese/Mandarin dialogue.
      while (history.current.length && new TextEncoder().encode(history.current.map((item) => item.text).join("")).length > 4_000) history.current.shift();
      const request = { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" as const, signal: controller.signal };
      const [statusResponse, reviewResponse] = await Promise.all([fetch("/api/yo/speech/status", request), fetch(`/api/yo/speech/reviews?language=${language}`, request)]);
      const [freshStatus, freshReviews] = await Promise.all([statusResponse.ok ? statusResponse.json() : null, reviewResponse.ok ? reviewResponse.json() : null]);
      if (generation !== lifetime.current || controller.signal.aborted) return;
      if (freshStatus) setStatus(freshStatus);
      if (freshReviews?.items) setReviews(freshReviews.items);
    } catch { if (generation === lifetime.current && !controller?.signal.aborted) setError(copy.retry); }
    finally { if (generation === lifetime.current && active.current === controller) setPhase("ready"); }
  }
  sendRef.current = () => { void send(); };

  async function start() {
    if (!consent || !status?.available || !owner.current || phase !== "ready") return;
    coordinateAudio(); audio.current?.pause();
    const generation = lifetime.current, controller = new AbortController();
    active.current?.abort(); active.current = controller;
    setError(""); setPhase("starting");
    try {
      const capture = await startSpeechRecording(controller.signal, () => sendRef.current());
      if (controller.signal.aborted || generation !== lifetime.current) { capture.cancel(); return; }
      recording.current = capture; setPhase("recording");
    } catch { if (generation === lifetime.current && !controller.signal.aborted) { setError(copy.microphone); setPhase("ready"); } }
  }

  function cancel() { active.current?.abort(); active.current = null; recording.current?.cancel(); recording.current = null; setPhase("ready"); }

  function coordinateAudio() {
    for (const name of ["yo-audio-stop", "yo-italian-audio-stop", "yo-japanese-audio-stop", "yo-mandarin-audio-stop"])
      window.dispatchEvent(new Event(name));
    window.dispatchEvent(new CustomEvent("yo-speech-cancel", { detail: { source: instance } }));
    window.dispatchEvent(new Event("yo-speech-start"));
  }

  async function review(action: "independent" | "assisted" | "again" | "delete") {
    const item = reviews[0], expectedOwner = owner.current, generation = lifetime.current;
    if (!item || !expectedOwner || reviewBusy) return;
    setReviewBusy(true); setError("");
    try {
      const accessToken = await currentToken(expectedOwner);
      if (generation !== lifetime.current) return;
      const response = await fetch("/api/yo/speech/reviews", { method: action === "delete" ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(action === "delete" ? { id: item.id } : { id: item.id, attemptId: speechRequestId(), revision: item.revision, correct: action !== "again", assisted: action === "assisted" }),
      });
      if (generation !== lifetime.current) return;
      if (!response.ok) throw new Error("review_failed");
      setReviews((items) => items.filter((value) => value.id !== item.id)); setRevealed(false);
    } catch { if (generation === lifetime.current) setError(copy.reviewError); }
    finally { if (generation === lifetime.current) setReviewBusy(false); }
  }

  const busy = phase !== "ready";
  const unavailable = status?.reason === "trial_complete" ? copy.trialComplete : status?.reason === "pilot_complete" ? copy.pilotComplete : copy.unavailable;
  return <section ref={root} className="mt-4 space-y-4 text-sm text-slate-700" aria-label={copy.title} data-no-deck-swipe data-no-deck-tap>
    <p className="text-xs font-medium text-indigo-700">{copy.ai}</p>
    {signedOut ? <p role="status">{copy.signIn}</p> : !status ? <p role="status">{copy.loading}</p> : !status.available ? <p role="status">{unavailable}</p> : <>
      <label className="block font-semibold">{copy.scenario}
        <select className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3" value={scenario} disabled={busy} onChange={(event) => { setScenario(event.target.value as SpeechScenarioId); history.current = []; setResult(null); setError(""); }}>
          {Object.entries(SPEECH_SCENARIOS).map(([id, value]) => <option key={id} value={id}>{value.title[locale]}</option>)}
        </select>
      </label>
      <div className="rounded-xl bg-indigo-50 p-4"><p className="font-semibold text-indigo-950">{SPEECH_SCENARIOS[scenario].goal[locale]}</p><p className="mt-1">{copy.recordingHint}</p></div>
      <label className="flex items-start gap-3"><input className="mt-1 h-4 w-4 shrink-0" type="checkbox" checked={consent} disabled={busy} onChange={(event) => setConsent(event.target.checked)} /><span>{copy.consent}</span></label>
      <label className="flex items-start gap-3"><input className="mt-1 h-4 w-4 shrink-0" type="checkbox" checked={remember} disabled={busy} onChange={(event) => setRemember(event.target.checked)} /><span>{copy.remember}</span></label>
      <div className="flex flex-wrap gap-2">
        {phase === "recording" ? <button type="button" className={`${button} bg-indigo-50`} onClick={() => void send()}>{copy.stop}</button> : <button type="button" className={`${button} bg-indigo-50`} disabled={!consent || busy} onClick={() => void start()}>{copy.record}</button>}
        {busy && <button type="button" className={button} onClick={cancel}>{copy.cancel}</button>}
        {result && !busy && <button type="button" className={button} onClick={() => { history.current = []; setResult(null); setError(""); }}>{copy.reset}</button>}
      </div>
      <p className="min-h-5 text-xs text-slate-500" aria-live="polite">{phase === "recording" ? copy.recording : phase === "starting" ? copy.starting : phase === "sending" ? copy.sending : status.remainingSeconds !== undefined ? copy.remaining.replace("{n}", String(Math.floor(status.remainingSeconds / 30))) : ""}</p>
    </>}
    {error && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-amber-950">{error}</p>}
    {result && <div className="space-y-3 rounded-xl border border-slate-200 p-4" aria-live="polite">
      <p className="text-xs font-semibold text-slate-500">{copy.transcription}</p>
      <p lang={SPEECH_LANGUAGES[language].locale}>{result.transcript}</p>
      <p className="font-semibold text-indigo-950" lang={SPEECH_LANGUAGES[language].locale}>Yoppo · {result.reply}</p>
      {audioUrl && <audio ref={(node) => { if (audio.current && audio.current !== node) audio.current.pause(); audio.current = node; }} controls preload="none" src={audioUrl} className="w-full" aria-label="Yoppo" onPlay={coordinateAudio} />}
      {result.feedback && <p>{result.feedback.message}</p>}
      {result.feedback?.correction && <div className="rounded-lg bg-emerald-50 p-3"><p className="font-semibold">{copy.correction}</p><p lang={SPEECH_LANGUAGES[language].locale}>{result.feedback.correction.better}</p><p className="mt-1 text-xs">{result.feedback.correction.hint}</p>{result.reviewSaved && <p className="mt-1 text-xs">{copy.saved}</p>}</div>}
      <p className="text-xs text-slate-500">{copy.transcriptNote}</p>
    </div>}
    {reviews[0] && <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4" aria-label={copy.review}>
      <h3 className="font-semibold text-emerald-950">{copy.review} · {reviews.length}</h3>
      <p>{copy.reviewPrompt}</p><p lang={reviews[0].locale}>{reviews[0].hint}</p>
      {revealed ? <><p className="text-base font-semibold" lang={SPEECH_LANGUAGES[language].locale}>{reviews[0].target}</p><div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={reviewBusy} onClick={() => void review("independent")}>{copy.remembered}</button>
        <button type="button" className={button} disabled={reviewBusy} onClick={() => void review("assisted")}>{copy.assisted}</button>
        <button type="button" className={button} disabled={reviewBusy} onClick={() => void review("again")}>{copy.again}</button>
      </div></> : <button type="button" className={button} onClick={() => setRevealed(true)}>{copy.reveal}</button>}
      <button type="button" className="text-xs text-slate-600 underline" disabled={reviewBusy} onClick={() => void review("delete")}>{copy.remove}</button>
    </section>}
  </section>;
}

export default YoSpeechPractice;
