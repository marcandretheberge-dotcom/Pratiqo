"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Mic, Square, Copy, Check, ArrowUpRight } from "lucide-react";
import type { CourseLesson } from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";
import { t } from "@/lib/yo/italian/course/courseAuthoring";
import { interestLabels, type InterestId } from "@/lib/yo/interests/preferences";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-900 disabled:opacity-50";

/** Private rehearsal, deliberately separate from scored learning evidence and XP. */
export function ItalianInterestProduction({ lesson, locale, resetAt, paused, teacherUrl }: { lesson: CourseLesson; locale: YoLocale; resetAt: number; paused: boolean; teacherUrl: string }) {
  const fieldId = useId();
  const key = `yo.italian.production.v1.${lesson.id}.${resetAt}`;
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(true);
  const [state, setState] = useState<"idle" | "requesting" | "recording">("idle");
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [includeDraft, setIncludeDraft] = useState(false);
  const recording = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const playback = useRef<HTMLAudioElement>(null);
  const startingPlayback = useRef(false);
  const say = (fr: string, en: string, es: string) => t(fr, en, es)[locale];
  const interest = interestLabels[lesson.discovery!.interest as InterestId]?.[locale] ?? "";
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setDraft((localStorage.getItem(key) ?? "").slice(0, 2000)); }
      catch { setSaved(false); }
    });
    return () => cancelAnimationFrame(frame);
  }, [key]);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => {
    function cancel() {
      generation.current++;
      clearTimeout(timer.current);
      if (recording.current?.state === "recording") recording.current.stop();
      recording.current = null;
      stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
      if (!startingPlayback.current) playback.current?.pause(); setState("idle");
    }
    const hidden = () => { if (document.hidden) cancel(); };
    const events = ["yo-cinema-open", "yo-speech-cancel", "pagehide"];
    events.forEach(name => window.addEventListener(name, cancel));
    document.addEventListener("visibilitychange", hidden);
    return () => { cancel(); events.forEach(name => window.removeEventListener(name, cancel)); document.removeEventListener("visibilitychange", hidden); };
  }, []);
  useEffect(() => {
    if (!paused) return;
    generation.current++;
    clearTimeout(timer.current);
    if (recording.current?.state === "recording") recording.current.stop();
    recording.current = null;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    playback.current?.pause();
    const frame = requestAnimationFrame(() => setState("idle"));
    return () => cancelAnimationFrame(frame);
  }, [paused]);
  function write(value: string) {
    setDraft(value); setCopied(false);
    try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); setSaved(true); }
    catch { setSaved(false); }
  }
  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(say("L’enregistrement n’est pas disponible ici. Tu peux pratiquer à voix haute ou écrire ta réponse.", "Recording is unavailable here. You can practise aloud or write your response.", "No se puede grabar aquí. Puedes practicar en voz alta o escribir tu respuesta.")); return;
    }
    stopLessonAudio(); playback.current?.pause();
    const request = ++generation.current;
    setState("requesting");
    try {
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (request !== generation.current) { microphone.getTracks().forEach(track => track.stop()); return; }
      stream.current = microphone;
      const recorder = new MediaRecorder(microphone), chunks: BlobPart[] = [];
      recording.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        microphone.getTracks().forEach(track => track.stop());
        if (request !== generation.current) return;
        clearTimeout(timer.current); recording.current = null; stream.current = null; setState("idle");
        if (chunks.length) setAudioUrl(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })));
      };
      recorder.onerror = () => {
        microphone.getTracks().forEach(track => track.stop());
        if (request !== generation.current) return;
        clearTimeout(timer.current); recording.current = null; stream.current = null; setState("idle");
        setError(say("L’enregistrement s’est interrompu. Tu peux réessayer.", "Recording stopped unexpectedly. You can try again.", "La grabación se interrumpió. Puedes intentarlo de nuevo."));
      };
      recorder.start(); setState("recording");
      timer.current = setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 45000);
    } catch {
      if (request !== generation.current) return;
      stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
      setState("idle"); setError(say("Le microphone n’est pas accessible. La pratique écrite et la suite du parcours restent disponibles.", "The microphone is unavailable. You can still write and continue the course.", "El micrófono no está disponible. Puedes escribir y continuar el curso."));
    }
  }
  const brief = [
    say("Mission de conversation · Italiano · Module 1", "Conversation mission · Italiano · Unit 1", "Misión de conversación · Italiano · Unidad 1"),
    interest, lesson.goal[locale], lesson.speaking.prompt[locale],
    lesson.speaking.checklist.map(item => `• ${item[locale]}`).join("\n"),
    say("Mots pratiqués", "Practised words", "Palabras practicadas") + ": " + lesson.vocabulary.slice(0, 8).map(item => item.it).join(" · "),
    ...(includeDraft && draft.trim() ? [say("Mon brouillon (non évalué)", "My draft (not assessed)", "Mi borrador (sin evaluar)"), draft] : []),
  ].filter(Boolean).join("\n\n");
  async function copyBrief() {
    try { await navigator.clipboard.writeText(brief); setCopied(true); }
    catch { setCopied(false); setError(say("Sélectionne le texte de la fiche pour le copier.", "Select the brief text to copy it.", "Selecciona el texto de la ficha para copiarlo.")); }
  }
  return <section className="space-y-5" data-interest-production={lesson.id}>
    <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{say("À toi de parler de ce monde", "Your turn to talk about this world", "Te toca hablar de este mundo")}</p>
    <h2 className="text-xl font-bold text-emerald-950">{lesson.speaking.prompt[locale]}</h2>
    <ul className="list-disc space-y-2 pl-5 text-sm leading-6">{lesson.speaking.checklist.map((item, index) => <li key={index}>{item[locale]}</li>)}</ul>
    <label htmlFor={fieldId} className="block text-sm font-bold">{say("Ton brouillon en italien", "Your Italian draft", "Tu borrador en italiano")}</label>
    <textarea id={fieldId} lang="it" rows={5} maxLength={2000} value={draft} onChange={event => write(event.target.value)} className="w-full resize-y rounded-2xl border border-stone-300 bg-white p-4 text-base leading-7 outline-offset-4" placeholder="Buongiorno! Mi chiamo…" />
    <p className="text-xs leading-5 text-stone-600" role="status">{saved ? say("Brouillon conservé sur cet appareil. Tu peux utiliser une identité imaginaire.", "Draft saved on this device. You can use an imaginary identity.", "Borrador guardado en este dispositivo. Puedes usar una identidad imaginaria.") : say("Le brouillon reste dans cette page : le stockage de l’appareil est indisponible.", "The draft stays on this page: device storage is unavailable.", "El borrador queda en esta página: el almacenamiento no está disponible.")}</p>
    <div className="rounded-2xl bg-emerald-50 p-4">
      <h3 className="font-bold">{say("Une répétition orale, si tu veux", "An optional speaking rehearsal", "Un ensayo oral, si quieres")}</h3>
      <p className="my-3 text-sm leading-6">{say("Vise environ 30 secondes. L’audio reste sur cette page, sans envoi ni évaluation automatique. Il disparaît quand tu quittes la leçon.", "Aim for about 30 seconds. Audio stays on this page, without upload or automatic assessment. It disappears when you leave the lesson.", "Intenta hablar unos 30 segundos. El audio queda en esta página, sin envío ni evaluación automática. Desaparece al salir de la lección.")}</p>
      {state === "recording" ? <button className={button} type="button" onClick={() => recording.current?.stop()}><Square size={16} aria-hidden />{say("Arrêter", "Stop", "Detener")}</button> : <button className={button} type="button" disabled={state === "requesting" || paused} onClick={() => void start()}><Mic size={17} aria-hidden />{state === "requesting" ? say("Ouverture du micro…", "Opening microphone…", "Abriendo micrófono…") : say("M’enregistrer", "Record myself", "Grabarme")}</button>}
      {state === "recording" ? <p role="status" className="mt-3 text-sm font-semibold">{say("Enregistrement en cours · arrêt automatique après 45 s", "Recording · stops automatically after 45 s", "Grabando · se detiene automáticamente a los 45 s")}</p> : null}
      {audioUrl && state === "idle" ? <div className="mt-4 space-y-3"><audio ref={playback} controls src={audioUrl} className="w-full" aria-label={say("Ma répétition", "My rehearsal", "Mi ensayo")} onPlay={() => { startingPlayback.current = true; stopLessonAudio(); startingPlayback.current = false; }} /><button type="button" className={button} onClick={() => setAudioUrl("")}>{say("Effacer l’audio", "Delete audio", "Borrar audio")}</button></div> : null}
    </div>
    {error ? <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p> : null}
    <details className="rounded-2xl border border-stone-200 bg-white p-4">
      <summary className="cursor-pointer font-bold text-emerald-950">{say("Préparer une séance avec un professeur (facultatif)", "Prepare a tutor session (optional)", "Preparar una clase con un profesor (opcional)")}</summary>
      <p className="mt-3 text-sm leading-6">{say("Voici la fiche que tu peux choisir de partager. Rien n’est envoyé automatiquement et aucune réservation n’est nécessaire pour continuer.", "Here is the brief you can choose to share. Nothing is sent automatically, and you can continue without a booking.", "Esta es la ficha que puedes compartir si quieres. No se envía nada automáticamente y puedes continuar sin reservar.")}</p>
      <label className="my-4 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={includeDraft} onChange={event => { setIncludeDraft(event.target.checked); setCopied(false); }} />{say("Ajouter mon brouillon à la fiche", "Include my draft in the brief", "Añadir mi borrador a la ficha")}</label>
      <pre className="whitespace-pre-wrap rounded-xl bg-stone-50 p-4 font-sans text-sm leading-6">{brief}</pre>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={button} onClick={() => void copyBrief()}>{copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{copied ? say("Fiche copiée", "Brief copied", "Ficha copiada") : say("Copier la fiche", "Copy brief", "Copiar ficha")}</button><a href={teacherUrl} className={button} target="_blank" rel="noopener noreferrer">{say("Voir les professeurs d’italien", "Browse Italian tutors", "Ver profesores de italiano")}<ArrowUpRight size={16} aria-hidden /></a></div>
    </details>
    <p className="text-xs leading-5 text-stone-500">{say("Cette étape est une pratique personnelle. Elle ne certifie pas un niveau et n’ajoute pas de XP.", "This is personal practice. It does not certify a level or award XP.", "Esta etapa es una práctica personal. No certifica un nivel ni otorga XP.")}</p>
  </section>;
}
