"use client";

import { useEffect, useRef, useState } from "react";
import type { YoLocale } from "@/lib/yo/types";
import type { JapaneseActivity } from "@/lib/yo/japaneseCourseTypes";
import type { Exercise } from "@/lib/yo/mandarin/types";
import { initialAttempt, checkAnswer } from "@/lib/yo/mandarin/progress";
import { loadEasternReviewContent, type EasternReviewContent } from "@/lib/yo/review/easternContent";
import { JapaneseActivityPanel, initialJapaneseActivityState } from "../japanese/JapaneseActivityPanel";
import { MandarinExercise } from "../mandarin/MandarinExercise";
import { YoDueReviewPanel, type ReviewExerciseActions } from "./YoDueReviewPanel";
import { useReviewQueue } from "./useReviewQueue";

function ContinueReview({ locale, actions }: { locale: YoLocale; actions: ReviewExerciseActions }) {
  return <button type="button" className="mt-5 min-h-12 rounded-2xl bg-emerald-900 px-5 py-3 font-semibold text-white" onClick={actions.onContinue}>{{ fr: "Continuer", en: "Continue", es: "Continuar" }[locale]}</button>;
}
function JapaneseReview({ activity, locale, actions }: { activity: JapaneseActivity; locale: YoLocale; actions: ReviewExerciseActions }) {
  const [draft, setDraft] = useState(() => initialJapaneseActivityState(activity));
  const assisted = useRef(false);
  return <><JapaneseActivityPanel activity={activity} locale={locale} state={draft}
    onChange={value => setDraft({ ...value, assisted: value.assisted || assisted.current })}
    onResult={(correct, helped) => {
      actions.onAttempt({ correct, assisted: helped || assisted.current });
      if (!correct || helped) assisted.current = true;
    }}/>{draft.checked && draft.correct && <ContinueReview locale={locale} actions={actions}/>}</>;
}
function MandarinReview({ exercise, locale, actions }: { exercise: Exercise; locale: YoLocale; actions: ReviewExerciseActions }) {
  const [draft, setDraft] = useState(() => initialAttempt(exercise));
  const assisted = useRef(false);
  return <><MandarinExercise exercise={exercise} locale={locale} state={draft} pinyin={false}
    onChange={value => setDraft({ ...value, assisted: value.assisted || assisted.current })}
    onResult={() => {
      const correct = checkAnswer(exercise, draft.answer);
      actions.onAttempt({ correct, assisted: draft.assisted || assisted.current });
      if (!correct || draft.assisted) assisted.current = true;
    }}/>{draft.checked && draft.correct && <ContinueReview locale={locale} actions={actions}/>}</>;
}

function DueExercise({ language, locale, id, actions }: {
  language: "ja" | "zh"; locale: YoLocale; id: string; actions: ReviewExerciseActions;
}) {
  const [content, setContent] = useState<EasternReviewContent | null>(null);
  const [failed, setFailed] = useState(false), [retry, setRetry] = useState(0);
  const say = (fr: string, en: string, es: string) => ({ fr, en, es })[locale];
  useEffect(() => {
    let active = true;
    void loadEasternReviewContent(language, id).then(item => { if (active) { setContent(item); setFailed(false); } })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [language, id, retry]);
  if (failed) return <div role="status"><p>{say("Cette révision n’a pas pu être chargée. Ta progression reste enregistrée.", "This review could not load. Your progress is still saved.", "No se pudo cargar este repaso. Tu progreso sigue guardado.")}</p><button type="button" className="mt-3 min-h-11 underline" onClick={() => { setFailed(false); setRetry(value => value + 1); }}>{say("Réessayer", "Try again", "Reintentar")}</button></div>;
  if (!content) return <p role="status">{say("Chargement de la phrase…", "Loading the phrase…", "Cargando la frase…")}</p>;
  return content.language === "ja" ? <JapaneseReview activity={content.activity} locale={locale} actions={actions}/>
    : <MandarinReview exercise={content.exercise} locale={locale} actions={actions}/>;
}

/** Original language checkers, with a small server-authored ID list and isolated outcomes. */
export function EasternDueReview({ language, locale, itemIds }: {
  language: "ja" | "zh"; locale: YoLocale; itemIds: readonly string[];
}) {
  const queue = useReviewQueue(language, itemIds);
  if (!queue.ready || !queue.total) return null;
  return <YoDueReviewPanel language={language} locale={locale} itemIds={itemIds}
    renderExercise={(id, actions) => <DueExercise key={`${language}:${id}`} language={language} locale={locale} id={id} actions={actions}/>}/>;
}
