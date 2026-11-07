"use client";
import { useLayoutEffect, useRef } from "react";
import type { YoLocale } from "@/lib/yo/types";
import type { IntroCourse, Draft, Exercise, Mission } from "@/lib/yo/shared/types";
import { L } from "@/lib/yo/shared/types";
import { scrambleItalianItems } from "@/lib/yo/italian/italianModuleLogic";
import { VocabularyScene } from "../personalized/VocabularyScene";
import { useAnswerFeedback, YoppoAnswerReaction } from "../feedback/LearningFeedback";
import { primary, secondary } from "../italian/guided/copy";
import { IntroAudio } from "./IntroAudio";

export function IntroQuestion({ course, locale, audio, exercise, visual, audioFirst = false, value, onChange, onContinue, assessment = false }: {
  course: IntroCourse; locale: YoLocale; audio: Record<string,string>; exercise?: Exercise; visual?: Mission["visuals"][number]; audioFirst?: boolean;
  value: Draft; onChange: (draft: Draft) => void; onContinue: () => void; assessment?: boolean;
}) {
  const id = exercise?.id ?? visual!.phrase, feedback = useAnswerFeedback(), last = useRef(value);
  useLayoutEffect(() => { last.current = value; }, [value]);
  const phraseId = exercise?.answer ?? visual!.phrase, phrase = course.phrases.find(p => p.id === phraseId)!;
  const listen = exercise?.kind === "listen" || Boolean(visual && audioFirst), parts = phrase.parts ?? [];
  const answered = value.checked && (value.correct || assessment);
  const ready = (!listen || value.heard || value.transcript) && (exercise?.kind === "order" ? value.tiles.length === parts.length : value.selected !== null);
  const say = (fr:string,en:string,es:string) => L(fr,en,es)[locale];
  function edit(patch: Partial<Draft>) { const next = { ...last.current, ...patch }; last.current = next; onChange(next); }
  function check() {
    if (!ready || last.current.checked) return;
    const correct = exercise?.kind === "order" ? last.current.tiles.every((v,i) => v === i) : last.current.selected === (visual?.answer ?? exercise!.answer);
    edit({ checked: true, correct, assisted: last.current.assisted || !correct && !assessment });
    if (correct) feedback.correct(id);
  }
  const showText = !listen || value.transcript || value.checked;
  const cue = exercise?.cue && course.phrases.find(p => p.id === exercise.cue);
  return <section data-intro-question={id}>
    <h2 className="mb-5 text-xl font-bold leading-relaxed">{visual ? say("Écoute et choisis l’image.","Listen and choose the image.","Escucha y elige la imagen.") : exercise!.prompt[locale]}</h2>
    {cue && <div className="mb-5 rounded-2xl bg-emerald-50 p-4"><p lang={course.language} className="text-xl font-semibold">{cue.text}</p>{cue.reading && <p className="mt-1 text-sm text-stone-600">{cue.reading}</p>}<IntroAudio text={cue.text} speechLocale={course.speechLocale} path={audio[cue.text]} locale={locale}/></div>}
    {(visual || listen) && <div className="mb-5 rounded-2xl bg-emerald-50 p-4">
      {showText && <><p lang={course.language} className="mb-2 text-2xl font-bold leading-relaxed">{phrase.text}</p>{phrase.reading && <p className="mb-3 text-base text-stone-600">{phrase.reading}</p>}</>}
      <IntroAudio autoPlay={Boolean(visual)} text={phrase.text} speechLocale={course.speechLocale} path={audio[phrase.text]} locale={locale} onListen={() => edit({ heard: true })}/>
      {listen && !showText && <button type="button" className={`${secondary} mt-2`} onClick={() => edit({ transcript: true, assisted: true })}>{say("Lire le message","Read the message","Leer el mensaje")}</button>}
    </div>}
    {visual ? <div className="grid grid-cols-2 gap-3" role="group" aria-label={say("Quatre images","Four images","Cuatro imágenes")}>{scrambleItalianItems(visual.pictures,`${id}:${audioFirst}`).map(p => <button key={p.id} type="button" disabled={value.checked} aria-pressed={value.selected===p.id} aria-label={p.alt[locale]} className={`min-w-0 overflow-hidden rounded-2xl border-[3px] focus-visible:outline-4 focus-visible:outline-offset-2 ${value.selected===p.id ? "border-emerald-700" : "border-stone-200"}`} onClick={()=>edit({selected:p.id})}><VocabularyScene picture={p} locale={locale}/></button>)}</div> : exercise?.kind === "order" ? <>
      <p className="mb-3 text-base">{phrase.meaning[locale]}</p>
      <div role="group" aria-label={say("Ta phrase","Your sentence","Tu frase")} className="flex min-h-24 flex-wrap items-start gap-2 rounded-2xl border-2 border-dashed border-stone-300 p-3">{value.tiles.map((n,i)=><button key={n} type="button" lang={course.language} disabled={value.checked} className="min-h-12 rounded-xl border bg-emerald-50 px-3 font-semibold" onClick={()=>edit({tiles:value.tiles.filter((_,j)=>j!==i)})}>{parts[n]}</button>)}</div>
      <div role="group" aria-label={say("Mots disponibles","Available words","Palabras disponibles")} className="mt-4 flex flex-wrap gap-2">{scrambleItalianItems(parts.map((text,n)=>({text,n})),id).map(p=><button key={p.n} type="button" lang={course.language} disabled={value.checked||value.tiles.includes(p.n)} className="min-h-12 rounded-xl border-2 border-b-4 bg-white px-3 font-semibold disabled:opacity-30" onClick={()=>{if(!last.current.tiles.includes(p.n))edit({tiles:[...last.current.tiles,p.n]});}}>{p.text}</button>)}</div>
    </> : <div className="grid gap-3" role="group" aria-label={say("Réponses","Answers","Respuestas")}>{scrambleItalianItems(exercise!.options,id).map(option=>{const p=course.phrases.find(p=>p.id===option)!;return <button key={option} type="button" lang={course.language} disabled={value.checked} aria-pressed={value.selected===option} className={`min-h-14 rounded-2xl border-2 px-4 py-4 text-left text-lg ${value.selected===option?'border-emerald-700 bg-emerald-50':'border-stone-200 bg-white'}`} onClick={()=>edit({selected:option})}>{p.text}{p.reading && <span className="mt-1 block text-sm text-stone-600">{p.reading}</span>}</button>;})}</div>}
    {value.checked && <div role="status" className={`mt-5 rounded-2xl p-4 ${value.correct?'bg-emerald-50':'bg-amber-50'}`}><p className="font-bold">{value.correct?say("Bien joué !","Well done!","¡Bien hecho!"):say("On regarde ensemble.","Let’s look at it together.","Vamos a verlo juntos.")}</p><p lang={course.language} className="mt-2 font-semibold">{phrase.text}</p><p className="mt-1 text-sm leading-6">{phrase.meaning[locale]}</p></div>}
    <YoppoAnswerReaction revision={feedback.reaction} locale={locale}/>
    <button type="button" className={`${primary} mt-6 w-full`} disabled={!value.checked&&!ready} onClick={answered ? onContinue : value.checked ? ()=>edit({checked:false,correct:false,selected:null,tiles:[],transcript:true,assisted:true}) : check}>{answered?say("Continuer","Continue","Continuar"):value.checked?say("Réessayer","Try again","Reintentar"):say("Vérifier","Check","Comprobar")}</button>
  </section>;
}
