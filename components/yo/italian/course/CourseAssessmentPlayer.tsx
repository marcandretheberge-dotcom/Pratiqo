"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, RotateCcw, Trophy } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import type { CourseAssessment, CoursePhrase, CourseQuestion } from "@/lib/yo/italian/course/courseTypes";
import { ItalianGame } from "../ItalianGames";
import { ItalianYoppoCoach } from "../ItalianYoppoCoach";
import { ItalianModuleAudio, ITALIAN_MODULE_AUDIO_STOP_EVENT } from "../ItalianModuleAudio";
import { italianCourseHref } from "@/lib/yo/italian/course/courseLinks";
import { phrase } from "@/lib/yo/italian/course/courseAuthoring";
import { C, CoursePanel, CourseProgressBar, courseButton, courseOutline } from "./CourseShared";
import { CourseBonus } from "./CourseBonus";

type Answer={correct:boolean;assisted:boolean};
function expected(question:CourseQuestion,locale:YoLocale){if(question.kind==="type")return question.model;const option=question.options.find(o=>o.id===question.correctId);return option?.it??option?.label?.[locale]??"";}
const bonusPool=[phrase("Grazie!","Merci !","Thank you!","¡Gracias!"),phrase("Ciao!","Salut !","Hi!","¡Hola!"),phrase("Scusi.","Excusez-moi.","Excuse me.","Disculpe.")];

/** One recorded answer per item; a new run is required to improve the score. */
export function CourseAssessmentPlayer({assessment,locale,onComplete,bonusPhrases=bonusPool}:{assessment:CourseAssessment;locale:YoLocale;onComplete:(id:string,correct:number,total:number,assisted:boolean)=>void;bonusPhrases?:CoursePhrase[]}){
 const copy=C[locale];
 const [phase,setPhase]=useState<"intro"|"questions"|"result">("intro"),[index,setIndex]=useState(0),[run,setRun]=useState(0),[answers,setAnswers]=useState<Answer[]>([]),[answer,setAnswer]=useState<Answer|null>(null),[bonus,setBonus]=useState(false),[review,setReview]=useState(false);
 const assisted=useRef(false),answered=useRef(false),submitted=useRef(false),transitioning=useRef(false),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{transitioning.current=false;},[index,phase,run]);
 const question=assessment.questions[index],total=assessment.questions.length;
 const score=Math.round(answers.filter(a=>a.correct).length/total*100),hadHelp=answers.some(a=>a.assisted);
 function focus(){requestAnimationFrame(()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:"start",behavior:"instant"});});}
 function stop(){window.dispatchEvent(new Event(ITALIAN_MODULE_AUDIO_STOP_EVENT));}
 function begin(){stop();setIndex(0);setRun(n=>n+1);setAnswers([]);setAnswer(null);setBonus(false);setReview(false);assisted.current=false;answered.current=false;submitted.current=false;setPhase("questions");focus();}
 function help(){if(phase==="questions"&&!answered.current)assisted.current=true;}
 function respond(correct:boolean){if(transitioning.current||answered.current||phase!=="questions")return;answered.current=true;stop();const value={correct,assisted:assisted.current};setAnswer(value);setAnswers(previous=>[...previous,value]);}
 function next(){if(transitioning.current||!answer||!answered.current)return;if(index===total-1&&answers.length!==total)return;transitioning.current=true;stop();if(index===total-1){if(!submitted.current){submitted.current=true;onComplete(assessment.id,answers.filter(a=>a.correct).length,total,answers.some(a=>a.assisted));}setPhase("result");}else{setIndex(index+1);setAnswer(null);assisted.current=false;answered.current=false;setBonus(false);setReview(false);}focus();}
 const italianExample=question.kind==="type"?question.model:question.options.find(option=>option.id===question.correctId)?.it;
 const example=italianExample?{it:italianExample,meaning:question.explanation}:undefined;
 return <div>
  {phase==="intro"?<CoursePanel><p className="text-xs font-bold uppercase tracking-widest text-[#a35e3f]">{total} {copy.games}</p><h2 ref={heading} tabIndex={-1} className="mt-3 font-serif text-3xl outline-none">{assessment.title[locale]}</h2><p className="mt-4 text-sm leading-relaxed">{assessment.description[locale]}</p><p className="mt-4 rounded-2xl bg-[#f3eee3] p-4 text-sm leading-relaxed">{copy.quizRule}</p><p className="mt-4 text-sm font-bold text-[#245a46]">{copy.target}</p><button type="button" onClick={begin} className={`${courseButton} mt-6`}>{copy.beginQuiz}<ArrowRight size={17} aria-hidden/></button></CoursePanel>:null}
  {phase==="questions"?<><CourseProgressBar value={index} total={total} label={`${copy.question} ${index+1}/${total}`}/><h2 ref={heading} tabIndex={-1} className="my-5 font-serif text-3xl outline-none">{question.title[locale]}</h2>{bonus?<CourseBonus locale={locale} phrases={bonusPhrases} onClose={()=>setBonus(false)}/>:null}{review?<CoursePanel className="mb-5"><h3 className="font-serif text-xl">{copy.review}</h3><div className="mt-3 flex flex-wrap gap-2">{assessment.unitIds.map(id=><Link key={id} href={italianCourseHref(locale,id)} className={courseOutline}>{copy.unit} {Number(id.slice(1))}</Link>)}</div></CoursePanel>:null}
   <CoursePanel><p className="mb-6 text-base leading-relaxed">{question.prompt[locale]}</p>{answer?<div role="status"><p className={`text-lg font-bold ${answer.correct?"text-[#245a46]":"text-[#a25c31]"}`}>{answer.correct?copy.correct:copy.wrong}</p><p className="mt-2 text-xs text-[#7b6b55]">{copy.firstTry} · {answer.assisted?copy.assisted:copy.independent}</p><p lang={question.kind==="type"||question.options.find(o=>o.id===question.correctId)?.it?"it":undefined} className="mt-5 rounded-2xl bg-[#edf2e6] p-4 text-lg font-semibold">{expected(question,locale)}</p><p className="mt-4 text-sm leading-relaxed">{question.explanation[locale]}</p><button type="button" className={`${courseButton} mt-6`} onClick={next}>{index===total-1?copy.finishQuiz:copy.nextQuestion}<ArrowRight size={17} aria-hidden/></button></div>:<><ItalianGame key={`${assessment.id}-${run}-${question.id}`} activity={question} locale={locale} onAttempt={respond} onHelp={help}/><button type="button" className="mt-5 min-h-11 text-xs underline text-[#7d6b50]" onClick={()=>respond(false)}>{copy.skip}</button></>}</CoursePanel>
   <ItalianYoppoCoach locale={locale} contextId={`${assessment.id}-${run}-${question.id}-${answer?"answered":"open"}`} message={question.prompt} hint={question.hint} hint2={question.hint2} explanation={question.explanation} example={example} exampleAudio={example?<ItalianModuleAudio text={example.it} locale={locale}/>:undefined} visualState={answer?answer.correct?"celebrating":"confused":"teacher_ready"} totalCount={total} completedCount={answers.length} reviewCount={assessment.unitIds.length} onAction={action=>{if(action==="hint"||action==="explain")help();if(action==="challenge"){help();setBonus(true);}if(action==="review"){help();setReview(true);}}}/>
  </>:null}
  {phase==="result"?<CoursePanel><Trophy size={35} className="text-[#b26640]" aria-hidden/><h2 ref={heading} tabIndex={-1} className="mt-4 font-serif text-3xl outline-none">{!hadHelp&&score>=assessment.passPercent?copy.passed:copy.reviewNeeded}</h2><p className="mt-6 text-5xl font-bold text-[#245a46]">{score} %</p><p className="mt-2 text-sm">{answers.filter(a=>a.correct).length}/{total} · {hadHelp?copy.assisted:copy.independent}</p><p className="mt-4 text-sm leading-relaxed">{copy.target}</p><ol className="mt-6 grid gap-2 sm:grid-cols-2">{assessment.questions.map((q,i)=><li key={q.id} className="rounded-xl bg-[#f3eee3] p-3 text-xs"><span className="font-semibold">{i+1}. {q.title[locale]}</span><span className="ml-2">{answers[i]?.correct?"✓":"↻"} {answers[i]?.assisted?copy.assisted:copy.independent}</span></li>)}</ol><p className="mt-5 text-xs leading-relaxed text-[#7d6b50]">{copy.assessmentNote}</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" className={courseButton} onClick={begin}><RotateCcw size={16} aria-hidden/>{copy.retake}</button><Link href={italianCourseHref(locale)} className={courseOutline}>{copy.returnCourse}</Link></div></CoursePanel>:null}
 </div>;
}
