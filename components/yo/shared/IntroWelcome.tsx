"use client";
import { useLayoutEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { goal as francisationGoal, purpose } from "@/lib/yo/francisation/mission";
import { Check } from "lucide-react";
import { JournalChoice, useYoppoJournal, YoppoWelcomeGuide, YoppoWelcomeLoading } from "../onboarding/YoppoJournal";
import type { IntroCourse, IntroProfile, Draft } from "@/lib/yo/shared/types";
import { L } from "@/lib/yo/shared/types";
import { emptyDraft, suggestedMission } from "@/lib/yo/shared/state";
import { visibleIntroPace } from "@/lib/yo/shared/releaseChoices";
import type { YoLocale } from "@/lib/yo/types";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { FeedbackSettings } from "../feedback/LearningFeedback";
import { primary, secondary } from "../italian/guided/copy";
import { IntroQuestion } from "./IntroQuestion";
import { InterestChoices } from "../interests/InterestChoices";
import { interestLanguage, interestLabels, writeInterestPreferences } from "@/lib/yo/interests/preferences";
import { createSharedWelcomeStore, type SharedWelcomeDraft } from "@/lib/yo/onboarding/draftAdapters";
import { sameDraft } from "@/lib/yo/onboarding/draftStore";
import { useOnboardingDraft } from "../onboarding/useOnboardingDraft";
import { OnboardingDraftNotice } from "../onboarding/OnboardingDraftNotice";
export function IntroWelcome({course,locale,audio,initial,onComplete,onCancel,onChooseFrancisation}:{course:IntroCourse;locale:YoLocale;audio:Record<string,string>;initial?:IntroProfile|null;onComplete:(p:IntroProfile)=>void;onCancel?:()=>void;onChooseFrancisation?:()=>void}){
 const say=(fr:string,en:string,es:string)=>L(fr,en,es)[locale];
 const journal = useYoppoJournal();
 const store=useMemo(()=>createSharedWelcomeStore(course,initial),[course,initial]);
 const snapshot=useOnboardingDraft(store);
 const {step,interests,experience,minutes,custom,customText,entry,picker,answers,draft}=snapshot.state;
 const guide=useRef<HTMLDivElement>(null),heading=useRef<HTMLHeadingElement>(null);
 useLayoutEffect(()=>{if(!snapshot.ready)return;const f=requestAnimationFrame(()=>{guide.current?.scrollIntoView({block:'start',behavior:'instant'});heading.current?.focus({preventScroll:true});});return()=>cancelAnimationFrame(f);},[snapshot.ready,step,answers.length]);
 const amount=visibleIntroPace(minutes,custom,customText);
 const valid=amount!==null;
 const titles={interests:say('Qu’est-ce qui t’intéresse ?','What do you enjoy?','¿Qué te interesa?'),experience:say(`${course.greeting} ! Tu connais déjà quelques mots ?`,`${course.greeting}! Know a few words already?`,`${course.greeting}! ¿Ya sabes algunas palabras?`),goal:say('Qu’est-ce qui te donne envie d’apprendre ?','What makes you want to learn?','¿Qué te anima a aprender?'),pace:say('Quel rythme te convient ?','What pace suits you?','¿Qué ritmo te viene bien?'),choice:say('Trouvons ton point de départ.','Let’s find your starting point.','Busquemos tu punto de partida.'),check:say('Voyons ce que tu connais déjà.','Let’s see what you already know.','Veamos lo que ya sabes.'),result:say('Je te propose de commencer ici !','I suggest starting here!','¡Te propongo empezar aquí!')};
 function change(patch:Partial<SharedWelcomeDraft>){return store.update(snapshot.token,current=>({...current,...patch}));}
 function go(next:typeof step,patch:Partial<SharedWelcomeDraft>={}){stopLessonAudio();return change({...patch,step:next});}
 function nextCheck(){
  const accepted=store.update(snapshot.token,current=>{
   if(current.step!=='check'||!current.draft.checked||current.answers.length>=course.final.length)return null;
   const next=[...current.answers,{correct:current.draft.correct,assisted:current.draft.assisted}];
   return {...current,answers:next,draft:emptyDraft(),...(next.length===course.final.length?{entry:suggestedMission(next),step:'result' as const}: {})};
  });
  if(accepted){stopLessonAudio();journal.write(`${say("Question", "Question", "Pregunta")} ${answers.length+1}`);}
 }
 function editDraft(next:Draft){
  const accepted=store.update(snapshot.token,current=>{
   if(current.step!=='check'||current.answers.length!==answers.length||current.draft.checked||next.checked||!sameDraft(current.draft,draft))return null;
   return {...current,draft:{...next,assisted:current.draft.assisted||next.assisted||next.transcript}};
  });
  return accepted?.draft??null;
 }
 function submitDraft(next:Draft,before:Draft){
  const accepted=store.update(snapshot.token,current=>{
   if(current.step!=='check'||current.answers.length!==answers.length||current.draft.checked||!next.checked||!sameDraft(current.draft,before))return null;
   const exercise=course.final[answers.length],phrase=course.phrases.find(item=>item.id===exercise.answer)!;
   const correct=exercise.kind==='order'?next.tiles.length===phrase.parts?.length&&next.tiles.every((n,i)=>n===i):next.selected===exercise.answer;
   if(next.correct!==correct)return null;
   return {...current,draft:{...next,assisted:current.draft.assisted||next.assisted||next.transcript}};
  });
  return accepted?.draft??null;
 }
 function restartCheck(){journal.clear();return go('check',{answers:[],draft:emptyDraft(),picker:false});}
 function finish(){
  const accepted=store.consume(snapshot.token);if(!accepted||accepted.step!=='result')return;
  stopLessonAudio();const language=interestLanguage(course.language);if(language)writeInterestPreferences(language,accepted.interests);
  onComplete({experience:accepted.experience,goal:accepted.goal,minutes:visibleIntroPace(accepted.minutes,accepted.custom,accepted.customText)??0,entry:accepted.entry,interests:accepted.interests});
 }
 const experienceLabels = [say('Je pars de zéro','I’m starting from zero','Empiezo de cero'),say('Je connais quelques mots','I know a few words','Conozco algunas palabras'),say('J’ai déjà des bases','I already have a background','Ya tengo una base')];
 const goalLabels = [say('Voyager','Travel','Viajar'),say('Famille et amis','Family and friends','Familia y amistades'),say('Travail ou études','Work or studies','Trabajo o estudios'),say('Parler au quotidien','Everyday conversation','Conversar cada día'),say('Apprendre en profondeur','Learn the language thoroughly','Aprender a fondo')];
 const paceLabel = (n: number) => n ? `${n} min / ${say("semaine", "week", "semana")}` : say("À mon rythme", "At my pace", "A mi ritmo");
 if(!snapshot.ready)return <YoppoWelcomeLoading locale={locale}/>;
 return <main lang={locale} data-shared-welcome={course.language} data-welcome-step={step} className="yj-welcome"><div className="yj-page">
  <div ref={guide} data-shared-guide className="scroll-mt-3">
    <YoppoWelcomeGuide title={titles[step]} language={course.nativeName} locale={locale} step={step} entry={journal.entry} headingRef={heading}/>
  </div>
  <OnboardingDraftNotice snapshot={snapshot} locale={locale}/>
  {step === 'experience' && <div className="yj-options">{(['new','some','confident'] as const).map((v,i) =>
    <JournalChoice key={v} kind={v} label={experienceLabels[i]} onPick={() => {
      if(go('goal',{experience:v}))journal.write(experienceLabels[i]);
    }}/>
  )}</div>}
  {step === 'goal' && <div className="yj-options">{(['travel','family','work','conversation','thorough'] as const).map((v,i) =>
    <JournalChoice key={v} kind={v} label={goalLabels[i]} onPick={() => {
      if(go('interests',{goal:v}))journal.write(goalLabels[i]);
    }}/>
  )}{onChooseFrancisation && <button type="button" lang="fr-CA" className="yj-option" onClick={() => {
    if (change({})) onChooseFrancisation();
  }}><span><strong className="block">{francisationGoal}</strong><span className="block text-sm font-normal">{purpose}</span></span></button>}</div>}
  {step==='interests'&&<><InterestChoices locale={locale} value={interests} onChange={next=>{if(change({interests:next}))journal.write(next.map(id=>interestLabels[id][locale]).join(' · ')||say('Surprends-moi','Surprise me','Sorpréndeme'));}}/><button type="button" className={`${primary} mt-5 w-full`} onClick={()=>go('pace')}>{say('Continuer','Continue','Continuar')}</button></>}
  {step==='pace'&&<><fieldset><legend className="sr-only">{titles.pace}</legend><div className="grid grid-cols-2 gap-3">{[30,60,120,180,0].map(n=><label key={n} data-shared-pace={n} className={`cursor-pointer ${n===0?'col-span-2':''}`}><input className="peer sr-only" type="radio" name="intro-pace" value={n} checked={minutes===n&&!custom} aria-label={n===0?say('À mon rythme','At my pace','A mi ritmo'):`${n} min`} onChange={()=>{if(change({minutes:n,custom:false}))journal.write(paceLabel(n));}}/><span className={`flex min-h-16 items-center justify-between gap-2 rounded-2xl border-2 p-4 font-bold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 ${minutes===n&&!custom?'border-emerald-700 bg-emerald-50':'border-stone-200 bg-white'}`}><span>{n===0?say('À mon rythme','At my pace','A mi ritmo'):n<60?`${n} min`:`${n/60} h`}{n>0&&<small className="block font-normal">{say('par semaine','per week','por semana')}</small>}</span>{minutes===n&&!custom&&<Check size={22} aria-hidden/>}</span></label>)}</div></fieldset>
   <button type="button" className={`${secondary} mt-2`} aria-expanded={custom} onClick={()=>change({custom:!custom})}>{say('Choisir une autre durée','Choose another duration','Elegir otra duración')}</button>{custom&&<label className="mt-3 block">{say('Minutes par semaine (15 à 1 200)','Minutes per week (15–1,200)','Minutos por semana (15–1200)')}<input type="number" inputMode="numeric" min="15" max="1200" step="1" className="mt-2 min-h-12 w-full rounded-xl border bg-white p-3 text-base" value={customText} maxLength={16} onChange={e=>change({customText:e.target.value.slice(0,16)})}/></label>}
   <button type="button" className={`${primary} mt-5 w-full`} disabled={!valid} onClick={()=>{if(!valid)return;if(custom && amount!==null)journal.write(paceLabel(amount));if(experience==='new')go('result',{minutes:amount,entry:initial?.entry??0});else go('choice',{minutes:amount});}}>{say('Continuer','Continue','Continuar')}</button></>}
  {step==='choice'&&<><p className="mb-4 leading-7">{say('Quelques questions, ou choisis directement une mission.','Try a few questions, or choose a mission directly.','Prueba unas preguntas o elige una misión directamente.')}</p><button type="button" className={`${primary} w-full`} onClick={restartCheck}>{say('Trouver mon point de départ','Find my starting point','Encontrar mi punto de partida')}</button><button type="button" className={`${secondary} mt-3 w-full`} onClick={()=>{journal.clear();go('result',{picker:true});}}>{say('Choisir moi-même','Choose for myself','Elegir por mi cuenta')}</button><Link prefetch={false} className={`${secondary} mt-2 w-full underline`} href={`${course.legacyPath}?lang=${locale}`}>{say('Retrouver le parcours existant','Go to the existing course','Ir al curso existente')}</Link></>}
  {step==='check'&&<div className="rounded-3xl border bg-white p-5"><p className="mb-3 text-sm">{answers.length+1}/{course.final.length}</p><IntroQuestion key={`${answers.length}:${snapshot.changedElsewhere ? snapshot.token : 'local'}`} course={course} locale={locale} audio={audio} exercise={course.final[answers.length]} assessment value={draft} onChange={editDraft} onSubmit={submitDraft} onContinue={nextCheck} paused={snapshot.invalidated||snapshot.consumed}/><button type="button" className={`${secondary} mt-3`} onClick={()=>{journal.clear();go('result',{picker:true});}}>{say('Choisir plutôt une mission','Choose a mission instead','Elegir una misión')}</button></div>}
  {step==='result'&&<section data-shared-recommendation className="rounded-3xl border border-stone-200 bg-white p-5"><p className="text-xs font-bold uppercase text-emerald-800">{say('Ta première mission','Your first mission','Tu primera misión')}</p><h2 className="mt-3 text-xl font-bold">{course.missions[entry].title[locale]}</h2><p className="mt-3 leading-7">{course.missions[entry].goal[locale]}</p><p className="mt-4 text-sm text-stone-600">{valid&&amount?`${amount%60===0?`${amount/60} h`:`${amount} min`} / ${say('semaine','week','semana')}`:say('À ton rythme','At your pace','A tu ritmo')}</p><button type="button" className={`${primary} mt-5 w-full`} onClick={finish}>{say('Commencer ici','Start here','Empezar aquí')}</button><button type="button" className={`${secondary} mt-2 w-full`} aria-expanded={picker} onClick={()=>change({picker:!picker})}>{say('Changer de mission','Change mission','Cambiar de misión')}</button>{picker&&<label className="mt-3 block text-sm">{say('Mission','Mission','Misión')}<select className="mt-2 min-h-12 w-full min-w-0 max-w-full rounded-xl border bg-white px-3 text-base" value={entry} onChange={e=>change({entry:Number(e.target.value)})}>{course.missions.map((m,i)=><option key={m.id} value={i}>{m.title[locale]}</option>)}</select><Link prefetch={false} className={`${secondary} mt-2 underline`} href={`${course.legacyPath}?lang=${locale}`}>{say('Retrouver le parcours existant','Go to the existing course','Ir al curso existente')}</Link></label>}</section>}
  {(step==='check'||step==='result'&&answers.length>0)&&<button type="button" className={`${secondary} mt-3 w-full`} onClick={restartCheck}>{say('Recommencer ce questionnaire','Start this check again','Reiniciar este cuestionario')}</button>}
  <footer className="mt-5 border-t pt-3"><div className="flex flex-wrap justify-between">{step!=='experience'&&step!=='check'&&<button type="button" className={secondary} onClick={()=>{journal.clear();go(step==='goal'?'experience':step==='interests'?'goal':step==='pace'?'interests':'pace');}}>{say('Retour','Back','Volver')}</button>}{onCancel?<button type="button" className={secondary} onClick={()=>{if(store.consume(snapshot.token)){stopLessonAudio();onCancel();}}}>{say('Garder mon parcours','Keep my journey','Conservar mi recorrido')}</button>:step!=='result'&&step!=='check'&&<button type="button" className={secondary} onClick={()=>{journal.clear();go('result',{picker:true,...(!valid?{minutes:0,custom:false}:{})});}}>{say('Passer','Skip','Omitir')}</button>}</div><FeedbackSettings locale={locale} compact/></footer>
 </div></main>;
}
