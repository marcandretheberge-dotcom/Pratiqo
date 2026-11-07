"use client";
import { useEffect, useRef, useState } from "react";
import { Volume2, Square } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { useItalianAudioPath } from "../italian/ItalianAudioProvider";
import { ItalianModuleAudio } from "../italian/ItalianModuleAudio";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";

/** Reuse recordings. New authored phrases have an explicit Italian-device-voice preview fallback. */
export function LearningAudio({text,locale,onListen,label,autoPlay=false}:{text:string;locale:YoLocale;onListen?:()=>void;label?:string;autoPlay?:boolean}) {
 const recorded=useItalianAudioPath(text), [playing,setPlaying]=useState(false),[failed,setFailed]=useState(false);
 const root=useRef<HTMLDivElement>(null);
 const active=useRef<SpeechSynthesisUtterance|null>(null);
 const stop=()=>{if(active.current){active.current=null;window.speechSynthesis?.cancel();setPlaying(false);}};
 useEffect(()=>{const cancel=()=>{if(active.current){active.current=null;window.speechSynthesis?.cancel();setPlaying(false);}};const hide=()=>{if(document.hidden)cancel();};window.addEventListener("yo-italian-audio-stop",cancel);document.addEventListener("visibilitychange",hide);return()=>{window.removeEventListener("yo-italian-audio-stop",cancel);document.removeEventListener("visibilitychange",hide);cancel();};},[text]);
 useEffect(()=>{if(!autoPlay)return;const frame=requestAnimationFrame(()=>root.current?.querySelector<HTMLButtonElement>("button")?.click());return()=>cancelAnimationFrame(frame);},[text,autoPlay]);
 if(recorded)return <div ref={root} className="block"><ItalianModuleAudio text={text} locale={locale} onListen={onListen} label={label}/></div>;
 const c={fr:{listen:"Écouter",stop:"Arrêter",voice:"Voix de l’appareil · aperçu",error:"Voix italienne indisponible ici. Tu peux continuer avec le texte."},en:{listen:"Listen",stop:"Stop",voice:"Device voice · preview",error:"No Italian voice is available here. You can continue with the text."},es:{listen:"Escuchar",stop:"Detener",voice:"Voz del dispositivo · vista previa",error:"No hay voz italiana aquí. Puedes continuar con el texto."}}[locale];
 function play(){if(playing){stop();return;}stopLessonAudio();setFailed(false);if(!window.speechSynthesis||typeof SpeechSynthesisUtterance==="undefined"){setFailed(true);return;}const voices=window.speechSynthesis.getVoices();const voice=voices.find(v=>/^it(?:-|_)/i.test(v.lang));if(!voice){setFailed(true);return;}const speech=new SpeechSynthesisUtterance(text);speech.lang="it-IT";speech.voice=voice;speech.rate=.85;active.current=speech;speech.onstart=()=>{if(active.current===speech){setPlaying(true);onListen?.();}};speech.onend=()=>{if(active.current===speech){active.current=null;setPlaying(false);}};speech.onerror=()=>{if(active.current===speech){active.current=null;setPlaying(false);setFailed(true);}};window.speechSynthesis.speak(speech);}
 return <div ref={root} className="flex flex-wrap items-center gap-2"><button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-950" aria-label={`${playing?c.stop:c.listen} : ${label??text}`} onClick={play}>{playing?<Square size={15} aria-hidden/>:<Volume2 size={17} aria-hidden/>}{playing?c.stop:c.listen}</button><span className="text-[10px] text-stone-500">{c.voice}</span>{failed?<p role="status" className="w-full text-xs text-amber-900">{c.error}</p>:null}</div>;
}
