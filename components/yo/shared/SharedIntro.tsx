"use client";
import { YoppoWelcomeLoading } from "../onboarding/YoppoJournal";
import { introPlace, lastPlace, rememberPlace } from "@/lib/yo/travelCinema";
import { TravelFilm } from "../travel/TravelFilm";
import { useTravelCinema } from "../travel/useTravelCinema";
import { MissionFilm } from "../travel/MissionFilm";
import { useMissionCinema } from "../travel/useMissionCinema";
import { YoSpeechPractice } from "../speech/YoSpeechPractice";
import { courseSpeechLanguage } from "@/lib/yo/shared/speechLanguage";
import Link from "next/link";
import {SharedPassBalance} from "../italian/pass/SharedPassBalance";
import {showPassPilot} from "@/lib/yo/passPilot/proof.client";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { BookOpen, Plane, Settings, Stamp, X } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { IntroCourse, IntroProfile } from "@/lib/yo/shared/types";
import { L } from "@/lib/yo/shared/types";
import { courseSteps } from "@/lib/yo/shared/steps";
import { freshIntro, introKey, introPassed, introPoints, independentScore } from "@/lib/yo/shared/state";
import { createIntroSyncStore, introRevision } from "@/lib/yo/shared/introSync";
import type { YoLocale } from "@/lib/yo/types";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { LearningFeedbackProvider, FeedbackSettings, useLearningFeedback } from "../feedback/LearningFeedback";
import { primary, secondary } from "../italian/guided/copy";
import { PracticeAdvanceNotice } from "../learning/PracticeAdvance";
import { IntroAudio } from "./IntroAudio";
import { IntroQuestion } from "./IntroQuestion";
import { IntroWelcome } from "./IntroWelcome";
import { IntroNotebook } from "./IntroNotebook";
import { WorldJourneyMap } from "../journey/map/WorldJourneyMap";
import { introStageMap } from "@/lib/yo/worldMap";
import { adventureWorld } from "@/lib/yo/adventure";
import { SpanishRegionalPractice } from "../SpanishRegionalPractice";
import { spanishRegionalPractice } from "@/lib/yo/spanishRegionalPractice";
import { introContinuation, introGoalFocus, introGoalReview, introWeeklyPlan } from "@/lib/yo/shared/continuation";
import { InterestPracticeCard } from "../interests/InterestPracticeCard";
import { IntroDueReview } from "../review/IntroDueReview";
import { recordIntroReviewAttempt } from "@/lib/yo/review/intro";

type Props={course:IntroCourse;locale:YoLocale;audio:Record<string,string>};
export function SharedIntro(props:Props){return <LearningFeedbackProvider><IntroPlayer key={props.course.language + "-" + introRevision(props.course)} {...props}/></LearningFeedbackProvider>;}
const introServerSnapshot = () => null;
function IntroPlayer({course,locale,audio}:Props){
 const say=(fr:string,en:string,es:string)=>L(fr,en,es)[locale],steps=courseSteps(course),key=introKey(course.language);
 const [store]=useState(()=>createIntroSyncStore(course)),[editing,setEditing]=useState(false);
 const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot,introServerSnapshot);
 const state=snapshot?.state??freshIntro(course),ready=Boolean(snapshot),stored=!snapshot?.storageError;
 const [panel,setPanel]=useState<'notebook'|'settings'|null>(null),latest=useRef(state),heading=useRef<HTMLHeadingElement>(null),live=useRef(true);
 const feedback=useLearningFeedback();
 const [regionalOpen,setRegionalOpen]=useState(false),[regionalIndex,setRegionalIndex]=useState(0);
 const { leg, depart, finish } = useTravelCinema();
 const opened = useRef<string | null>(null);
 const hasProfile = Boolean(state.profile);
 const speechLanguage = courseSpeechLanguage(course.language);
 const { scene, present, finish: finishMission } = useMissionCinema(`intro:${course.language}`, { active: ready && hasProfile && !editing && !leg && panel === null && !regionalOpen });
 const missionIndex = steps[state.step].mission;
 useEffect(() => {
   if (!ready || !hasProfile || editing || state.view !== "lesson") return;
   const mission = course.missions[missionIndex];
   present({ id: `${mission.id}:start`, kind: "mission-start", title: mission.title[locale], detail: mission.goal[locale] });
 }, [ready, hasProfile, editing, state.view, course.missions, missionIndex, locale, present]);
 useEffect(() => {
   if (!ready || !hasProfile || state.view !== "map" || opened.current === key) return;
   opened.current = key;
   const place = introPlace(course.language, course.city);
   if (!place) return;
   // Learners with saved lesson activity are already at this destination.
   const saved = latest.current;
   if (!lastPlace() && (saved.visited.length || saved.completed.length || saved.answers.length || saved.best)) rememberPlace(place);
   else depart(place);
 }, [ready, hasProfile, state.view, key, course.language, course.city, depart]);
 useLayoutEffect(()=>{latest.current=state;},[state]);
 useEffect(()=>{live.current=true;return()=>{live.current=false;stopLessonAudio();};},[]);
 function focus(){requestAnimationFrame(()=>{heading.current?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});});}
 function move(at:number){if(!live.current||at<0||at>=steps.length)return;const fromMap=store.getSnapshot().state.view==='map';stopLessonAudio();store.move(at);focus();if(fromMap)feedback.step();}
 function leave(){if(!live.current)return;stopLessonAudio();store.leave();focus();}
 function startFinal(){if(!live.current)return;stopLessonAudio();store.startFinal();focus();}
 function advance(){
  if(!live.current||!snapshot)return;
  const result=store.advance(snapshot.token);if(!result.accepted)return;stopLessonAudio();focus();
  if(result.mission!==null){
   const mission=course.missions[result.mission];
   feedback.emit('mission:'+course.language+':'+mission.id,'mission');
   present({id:mission.id+':success',kind:'mission-success',title:mission.title[locale],detail:mission.goal[locale]});
  }
 }
 function nextFinal(){
  if(!live.current||!snapshot)return;
  const result=store.nextFinal(snapshot.token);if(!result.accepted)return;stopLessonAudio();focus();
  if(result.firstPass){
   feedback.emit('intro-stamp:'+course.language,'stamp');
   present({id:'intro-final:success',kind:'mission-success',title:say('Défi final réussi','Final challenge completed','Reto final superado')});
   present({id:'intro-stamp',kind:'artifact',title:say('Ton premier tampon','Your first stamp','Tu primer sello'),detail:course.city});
  }
 }
 function profileDone(profile:IntroProfile){if(!live.current)return;store.profile(profile);setEditing(false);focus();}
 function resume(){if(!live.current)return;store.resume();focus();feedback.step();}
 function notebook(){
  if(state.view==='final')return;stopLessonAudio();
  if(snapshot&&state.view==='lesson'&&['exercise','recall'].includes(steps[state.step].kind)&&!state.draft.checked)store.edit(snapshot.token,{...state.draft,assisted:true});
  setPanel('notebook');
 }
 const smallStatus=snapshot?.contentChanged?<div role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm">
  <p>{say('Cette leçon a changé. Actualise la page pour continuer.','This lesson has changed. Refresh the page to continue.','Esta lección ha cambiado. Actualiza la página para continuar.')}</p>
  <button type="button" className={`${secondary} mt-2`} onClick={()=>window.location.reload()}>{say('Actualiser la leçon','Refresh lesson','Actualizar la lección')}</button>
 </div>:!stored?<p role="status" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm">{say('La sauvegarde est indisponible dans ce navigateur.','Saving is unavailable in this browser.','No se puede guardar en este navegador.')}</p>:null;
 if(!ready)return <YoppoWelcomeLoading locale={locale}/>;
 if(!state.profile||editing)return <>{smallStatus&&<div className="mx-auto max-w-xl px-5 pt-5">{smallStatus}</div>}<IntroWelcome course={course} locale={locale} audio={audio} initial={state.profile} onComplete={profileDone} onCancel={state.profile?()=>setEditing(false):undefined}/></>;
 const step=steps[state.step],mission=course.missions[step.mission],missionSteps=steps.filter(s=>s.mission===step.mission),position=missionSteps.findIndex(s=>s.id===step.id);
 const phrase=(id:string)=>course.phrases.find(p=>p.id===id)!;
 const passed=introPassed(course,state),currentPassed=independentScore(state.answers)>=Math.ceil(course.final.length*.8);
 const continuation=introContinuation(course,state.profile.goal,locale);
 const weeklyPlan=introWeeklyPlan(state.profile.minutes),goalReview=introGoalReview(course,state);
 const map=state.view==='map'?introStageMap(course,state,adventureWorld(course.slug)):null;
 function openStop(id: string, stop: { entryStep?: string }) {
      if(stop.entryStep) {
        if(map?.guideId===id && latest.current.resume==='lesson'){resume();return;}
        const at=steps.findIndex(s=>s.id===stop.entryStep); if(at>=0)move(at);
        return;
      }
      if(id==='intro-final'){if(latest.current.resume==='final')resume();else startFinal();return;}
      const region=course.slug==='espagnol'?spanishRegionalPractice.findIndex(item=>item.id===id):-1;
      if(region>=0){stopLessonAudio();setRegionalIndex(region);setRegionalOpen(true);return;}
      const index=course.missions.findIndex(m=>m.id===id),s=latest.current;
      if(index<0)return;
      if(steps[s.step].mission===index&&s.resume==='lesson'){resume();return;}
      const at=steps.findIndex(item=>item.mission===index&&!s.visited.includes(item.id));
      move(at<0?steps.findIndex(item=>item.mission===index):at);
 }
 const example=(id:string)=>{const p=phrase(id);return <div key={id} className="rounded-2xl bg-emerald-50 p-4"><p lang={course.language} className="text-xl font-semibold leading-relaxed">{p.text}</p>{p.reading&&<p className="mt-1 text-base text-stone-600">{p.reading}</p>}{p.meaning[locale]!==p.text&&<p className="my-2 leading-7">{p.meaning[locale]}</p>}<IntroAudio text={p.text} speechLocale={course.speechLocale} path={audio[p.text]} locale={locale}/></div>;};
 return <div lang={locale} data-shared-course={course.language} className="min-h-screen bg-[#fbf9f3] text-stone-800">
  <header className="border-b border-stone-200 bg-white"><div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
   {state.view==='map'?<Link prefetch={false} className="text-lg font-black text-emerald-900" href={`/yo/langues?lang=${locale}`}>YoPratiqo</Link>:<button type="button" className={secondary} aria-label={say('Quitter et garder ma place','Leave and save my place','Salir y guardar mi lugar')} onClick={leave}><X size={21}/></button>}
   <span lang={course.language} className="col-span-2 row-start-2 min-w-0 text-sm font-bold sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:text-center">{course.nativeName}</span>
   <div className="col-start-2 row-start-1 flex justify-end sm:col-start-3">{state.view === "map" && <button type="button" className={secondary}
      aria-label={say("Revoir l’arrivée","Replay arrival","Repetir la llegada")}
      onClick={() => { const place = introPlace(course.language, course.city); if (place) depart(place, undefined, true); }}><Plane size={21}/></button>}<button type="button" className={secondary} disabled={state.view==='final'} onClick={notebook} aria-label={say('Carnet de mots','Word notebook','Cuaderno de palabras')}><BookOpen size={21}/></button><button type="button" className={secondary} onClick={()=>{stopLessonAudio();setPanel('settings');}} aria-label={say('Mes outils','My tools','Mis herramientas')}><Settings size={21}/></button></div>
  </div></header>
  <main className={`mx-auto ${state.view==='map'?'max-w-5xl':'max-w-2xl'} px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))]`}>
   {smallStatus}
   {course.slug==='espagnol'&&<section hidden={!regionalOpen}>
    <button type="button" className={secondary} onClick={()=>{setRegionalOpen(false);focus();}}>{say('Retour à la carte','Back to the map','Volver al mapa')}</button>
    <SpanishRegionalPractice locale={locale} selectedIndex={regionalIndex} onIndexChange={setRegionalIndex}/>
    {spanishRegionalPractice[regionalIndex].id==='es-region-caribbean-bus'&&<Link prefetch={false} href={`/yo/langues/espagnol/pays/republique-dominicaine?lang=${locale}`} className={`${secondary} mt-4 underline`}>{say('Découvrir le parcours dominicain existant','Explore the existing Dominican course','Explorar el curso dominicano existente')}</Link>}
   </section>}
   {state.view==='map'&&showPassPilot&&<SharedPassBalance locale={locale}/>}
   {state.view==='map'&&<div hidden={regionalOpen}>
    <div className="mb-6 flex items-center gap-4"><CompanionAvatar visualId="travel" state="teacher_ready" locale={locale} size="md" compact/><div className="min-w-0"><p className="text-sm font-semibold text-emerald-700">{course.city} · {say('Premières rencontres','First meetings','Primeros encuentros')}</p><h1 ref={heading} tabIndex={-1} className="mt-2 text-2xl font-black outline-none">{passed?say('Ton premier tampon est gagné !','You earned your first stamp!','¡Ganaste tu primer sello!'):say('On fait connaissance ?','Shall we get acquainted?','¿Vamos a conocernos?')}</h1></div></div>
    {passed && <IntroContinuationCard destination={continuation} locale={locale}/>}
    {map && <WorldJourneyMap model={map} locale={locale} active={!regionalOpen && !leg && !scene} onContinue={id => {
      const stop = map.destinations.find(d => d.id === id);
      if (!stop?.accessible) return;
      const place = introPlace(course.language, course.city);
      if (place) depart(place, () => openStop(id, stop));
      else openStop(id, stop);
    }}/>}
    <section data-intro-session-plan className="mb-5 rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm leading-6">
     <h2 className="font-bold text-emerald-900">{say("Pour ta prochaine séance", "For your next session", "Para tu próxima sesión")}</h2>
     <p className="mt-2">{introGoalFocus[state.profile.goal][locale]}</p>
     <p className="mt-1 text-stone-600">{weeklyPlan
      ? say(`Rythme proposé : ${weeklyPlan.sessions} séance${weeklyPlan.sessions>1?'s':''} d’environ ${weeklyPlan.minutes} min par semaine.`, `Suggested rhythm: ${weeklyPlan.sessions} session${weeklyPlan.sessions>1?'s':''} of about ${weeklyPlan.minutes} minutes per week.`, `Ritmo propuesto: ${weeklyPlan.sessions} ${weeklyPlan.sessions===1?'sesión':'sesiones'} de unos ${weeklyPlan.minutes} minutos por semana.`)
      : say("À ton rythme : une étape suffit pour reprendre le fil.", "At your pace: one step is enough to pick up where you left off.", "A tu ritmo: basta una etapa para retomar el hilo.")}</p>
     {state.resume && <p className="mt-2 font-medium">{state.resume==='final'
      ? say(`Reprends ton défi à la question ${state.finalIndex+1}.`, `Resume your challenge at question ${state.finalIndex+1}.`, `Retoma el reto en la pregunta ${state.finalIndex+1}.`)
      : say(`Ta mission en cours : ${mission.title.fr}`, `Your current mission: ${mission.title.en}`, `Tu misión en curso: ${mission.title.es}`)}</p>}
     {goalReview && <button type="button" className={`${secondary} mt-2 text-left underline`} onClick={()=>move(goalReview.step)}>{say("Revoir", "Revisit", "Repasar")} · {goalReview.title[locale]}</button>}
    </section>
    <InterestPracticeCard language={course.language} locale={locale} interests={state.profile.interests} city={course.city}/>
    <Link prefetch={false} href={`/yo/langues/${course.slug}/demarrer/vocabulaire?lang=${locale}`} target="_blank" rel="noopener" className={`${secondary} mt-3 underline`}>{say('Voir / imprimer les mots et verbes','View / print words and verbs','Ver / imprimir palabras y verbos')}</Link>
    <p className="text-sm text-emerald-800">{introPoints(course,state)} {say('points d’apprentissage','learning points','puntos de aprendizaje')}{passed&&<Stamp className="ml-3 inline" aria-label={say('Tampon obtenu','Stamp earned','Sello obtenido')}/>}</p>
    <button type="button" className={`${secondary} mt-3 underline`} onClick={startFinal}>{say('Déjà à l’aise ? Essayer le défi','Already comfortable? Try the challenge','¿Ya dominas esto? Probar el reto')}</button>
    <Link prefetch={false} href={`${course.legacyPath}?lang=${locale}`} className={`${secondary} mt-2 block underline`}>{say('Retrouver mon parcours existant','Return to my existing course','Volver a mi curso existente')}</Link>
   </div>}
   {state.view==='lesson'&&<>
    <p className="text-sm font-semibold text-emerald-800">{say('Mission','Mission','Misión')} {step.mission+1} · {position+1}/{missionSteps.length}</p><div className="my-3 h-2 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={position} aria-valuemin={0} aria-valuemax={missionSteps.length} aria-label={mission.title[locale]}><div className="h-full bg-emerald-700" style={{width:`${position/missionSteps.length*100}%`}}/></div>
    <h1 ref={heading} tabIndex={-1} className="mb-5 text-2xl font-bold outline-none">{mission.title[locale]}</h1>
    <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7">
     {step.kind==='recall'?<IntroQuestion key={snapshot!.token} course={course} locale={locale} audio={audio} exercise={mission.preparation[step.index - 1]} paused={panel!==null || Boolean(scene) || Boolean(leg)} value={state.draft} onChange={d=>live.current?store.edit(snapshot!.token,d):null} onSubmit={(draft,before)=>live.current?store.edit(snapshot!.token,draft,{draft,before}):null} onAttempt={result=>recordIntroReviewAttempt(course,mission.preparation[step.index-1],result)} onContinue={advance} onRestart={()=>{stopLessonAudio();store.restart(snapshot!.token);focus();}}/>:
      step.kind==='exercise'?<IntroQuestion key={snapshot!.token} course={course} locale={locale} audio={audio} exercise={mission.practice[step.index]} paused={panel!==null || Boolean(scene) || Boolean(leg)} value={state.draft} onChange={d=>live.current?store.edit(snapshot!.token,d):null} onSubmit={(draft,before)=>live.current?store.edit(snapshot!.token,draft,{draft,before}):null} onAttempt={result=>recordIntroReviewAttempt(course,mission.practice[step.index],result)} onContinue={advance} onRestart={()=>{stopLessonAudio();store.restart(snapshot!.token);focus();}}/>:
      <>
       {step.kind==='study'&&<><h2 className="mb-4 text-xl font-bold">{say('Tes mots pour la mission','Your words for the mission','Tus palabras para la misión')}</h2><div className="space-y-3">{mission.phrases.map(example)}</div><PracticeAdvanceNotice locale={locale}/></>}
       {step.kind==='words'&&<><h2 className="text-xl font-bold">{say('Prêt pour la rencontre !','Ready for the conversation!','¡Todo listo para el encuentro!')}</h2><p className="mt-4 leading-7">{mission.goal[locale]}</p></>}
       {step.kind==='scene'&&<><div className="mb-5 flex items-start gap-3"><CompanionAvatar visualId="travel" state="teacher_ready" locale={locale} size="sm" compact/><h2 className="pt-2 text-xl font-bold">{say('Écoute la rencontre','Listen to the meeting','Escucha el encuentro')}</h2></div><div className="space-y-3">{mission.conversation.map((id,i)=><div key={`${id}:${i}`} className={i%2?'ml-5':'mr-5'}>{example(id)}</div>)}</div></>}
       {step.kind==='concept'&&<section data-shared-explanation><p className="text-sm font-bold text-emerald-800">{say('Comprendre la langue','Understand the language','Entender la lengua')}</p><h2 className="mt-3 text-2xl font-bold">{mission.concepts[step.index].title[locale]}</h2><p className="my-5 text-lg leading-8">{mission.concepts[step.index].body[locale]}</p><div className="space-y-3">{mission.concepts[step.index].examples.map(example)}</div></section>}
       <button type="button" className={`${primary} mt-6 w-full`} onClick={advance}>{step.kind==='study'?say('Passer à la pratique','Let’s practise','Vamos a practicar'):step.kind==='words'?say('Entrer dans la mission','Enter the mission','Entrar en la misión'):say('Continuer','Continue','Continuar')}</button>
      </>}
    </div>
   </>}
   {state.view==='final'&&<><h1 ref={heading} tabIndex={-1} className="text-2xl font-bold outline-none">{say('Défi final','Final challenge','Reto final')} · {state.finalIndex+1}/{course.final.length}</h1><p className="my-4 text-sm leading-6">{say('Réussis 5 réponses sur 6 sans aide pour gagner ton tampon.','Get 5 of 6 answers right without help to earn your stamp.','Acierta 5 de 6 respuestas sin ayuda para ganar el sello.')}</p><div className="rounded-3xl border bg-white p-5"><IntroQuestion key={snapshot!.token} course={course} locale={locale} audio={audio} exercise={course.final[state.finalIndex]} assessment paused={panel!==null || Boolean(scene) || Boolean(leg)} value={state.draft} onChange={d=>live.current?store.edit(snapshot!.token,d):null} onSubmit={(draft,before)=>live.current?store.edit(snapshot!.token,draft,{draft,before}):null} onContinue={nextFinal}/></div></>}
   {state.view==='result'&&<section className="rounded-3xl border bg-white p-6 text-center"><div className="flex justify-center"><CompanionAvatar visualId="travel" state={currentPassed?'celebrating':'teacher_ready'} locale={locale} size="md" compact/></div><h1 ref={heading} tabIndex={-1} className="mt-5 text-2xl font-bold outline-none">{currentPassed?say('Ton tampon est dans le passeport !','Your stamp is in your passport!','¡Tu sello está en el pasaporte!'):say('On révise, puis on réessaie.','Let’s review, then try again.','Repasamos y lo intentamos de nuevo.')}</h1><p className="mt-5 text-4xl font-black text-emerald-800">{independentScore(state.answers)}/{course.final.length}</p><p className="mt-2 text-sm">{say('réponses réussies sans aide','answers correct without help','respuestas correctas sin ayuda')}</p>
    {passed && <IntroContinuationCard destination={continuation} locale={locale}/>}
    {goalReview && <div className="mt-4 text-left text-sm"><p>{goalReview.goal[locale]}</p><button type="button" className={`${secondary} mt-2 underline`} onClick={()=>move(goalReview.step)}>{say("Revoir", "Revisit", "Repasar")} · {goalReview.title[locale]}</button></div>}
    <button type="button" className={`${passed?secondary:primary} mt-6 w-full`} onClick={()=>{store.map();focus();}}>{say('Retour à mon parcours','Back to my journey','Volver a mi recorrido')}</button>{!currentPassed&&<button type="button" className={`${secondary} mt-3`} onClick={startFinal}>{say('Réessayer le défi','Retry the challenge','Reintentar el reto')}</button>}</section>}
   {(state.view==='map'||state.view==='result')&&!regionalOpen&&!scene&&!leg&&panel===null&&<IntroDueReview course={course} locale={locale} audio={audio}/>}
   {speechLanguage && !scene && !leg && panel === null && (state.view === "result" || (state.view === "lesson" && step.kind !== "recall" && step.kind !== "exercise")) && <div className="mt-6"><YoSpeechPractice key={mission.id} language={speechLanguage} locale={locale} scenarioId="introduction"/></div>}
  </main>
  <Dialog.Root open={panel!==null} onOpenChange={open=>{if(!open){stopLessonAudio();setPanel(null);}}}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40"/><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-[#fbf9f3] p-5 shadow-xl" aria-describedby={undefined}>
   <div className="mb-4 flex items-center justify-between gap-3"><Dialog.Title className="text-xl font-bold">{panel==='notebook'?say('Carnet de mots','Word notebook','Cuaderno de palabras'):say('Mes outils','My tools','Mis herramientas')}</Dialog.Title><Dialog.Close className={secondary} aria-label={say('Fermer','Close','Cerrar')}><X/></Dialog.Close></div>
   {panel==='notebook'?<IntroNotebook course={course} locale={locale} audio={audio}/>:<div className="space-y-5"><FeedbackSettings locale={locale}/><button type="button" className={secondary} onClick={()=>{setPanel(null);setEditing(true);}}>{say('Ajuster mon départ et mon rythme','Adjust my start and pace','Ajustar mi inicio y mi ritmo')}</button><section><h3 className="font-bold">Pratiqo Match</h3><Link prefetch={false} href={`/trouver-un-prof?q=${encodeURIComponent(course.teacherQuery)}&lang=${locale}`} className={`${secondary} mt-2 underline`}>{say('Pratiquer avec un professeur','Practise with a teacher','Practicar con un profesor')}</Link></section><nav aria-label={say('Langue de l’interface','Interface language','Idioma de la interfaz')} className="flex">{(['fr','en','es'] as const).map(l=><Link prefetch={false} key={l} href={`/yo/langues/${course.slug}/demarrer?lang=${l}`} className={secondary} aria-current={locale===l?'page':undefined}>{l.toUpperCase()}</Link>)}</nav></div>}
  </Dialog.Content></Dialog.Portal></Dialog.Root>
  {leg && <TravelFilm locale={locale} leg={leg} onArrival={finish}/>}
  {scene && <MissionFilm scene={scene} locale={locale} onContinue={finishMission}/>}
 </div>;
}

function IntroContinuationCard({ destination, locale }: { destination: ReturnType<typeof introContinuation>; locale: YoLocale }) {
 return <section data-intro-continuation className="my-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left">
  <h2 className="text-lg font-bold text-emerald-950">{L("La suite de ton apprentissage", "Keep learning", "Sigue aprendiendo")[locale]}</h2>
  <p className="mt-2 font-semibold">{destination.title[locale]}</p>
  <p className="mt-2 text-sm leading-6">{destination.description[locale]}</p>
  <Link prefetch={false} className={`${primary} mt-4 w-full`} href={destination.href} onClick={stopLessonAudio}>{L("Continuer", "Continue", "Continuar")[locale]} · {destination.title[locale]}</Link>
 </section>;
}
