"use client";
import { adventureCopy } from "@/lib/yo/adventure";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, MapPin, MessageCircle, RotateCcw, Trophy } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import type { CourseAssessment, CoursePhrase, CourseQuestion } from "@/lib/yo/italian/course/courseTypes";
import { ItalianGame, type ItalianAttemptDetail } from "../ItalianGames";
import { ItalianYoppoCoach } from "../ItalianYoppoCoach";
import { ItalianModuleAudio, ITALIAN_MODULE_AUDIO_STOP_EVENT } from "../ItalianModuleAudio";
import { italianAssessmentHref, italianCourseHref } from "@/lib/yo/italian/course/courseLinks";
import { phrase, t } from "@/lib/yo/italian/course/courseAuthoring";
import { C, CoursePanel, CourseProgressBar, courseButton, courseOutline } from "./CourseShared";
import { CourseBonus } from "./CourseBonus";
import { CourseCulturePhoto } from "./CourseCulturePhoto";

type Answer={correct:boolean;assisted:boolean;optionId?:string};
const missionCopy = {
 fr: {
  mission: "Mission de l’unité", scene: "Scène", scenes: "scènes", character: "Avec",
  midpoint: "Halte de mi-parcours", beginMidpoint: "Commencer la halte", retakeMidpoint: "Rejouer la halte",
  midpointRule: "Ta première réponse à chaque question compte. Lis ensuite la correction. Les indices et les transcriptions comptent comme aide ; tu peux rejouer cette halte.",
  midpointPassed: "Halte réussie", midpointReview: "Quelques repères à reprendre",
  review: "Reprendre les points à travailler",
 },
 en: {
  mission: "Unit mission", scene: "Scene", scenes: "scenes", character: "With",
  midpoint: "Midpoint recap", beginMidpoint: "Start the recap", retakeMidpoint: "Retake the recap",
  midpointRule: "Your first answer to each question counts. Read the feedback afterwards. Hints and transcripts count as help; you can retake this recap.",
  midpointPassed: "Recap targets reached", midpointReview: "A few points to revisit",
  review: "Revisit the points to work on",
 },
 es: {
  mission: "Misión de la unidad", scene: "Escena", scenes: "escenas", character: "Con",
  midpoint: "Repaso a mitad de camino", beginMidpoint: "Empezar el repaso", retakeMidpoint: "Repetir el repaso",
  midpointRule: "Cuenta tu primera respuesta a cada pregunta. Lee después la corrección. Las pistas y transcripciones cuentan como ayuda; puedes repetir este repaso.",
  midpointPassed: "Objetivos del repaso alcanzados", midpointReview: "Algunos puntos por retomar",
  review: "Volver a los puntos por trabajar",
 },
} as const;
function expected(question:CourseQuestion,locale:YoLocale){if(question.kind==="type")return question.model;const option=question.options.find(o=>o.id===question.correctId);return option?.it??option?.label?.[locale]??"";}
const bonusPool=[phrase("Grazie!","Merci !","Thank you!","¡Gracias!"),phrase("Ciao!","Salut !","Hi!","¡Hola!"),phrase("Scusi.","Excusez-moi.","Excuse me.","Disculpe.")];

/** One recorded answer per item; a new run is required to improve the score. */
export function CourseAssessmentPlayer({assessment,locale,onComplete,bonusPhrases=bonusPool,resultAction}:{resultAction?:ReactNode;assessment:CourseAssessment;locale:YoLocale;onComplete:(id:string,correct:number,total:number,assisted:boolean)=>void;bonusPhrases?:CoursePhrase[]}){
 const copy=C[locale];
 const sceneCopy=missionCopy[locale],mission=assessment.mission,midpoint=assessment.purpose==="midpoint";
 const [phase,setPhase]=useState<"intro"|"questions"|"result">("intro"),[index,setIndex]=useState(0),[run,setRun]=useState(0),[answers,setAnswers]=useState<Answer[]>([]),[answer,setAnswer]=useState<Answer|null>(null),[bonus,setBonus]=useState(false),[review,setReview]=useState(false);
 const assisted=useRef(false),answered=useRef(false),submitted=useRef(false),transitioning=useRef(false),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{transitioning.current=false;},[index,phase,run]);
 const question=assessment.questions[index],total=assessment.questions.length;
 const score=Math.round(answers.filter(a=>a.correct).length/total*100),hadHelp=answers.some(a=>a.assisted);
 const independentPass=!hadHelp&&score>=assessment.passPercent;
 const scene=mission?.scenes[question.id];
 const selectedOption=question.kind!=="type"&&answer?.optionId?question.options.find(option=>option.id===answer.optionId):undefined;
 const responseFeedback=selectedOption?.feedback[locale];
 const reviewUnits=[...new Set(assessment.questions.flatMap((item,itemIndex)=>
  answers[itemIndex]&&(!answers[itemIndex].correct||answers[itemIndex].assisted)
   ? item.taughtInUnitId?[item.taughtInUnitId]:assessment.unitIds
   : []
 ))];
 function focus(){requestAnimationFrame(()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:"start",behavior:"instant"});});}
 function stop(){window.dispatchEvent(new Event(ITALIAN_MODULE_AUDIO_STOP_EVENT));}
 function begin(){stop();setIndex(0);setRun(n=>n+1);setAnswers([]);setAnswer(null);setBonus(false);setReview(false);assisted.current=false;answered.current=false;submitted.current=false;setPhase("questions");focus();}
 function help(){if(phase==="questions"&&!answered.current)assisted.current=true;}
 function respond(correct:boolean,detail?:ItalianAttemptDetail){if(transitioning.current||answered.current||phase!=="questions")return;answered.current=true;stop();const optionId=question.kind!=="type"&&question.options.some(option=>option.id===detail?.optionId)?detail?.optionId:undefined;const value={correct,assisted:assisted.current,...(optionId?{optionId}:{})};setAnswer(value);setAnswers(previous=>[...previous,value]);}
 function next(){if(transitioning.current||!answer||!answered.current)return;if(index===total-1&&answers.length!==total)return;transitioning.current=true;stop();if(index===total-1){if(!submitted.current){submitted.current=true;onComplete(assessment.id,answers.filter(a=>a.correct).length,total,answers.some(a=>a.assisted));}setPhase("result");}else{setIndex(index+1);setAnswer(null);assisted.current=false;answered.current=false;setBonus(false);setReview(false);}focus();}
 const italianExample=question.kind==="type"?question.model:question.options.find(option=>option.id===question.correctId)?.it;
 const example=italianExample?{it:italianExample,meaning:question.explanation}:undefined;
 return <div data-course-mission={mission?assessment.id:undefined}>
  {phase==="intro"?<CoursePanel>{mission||midpoint||assessment.theme!=="culture"?<p className="mb-2 text-xs font-bold text-emerald-800">{mission?sceneCopy.mission:midpoint?sceneCopy.midpoint:adventureCopy[locale].challenge}</p>:null}<p className="text-xs font-bold uppercase tracking-widest text-[#a35e3f]">{total} {mission?sceneCopy.scenes:copy.games}</p><h2 ref={heading} tabIndex={-1} className="mt-3 font-serif text-3xl outline-none">{mission?.title[locale]??assessment.title[locale]}</h2><p className="mt-4 text-sm leading-relaxed">{mission?.briefing[locale]??assessment.description[locale]}</p><p className="mt-4 rounded-2xl bg-[#f3eee3] p-4 text-sm leading-relaxed">{midpoint?sceneCopy.midpointRule:copy.quizRule}</p><p className="mt-4 text-sm font-bold text-[#245a46]">{copy.target}</p><p className="mt-3 text-xs leading-6 text-gray-600">{adventureCopy[locale].retry}</p><button type="button" onClick={begin} className={`${courseButton} mt-6`}>{midpoint?sceneCopy.beginMidpoint:copy.beginQuiz}<ArrowRight size={17} aria-hidden/></button></CoursePanel>:null}
  {phase==="questions"?<><CourseProgressBar value={index} total={total} label={`${mission?sceneCopy.scene:copy.question} ${index+1}/${total}`}/><h2 ref={heading} tabIndex={-1} className="my-5 font-serif text-3xl outline-none">{scene?.title[locale]??question.title[locale]}</h2>{bonus?<CourseBonus locale={locale} phrases={bonusPhrases} onClose={()=>setBonus(false)}/>:null}{review?<CoursePanel className="mb-5"><h3 className="font-serif text-xl">{copy.review}</h3><div className="mt-3 flex flex-wrap gap-2">{(question.taughtInUnitId?[question.taughtInUnitId]:assessment.unitIds).map(id=><Link key={id} href={italianCourseHref(locale,id)} className={courseOutline}>{copy.unit} {Number(id.slice(1))}</Link>)}</div></CoursePanel>:null}
   <div className="mb-5"><ItalianYoppoCoach presentation="inline" locale={locale} contextId={`${assessment.id}-${run}-${question.id}-${answer?"answered":"open"}`} message={question.prompt} hint={question.hint} hint2={question.hint2} explanation={question.explanation} example={example} exampleAudio={example?<ItalianModuleAudio text={example.it} locale={locale}/>:undefined} visualState={answer?answer.correct?"celebrating":"confused":"teacher_ready"} totalCount={total} completedCount={answers.filter(item=>item.correct).length} reviewCount={question.taughtInUnitId?1:assessment.unitIds.length} onAction={action=>{if(action==="hint"||action==="explain")help();if(action==="challenge"){help();setBonus(true);}if(action==="review"){help();setReview(true);}}}/></div>
   <div className={question.photo?"grid min-w-0 items-start gap-5 md:grid-cols-2":""}>{question.photo?<CourseCulturePhoto photo={question.photo} locale={locale} reveal={Boolean(answer)} onSource={help} compact/>:null}<CoursePanel>
    {scene?<div data-testid="course-mission-scene" className="mb-6 rounded-2xl border border-[#d1dfcb] bg-[#eff4e9] p-4 sm:p-5">
     <p className="flex items-start gap-2 text-sm font-bold text-[#245a46]"><MessageCircle size={18} className="mt-0.5 shrink-0" aria-hidden/><span>{sceneCopy.character} {scene.character[locale]}</span></p>
     <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-[#4c5947]"><MapPin size={18} className="mt-0.5 shrink-0" aria-hidden/><span>{scene.setting[locale]}</span></p>
    </div>:null}
    <p className="mb-6 text-base leading-relaxed">{question.prompt[locale]}</p>{answer?<div role="status">
     {scene?<p data-testid="course-mission-outcome" className="mb-4 rounded-2xl bg-[#f3eee3] p-4 text-base font-semibold leading-relaxed">{answer.correct?scene.success[locale]:scene.recovery[locale]}</p>:null}
     <p className={`text-lg font-bold ${answer.correct?"text-[#245a46]":"text-[#a25c31]"}`}>{answer.correct?copy.correct:copy.wrong}</p><p className="mt-2 text-xs text-[#7b6b55]">{copy.firstTry} · {answer.assisted?copy.assisted:copy.independent}</p>
     {responseFeedback&&responseFeedback!==question.explanation[locale]?<p data-testid="course-response-feedback" className="mt-4 text-sm leading-relaxed">{responseFeedback}</p>:null}
     <p lang={question.kind==="type"||question.options.find(o=>o.id===question.correctId)?.it?"it":undefined} className="mt-5 rounded-2xl bg-[#edf2e6] p-4 text-lg font-semibold">{expected(question,locale)}</p><p className="mt-4 text-sm leading-relaxed">{question.explanation[locale]}</p><button type="button" className={`${courseButton} mt-6`} onClick={next}>{index===total-1?copy.finishQuiz:copy.nextQuestion}<ArrowRight size={17} aria-hidden/></button></div>:<><ItalianGame key={`${assessment.id}-${run}-${question.id}`} activity={question} locale={locale} onAttempt={respond} onHelp={help}/><button type="button" className="mt-5 min-h-11 text-xs underline text-[#7d6b50]" onClick={()=>respond(false)}>{copy.skip}</button></>}</CoursePanel></div>

  </>:null}
  {phase==="result"?<CoursePanel><Trophy size={35} className="text-[#b26640]" aria-hidden/><h2 ref={heading} tabIndex={-1} className="mt-4 font-serif text-3xl outline-none">{midpoint?independentPass?sceneCopy.midpointPassed:sceneCopy.midpointReview:independentPass?copy.passed:copy.reviewNeeded}</h2>
   {mission?<p data-testid="course-mission-result" className="mt-4 rounded-2xl bg-[#eff4e9] p-4 text-base font-semibold leading-relaxed text-[#245a46]">{independentPass?mission.success[locale]:hadHelp?mission.assisted[locale]:mission.retry[locale]}</p>:null}
   <p className="mt-6 text-5xl font-bold text-[#245a46]">{score} %</p><p className="mt-2 text-sm">{answers.filter(a=>a.correct).length}/{total} · {hadHelp?copy.assisted:copy.independent}</p><p className="mt-4 text-sm leading-relaxed">{copy.target}</p><ol className="mt-6 grid gap-2 sm:grid-cols-2">{assessment.questions.map((q,i)=><li key={q.id} className="rounded-xl bg-[#f3eee3] p-3 text-xs"><span className="font-semibold">{i+1}. {mission?.scenes[q.id]?.title[locale]??q.title[locale]}</span><span className="ml-2">{answers[i]?.correct?"✓":"↻"} {answers[i]?.assisted?copy.assisted:copy.independent}</span></li>)}</ol>
   {(mission||midpoint)&&reviewUnits.length?<div className="mt-5 rounded-2xl border border-[#e5ddce] p-4"><h3 className="text-sm font-bold">{sceneCopy.review}</h3><div className="mt-3 flex flex-wrap gap-2">{reviewUnits.map(id=><Link key={id} href={italianCourseHref(locale,id)} className={courseOutline}>{copy.unit} {Number(id.slice(1))}</Link>)}</div></div>:null}
   <p className="mt-5 text-xs leading-relaxed text-[#7d6b50]">{copy.assessmentNote}</p>{resultAction}<div className="mt-6 flex flex-wrap gap-3"><button type="button" className={courseButton} onClick={begin}><RotateCcw size={16} aria-hidden/>{midpoint?sceneCopy.retakeMidpoint:copy.retake}</button><Link href={italianCourseHref(locale)} className={courseOutline}>{copy.returnCourse}</Link></div></CoursePanel>:null}
 {phase==="result"&&assessment.id==="it1-final"?<Link href={italianAssessmentHref(locale,"it1-culture-finale")} className={`${courseButton} mt-6`}>{t("Dernière escale · L’Italie en images","Last stop · Italy in pictures","Última parada · Italia en imágenes")[locale]}<ArrowRight size={17} aria-hidden/></Link>:null}
 </div>;
}
