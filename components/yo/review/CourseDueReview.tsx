"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { YoLocale } from "@/lib/yo/types";
import type { CourseCatalog } from "@/lib/yo/italian/course/courseTypes";
import type { TextCourseLanguage } from "@/lib/yo/foundations/experience";
import { courseReviewIds } from "@/lib/yo/review/courseRegistry";
import { loadCourseReviewContent, type CourseReviewContent } from "@/lib/yo/review/courseContent";
import { ItalianGame } from "../italian/ItalianGames";
import { ItalianAudioProvider } from "../italian/ItalianAudioProvider";
import { YoDueReviewPanel, type ReviewExerciseActions } from "./YoDueReviewPanel";
import { useReviewQueue } from "./useReviewQueue";

function DueExercise({ language, locale, id, actions }: {
  language: TextCourseLanguage; locale: YoLocale; id: string; actions: ReviewExerciseActions;
}) {
  const [content, setContent] = useState<CourseReviewContent | null>(null);
  const [failed, setFailed] = useState(false), [reload, setReload] = useState(0), [done, setDone] = useState(false);
  const assisted = useRef(false), solved = useRef(false);
  const say = (fr: string, en: string, es: string) => ({ fr, en, es })[locale];
  useEffect(() => {
    let active = true;
    void loadCourseReviewContent(language, id).then(value => { if (active) { setContent(value); setFailed(false); } })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [language, id, reload]);
  if (failed) return <div role="status"><p>{say("Cette révision n’a pas pu être chargée. Ta progression reste enregistrée.", "This review could not load. Your progress is still saved.", "No se pudo cargar este repaso. Tu progreso sigue guardado.")}</p><button type="button" className="mt-3 min-h-11 underline" onClick={() => { setFailed(false); setReload(value => value + 1); }}>{say("Réessayer", "Try again", "Reintentar")}</button></div>;
  if (!content) return <p role="status">{say("Chargement de la phrase…", "Loading the phrase…", "Cargando la frase…")}</p>;
  return <ItalianAudioProvider language={language} paths={content.audioPaths}>
    <h4 className="mb-4 text-lg font-bold">{content.activity.prompt[locale]}</h4>
    <ItalianGame activity={content.activity} locale={locale} onHelp={() => { if (!solved.current) assisted.current = true; }} onAttempt={correct => {
      if (solved.current) return;
      actions.onAttempt({ correct, assisted: assisted.current });
      if (correct) { solved.current = true; setDone(true); } else assisted.current = true;
    }}/>
    {done && <button type="button" className="mt-5 min-h-12 rounded-2xl bg-emerald-900 px-5 py-3 font-semibold text-white" onClick={actions.onContinue}>{say("Continuer", "Continue", "Continuar")}</button>}
  </ItalianAudioProvider>;
}

/** Optional targeted practice; never calls the course's progress, XP or checkpoint writers. */
export function CourseDueReview({ language, locale, catalog }: { language: TextCourseLanguage; locale: YoLocale; catalog: CourseCatalog }) {
  const ids = useMemo(() => courseReviewIds(catalog), [catalog]);
  const queue = useReviewQueue(language, ids);
  if (!queue.ready || !queue.total) return null;
  return <YoDueReviewPanel language={language} locale={locale} itemIds={ids}
    renderExercise={(id, actions) => <DueExercise key={`${language}:${id}`} language={language} locale={locale} id={id} actions={actions}/>}/>;
}
