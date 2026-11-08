"use client";
import { useEffect, useRef } from "react";
import type { YoLocale } from "@/lib/yo/types";
import { getItalianBolognaAudioItem } from "@/lib/yo/audio/italianBolognaAudio";
import { useItalianAudioPath } from "../italian/ItalianAudioProvider";
import { ItalianModuleAudio } from "../italian/ItalianModuleAudio";
import { IntroAudio } from "../shared/IntroAudio";

/** Keep the existing recorded Italian player; device fallback shares cancellation, delayed voices and slow playback. */
export function LearningAudio({text,locale,onListen,label,autoPlay=false}:{text:string;locale:YoLocale;onListen?:()=>void;label?:string;autoPlay?:boolean}) {
 const recorded=useItalianAudioPath(text) ?? getItalianBolognaAudioItem(text)?.storagePath;
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!autoPlay||!recorded)return;const frame=requestAnimationFrame(()=>root.current?.querySelector<HTMLButtonElement>("button")?.click());return()=>cancelAnimationFrame(frame);},[text,autoPlay,recorded]);
 if(recorded)return <div ref={root} className="block"><ItalianModuleAudio text={text} locale={locale} onListen={onListen} label={label}/></div>;
 return <IntroAudio text={text} speechLocale="it-IT" locale={locale} onListen={onListen} label={label??text} autoPlay={autoPlay}/>;
}
