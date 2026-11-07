"use client";
import { useLayoutEffect, useRef } from "react";
import type { ItalianActivity } from "@/lib/yo/italian/italianModuleTypes";
import type { YoLocale } from "@/lib/yo/types";
import { scrambleItalianItems } from "@/lib/yo/italian/italianModuleLogic";
import { checkGuided, expectedGuided, listeningText, tokenPool, type GameDraft } from "@/lib/yo/italian/course/guidedItalian";
import { ItalianModuleAudio } from "../ItalianModuleAudio";
import { guidedCopy, primary, secondary } from "./copy";

export function GuidedGame({ activity, locale, value, onChange, onAttempt, onContinue, assessment = false, continueLabel }: {
  activity: ItalianActivity; locale: YoLocale; value: GameDraft;
  onChange: (next: GameDraft) => void; onAttempt: (correct: boolean, assisted: boolean) => void;
  onContinue: () => void; assessment?: boolean; continueLabel?: string;
}) {
  const c = guidedCopy[locale], current = useRef(value);
  useLayoutEffect(() => { current.current = value; }, [value]);
  const audio = listeningText(activity), pool = tokenPool(activity);
  const turn = activity.kind === "dialogue" ? activity.turns[value.turn] : null;
  const options = activity.kind === "choice" || activity.kind === "listen" || activity.kind === "culture" ? activity.options : turn?.options;
  const feedback = value.feedback;
  const ready = (!audio || value.heard || value.transcript) && (options ? Boolean(value.selected) : pool.length ? value.tiles.length > 0 : false);
  const finished = value.complete;
  function edit(patch: Partial<GameDraft>) { const next = { ...current.current, ...patch }; current.current = next; onChange(next); }
  function report(correct: boolean, complete: boolean) {
    const previous = current.current;
    if (previous.complete || previous.feedback === true) return;
    const assisted = previous.assisted;
    edit({ feedback: correct, complete, assisted: assisted || (!correct && !assessment) });
    onAttempt(correct, assisted);
  }
  function check() {
    if (!ready || current.current.complete || current.current.feedback === true) return;
    const correct = checkGuided(activity, current.current);
    const complete = assessment || (correct && (activity.kind !== "dialogue" || current.current.turn === activity.turns.length - 1));
    if (activity.kind === "dialogue" && correct && !complete) { edit({ feedback: true }); return; }
    report(correct, complete);
  }
  function pair(id: string) {
    const g = current.current;
    if (!g.left || g.pairs.includes(id) || g.complete || activity.kind !== "match") return;
    if (g.left === id) {
      const pairs = [...g.pairs, id];
      if (pairs.length === activity.pairs.length) { edit({ pairs, left: null }); report(true, true); }
      else edit({ pairs, left: null, feedback: null });
    } else { edit({ feedback: false, assisted: true }); onAttempt(false, g.assisted); }
  }
  const optionStyle = "min-h-14 w-full rounded-2xl border-2 px-4 py-4 text-left text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60";
  const title = activity.kind === "type" ? activity.listeningText ? c.listenBuild : activity.prompt[locale].replace(/^(Écris en italien|Write in Italian|Escribe en italiano)/, c.writtenTarget) : turn?.prompt[locale] ?? activity.prompt[locale];
  return <section aria-label={title} data-guided-game={activity.id}>
    <h2 className="mb-6 text-xl font-bold leading-relaxed sm:text-2xl">{title}</h2>
    {audio ? <div className="mb-6 rounded-2xl bg-emerald-50 p-4"><ItalianModuleAudio text={audio} locale={locale} label={c.audio} onListen={() => edit({ heard: true })} />{!value.heard && !value.transcript ? <p className="mt-2 text-sm">{c.listenFirst}</p> : null}<button type="button" className={`${secondary} mt-2`} disabled={finished} onClick={() => edit({ transcript: true, assisted: true })}>{c.transcript}</button>{value.transcript ? <p lang="it" className="mt-3 font-semibold">{audio}</p> : null}</div> : null}
    {turn ? <div className="mb-5 rounded-2xl bg-emerald-50 p-5"><p className="mb-2 text-xs font-bold">{turn.speaker} · {value.turn + 1}/{activity.kind === "dialogue" ? activity.turns.length : 1}</p><p lang="it" className="mb-3 text-xl">{turn.line}</p><ItalianModuleAudio text={turn.line} locale={locale} /></div> : null}
    {options ? <div className="grid gap-3" role="group" aria-label={c.choose}>{options.map(option => <button key={option.id} type="button" disabled={finished || feedback === true} aria-pressed={value.selected === option.id} lang={option.it ? "it" : undefined} className={`${optionStyle} ${value.selected === option.id ? "border-emerald-700 bg-emerald-50" : "border-stone-200 bg-white hover:border-emerald-400"}`} onClick={() => edit({ selected: option.id, feedback: null })}>{option.it ?? option.label?.[locale]}</button>)}</div> : null}
    {pool.length ? <><div role="group" aria-label={c.sentence} className="flex min-h-28 flex-wrap content-start gap-2 rounded-2xl border-2 border-dashed border-stone-300 p-4">{!value.tiles.length ? <p className="text-sm text-stone-600">{c.tap}</p> : value.tiles.map((id, i) => <button key={id} lang="it" type="button" disabled={finished} aria-label={`${c.remove} ${pool[id]}`} className="min-h-11 rounded-xl border border-emerald-300 bg-emerald-50 px-3 font-semibold" onClick={() => edit({ tiles: current.current.tiles.filter((_, position) => position !== i), feedback: null })}>{pool[id]}</button>)}</div><div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={c.words}>{scrambleItalianItems(pool.map((text, id) => ({ text, id })), activity.id).map(token => <button key={token.id} lang="it" type="button" disabled={finished || value.tiles.includes(token.id)} className="min-h-12 rounded-xl border-2 border-b-4 border-stone-200 bg-white px-4 font-semibold disabled:opacity-25 focus-visible:outline-2" onClick={() => { if (!current.current.tiles.includes(token.id)) edit({ tiles: [...current.current.tiles, token.id], feedback: null }); }}>{token.text}</button>)}</div></> : null}
    {activity.kind === "match" ? <><p className="mb-4 text-sm">{c.pair}</p><div className="grid grid-cols-2 gap-3"><div className="grid gap-3">{activity.pairs.map(item => <button key={item.id} type="button" lang="it" aria-pressed={value.left === item.id} disabled={value.pairs.includes(item.id)} className={`${optionStyle} ${value.left === item.id ? "border-emerald-700 bg-emerald-50" : "border-stone-200 bg-white"}`} onClick={() => edit({ left: item.id, feedback: null })}>{value.pairs.includes(item.id) ? "✓ " : ""}{item.it}</button>)}</div><div className="grid gap-3">{scrambleItalianItems(activity.pairs, activity.id).map(item => <button key={item.id} type="button" disabled={!value.left || value.pairs.includes(item.id)} className={`${optionStyle} border-stone-200 bg-white`} onClick={() => pair(item.id)}>{value.pairs.includes(item.id) ? "✓ " : ""}{item.meaning[locale]}</button>)}</div></div></> : null}
    {feedback !== null ? <div role="status" className={`mt-6 rounded-2xl p-4 ${feedback ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950"}`}><p className="font-bold">{feedback ? c.correct : activity.kind === "match" ? c.pairWrong : c.wrong}</p>{activity.kind !== "match" ? <p className="mt-2 text-sm leading-6">{options?.find(o => o.id === value.selected)?.feedback[locale] ?? activity.explanation[locale]}</p> : null}{assessment && !feedback ? <p lang="it" className="mt-2 font-semibold">{expectedGuided(activity)}</p> : null}</div> : null}
    <div className="mt-8 border-t border-stone-200 pt-5">
      {finished ? <button type="button" className={`${primary} w-full`} onClick={onContinue}>{continueLabel ?? c.next}</button> : feedback === true && turn ? <button type="button" className={`${primary} w-full`} onClick={() => edit({ turn: current.current.turn + 1, selected: null, feedback: null })}>{c.dialogue}</button> : activity.kind !== "match" ? <button type="button" className={`${primary} w-full`} disabled={!ready} onClick={check}>{c.check}</button> : null}
    </div>
  </section>;
}
