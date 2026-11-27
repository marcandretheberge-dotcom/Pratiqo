"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, ExternalLink } from "lucide-react";
import type { CourseLesson } from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";
import { interestLabels, type InterestId } from "@/lib/yo/interests/preferences";
import { italianInterestVideo } from "@/lib/yo/italian/interests/media";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { beginLessonAudio } from "@/lib/yo/audio/lessonAudioActivity";
import { LearningAudio } from "../../personalized/LearningAudio";
import { t } from "@/lib/yo/italian/course/courseAuthoring";

export function ItalianInterestDiscovery({ lesson, locale, paused }: { lesson: CourseLesson; locale: YoLocale; paused: boolean }) {
  const [translation, setTranslation] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const startingVideo = useRef(false);
  const releaseAudio = useRef<(() => void) | null>(null);
  const discovery = lesson.discovery!;
  const media = italianInterestVideo(lesson.id);
  const say = (fr: string, en: string, es: string) => t(fr, en, es)[locale];
  useEffect(() => {
    const pause = () => { if (!startingVideo.current) video.current?.pause(); };
    const hidden = () => { if (document.hidden) pause(); };
    const events = ["yo-italian-audio-stop", "yo-speech-start", "yo-cinema-open", "pagehide"];
    events.forEach(name => window.addEventListener(name, pause));
    document.addEventListener("visibilitychange", hidden);
    return () => { events.forEach(name => window.removeEventListener(name, pause)); document.removeEventListener("visibilitychange", hidden); pause(); releaseAudio.current?.(); releaseAudio.current = null; };
  }, []);
  useEffect(() => { if (paused) video.current?.pause(); }, [paused]);
  return <section data-interest-discovery={discovery.interest} className="space-y-5">
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-800"><BookOpen size={16} aria-hidden />{interestLabels[discovery.interest as InterestId]?.[locale] ?? discovery.interest}</div>
    <h2 className="text-xl font-bold leading-8 text-emerald-950">{discovery.question[locale]}</h2>
    {media ? <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-950">
      <video ref={video} controls playsInline preload="none" poster={media.poster} aria-label={lesson.title[locale]} className="aspect-video w-full" onError={() => { setMediaError(true); releaseAudio.current?.(); releaseAudio.current = null; }} onPlay={() => { startingVideo.current = true; stopLessonAudio(); startingVideo.current = false; releaseAudio.current?.(); releaseAudio.current = beginLessonAudio(); }} onPause={() => { releaseAudio.current?.(); releaseAudio.current = null; }} onEnded={() => { releaseAudio.current?.(); releaseAudio.current = null; }}>
        <source src={media.src} type="video/mp4" />
        <track kind="captions" src={media.captions} srcLang="it" label="Italiano" default />
      </video>
      <p className="px-4 py-3 text-xs leading-5 text-emerald-50">{say("Capsule pédagogique illustrée · narration de synthèse en italien. Transcription intégrale ci-dessous.", "Illustrated learning video · Italian synthetic narration. Full transcript below.", "Vídeo didáctico ilustrado · narración sintética en italiano. Transcripción completa abajo.")}</p>
      {mediaError ? <p role="status" className="px-4 pb-3 text-sm text-white">{say("La vidéo ne se charge pas. L’écoute et le texte restent disponibles.", "The video could not load. You can still use the audio and text.", "No se pudo cargar el vídeo. El audio y el texto siguen disponibles.")}</p> : null}
    </div> : null}
    <LearningAudio text={lesson.reading.it} locale={locale} label={say("Écouter la découverte", "Listen to the discovery", "Escuchar el descubrimiento")} />
    <p lang="it" className="whitespace-pre-line text-xl leading-9">{lesson.reading.it}</p>
    <button type="button" className="min-h-11 rounded-xl border border-stone-300 px-4 py-2 text-sm font-bold text-emerald-900" aria-expanded={translation} onClick={() => setTranslation(!translation)}>{translation ? say("Masquer la traduction", "Hide translation", "Ocultar traducción") : say("Afficher la traduction", "Show translation", "Mostrar traducción")}</button>
    {translation ? <p className="whitespace-pre-line rounded-2xl bg-stone-50 p-4 text-sm leading-7">{lesson.reading.meaning[locale]}</p> : null}
    <details className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
      <summary className="min-h-7 cursor-pointer font-bold text-emerald-950">{say("Ce que cette découverte nous apprend", "What this discovery teaches us", "Lo que nos enseña este descubrimiento")}</summary>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">{discovery.takeaways.map((item, index) => <li key={index}>{item[locale]}</li>)}</ul>
    </details>
    <details className="border-t border-stone-200 pt-4 text-sm leading-6">
      <summary className="cursor-pointer font-semibold text-stone-600">{say("D’où viennent les faits ?", "Where do the facts come from?", "¿De dónde vienen los datos?")}</summary>
      <p className="mt-3 text-stone-600">{discovery.authorship[locale]}</p>
      <ul className="mt-3 space-y-3">{discovery.sources.map(source => <li key={source.id}>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-emerald-900 underline">{source.publisher} · {source.title}<ExternalLink size={13} aria-hidden /></a>
        <p className="text-xs text-stone-600">{source.supports[locale]}</p>
      </li>)}</ul>
    </details>
  </section>;
}
