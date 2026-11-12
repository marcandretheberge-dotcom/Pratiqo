"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { YoLocale } from "@/lib/yo/types";
import { getItalianBolognaAudioItem } from "@/lib/yo/audio/italianBolognaAudio";
import { useItalianAudioPath } from "../italian/ItalianAudioProvider";
import { ItalianModuleAudio } from "../italian/ItalianModuleAudio";
import { IntroAudio } from "../shared/IntroAudio";

const AutomaticAudio = createContext(true);
/** Opt-in presentation policy. Existing courses keep their current defaults. */
export function OnDemandLearningAudio({children}:{children:ReactNode}) {
 return <AutomaticAudio.Provider value={false}>{children}</AutomaticAudio.Provider>;
}

/** Keep the existing recorded Italian player; device fallback shares cancellation, delayed voices and slow playback. */
export function LearningAudio({text,locale,onListen,label,autoPlay=false}:{text:string;locale:YoLocale;onListen?:()=>void;label?:string;autoPlay?:boolean}) {
 const automatic=useContext(AutomaticAudio) && autoPlay;
 const recorded=useItalianAudioPath(text) ?? getItalianBolognaAudioItem(text)?.storagePath;
 if(recorded)return <div className="block"><ItalianModuleAudio text={text} locale={locale} onListen={onListen} label={label} autoPlay={automatic}/></div>;
 return <IntroAudio text={text} speechLocale="it-IT" locale={locale} onListen={onListen} label={label??text} autoPlay={automatic}/>;
}
