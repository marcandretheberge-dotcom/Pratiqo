"use client";
import { useEffect, useRef, useState } from "react";
import { X, Sparkles } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import type { CoursePhrase } from "@/lib/yo/italian/course/courseTypes";
import { C, courseOutline, CoursePanel } from "./CourseShared";

export function CourseBonus({locale,phrases,onClose}:{locale:YoLocale;phrases:CoursePhrase[];onClose:()=>void}){
 const [round,setRound]=useState(0),[answer,setAnswer]=useState<number|null>(null);
 const title=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{const frame=requestAnimationFrame(()=>title.current?.focus());return()=>cancelAnimationFrame(frame);},[]);
 const pool=phrases.filter((p,index)=>phrases.findIndex(other=>other.meaning[locale]===p.meaning[locale])===index);
 const target=pool[round%pool.length];
 if(!target)return null;
 const distractors=pool.filter(p=>p.meaning[locale]!==target.meaning[locale]).slice(0,2);
 const options=[...distractors];options.splice(round%3,0,target);
 return <CoursePanel className="mb-6 border-[#c6dac9] bg-[#eef5e9]"><div className="flex justify-between gap-4"><h2 ref={title} tabIndex={-1} className="flex items-center gap-2 font-serif text-2xl outline-none"><Sparkles size={20} aria-hidden/>{C[locale].bonus}</h2><button type="button" onClick={onClose} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-white" aria-label={C[locale].close}><X size={19} aria-hidden/></button></div><p className="mt-2 text-xs leading-relaxed">{C[locale].bonusNote}</p><p lang="it" className="my-5 font-serif text-3xl text-[#245a46]">{target.it}</p><div className="grid gap-2 sm:grid-cols-3">{options.map((p,index)=><button key={`${round}-${index}`} type="button" aria-pressed={answer===index} disabled={answer!==null} onClick={()=>setAnswer(index)} className={`${courseOutline} ${answer===index?"border-[#245a46] bg-[#e0eddd]":""}`}>{p.meaning[locale]}</button>)}</div>{answer!==null?<div role="status" className="mt-4"><p className="font-semibold">{options[answer]===target?C[locale].correct:C[locale].wrong}</p><p>{target.it} — {target.meaning[locale]}</p><button type="button" className={`${courseOutline} mt-3`} onClick={()=>{setRound(round+1);setAnswer(null);}}>{C[locale].again}</button></div>:null}</CoursePanel>;
}
