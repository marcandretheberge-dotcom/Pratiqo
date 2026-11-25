"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { YoLocale } from "@/lib/yo/types";
import type { JapaneseActivity } from "@/lib/yo/japaneseCourseTypes";
import type { Exercise } from "@/lib/yo/mandarin/types";
import { initialAttempt, checkAnswer } from "@/lib/yo/mandarin/progress";
import { loadEasternReviews, type EasternReviewContent } from "@/lib/yo/review/easternContent";
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

/** Reuses each language's real checker and input controls, without changing course outcomes. */
export function EasternDueReview({ language, locale }: { language: "ja" | "zh"; locale: YoLocale }) {
  const queue = useReviewQueue(language);
  const [content, setContent] = useState<{ language: string; items: Record<string, EasternReviewContent> } | null>(null);
  const [failed, setFailed] = useState(false), [retry, setRetry] = useState(0);
  const needed = queue.total > 0;
  useEffect(() => {
    if (!needed) return;
    let active = true;
    void loadEasternReviews(language).then(items => { if (active) { setContent({ language, items }); setFailed(false); } })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [language, needed, retry]);
  const items = content?.language === language ? content.items : null;
  const ids = useMemo(() => Object.keys(items ?? {}), [items]);
  const courseQueue = useReviewQueue(language, ids);
  if (!needed) return null;
  if (failed) return <p role="status" className="my-4 text-sm"><button type="button" className="min-h-11 underline" onClick={() => { setFailed(false); setRetry(value => value + 1); }}>{{ fr: "Recharger les révisions", en: "Reload reviews", es: "Recargar los repasos" }[locale]}</button></p>;
  if (!items || !courseQueue.total) return null;
  return <YoDueReviewPanel language={language} locale={locale} itemIds={ids} renderExercise={(id, actions) => {
    const content = items[id];
    return content?.language === "ja" ? <JapaneseReview key={id} activity={content.activity} locale={locale} actions={actions}/>
      : content?.language === "zh" ? <MandarinReview key={id} exercise={content.exercise} locale={locale} actions={actions}/> : null;
  }}/>;
}
