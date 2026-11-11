"use client";
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { ItalianMapAmbience } from "@/lib/yo/italian/mapAmbience";
import { lessonAudioIsBusy, subscribeLessonAudio } from "@/lib/yo/audio/lessonAudioActivity";
const KEY="yo.italian.ambience.v1";
export function ItalianAtmosphereControl({active,locale}:{active:boolean;locale:YoLocale}) {
  const [enabled,setEnabled]=useState(false),[unavailable,setUnavailable]=useState(false);
  const engine=useRef<ItalianMapAmbience|null>(null), preferences=useRef({enabled:false,active}), epoch=useRef(0);
  useEffect(()=>{
    const player=new ItalianMapAmbience();engine.current=player;
    const frame=requestAnimationFrame(()=>{try { const value=localStorage.getItem(KEY)==="true";preferences.current.enabled=value;setEnabled(value);}catch{/* Session only. */}});
    const sync=()=>player.setAudible(preferences.current.enabled && preferences.current.active && document.visibilityState==="visible" && !lessonAudioIsBusy());
    const gesture=()=>{
      if(!preferences.current.enabled || !preferences.current.active)return;
      const revision=epoch.current;
      void player.start().then(ok=>{if(revision!==epoch.current)return;if(!ok)setUnavailable(true);sync();});
    };
    const hide=()=>player.setAudible(false);
    const unsubscribe=subscribeLessonAudio(sync);
    document.addEventListener("visibilitychange",sync);window.addEventListener("pagehide",hide);
    window.addEventListener("pointerdown",gesture,{passive:true});window.addEventListener("keydown",gesture);
    return ()=>{epoch.current++;cancelAnimationFrame(frame);unsubscribe();document.removeEventListener("visibilitychange",sync);window.removeEventListener("pagehide",hide);window.removeEventListener("pointerdown",gesture);window.removeEventListener("keydown",gesture);player.dispose();engine.current=null;};
  },[]);
  useEffect(()=>{preferences.current={enabled,active};engine.current?.setAudible(enabled && active && document.visibilityState==="visible" && !lessonAudioIsBusy());},[enabled,active]);
  async function toggle(){
    const next=!enabled;preferences.current={enabled:next,active};setEnabled(next);setUnavailable(false);
    try{localStorage.setItem(KEY,String(next));}catch{/* Session only. */}
    const revision=++epoch.current;
    if(!next){engine.current?.setAudible(false);return;}
    const ok=await engine.current?.start();if(revision!==epoch.current)return;
    if(!ok)setUnavailable(true);
    engine.current?.setAudible(Boolean(ok) && preferences.current.enabled && preferences.current.active && document.visibilityState==="visible" && !lessonAudioIsBusy());
  }
  const title={fr:"Ambiance douce",en:"Gentle ambience",es:"Ambiente suave"}[locale];
  return <span className="yo-ambience-control"><button type="button" role="switch" aria-checked={enabled} aria-label={title} title={title} className="yo-icon-button" onClick={()=>void toggle()}>{enabled?<Volume2 size={20} aria-hidden/>:<VolumeX size={20} aria-hidden/>}</button>{unavailable?<span role="status" className="sr-only">{{fr:"Son indisponible sur cet appareil.",en:"Sound is unavailable on this device.",es:"Sonido no disponible en este dispositivo."}[locale]}</span>:null}</span>;
}
