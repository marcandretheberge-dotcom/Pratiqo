"use client";
import type { YoLocale } from "@/lib/yo/types";
import { getItalianBolognaAudioItem } from "@/lib/yo/audio/italianBolognaAudio";
import { useItalianAudioPath } from "../italian/ItalianAudioProvider";
import { ItalianModuleAudio } from "../italian/ItalianModuleAudio";
import { IntroAudio } from "../shared/IntroAudio";

/** Keep the existing recorded Italian player; device fallback shares cancellation, delayed voices and slow playback. */
export function LearningAudio({text,locale,onListen,label,autoPlay=false}:{text:string;locale:YoLocale;onListen?:()=>void;label?:string;autoPlay?:boolean}) {
 const recorded=useItalianAudioPath(text) ?? getItalianBolognaAudioItem(text)?.storagePath;
 if(recorded)return <div className="block"><ItalianModuleAudio text={text} locale={locale} onListen={onListen} label={label} autoPlay={autoPlay}/></div>;
 return <IntroAudio text={text} speechLocale="it-IT" locale={locale} onListen={onListen} label={label??text} autoPlay={autoPlay}/>;
}
