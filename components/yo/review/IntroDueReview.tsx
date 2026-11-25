"use client";

import { useMemo, useState } from "react";
import type { YoLocale } from "@/lib/yo/types";
import type { Exercise, IntroCourse } from "@/lib/yo/shared/types";
import { emptyDraft } from "@/lib/yo/shared/state";
import { introReviewItems } from "@/lib/yo/review/intro";
import { IntroQuestion } from "../shared/IntroQuestion";
import { YoDueReviewPanel, type ReviewExerciseActions } from "./YoDueReviewPanel";

function ReviewQuestion({ course, locale, audio, exercise, actions }: {
  course: IntroCourse; locale: YoLocale; audio: Record<string, string>; exercise: Exercise; actions: ReviewExerciseActions;
}) {
  const [draft, setDraft] = useState(emptyDraft);
  return <IntroQuestion course={course} locale={locale} audio={audio} exercise={exercise} value={draft} onChange={setDraft} onAttempt={actions.onAttempt} onContinue={actions.onContinue} />;
}

export function IntroDueReview({ course, locale, audio }: { course: IntroCourse; locale: YoLocale; audio: Record<string, string> }) {
  const items = useMemo(() => introReviewItems(course), [course]);
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  return <YoDueReviewPanel key={course.language} language={course.language} locale={locale} itemIds={ids} renderExercise={(id, actions) => {
    const item = items.find((candidate) => candidate.id === id);
    return item ? <ReviewQuestion key={id} course={course} locale={locale} audio={audio} exercise={item.exercise} actions={actions} /> : null;
  }} />;
}
