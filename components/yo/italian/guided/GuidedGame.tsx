"use client";
import { useLayoutEffect, useRef } from "react";
import type { ItalianActivity } from "@/lib/yo/italian/italianModuleTypes";
import type { YoLocale } from "@/lib/yo/types";
import { scrambleItalianItems } from "@/lib/yo/italian/italianModuleLogic";
import { checkGuided, expectedGuided, listeningText, tokenPool, type GameDraft } from "@/lib/yo/italian/course/guidedItalian";
import { LearningAudio } from "../../personalized/LearningAudio";
import { SpatialExercise } from "../../personalized/SpatialExercise";
import { useAnswerFeedback, YoppoAnswerReaction } from "../../feedback/LearningFeedback";
import { acceptPracticeTap, PracticeAdvanceStatus, usePracticeAdvance } from "../../learning/PracticeAdvance";
import { Check, X } from "lucide-react";
import { guidedCopy, primary, secondary } from "./copy";

export function GuidedGame({ activity, locale, value, onChange, onAttempt, onContinue, assessment = false, continueLabel, paused = false }: {
  activity: ItalianActivity; locale: YoLocale; value: GameDraft;
  onChange: (next: GameDraft) => void; onAttempt: (correct: boolean, assisted: boolean) => void;
  onContinue: () => void; assessment?: boolean; continueLabel?: string; paused?: boolean;
}) {
  const response = useAnswerFeedback();
  const c = guidedCopy[locale], current = useRef(value);
  useLayoutEffect(() => { current.current = value; }, [value]);
  const audio = listeningText(activity), pool = tokenPool(activity);
  const turn = activity.kind === "dialogue" ? activity.turns[value.turn] : null;
  const options = activity.kind === "choice" || activity.kind === "listen" || activity.kind === "culture" ? activity.options : turn?.options;
  const feedback = value.feedback;
  const ready = (!audio || value.heard || value.transcript) && (options ? Boolean(value.selected) : pool.length ? value.tiles.length > 0 : activity.kind === "cafe" ? Object.values(value.basket ?? {}).some(n=>n>0) : activity.kind === "map" ? Boolean(value.path?.length) : false);
  const finished = value.complete;
  const flow = usePracticeAdvance({ token: `${activity.id}:${value.turn}`, correct: value.feedback === true, paused,
    onNext: () => {
      if (activity.kind === "dialogue" && !current.current.complete && current.current.feedback === true)
        edit({ turn: current.current.turn + 1, selected: null, feedback: null });
      else onContinue();
    },
  });
  function edit(patch: Partial<GameDraft>) { if (patch.feedback === false || patch.feedback === null) response.clear(); const next = { ...current.current, ...patch }; current.current = next; onChange(next); }
  function report(correct: boolean, complete: boolean) {
    const previous = current.current;
    if (previous.complete || previous.feedback === true) return;
    const assisted = previous.assisted;
    edit({ feedback: correct, complete, assisted: assisted || (!correct && !assessment) });
    onAttempt(correct, assisted);
  }
  function check() {
    const g = current.current;
    const readyNow = (!audio || g.heard || g.transcript) && (options ? Boolean(g.selected) : pool.length ? g.tiles.length > 0 : activity.kind === "cafe" ? Object.values(g.basket ?? {}).some(n => n > 0) : activity.kind === "map" ? Boolean(g.path?.length) : false);
    if (!readyNow || g.complete || g.feedback === true) return;
    const correct = checkGuided(activity, current.current);
    const complete = assessment || (correct && (activity.kind !== "dialogue" || current.current.turn === activity.turns.length - 1));
    if (activity.kind === "dialogue" && correct && !complete) { edit({ feedback: true }); response.correct(`${activity.id}:turn:${current.current.turn}`); flow.arm(); return; }
    report(correct, complete);
    if (correct) { response.correct(`${activity.id}:turn:${current.current.turn}`); if (activity.kind !== "cafe" && activity.kind !== "map") flow.arm(); }
  }
  function pair(id: string) {
    const g = current.current;
    if (!g.left || g.pairs.includes(id) || g.complete || activity.kind !== "match") return;
    if (g.left === id) {
      const pairs = [...g.pairs, id];
      if (pairs.length === activity.pairs.length) { edit({ pairs, left: null }); report(true, true); flow.arm(); }
      else edit({ pairs, left: null, feedback: null });
      response.correct(`${activity.id}:pair:${id}`);
    } else { edit({ feedback: false, assisted: true }); onAttempt(false, g.assisted); }
  }
  const optionStyle = "min-h-14 w-full rounded-2xl border-2 px-4 py-4 text-left text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 ";
  const title = activity.kind === "type" ? activity.listeningText ? c.listenBuild : activity.prompt[locale].replace(/^(Écris en italien|Write in Italian|Escribe en italiano)/, c.writtenTarget) : turn?.prompt[locale] ?? activity.prompt[locale];
  return <section aria-label={title} data-guided-game={activity.id}>
    <h2 className="mb-6 text-xl font-bold leading-relaxed sm:text-2xl">{title}</h2>
    {audio ? <div className="mb-6 rounded-2xl bg-emerald-50 p-4"><LearningAudio text={audio} locale={locale} label={c.audio} onListen={() => edit({ heard: true })} />{!value.heard && !value.transcript ? <p className="mt-2 text-sm">{c.listenFirst}</p> : null}<button type="button" className={`${secondary} mt-2`} disabled={finished} onClick={() => edit({ transcript: true, assisted: true })}>{c.transcript}</button>{value.transcript ? <p lang="it" className="mt-3 font-semibold">{audio}</p> : null}</div> : null}
    {turn ? <div className="mb-5 rounded-2xl bg-emerald-50 p-5"><p className="mb-2 text-xs font-bold">{turn.speaker} · {value.turn + 1}/{activity.kind === "dialogue" ? activity.turns.length : 1}</p><p lang="it" className="mb-3 text-xl">{turn.line}</p><LearningAudio text={turn.line} locale={locale} /></div> : null}
    {options ? <div className="grid gap-3" role="group" aria-label={c.choose}>{options.map(option => <button key={option.id} type="button" disabled={finished || feedback === true || Boolean(audio && !value.heard && !value.transcript) || feedback === false && value.selected === option.id} aria-pressed={value.selected === option.id} lang={option.it ? "it" : undefined} className={`${optionStyle} ${value.selected === option.id ? feedback === false ? "border-red-700 bg-red-50 text-red-950" : "border-emerald-700 bg-emerald-50 text-emerald-950" : "border-stone-200 bg-white hover:border-emerald-400"}`} onClick={e => { if (!acceptPracticeTap(e.detail) || current.current.complete || current.current.feedback === true) return; edit({ selected: option.id, feedback: null }); check(); }}><span>{option.it ?? option.label?.[locale]}</span>{value.selected === option.id && feedback !== null ? feedback ? <Check className="ml-2 inline" size={20} aria-hidden/> : <X className="ml-2 inline" size={20} aria-hidden/> : null}</button>)}</div> : null}
    {pool.length ? <><div role="group" aria-label={c.sentence} className="flex min-h-28 flex-wrap content-start gap-2 rounded-2xl border-2 border-dashed border-stone-300 p-4">{!value.tiles.length ? <p className="text-sm text-stone-600">{c.tap}</p> : value.tiles.map((id, i) => <button key={id} lang="it" type="button" disabled={finished} aria-label={`${c.remove} ${pool[id]}`} className="min-h-11 rounded-xl border border-emerald-300 bg-emerald-50 px-3 font-semibold" onClick={() => edit({ tiles: current.current.tiles.filter((_, position) => position !== i), feedback: null })}>{pool[id]}</button>)}</div><div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={c.words}>{scrambleItalianItems(pool.map((text, id) => ({ text, id })), activity.id).map(token => <button key={token.id} lang="it" type="button" disabled={finished || value.tiles.includes(token.id)} className="min-h-12 rounded-xl border-2 border-b-4 border-stone-200 bg-white px-4 font-semibold disabled:opacity-25 focus-visible:outline-2" onClick={() => { if (!current.current.tiles.includes(token.id)) edit({ tiles: [...current.current.tiles, token.id], feedback: null }); }}>{token.text}</button>)}</div></> : null}
    {activity.kind === "match" ? <><p className="mb-4 text-sm">{c.pair}</p><div className="grid grid-cols-2 gap-3"><div className="grid gap-3">{activity.pairs.map(item => <button key={item.id} type="button" lang="it" aria-pressed={value.left === item.id} disabled={value.pairs.includes(item.id)} className={`${optionStyle} ${value.left === item.id ? "border-emerald-700 bg-emerald-50" : "border-stone-200 bg-white"}`} onClick={() => edit({ left: item.id, feedback: null })}>{value.pairs.includes(item.id) ? "✓ " : ""}{item.it}</button>)}</div><div className="grid gap-3">{scrambleItalianItems(activity.pairs, activity.id).map(item => <button key={item.id} type="button" disabled={!value.left || value.pairs.includes(item.id)} className={`${optionStyle} border-stone-200 bg-white`} onClick={() => pair(item.id)}>{value.pairs.includes(item.id) ? "✓ " : ""}{item.meaning[locale]}</button>)}</div></div></> : null}
    <SpatialExercise activity={activity} value={value} onChange={edit} locale={locale}/>
    <YoppoAnswerReaction revision={response.reaction} locale={locale}/>
    {feedback !== null ? <div role="status" aria-live="polite" aria-atomic="true" className={`mt-6 rounded-2xl p-4 ${feedback ? "bg-emerald-50 text-emerald-950" : "bg-red-50 text-red-950"}`}><p className="font-bold">{feedback ? c.correct : activity.kind === "match" ? c.pairWrong : c.wrong}</p>{activity.kind !== "match" ? feedback ? <details className="mt-2 text-sm leading-6" onToggle={e=>{if(e.currentTarget.open)flow.hold();}}><summary className="min-h-11 cursor-pointer py-2 font-semibold">{{fr:"Comprendre la réponse",en:"Understand the answer",es:"Entender la respuesta"}[locale]}</summary><p>{options?.find(o => o.id === value.selected)?.feedback[locale] ?? activity.explanation[locale]}</p></details> : <p className="mt-2 text-sm leading-6">{options?.find(o => o.id === value.selected)?.feedback[locale] ?? activity.explanation[locale]}</p> : null}{assessment && !feedback ? <p lang="it" className="mt-2 font-semibold">{expectedGuided(activity)}</p> : null}</div> : null}
    <PracticeAdvanceStatus flow={flow} locale={locale}/>
    {finished || feedback === true && turn ? !flow.pending && <button type="button" className={`${primary} mt-6 w-full`} onClick={flow.next}>{finished ? continueLabel ?? c.next : c.dialogue}</button> : !options && activity.kind !== "match" ? <button type="button" className={`${primary} mt-6 w-full`} disabled={!ready} onClick={check}>{c.check}</button> : null}
  </section>;
}
