"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { BookOpen, Check, Settings, Stamp, X } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { IntroCourse, IntroState, IntroProfile } from "@/lib/yo/shared/types";
import { L } from "@/lib/yo/shared/types";
import { courseSteps } from "@/lib/yo/shared/steps";
import { emptyDraft, freshIntro, introKey, parseIntro, introPassed, introPoints, independentScore } from "@/lib/yo/shared/state";
import type { YoLocale } from "@/lib/yo/types";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { LearningFeedbackProvider, FeedbackSettings, useLearningFeedback } from "../feedback/LearningFeedback";
import { primary, secondary } from "../italian/guided/copy";
import { PracticeAdvanceNotice } from "../learning/PracticeAdvance";
import { IntroAudio } from "./IntroAudio";
import { IntroQuestion } from "./IntroQuestion";
import { IntroWelcome } from "./IntroWelcome";
import { IntroNotebook } from "./IntroNotebook";

type Props={course:IntroCourse;locale:YoLocale;audio:Record<string,string>};
export function SharedIntro(props:Props){return <LearningFeedbackProvider><IntroPlayer {...props}/></LearningFeedbackProvider>;}
function IntroPlayer({course,locale,audio}:Props){
 const say=(fr:string,en:string,es:string)=>L(fr,en,es)[locale],steps=courseSteps(course),key=introKey(course.language);
 const [state,setState]=useState<IntroState>(()=>freshIntro(course)),[ready,setReady]=useState(false),[stored,setStored]=useState(true),[editing,setEditing]=useState(false);
 const [panel,setPanel]=useState<'notebook'|'settings'|null>(null),latest=useRef(state),heading=useRef<HTMLHeadingElement>(null);
 const feedback=useLearningFeedback();
 useLayoutEffect(()=>{latest.current=state;},[state]);
 useEffect(()=>{const frame=requestAnimationFrame(()=>{try{const saved=parseIntro(localStorage.getItem(key),course);if(saved.view==='lesson'||saved.view==='final'){saved.resume=saved.view;saved.view='map';}latest.current=saved;setState(saved);}catch{setStored(false);}setReady(true);});return()=>cancelAnimationFrame(frame);},[key,course]);
 useEffect(()=>{return()=>stopLessonAudio();},[]);
 function save(next:IntroState){latest.current=next;setState(next);try{localStorage.setItem(key,JSON.stringify(next));setStored(true);}catch{setStored(false);}}
 function focus(){requestAnimationFrame(()=>{heading.current?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});});}
 function move(at:number){if(at<0||at>=steps.length)return;stopLessonAudio();save({...latest.current,view:'lesson',resume:'lesson',step:at,draft:emptyDraft()});focus();}
 function leave(){stopLessonAudio();save({...latest.current,view:'map',resume:latest.current.view==='final'?'final':latest.current.view==='lesson'?'lesson':latest.current.resume});focus();}
 function startFinal(){stopLessonAudio();save({...latest.current,view:'final',resume:'final',finalIndex:0,answers:[],draft:emptyDraft()});focus();}
 function advance(){const s=latest.current,step=steps[s.step];if((step.kind==='recall'||step.kind==='exercise')&&(!s.draft.checked||!s.draft.correct))return;
  const completed=(step.kind==='recall'||step.kind==='exercise')?[...new Set([...s.completed,step.id])]:s.completed;
  save({...s,completed,visited:[...new Set([...s.visited,step.id])]});if(s.step===steps.length-1)startFinal();else move(s.step+1);
 }
 function nextFinal(){const s=latest.current;if(!s.draft.checked||s.answers.length!==s.finalIndex)return;stopLessonAudio();
  const answers=[...s.answers,{correct:s.draft.correct,assisted:s.draft.assisted}];
  if(answers.length===course.final.length){const score=independentScore(answers);save({...s,view:'result',resume:null,answers,best:Math.max(s.best,score),draft:emptyDraft()});if(score>=Math.ceil(course.final.length*.8)&&!introPassed(course,s))feedback.emit(`intro-stamp:${course.language}`,'stamp');}
  else save({...s,finalIndex:s.finalIndex+1,answers,draft:emptyDraft()});focus();
 }
 function profileDone(profile:IntroProfile){const existing=latest.current,entry=steps.findIndex(s=>s.mission===profile.entry);
  // Editing the same starting point preserves the exact draft and every earned outcome.
  save({...existing,profile,...(existing.profile?.entry===profile.entry?{}:{step:entry,resume:'lesson' as const,draft:emptyDraft()}),view:'map'});setEditing(false);focus();
 }
 function resume(){const s=latest.current;if(s.resume){save({...s,view:s.resume});focus();}else move(steps.findIndex(x=>x.mission===(s.profile?.entry??0)));}
 function notebook(){if(state.view==='final')return;stopLessonAudio();if(state.view==='lesson'&&steps[state.step].kind==='exercise'&&!state.draft.checked)save({...latest.current,draft:{...latest.current.draft,assisted:true}});setPanel('notebook');}
 if(!ready)return <main className="p-8"><p role="status">{say('Yoppo prépare ton parcours…','Yoppo is preparing your journey…','Yoppo prepara tu recorrido…')}</p></main>;
 if(!state.profile||editing)return <IntroWelcome course={course} locale={locale} audio={audio} initial={state.profile} onComplete={profileDone} onCancel={state.profile?()=>setEditing(false):undefined}/>;
 const step=steps[state.step],mission=course.missions[step.mission],missionSteps=steps.filter(s=>s.mission===step.mission),position=missionSteps.findIndex(s=>s.id===step.id);
 const phrase=(id:string)=>course.phrases.find(p=>p.id===id)!;
 const passed=introPassed(course,state),currentPassed=independentScore(state.answers)>=Math.ceil(course.final.length*.8);
 const smallStatus=!stored?<p role="status" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm">{say('La sauvegarde est indisponible dans ce navigateur.','Saving is unavailable in this browser.','No se puede guardar en este navegador.')}</p>:null;
 const example=(id:string)=>{const p=phrase(id);return <div key={id} className="rounded-2xl bg-emerald-50 p-4"><p lang={course.language} className="text-xl font-semibold leading-relaxed">{p.text}</p>{p.reading&&<p className="mt-1 text-base text-stone-600">{p.reading}</p>}{p.meaning[locale]!==p.text&&<p className="my-2 leading-7">{p.meaning[locale]}</p>}<IntroAudio text={p.text} speechLocale={course.speechLocale} path={audio[p.text]} locale={locale}/></div>;};
 return <div lang={locale} data-shared-course={course.language} className="min-h-screen bg-[#fbf9f3] text-stone-800">
  <header className="border-b border-stone-200 bg-white"><div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
   {state.view==='map'?<Link prefetch={false} className="text-lg font-black text-emerald-900" href={`/yo/langues?lang=${locale}`}>YoPratiqo</Link>:<button type="button" className={secondary} aria-label={say('Quitter et garder ma place','Leave and save my place','Salir y guardar mi lugar')} onClick={leave}><X size={21}/></button>}
   <span lang={course.language} className="text-sm font-bold">{course.nativeName}</span>
   <div className="flex"><button type="button" className={secondary} disabled={state.view==='final'} onClick={notebook} aria-label={say('Carnet de mots','Word notebook','Cuaderno de palabras')}><BookOpen size={21}/></button><button type="button" className={secondary} onClick={()=>{stopLessonAudio();setPanel('settings');}} aria-label={say('Mes outils','My tools','Mis herramientas')}><Settings size={21}/></button></div>
  </div></header>
  <main className="mx-auto max-w-2xl px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))]">
   {smallStatus}
   {state.view==='map'&&<>
    <div className="mb-6 flex items-center gap-4"><CompanionAvatar visualId="travel" state="teacher_ready" locale={locale} size="md" compact/><div className="min-w-0"><p className="text-sm font-semibold text-emerald-700">{course.city} · {say('Premières rencontres','First meetings','Primeros encuentros')}</p><h1 ref={heading} tabIndex={-1} className="mt-2 text-2xl font-black outline-none">{passed?say('Ton premier tampon est gagné !','You earned your first stamp!','¡Ganaste tu primer sello!'):say('On fait connaissance ?','Shall we get acquainted?','¿Vamos a conocernos?')}</h1></div></div>
    <section className="rounded-3xl border border-stone-200 bg-white p-5"><p className="text-sm font-bold text-emerald-800">{say('Ta prochaine étape','Your next step','Tu siguiente paso')}</p><h2 className="mt-2 text-xl font-bold">{state.resume==='final'?say('Défi final','Final challenge','Reto final'):mission.title[locale]}</h2><p className="mt-3 leading-7">{mission.goal[locale]}</p>
     {passed?<Link prefetch={false} href={`${course.legacyPath}?lang=${locale}`} className={`${primary} mt-5 w-full`}>{say('Explorer la suite du parcours','Explore the existing course','Explorar el resto del curso')}</Link>:<button type="button" className={`${primary} mt-5 w-full`} onClick={resume}>{state.visited.length?say('Continuer ma mission','Continue my mission','Continuar mi misión'):say('Commencer ma mission','Start my mission','Empezar mi misión')}</button>}
     <Link prefetch={false} href={`/yo/langues/${course.slug}/demarrer/vocabulaire?lang=${locale}`} target="_blank" rel="noopener" className={`${secondary} mt-3 underline`}>{say('Voir / imprimer les mots et verbes','View / print words and verbs','Ver / imprimir palabras y verbos')}</Link>
    </section>
    <ol className="my-6 space-y-3">{course.missions.map((m,i)=>{const done=m.practice.every(e=>state.completed.includes(e.id)),available=i<=state.profile!.entry||i===0||course.missions[i-1].practice.every(e=>state.completed.includes(e.id));return <li key={m.id} className={i%2?'ml-6':'mr-6'}><button type="button" disabled={!available} className="flex min-h-16 w-full items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 text-left disabled:opacity-50" onClick={()=>{const at=steps.findIndex(s=>s.mission===i&&!state.visited.includes(s.id));move(at<0?steps.findIndex(s=>s.mission===i):at);}}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 font-bold">{done?<Check size={21}/>:i+1}</span><span className="font-semibold">{m.title[locale]}</span></button></li>;})}</ol>
    <p className="text-sm text-emerald-800">{introPoints(course,state)} {say('points d’apprentissage','learning points','puntos de aprendizaje')}{passed&&<Stamp className="ml-3 inline" aria-label={say('Tampon obtenu','Stamp earned','Sello obtenido')}/>}</p>
    <button type="button" className={`${secondary} mt-3 underline`} onClick={startFinal}>{say('Déjà à l’aise ? Essayer le défi','Already comfortable? Try the challenge','¿Ya dominas esto? Probar el reto')}</button>
    <Link prefetch={false} href={`${course.legacyPath}?lang=${locale}`} className={`${secondary} mt-2 block underline`}>{say('Retrouver mon parcours existant','Return to my existing course','Volver a mi curso existente')}</Link>
   </>}
   {state.view==='lesson'&&<>
    <p className="text-sm font-semibold text-emerald-800">{say('Mission','Mission','Misión')} {step.mission+1} · {position+1}/{missionSteps.length}</p><div className="my-3 h-2 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={position} aria-valuemin={0} aria-valuemax={missionSteps.length} aria-label={mission.title[locale]}><div className="h-full bg-emerald-700" style={{width:`${position/missionSteps.length*100}%`}}/></div>
    <h1 ref={heading} tabIndex={-1} className="mb-5 text-2xl font-bold outline-none">{mission.title[locale]}</h1>
    <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7">
     {step.kind==='recall'?<IntroQuestion key={step.id} course={course} locale={locale} audio={audio} exercise={mission.preparation[step.index - 1]} paused={panel!==null} value={state.draft} onChange={d=>save({...latest.current,draft:d})} onContinue={advance}/>:
      step.kind==='exercise'?<IntroQuestion key={step.id} course={course} locale={locale} audio={audio} exercise={mission.practice[step.index]} paused={panel!==null} value={state.draft} onChange={d=>save({...latest.current,draft:d})} onContinue={advance}/>:
      <>
       {step.kind==='study'&&<><h2 className="mb-4 text-xl font-bold">{say('Tes mots pour la mission','Your words for the mission','Tus palabras para la misión')}</h2><div className="space-y-3">{mission.phrases.map(example)}</div><PracticeAdvanceNotice locale={locale}/></>}
       {step.kind==='words'&&<><h2 className="text-xl font-bold">{say('Prêt pour la rencontre !','Ready for the conversation!','¡Todo listo para el encuentro!')}</h2><p className="mt-4 leading-7">{mission.goal[locale]}</p></>}
       {step.kind==='scene'&&<><div className="mb-5 flex items-start gap-3"><CompanionAvatar visualId="travel" state="teacher_ready" locale={locale} size="sm" compact/><h2 className="pt-2 text-xl font-bold">{say('Écoute la rencontre','Listen to the meeting','Escucha el encuentro')}</h2></div><div className="space-y-3">{mission.conversation.map((id,i)=><div key={`${id}:${i}`} className={i%2?'ml-5':'mr-5'}>{example(id)}</div>)}</div></>}
       {step.kind==='concept'&&<section data-shared-explanation><p className="text-sm font-bold text-emerald-800">{say('Comprendre la langue','Understand the language','Entender la lengua')}</p><h2 className="mt-3 text-2xl font-bold">{mission.concepts[step.index].title[locale]}</h2><p className="my-5 text-lg leading-8">{mission.concepts[step.index].body[locale]}</p><div className="space-y-3">{mission.concepts[step.index].examples.map(example)}</div></section>}
       <button type="button" className={`${primary} mt-6 w-full`} onClick={advance}>{step.kind==='study'?say('Passer à la pratique','Let’s practise','Vamos a practicar'):step.kind==='words'?say('Entrer dans la mission','Enter the mission','Entrar en la misión'):say('Continuer','Continue','Continuar')}</button>
      </>}
    </div>
   </>}
   {state.view==='final'&&<><h1 ref={heading} tabIndex={-1} className="text-2xl font-bold outline-none">{say('Défi final','Final challenge','Reto final')} · {state.finalIndex+1}/{course.final.length}</h1><p className="my-4 text-sm leading-6">{say('Réussis 5 réponses sur 6 sans aide pour gagner ton tampon.','Get 5 of 6 answers right without help to earn your stamp.','Acierta 5 de 6 respuestas sin ayuda para ganar el sello.')}</p><div className="rounded-3xl border bg-white p-5"><IntroQuestion key={`final:${state.finalIndex}`} course={course} locale={locale} audio={audio} exercise={course.final[state.finalIndex]} assessment paused={panel!==null} value={state.draft} onChange={d=>save({...latest.current,draft:d})} onContinue={nextFinal}/></div></>}
   {state.view==='result'&&<section className="rounded-3xl border bg-white p-6 text-center"><div className="flex justify-center"><CompanionAvatar visualId="travel" state={currentPassed?'celebrating':'teacher_ready'} locale={locale} size="md" compact/></div><h1 ref={heading} tabIndex={-1} className="mt-5 text-2xl font-bold outline-none">{currentPassed?say('Ton tampon est dans le passeport !','Your stamp is in your passport!','¡Tu sello está en el pasaporte!'):say('On révise, puis on réessaie.','Let’s review, then try again.','Repasamos y lo intentamos de nuevo.')}</h1><p className="mt-5 text-4xl font-black text-emerald-800">{independentScore(state.answers)}/{course.final.length}</p><p className="mt-2 text-sm">{say('réponses réussies sans aide','answers correct without help','respuestas correctas sin ayuda')}</p><button type="button" className={`${primary} mt-6 w-full`} onClick={()=>{save({...latest.current,view:'map',resume:null});focus();}}>{say('Retour à mon parcours','Back to my journey','Volver a mi recorrido')}</button>{!currentPassed&&<button type="button" className={`${secondary} mt-3`} onClick={startFinal}>{say('Réessayer le défi','Retry the challenge','Reintentar el reto')}</button>}</section>}
  </main>
  <Dialog.Root open={panel!==null} onOpenChange={open=>{if(!open){stopLessonAudio();setPanel(null);}}}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40"/><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-[#fbf9f3] p-5 shadow-xl" aria-describedby={undefined}>
   <div className="mb-4 flex items-center justify-between gap-3"><Dialog.Title className="text-xl font-bold">{panel==='notebook'?say('Carnet de mots','Word notebook','Cuaderno de palabras'):say('Mes outils','My tools','Mis herramientas')}</Dialog.Title><Dialog.Close className={secondary} aria-label={say('Fermer','Close','Cerrar')}><X/></Dialog.Close></div>
   {panel==='notebook'?<IntroNotebook course={course} locale={locale} audio={audio}/>:<div className="space-y-5"><FeedbackSettings locale={locale}/><button type="button" className={secondary} onClick={()=>{setPanel(null);setEditing(true);}}>{say('Ajuster mon départ et mon rythme','Adjust my start and pace','Ajustar mi inicio y mi ritmo')}</button><section><h3 className="font-bold">Pratiqo Match</h3><Link prefetch={false} href={`/trouver-un-prof?q=${encodeURIComponent(course.teacherQuery)}&lang=${locale}`} className={`${secondary} mt-2 underline`}>{say('Pratiquer avec un professeur','Practise with a teacher','Practicar con un profesor')}</Link></section><nav aria-label={say('Langue de l’interface','Interface language','Idioma de la interfaz')} className="flex">{(['fr','en','es'] as const).map(l=><Link prefetch={false} key={l} href={`/yo/langues/${course.slug}/demarrer?lang=${l}`} className={secondary} aria-current={locale===l?'page':undefined}>{l.toUpperCase()}</Link>)}</nav></div>}
  </Dialog.Content></Dialog.Portal></Dialog.Root>
 </div>;
}
