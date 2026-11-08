"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { VisualWord } from "@/lib/yo/personalized/types";
import { firstMeetingVisuals } from "@/lib/yo/personalized/firstMeeting";
import type { YoLocale } from "@/lib/yo/types";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { recallChoices, recallQueue, type RecallWord } from "@/lib/yo/learning/vocabularyPractice";
import { LearningAudio } from "./LearningAudio";
import { primary } from "../italian/guided/copy";
import { PracticeAdvanceNotice } from "../learning/PracticeAdvance";
import { RecallQuestion, freshRecall, type RecallDraft } from "../learning/RecallQuestion";

// The public component/step IDs stay stable; the discarded portrait exercise has a new draft schema.
export type VocabularyDraft = { version: 2; mode: "learn" | "check"; queue: number[]; at: number; study: boolean; done: boolean; answer: RecallDraft };
export function freshVocabulary(count: number, mode: VocabularyDraft["mode"] = "learn", seed = "italian"): VocabularyDraft {
  return { version: 2, mode, queue: recallQueue(count, seed, Math.min(3, count)), at: 0, study: true, done: false, answer: freshRecall() };
}
export function parseVocabulary(raw: string | null, words: VisualWord[]): VocabularyDraft | null {
  try {
    if (!raw || raw.length > 6000) return null;
    const v = JSON.parse(raw);
    // Old completed preparation remains completed. An obsolete unsubmitted picture choice is discarded,
    // without changing canonical lesson progress, points, stamps or any legacy storage value.
    if (v?.version === 1 && Array.isArray(v.queue) && v.queue.every((n: unknown) => Number.isInteger(n) && Number(n) >= 0 && Number(n) < words.length) && typeof v.done === "boolean") {
      return { ...freshVocabulary(words.length), study: !v.done, done: v.done };
    }
    const lessons = Object.values(firstMeetingVisuals);
    const knownLesson = lessons.findIndex(list => list.length === words.length && list.every((w, i) => w.id === words[i].id));
    const allowed = knownLesson < 0 ? words : lessons.slice(0, knownLesson + 1).flat();
    if (v?.version !== 2 || !["learn", "check"].includes(v.mode) || !Array.isArray(v.queue) || v.queue.length < 1 || v.queue.length > words.length * 3 ||
        !v.queue.every((n: unknown) => Number.isInteger(n) && Number(n) >= 0 && Number(n) < words.length) || !Number.isInteger(v.at) || v.at < 0 || v.at >= v.queue.length ||
        typeof v.study !== "boolean" || typeof v.done !== "boolean" || !v.answer || ![v.answer.checked, v.answer.correct, v.answer.heard, v.answer.transcript].every(x => typeof x === "boolean") ||
        !(v.answer.selected === null || allowed.some(w => w.id === v.answer.selected))) return null;
    // Older rounds intentionally repeated two identical targets. Preserve the
    // unique questions already answered, but never replay an identical target
    // just because a legacy queue contains it twice.
    const uniqueQueue: number[] = [...new Set(v.queue as number[])];
    const answeredUnique = new Set((v.queue as number[]).slice(0, v.at)).size;
    const done = v.done || answeredUnique >= uniqueQueue.length;
    const at = Math.min(answeredUnique, uniqueQueue.length - 1);
    return { ...v, queue: uniqueQueue, at, done,
      answer: (v.queue as number[])[v.at] === uniqueQueue[at] ? v.answer : freshRecall() } as VocabularyDraft;
  } catch { return null; }
}
export function VisualVocabulary({ words, lessonId, locale, onReady, resetAt = 0, paused = false }: {
  words: VisualWord[]; lessonId: string; locale: YoLocale; onReady: () => void; experienced?: boolean; resetAt?: number; paused?: boolean;
}) {
  const key = `yo.vocabulary-recall.v2.${lessonId}.${resetAt}`;
  const [draft, setDraft] = useState<VocabularyDraft | null>(null), [stored, setStored] = useState(true);
  const latest = useRef(draft), heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => { latest.current = draft; }, [draft]);
  useEffect(() => {
    const f = requestAnimationFrame(() => {
      let d = freshVocabulary(words.length, "learn", lessonId);
      try { d = parseVocabulary(localStorage.getItem(key), words) ?? parseVocabulary(localStorage.getItem(`yo.visual-vocabulary.v1.${lessonId}.${resetAt}`), words) ?? d; } catch { setStored(false); }
      latest.current = d; setDraft(d);
    });
    return () => cancelAnimationFrame(f);
  }, [key, words, lessonId, resetAt]);
  const say = (fr: string, en: string, es: string) => ({ fr, en, es })[locale];
  const asRecall = (w: VisualWord): RecallWord => ({ id: w.id, text: w.it, meaning: w.meaning, ...(/^age\d+$/.test(w.id) ? { number: w.id.slice(3) } : {}) });
  const targets = words.map(asRecall);
  const lessonIndex = Object.keys(firstMeetingVisuals).indexOf(lessonId);
  // The age lesson has only one non-number target. Previously taught expressions supply
  // meaningful distractors rather than a one-button "question" with an obvious answer.
  const choicePool = lessonIndex < 0 ? targets : Object.values(firstMeetingVisuals).slice(0, lessonIndex + 1).flat().map(asRecall);
  function save(d: VocabularyDraft) { latest.current = d; setDraft(d); try { localStorage.setItem(key, JSON.stringify(d)); } catch { setStored(false); } }
  function next() {
    const d = latest.current;
    if (!d || !d.answer.checked || !d.answer.correct) return;
    stopLessonAudio();
    if (d.at + 1 === d.queue.length) { save({ ...d, done: true }); return; }
    save({ ...d, at: d.at + 1, answer: freshRecall() });
    requestAnimationFrame(() => heading.current?.focus());
  }
  if (!draft) return <p role="status">{say("Préparation…", "Preparing…", "Preparando…")}</p>;
  if (draft.done) return <section data-visual-ready><h2 className="text-2xl font-bold">{say("Prêt pour la rencontre !", "Ready for the conversation!", "¡Todo listo para el encuentro!")}</h2><button type="button" className={`${primary} mt-5 w-full`} onClick={onReady}>{say("Entrer dans la mission", "Enter the mission", "Entrar en la misión")}</button></section>;
  if (draft.study) return <section data-vocabulary-study><h2 className="text-2xl font-bold">{say("Les expressions avant la mission", "Expressions before the mission", "Expresiones antes de la misión")}</h2>
    <PracticeAdvanceNotice locale={locale}/><div className="space-y-4">{targets.map(w => <div key={w.id} className="border-b border-stone-200 pb-3"><p lang="it" className="text-lg font-semibold">{w.text}</p><p className="my-2 text-stone-600">{w.meaning[locale]}</p><LearningAudio text={w.text} locale={locale}/></div>)}</div>
    <button type="button" className={`${primary} mt-5 w-full`} onClick={() => { stopLessonAudio(); save({ ...draft, study: false }); }}>{say("Passer à la pratique", "Let’s practise", "Vamos a practicar")}</button></section>;
  const word = targets[draft.queue[draft.at]], token = `${lessonId}:${draft.at}`;
  return <section data-vocabulary-preparation>
    <h2 ref={heading} tabIndex={-1} className="mb-4 text-sm font-bold text-emerald-800 outline-none">{say("Préparation", "Preparation", "Preparación")} · {draft.at + 1}/{draft.queue.length}</h2>
    <RecallQuestion key={token} token={token} word={word} choices={recallChoices(choicePool, word, token)} locale={locale} targetLanguage="it" paused={paused} value={draft.answer}
      onChange={answer => { if (latest.current) save({ ...latest.current, answer }); }} onNext={next}
      audio={onListen => <LearningAudio text={word.text} locale={locale} label={say("l’expression", "the expression", "la expresión")} autoPlay onListen={onListen}/>}/>
    {!stored && <p role="status" className="mt-3 text-sm text-amber-900">{say("La sauvegarde est indisponible dans ce navigateur.", "Saving is unavailable in this browser.", "No se puede guardar en este navegador.")}</p>}
  </section>;
}
