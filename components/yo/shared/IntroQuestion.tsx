"use client";
import { useLayoutEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import type { IntroCourse, Draft, Exercise, Mission } from "@/lib/yo/shared/types";
import { L } from "@/lib/yo/shared/types";
import { scrambleItalianItems } from "@/lib/yo/italian/italianModuleLogic";
import { validObjectChoices } from "@/lib/yo/learning/vocabularyPractice";
import { artworkPath } from "@/lib/yo/personalized/approvedVocabulary";
import { useAnswerFeedback, YoppoAnswerReaction } from "../feedback/LearningFeedback";
import { acceptPracticeTap, PracticeAdvanceStatus, usePracticeAdvance } from "../learning/PracticeAdvance";
import { primary, secondary } from "../italian/guided/copy";
import { IntroAudio } from "./IntroAudio";

export function IntroQuestion({ course, locale, audio, exercise, visual, value, onChange, onContinue, assessment = false, paused = false }: {
  course: IntroCourse; locale: YoLocale; audio: Record<string,string>; exercise?: Exercise; visual?: Mission["visuals"][number]; audioFirst?: boolean;
  value: Draft; onChange: (draft: Draft) => void; onContinue: () => void; assessment?: boolean; paused?: boolean;
}) {
  const id = exercise?.id ?? visual!.phrase, feedback = useAnswerFeedback(), last = useRef(value);
  useLayoutEffect(() => { last.current = value; }, [value]);
  const phraseId = exercise?.answer ?? visual!.phrase, phrase = course.phrases.find(p => p.id === phraseId)!;
  const listen = exercise?.kind === "listen" || exercise?.kind === "meaning" || exercise?.kind === "number" || Boolean(visual);
  const parts = phrase.parts ?? [], answered = value.checked && (value.correct || assessment);
  const flow = usePracticeAdvance({ token: id, correct: value.checked && value.correct, paused, onNext: onContinue });
  const say = (fr:string,en:string,es:string) => L(fr,en,es)[locale];
  function edit(patch: Partial<Draft>) { const next = { ...last.current, ...patch }; last.current = next; onChange(next); }
  function submit(selected?: string) {
    const d = last.current;
    if (d.checked && (d.correct || assessment) || listen && !d.heard && !d.transcript) return;
    if (exercise?.kind === "order" && d.tiles.length !== parts.length) return;
    const chosen = selected ?? d.selected;
    if (exercise?.kind !== "order" && !chosen) return;
    const correct = exercise?.kind === "order" ? d.tiles.every((v,i) => v === i) : chosen === (visual?.answer ?? exercise!.answer);
    edit({ selected: chosen, checked: true, correct, assisted: d.assisted || !correct && !assessment });
    if (correct) { feedback.correct(id); flow.arm(); }
  }
  function choose(selected: string, detail: number) { if (acceptPracticeTap(detail)) submit(selected); }
  const cue = exercise?.cue && course.phrases.find(p => p.id === exercise.cue);
  // A content error must not silently bring back labelled portraits or age/flag guessing.
  if (visual && !validObjectChoices(visual.pictures)) throw new Error("Vocabulary image questions require four distinct, unlabelled concrete objects.");
  const selectedStyle = (selected: boolean) => selected && value.checked ? value.correct ? "border-emerald-700 bg-emerald-50 text-emerald-950" : "border-red-700 bg-red-50 text-red-950" : "border-stone-200 bg-white text-stone-800";
  return <section data-intro-question={id}>
    <h2 className="mb-5 text-xl font-bold leading-relaxed">{visual ? say("Écoute et choisis l’objet.","Listen and choose the object.","Escucha y elige el objeto.") : exercise!.prompt[locale]}</h2>
    {cue && <div className="mb-5 rounded-2xl bg-emerald-50 p-4"><p lang={course.language} className="text-xl font-semibold">{cue.text}</p>{cue.reading && <p className="mt-1 text-sm text-stone-600">{cue.reading}</p>}<IntroAudio text={cue.text} speechLocale={course.speechLocale} path={audio[cue.text]} locale={locale}/></div>}
    {listen && <div className="mb-5 rounded-2xl bg-emerald-50 p-4">
      <IntroAudio autoPlay={!assessment} text={phrase.text} speechLocale={course.speechLocale} path={audio[phrase.text]} locale={locale} onListen={() => edit({ heard: true })}/>
      {value.transcript && <><p lang={course.language} className="mt-3 text-xl font-semibold">{phrase.text}</p>{phrase.reading && <p className="mt-1 text-base text-stone-600">{phrase.reading}</p>}</>}
      {!value.transcript && !answered && <button type="button" className={`${secondary} mt-2`} onClick={() => edit({ transcript: true, assisted: true })}>{say("Lire plutôt qu’écouter","Read instead of listen","Leer en vez de escuchar")}</button>}
    </div>}
    {visual ? <div className="grid grid-cols-2 gap-3" role="group" aria-label={say("Quatre objets","Four objects","Cuatro objetos")}>{scrambleItalianItems(visual.pictures,id).map(p => <button key={p.id} type="button" disabled={answered || !value.heard && !value.transcript} aria-pressed={value.selected===p.id} aria-label={p.alt[locale]} className={`relative min-w-0 overflow-hidden rounded-2xl border-[3px] focus-visible:outline-4 focus-visible:outline-offset-2 ${selectedStyle(value.selected===p.id)}`} onClick={e=>choose(p.id,e.detail)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={artworkPath(p.artwork!)} alt="" className="aspect-square w-full object-contain"/>
      {value.selected===p.id && value.checked && <span className="absolute right-2 top-2 rounded-full bg-white p-1">{value.correct?<Check size={22} aria-hidden/>:<X size={22} aria-hidden/>}</span>}
    </button>)}</div> : exercise?.kind === "order" ? <>
      <p className="mb-3 text-base">{phrase.meaning[locale]}</p>
      <div role="group" aria-label={say("Ta phrase","Your sentence","Tu frase")} className="flex min-h-24 flex-wrap items-start gap-2 rounded-2xl border-2 border-dashed border-stone-300 p-3">{value.tiles.map((n,i)=><button key={n} type="button" lang={course.language} disabled={answered} className="min-h-12 rounded-xl border bg-emerald-50 px-3 font-semibold" onClick={()=>edit({tiles:last.current.tiles.filter((_,j)=>j!==i),checked:false,correct:false})}>{parts[n]}</button>)}</div>
      <div role="group" aria-label={say("Mots disponibles","Available words","Palabras disponibles")} className="mt-4 flex flex-wrap gap-2">{scrambleItalianItems(parts.map((text,n)=>({text,n})),id).map(p=><button key={p.n} type="button" lang={course.language} disabled={answered||value.tiles.includes(p.n)} className="min-h-12 rounded-xl border-2 border-b-4 bg-white px-3 font-semibold disabled:opacity-30" onClick={()=>{if(!last.current.tiles.includes(p.n))edit({tiles:[...last.current.tiles,p.n],checked:false,correct:false});}}>{p.text}</button>)}</div>
    </> : <div className="grid gap-3" role="group" aria-label={say("Réponses","Answers","Respuestas")}>{scrambleItalianItems(exercise!.options,id).map(option=>{
      const p=course.phrases.find(p=>p.id===option)!, meaning=exercise?.kind==='meaning', number=exercise?.kind==='number';
      const text=number?option.replace(/^age/,''):meaning?p.meaning[locale]:p.text;
      return <button key={option} type="button" lang={meaning?locale:number?undefined:course.language} disabled={answered || listen&&!value.heard&&!value.transcript || value.checked&&!value.correct&&value.selected===option} aria-pressed={value.selected===option} data-answer-id={option}
        className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 px-4 py-4 text-left text-lg ${selectedStyle(value.selected===option)}`} onClick={e=>choose(option,e.detail)}>
        <span>{text}{!meaning&&!number&&p.reading && <span className="mt-1 block text-sm text-stone-600">{p.reading}</span>}</span>{value.selected===option&&value.checked&&(value.correct?<Check size={20} aria-hidden/>:<X size={20} aria-hidden/>)}</button>;
    })}</div>}
    <div role="status" aria-live="polite" aria-atomic="true" className="mt-5">{value.checked && <p className={`font-bold ${value.correct?'text-emerald-900':'text-red-800'}`}>{value.correct?say("Bien joué !","Well done!","¡Bien hecho!"):assessment?say("On regarde la réponse.","Let’s review the answer.","Veamos la respuesta."):say("Pas tout à fait. Essaie encore.","Not quite. Try again.","No del todo. Inténtalo de nuevo.")}</p>}</div>
    {value.checked && (value.correct || assessment) && <details className="mt-3 text-sm leading-6" onToggle={e=>{if(e.currentTarget.open)flow.hold();}} open={assessment&&!value.correct || undefined}>
      <summary className="min-h-11 cursor-pointer py-2 font-semibold text-emerald-900">{say("Comprendre la réponse","Understand the answer","Entender la respuesta")}</summary><p lang={course.language} className="font-semibold">{phrase.text}</p><p>{phrase.meaning[locale]}</p>
    </details>}
    <YoppoAnswerReaction revision={value.correct?feedback.reaction:0} locale={locale}/>
    <PracticeAdvanceStatus flow={flow} locale={locale}/>
    {answered && !flow.pending ? <button type="button" className={`${primary} mt-5 w-full`} onClick={flow.next}>{say("Continuer","Continue","Continuar")}</button> : exercise?.kind==='order'&&!answered ? <button type="button" className={`${primary} mt-5 w-full`} disabled={value.tiles.length!==parts.length} onClick={()=>submit()}>{say("Vérifier la phrase","Check sentence","Comprobar la frase")}</button> : null}
  </section>;
}
