"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { arrivalListeningScenes, type ArrivalSceneId } from "@/lib/yo/dominicanArrivalListening";
import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";

const PLAYBACK_EVENT = "yo-arrival-playback-start";
const STAGES = ["listen", "questions", "transcript", "roleplay"] as const;
type Stage = (typeof STAGES)[number];
type Playback = "idle" | "loading" | "playing";
type RoleplayPhase = "ready" | "listening" | "respond" | "model";
type FocusTarget = "question" | "feedback" | "transcript" | "turn" | "model" | "finished";

const COPY = {
  stages: {
    listen: lstr("Écouter", "Listen", "Escuchar"),
    questions: lstr("Comprendre", "Understand", "Comprender"),
    transcript: lstr("Lire", "Read", "Leer"),
    roleplay: lstr("Parler", "Speak", "Hablar"),
  },
  navigation: lstr("Étapes du dialogue", "Conversation steps", "Pasos del diálogo"),
  goal: lstr("Ta mission", "Your goal", "Tu objetivo"),
  listenHint: lstr("Écoute une première fois. Repère l'information utile avant d'ouvrir le texte.", "Listen once and pick out the useful information before opening the text.", "Escucha una vez e identifica la información útil antes de abrir el texto."),
  pending: lstr("Audio en préparation", "Audio in preparation", "Audio en preparación"),
  pendingHint: lstr("Les enregistrements ne sont pas encore disponibles. Tu peux déjà lire le dialogue et pratiquer à voix haute.", "The recordings are not available yet. You can already read the conversation and practise aloud.", "Las grabaciones todavía no están disponibles. Ya puedes leer el diálogo y practicar en voz alta."),
  synthetic: lstr("Voix de synthèse · version à valider à l’écoute", "Synthetic voices · awaiting listening review", "Voces sintéticas · versión pendiente de escucha y validación"),
  play: lstr("Écouter le dialogue", "Play the conversation", "Escuchar el diálogo"),
  replay: lstr("Réécouter", "Replay", "Volver a escuchar"),
  stop: lstr("Arrêter l'audio", "Stop audio", "Detener el audio"),
  normal: lstr("Vitesse normale", "Normal speed", "Velocidad normal"),
  slow: lstr("Plus lent", "Slower", "Más lento"),
  speed: lstr("Vitesse de lecture", "Playback speed", "Velocidad de reproducción"),
  loading: lstr("Chargement de l'audio…", "Loading audio…", "Cargando audio…"),
  playing: lstr("Lecture en cours…", "Audio playing…", "Audio en curso…"),
  error: lstr("L'audio n'a pas pu démarrer. Réessaie ou ouvre la transcription.", "Audio could not start. Try again or open the transcript.", "No se pudo iniciar el audio. Inténtalo de nuevo o abre la transcripción."),
  retryAudio: lstr("Réessayer l'audio", "Retry audio", "Reintentar el audio"),
  transcript: lstr("Ouvrir la transcription", "Open the transcript", "Abrir la transcripción"),
  questionHint: lstr("Choisis une réponse. L'explication apparaît ensuite.", "Choose an answer, then read the explanation.", "Elige una respuesta y después lee la explicación."),
  check: lstr("Vérifier ma compréhension", "Check my understanding", "Comprobar mi comprensión"),
  correct: lstr("Bien repéré !", "You caught it!", "¡Bien identificado!"),
  incorrect: lstr("À revoir", "Review this", "Para repasar"),
  tryAgain: lstr("Réessayer cette question", "Try this question again", "Reintentar esta pregunta"),
  previousQuestion: lstr("Question précédente", "Previous question", "Pregunta anterior"),
  nextQuestion: lstr("Question suivante", "Next question", "Siguiente pregunta"),
  reviewDialogue: lstr("Lire le dialogue", "Read the conversation", "Leer el diálogo"),
  previousLine: lstr("Réplique précédente", "Previous line", "Frase anterior"),
  nextLine: lstr("Réplique suivante", "Next line", "Siguiente frase"),
  playLine: lstr("Écouter cette réplique", "Play this line", "Escuchar esta frase"),
  phrases: lstr("Phrases à réutiliser", "Useful phrases", "Frases útiles"),
  startRoleplay: lstr("À moi de parler", "My turn to speak", "Me toca hablar"),
  roleplayHint: lstr("Prends le rôle du voyageur. Réponds à voix haute, puis compare avec le modèle.", "Take the traveler's role. Answer aloud, then compare with the model.", "Haz el papel del viajero. Responde en voz alta y después compara con el modelo."),
  prompt: lstr("Écouter la réplique", "Play the other person's line", "Escuchar la intervención"),
  readPrompt: lstr("Lire la réplique et répondre", "Read the line and respond", "Leer la intervención y responder"),
  ready: lstr("Commencer ma réponse", "Start my response", "Empezar mi respuesta"),
  yourTurn: lstr("À toi : réponds à voix haute. Prends le temps qu'il te faut.", "Your turn: answer aloud. Take the time you need.", "Te toca: responde en voz alta. Tómate el tiempo que necesites."),
  revealModel: lstr("J'ai répondu — voir le modèle", "I've answered — show the model", "Ya respondí — ver el modelo"),
  model: lstr("Une réponse possible", "One possible response", "Una respuesta posible"),
  playModel: lstr("Écouter le modèle", "Play the model response", "Escuchar el modelo"),
  nextTurn: lstr("Échange suivant", "Next exchange", "Siguiente intercambio"),
  previousTurn: lstr("Échange précédent", "Previous exchange", "Intercambio anterior"),
  finish: lstr("Terminer la pratique", "Finish practice", "Terminar la práctica"),
  finished: lstr("Pratique terminée. Rejoue les échanges qui restent difficiles.", "Practice complete. Replay the exchanges you found difficult.", "Práctica terminada. Repite los intercambios que te resultaron difíciles."),
  restart: lstr("Rejouer la mise en situation", "Replay the roleplay", "Repetir la situación"),
};

const primary = "rounded-xl bg-[#0F6E56] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45";
const secondary = "rounded-xl border border-[#0F6E56]/20 bg-white px-3 py-2 text-sm font-semibold text-[#0F6E56] disabled:cursor-not-allowed disabled:opacity-45";

/** A compact, local-only listening exercise. It never records or scores speech. */
export function YoArrivalListeningLesson({ sceneId, locale }: { sceneId: ArrivalSceneId; locale: YoLocale }) {
  const scene = arrivalListeningScenes[sceneId];
  const instanceId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const runRef = useRef(0);
  const cancelClipRef = useRef<(() => void) | null>(null);
  const lastPlayRef = useRef<{ ids: string[]; onComplete?: () => void } | null>(null);
  const rateRef = useRef(1);
  const pendingFocusRef = useRef<FocusTarget | null>(null);
  const focusTargetsRef = useRef<Partial<Record<FocusTarget, HTMLElement | null>>>({});
  const [focusRequest, setFocusRequest] = useState(0);
  const [stage, setStage] = useState<Stage>("listen");
  const [playback, setPlayback] = useState<Playback>("idle");
  const [audioError, setAudioError] = useState(false);
  const [rate, setRate] = useState(1);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [transcriptIndex, setTranscriptIndex] = useState(0);
  const [roleplayIndex, setRoleplayIndex] = useState(0);
  const [roleplayPhase, setRoleplayPhase] = useState<RoleplayPhase>("ready");
  const [showPrompt, setShowPrompt] = useState(false);
  const [roleplayFinished, setRoleplayFinished] = useState(false);
  const allLines = [...scene.lines, ...scene.practiceLines];
  const question = scene.questions[questionIndex];
  const turn = scene.roleplay[roleplayIndex];
  const selected = responses[question.id];
  const line = scene.lines[transcriptIndex];
  const text = (key: keyof Omit<typeof COPY, "stages">) => t(COPY[key], locale);

  // Only explicit learner transitions request focus. Media completion, locale
  // changes and initial rendering must leave the learner's focus untouched.
  // Each request has its own render token, including same-stage transitions.
  useEffect(() => {
    const target = pendingFocusRef.current;
    pendingFocusRef.current = null;
    if (!target) return;
    const root = rootRef.current;
    const host = root?.closest("[data-yo-lesson-deck-screen-host-id]");
    if (!root || document.visibilityState === "hidden" ||
      host?.getAttribute("data-yo-lesson-deck-screen-host-active") === "false" ||
      root.closest('[hidden], [inert], [aria-hidden="true"]')) return;
    focusTargetsRef.current[target]?.focus();
  }, [focusRequest]);

  function requestFocus(target: FocusTarget) {
    pendingFocusRef.current = target;
    setFocusRequest((request) => request + 1);
  }

  const stopPlayback = useCallback((updateUI = true) => {
    runRef.current += 1;
    cancelClipRef.current?.();
    cancelClipRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (updateUI) {
      setPlayback("idle");
      setRoleplayPhase((current) => current === "listening" ? "ready" : current);
    }
  }, []);

  // Classic deck screens stay mounted when hidden. Stop on the actual host
  // attribute as well as on page visibility, sibling playback and unmount.
  useEffect(() => {
    const host = rootRef.current?.closest("[data-yo-lesson-deck-screen-host-id]");
    const checkHost = () => {
      if (host?.getAttribute("data-yo-lesson-deck-screen-host-active") === "false") stopPlayback();
    };
    const observer = host ? new MutationObserver(checkHost) : null;
    if (host) observer?.observe(host, { attributes: true, attributeFilter: ["data-yo-lesson-deck-screen-host-active"] });
    const onVisibility = () => { if (document.visibilityState === "hidden") stopPlayback(); };
    const onSibling = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== instanceId) stopPlayback();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(PLAYBACK_EVENT, onSibling);
    const onLessonStop = () => stopPlayback();
    window.addEventListener("yo-audio-stop", onLessonStop);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(PLAYBACK_EVENT, onSibling);
      window.removeEventListener("yo-audio-stop", onLessonStop);
      stopPlayback(false);
      audioRef.current = null;
    };
  }, [instanceId, stopPlayback]);

  async function playLines(ids: string[], onComplete?: () => void) {
    if (!scene.audioReady) return;
    const host = rootRef.current?.closest("[data-yo-lesson-deck-screen-host-id]");
    if (document.visibilityState === "hidden" || host?.getAttribute("data-yo-lesson-deck-screen-host-active") === "false") return;
    stopPlayback();
    const run = runRef.current;
    lastPlayRef.current = { ids, onComplete };
    setAudioError(false);
    if (onComplete) setRoleplayPhase("listening");
    window.dispatchEvent(new CustomEvent(PLAYBACK_EVENT, { detail: instanceId }));
    try {
      const audio = audioRef.current ?? new window.Audio();
      audioRef.current = audio;
      audio.preload = "none";
      audio.preservesPitch = true;
      for (const id of ids) {
        if (run !== runRef.current) return;
        const spokenLine = allLines.find((candidate) => candidate.id === id);
        if (!spokenLine) throw new Error("Unknown dialogue line");
        audio.src = spokenLine.audioSrc;
        audio.playbackRate = rateRef.current;
        setPlayback("loading");
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const settle = (error?: Error) => {
            if (settled) return;
            settled = true;
            audio.removeEventListener("ended", onEnded);
            audio.removeEventListener("error", onError);
            cancelClipRef.current = null;
            if (error) reject(error); else resolve();
          };
          const onEnded = () => settle();
          const onError = () => settle(new Error("Audio unavailable"));
          cancelClipRef.current = () => settle();
          audio.addEventListener("ended", onEnded);
          audio.addEventListener("error", onError);
          try {
            Promise.resolve(audio.play()).then(() => {
              if (run === runRef.current && !settled) setPlayback("playing");
            }).catch(() => settle(new Error("Playback rejected")));
          } catch {
            settle(new Error("Playback unavailable"));
          }
        });
      }
      if (run === runRef.current) {
        setPlayback("idle");
        onComplete?.();
      }
    } catch {
      if (run === runRef.current) {
        audioRef.current?.pause();
        setPlayback("idle");
        setAudioError(true);
        setRoleplayPhase((current) => current === "listening" ? "ready" : current);
      }
    }
  }

  function changeStage(next: Stage, moveFocus = false) {
    stopPlayback();
    lastPlayRef.current = null;
    setAudioError(false);
    if (moveFocus) {
      const target = next === "questions" ? "question" : next === "transcript" ? "transcript" :
        next === "roleplay" ? roleplayFinished ? "finished" : "turn" : null;
      if (target) requestFocus(target);
    }
    setStage(next);
  }
  function changeItem(update: () => void, focusTarget?: FocusTarget) {
    stopPlayback();
    lastPlayRef.current = null;
    setAudioError(false);
    if (focusTarget) requestFocus(focusTarget);
    update();
  }
  function changeRate(value: number) {
    rateRef.current = value;
    setRate(value);
    if (audioRef.current) audioRef.current.playbackRate = value;
  }
  function moveTurn(index: number) {
    stopPlayback();
    lastPlayRef.current = null;
    setAudioError(false);
    setRoleplayIndex(index);
    setRoleplayPhase("ready");
    setShowPrompt(false);
    setRoleplayFinished(false);
    requestFocus("turn");
  }
  function beginResponse() {
    if (turn.promptLineIds.length === 0) {
      changeItem(() => setRoleplayPhase("respond"));
      return;
    }
    void playLines(turn.promptLineIds, () => setRoleplayPhase("respond"));
  }

  return (
    <div ref={rootRef} data-testid={`arrival-lesson-${sceneId}`} data-yo-arrival-listening={sceneId} data-no-deck-swipe data-no-deck-tap className="mt-3 space-y-3">
      <p className="text-sm leading-relaxed text-[#0F6E56]/80">{t(scene.scenario, locale)}</p>
      <p className="rounded-xl bg-[#DDF4F1]/65 px-3 py-2 text-sm text-[#0F6E56]"><strong>{text("goal")} : </strong>{t(scene.goal, locale)}</p>
      <nav aria-label={text("navigation")} className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        {STAGES.map((item, index) => <button key={item} type="button" onClick={() => changeStage(item)} aria-current={stage === item ? "step" : undefined} className={`min-w-0 rounded-lg px-1 py-2 text-xs font-bold ${stage === item ? "bg-[#0F6E56] text-white" : "bg-[#F4FBF9] text-[#0F6E56]"}`}>
          {index + 1} · {t(COPY.stages[item], locale)}
        </button>)}
      </nav>

      {!scene.audioReady ? <div role="status" className="rounded-xl border border-[#E7DFCF] bg-[#FFF8E7] p-3 text-sm text-[#6B552B]">
        <p className="font-bold">{text("pending")}</p><p className="mt-1">{text("pendingHint")}</p>
      </div> : <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label={text("speed")} className="flex gap-1">
          <button type="button" aria-pressed={rate === 1} onClick={() => changeRate(1)} className={secondary}>{text("normal")}</button>
          <button type="button" aria-pressed={rate === 0.8} onClick={() => changeRate(0.8)} className={secondary}>{text("slow")}</button>
        </div>
        {playback !== "idle" ? <button type="button" onClick={() => stopPlayback()} className={secondary}>{text("stop")}</button> : null}
      </div>}
      {scene.audioReady ? <p className="text-xs text-[#566073]">{text("synthetic")}</p> : null}
      <p role="status" aria-live="polite" className={playback === "idle" ? "sr-only" : "text-xs text-[#0F6E56]/70"}>{playback === "loading" ? text("loading") : playback === "playing" ? text("playing") : ""}</p>
      {audioError ? <div role="alert" className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        <p>{text("error")}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { const request = lastPlayRef.current; if (request) void playLines(request.ids, request.onComplete); }} className={secondary}>{text("retryAudio")}</button>
          <button type="button" onClick={() => changeStage("transcript", true)} className={secondary}>{text("transcript")}</button>
        </div>
      </div> : null}

      {stage === "listen" ? <div className="space-y-3" data-testid="arrival-listen">
        <p className="text-sm text-[#566073]">{text("listenHint")}</p>
        <button type="button" disabled={!scene.audioReady} onClick={() => void playLines(scene.lines.map((item) => item.id))} className={primary}>{text("play")}</button>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => changeStage("questions", true)} className={secondary}>{text("check")}</button>
          <button type="button" onClick={() => changeStage("transcript", true)} className={secondary}>{text("transcript")}</button>
        </div>
      </div> : null}

      {stage === "questions" ? <div className="space-y-3" data-testid="arrival-questions">
        <p className="text-xs font-semibold text-[#566073]">{questionIndex + 1} / {scene.questions.length} · {text("questionHint")}</p>
        <h3 ref={(node) => { focusTargetsRef.current.question = node; }} tabIndex={-1} aria-live="polite" className="font-bold text-[#0F6E56]">{t(question.prompt, locale)}</h3>
        <button type="button" disabled={!scene.audioReady} onClick={() => void playLines([question.replayLineId])} className={secondary}>{text("replay")}</button>
        <div className="grid gap-2">
          {question.options.map((option) => <button key={option.id} type="button" lang="es" aria-pressed={selected === option.id} disabled={Boolean(selected)} onClick={() => { requestFocus("feedback"); setResponses((current) => ({ ...current, [question.id]: option.id })); }} className={`${secondary} text-left ${selected === option.id ? "ring-2 ring-[#0F6E56]" : ""}`}>{option.target}</button>)}
        </div>
        {selected ? <div role="status" className="space-y-2 rounded-xl bg-[#F4FBF9] p-3 text-sm text-[#0F6E56]">
          <h4 ref={(node) => { focusTargetsRef.current.feedback = node; }} tabIndex={-1} className="font-bold">{selected === question.correctOptionId ? text("correct") : text("incorrect")}</h4>
          <p>{t(question.feedback, locale)}</p>
          <button type="button" onClick={() => { requestFocus("question"); setResponses((current) => { const next = { ...current }; delete next[question.id]; return next; }); }} className={secondary}>{text("tryAgain")}</button>
        </div> : null}
        <div className="flex flex-wrap gap-2">
          {questionIndex > 0 ? <button type="button" onClick={() => changeItem(() => setQuestionIndex(questionIndex - 1), "question")} className={secondary}>{text("previousQuestion")}</button> : null}
          {selected && questionIndex < scene.questions.length - 1 ? <button type="button" onClick={() => changeItem(() => setQuestionIndex(questionIndex + 1), "question")} className={primary}>{text("nextQuestion")}</button> : null}
          <button type="button" onClick={() => changeStage("transcript", true)} className={secondary}>{text("reviewDialogue")}</button>
        </div>
      </div> : null}

      {stage === "transcript" ? <div className="space-y-3" data-testid="arrival-transcript">
        <h3 ref={(node) => { focusTargetsRef.current.transcript = node; }} tabIndex={-1} className="text-xs font-semibold text-[#566073]">{transcriptIndex + 1} / {scene.lines.length} · {t(line.speaker, locale)}</h3>
        <div className="space-y-2 rounded-xl border border-[#DDF4F1] bg-white p-3">
          <p lang="es" className="text-lg font-semibold text-[#0F6E56]">{line.target}</p>
          {locale !== "es" ? <p className="text-sm text-[#566073]">{t(line.translation, locale)}</p> : null}
          <button type="button" disabled={!scene.audioReady} onClick={() => void playLines([line.id])} className={secondary}>{text("playLine")}</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={transcriptIndex === 0} onClick={() => changeItem(() => setTranscriptIndex(transcriptIndex - 1))} className={secondary}>{text("previousLine")}</button>
          <button type="button" disabled={transcriptIndex === scene.lines.length - 1} onClick={() => changeItem(() => setTranscriptIndex(transcriptIndex + 1))} className={secondary}>{text("nextLine")}</button>
        </div>
        <details className="rounded-xl bg-[#F4FBF9] p-3 text-sm text-[#0F6E56]">
          <summary className="cursor-pointer font-bold">{text("phrases")}</summary>
          <ul className="mt-2 space-y-2">{scene.phrases.map((phrase) => <li key={phrase.id}><p lang="es" className="font-semibold">{phrase.target}</p>{locale !== "es" ? <p className="text-[#566073]">{t(phrase.translation, locale)}</p> : null}</li>)}</ul>
        </details>
        <button type="button" onClick={() => changeStage("roleplay", true)} className={primary}>{text("startRoleplay")}</button>
      </div> : null}

      {stage === "roleplay" ? <div className="space-y-3" data-testid="arrival-roleplay">
        {roleplayFinished ? <>
          <p ref={(node) => { focusTargetsRef.current.finished = node; }} tabIndex={-1} role="status" className="rounded-xl bg-[#DDF4F1]/65 p-3 font-semibold text-[#0F6E56]">{text("finished")}</p>
          <button type="button" onClick={() => moveTurn(0)} className={secondary}>{text("restart")}</button>
        </> : <>
          <p className="text-xs text-[#566073]">{roleplayIndex + 1} / {scene.roleplay.length} · {text("roleplayHint")}</p>
          <h3 ref={(node) => { focusTargetsRef.current.turn = node; }} tabIndex={-1} className="font-semibold text-[#0F6E56]">{t(turn.instruction, locale)}</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={turn.promptLineIds.length > 0 && !scene.audioReady} onClick={beginResponse} className={primary}>{turn.promptLineIds.length > 0 ? text("prompt") : text("ready")}</button>
            {turn.promptLineIds.length > 0 ? <button type="button" onClick={() => changeItem(() => { setShowPrompt(true); setRoleplayPhase("respond"); })} className={secondary}>{text("readPrompt")}</button> : null}
          </div>
          {showPrompt ? <div className="space-y-1 rounded-xl bg-[#F4FBF9] p-3">{turn.promptLineIds.map((id) => <p key={id} lang="es" className="text-sm font-semibold text-[#0F6E56]">{allLines.find((item) => item.id === id)?.target}</p>)}</div> : null}
          {roleplayPhase === "respond" ? <div className="space-y-3 rounded-xl border border-[#DDF4F1] p-3">
            <p role="status" className="text-sm text-[#0F6E56]">{text("yourTurn")}</p>
            <button type="button" onClick={() => changeItem(() => setRoleplayPhase("model"), "model")} className={secondary}>{text("revealModel")}</button>
          </div> : null}
          {roleplayPhase === "model" ? <div data-testid="arrival-roleplay-model" className="space-y-2 rounded-xl bg-[#DDF4F1]/65 p-3">
            <h3 ref={(node) => { focusTargetsRef.current.model = node; }} tabIndex={-1} className="text-xs font-bold uppercase tracking-wide text-[#0F6E56]/70">{text("model")}</h3>
            {turn.modelLineIds.map((id) => { const model = allLines.find((item) => item.id === id)!; return <div key={id}><p lang="es" className="font-semibold text-[#0F6E56]">{model.target}</p>{locale !== "es" ? <p className="text-sm text-[#566073]">{t(model.translation, locale)}</p> : null}</div>; })}
            <button type="button" disabled={!scene.audioReady} onClick={() => void playLines(turn.modelLineIds)} className={secondary}>{text("playModel")}</button>
          </div> : null}
          <div className="flex flex-wrap gap-2">
            {roleplayIndex > 0 ? <button type="button" onClick={() => moveTurn(roleplayIndex - 1)} className={secondary}>{text("previousTurn")}</button> : null}
            {roleplayPhase === "model" ? <button type="button" onClick={() => { if (roleplayIndex < scene.roleplay.length - 1) moveTurn(roleplayIndex + 1); else changeItem(() => setRoleplayFinished(true), "finished"); }} className={primary}>{roleplayIndex < scene.roleplay.length - 1 ? text("nextTurn") : text("finish")}</button> : null}
          </div>
        </>}
      </div> : null}
    </div>
  );
}
