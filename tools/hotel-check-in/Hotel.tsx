import React,{useEffect,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import {ArrowRight,BookOpen,Check,CheckCheck,ChevronRight,Headphones,KeyRound,Languages,MapPin,Pause,Repeat2,Ticket,Volume2} from "lucide-react";
import {fresh,progressFor,tr,type Locale,type Mode,type Practice} from "../../lib/yo/scenarios/practice";
import "./hotel.css";

const locales:Locale[]=["fr","en","es"];
function initialLocale(key:string):Locale {
  try{const l=new URLSearchParams(location.search).get("lang")??localStorage.getItem(key+".lang")??navigator.language.slice(0,2);return locales.includes(l as Locale)?l as Locale:"fr";}catch{return "fr";}
}
export function mountPractice(scenario:Practice){
 const {visits,lines,key,targetLang}=scenario, {restore,ready,submit}=progressFor(visits);
 const isHotel=key==="yo.review.es.do.hotel.check-in.v1";
 function App(){
  const [lang,setLang]=useState(()=>initialLocale(key));
  const t=(fr:string,en:string,es:string)=>tr(fr,en,es)[lang];
  const [memory,setMemory]=useState(()=>{try{return restore(localStorage.getItem(key));}catch{return fresh();}});
  const [now,setNow]=useState(Date.now);
  const [mode,setMode]=useState<Mode>(()=>ready(memory,Date.now())?"tomorrow":"guided");
  const [fault,setFault]=useState(false),[bad,setBad]=useState(""),[hint,setHint]=useState(false),[text,setText]=useState(false),[heard,setHeard]=useState(false);
  const [playing,setPlaying]=useState(""),[audioError,setAudioError]=useState(""),[pack,setPack]=useState<"saving"|"ready"|"failed">("saving"),[retry,setRetry]=useState(0);
  const player=useRef<HTMLAudioElement|null>(null), head=useRef<HTMLHeadingElement>(null), initial=useRef(true);
  const visit=visits[mode], step=memory[mode], beat=visit.beats[step],prompt=beat?.prompt;
  const voice=prompt&&"clip"in prompt?lines.find(l=>l.id===prompt.clip):null;
  const unlock=ready(memory,now);
  useEffect(()=>{
    document.documentElement.lang=lang;
    try{localStorage.setItem(key+".lang",lang);const u=new URL(location.href);u.searchParams.set("lang",lang);history.replaceState(null,"",u);}catch{/* optional preference */}
  },[lang]);
  useEffect(()=>{
    const refresh=()=>setNow(Date.now()),timer=setInterval(refresh,20000);
    const sync=(e:StorageEvent)=>{if(e.key===key)setMemory(restore(e.newValue));};
    const hide=()=>{if(document.hidden){player.current?.pause();setPlaying("");}else refresh();};
    window.addEventListener("pageshow",refresh);window.addEventListener("storage",sync);document.addEventListener("visibilitychange",hide);
    return()=>{clearInterval(timer);window.removeEventListener("pageshow",refresh);window.removeEventListener("storage",sync);document.removeEventListener("visibilitychange",hide);player.current?.pause();};
  },[]);
  useEffect(()=>{
    let alive=true;const timeout=setTimeout(()=>alive&&setPack("failed"),45000);
    async function save(){
      if(!("serviceWorker"in navigator))throw Error("offline unavailable");
      await navigator.serviceWorker.register("./sw.js",{scope:"./"});
      const reg=await navigator.serviceWorker.ready;
      const complete=await new Promise<boolean>(resolve=>{
        const c=new MessageChannel(),timer=setTimeout(()=>{c.port1.close();resolve(false);},5000);
        c.port1.onmessage=e=>{clearTimeout(timer);c.port1.close();resolve(e.data==="complete");};reg.active?.postMessage("check-pack",[c.port2]);
      });
      if(!complete)throw Error("incomplete pack");
    }
    save().then(()=>alive&&setPack("ready"),()=>alive&&setPack("failed")).finally(()=>clearTimeout(timeout));
    return()=>{alive=false;clearTimeout(timeout);};
  },[retry]);
  useEffect(()=>{
    player.current?.pause();player.current=null;setPlaying("");setAudioError("");setHint(false);setText(false);setHeard(false);setBad("");
    if(!initial.current)head.current?.focus({preventScroll:true});initial.current=false;
  },[mode,step]);
  function play(id:string){
    player.current?.pause();player.current=null;
    if(playing===id){setPlaying("");return;}
    const a=new Audio("./"+id+".mp3");player.current=a;setPlaying(id);setAudioError("");
    const failed=()=>{if(player.current!==a)return;setPlaying("");setAudioError(id);if(id===voice?.id)setText(true);};
    a.onerror=failed;a.onended=()=>{if(player.current===a){setPlaying("");if(id===voice?.id)setHeard(true);}};
    void a.play().catch(failed);
  }
  function choose(value:string){
    if(!beat||(voice&&!heard&&!text))return;
    let current=memory;
    try{const disk=localStorage.getItem(key);if(disk){const other=restore(disk);if(other.guided>current.guided||other.tomorrow>current.tomorrow){setMemory(other);return;}if(other.corrected)current={...current,corrected:true};}}catch{/* use memory */}
    const stamp=Date.now(),next=submit(current,mode,value,stamp);
    setBad(value===beat.answer?"":value);setNow(stamp);setMemory(next);
    try{localStorage.setItem(key,JSON.stringify(next));}catch{setFault(true);}
  }
  const listen=(id:string,label:string)=><button type="button" className="listen" aria-pressed={playing===id} onClick={()=>play(id)}>{playing===id?<Pause size={16}/>:<Volume2 size={16}/>} {playing===id?t("Pause","Pause","Pausa"):label}</button>;
  return <main>
    <header><span className="brand"><img src="./icon.png" width="26" height="26" alt=""/>YoPratiqo</span><label><Languages size={17}/><select aria-label={t("Langue de l’interface","Interface language","Idioma de la interfaz")} value={lang} onChange={e=>setLang(e.target.value as Locale)}>{locales.map(l=><option key={l} value={l}>{l.toUpperCase()}</option>)}</select></label></header>
    <section className="cover"><img className="scene" src="./desk.webp" alt=""/><div className="cover-text"><span><MapPin size={14}/> {visit.city}</span><h1>{scenario.title[lang]}</h1></div></section>
    <div className="paper">
    <div className="stub"><Ticket size={20}/><div><small>{scenario.slip[lang]}</small><b>{visit.guest}</b></div><span>{scenario.badge}</span></div>
    <div className="progress"><b>{mode==="guided"?t("Mission avec Yoppo","Guided mission","Misión guiada"):t("Défi du lendemain","Next-day challenge","Reto del día siguiente")}</b><span>{Math.min(step+1,visit.beats.length)} / {visit.beats.length}</span></div>
    <div className="stitches" aria-hidden>{visit.beats.map((_,i)=><i key={i} className={i<step?"complete":i===step?"current":""}/>)}</div>
    {beat?<section>
      <h2 ref={head} tabIndex={-1}>{beat.task[lang]}</h2>
      <div className="desk"><span className="tag">{voice?<Headphones size={16}/>:<BookOpen size={16}/>} {isHotel?(voice?t("Réception","Reception","Recepción"):t("Au comptoir","At the counter","En el mostrador")):(voice?t("À l’écoute","Listen in","Escucha"):t("Sur place","On the scene","En situación"))}</span>
        {voice?<><div className="play-row">{listen(voice.id,t("Écouter","Listen","Escuchar"))}<button className="link" aria-expanded={text} onClick={()=>setText(v=>!v)}>{t("Lire la réplique","Read the line","Leer la frase")}</button></div>
          {text&&<p lang={targetLang}>{voice.speechText}</p>}</>:prompt&&"text"in prompt?<p lang={targetLang}>{prompt.text}</p>:null}
      </div>
      <div className={/^\d+$/.test(beat.answer)?"choices keys":"choices"}>{beat.choices.map(v=><button type="button" key={v} disabled={!!voice&&!heard&&!text} className={bad===v?"miss":""} onClick={()=>choose(v)} lang={targetLang}>{/^\d+$/.test(v)?<KeyRound size={19}/>:null}{v}{!/^\d+$/.test(v)&&<ChevronRight size={17}/>}</button>)}</div>
      <div className="coach"><img src="./yoppo.png" alt="Yoppo" width="50" height="50"/><div>{mode==="guided"?<button className="link" onClick={()=>setHint(v=>!v)} aria-expanded={hint}>{t("Un indice, Yoppo ?","A hint, Yoppo?","¿Una pista, Yoppo?")}</button>:<b>Yoppo</b>}
      <p role="status">{bad?mode==="guided"?beat.hint[lang]:t("Vérifie la situation et réessaie.","Check the situation and try again.","Revisa la situación y vuelve a intentarlo."):hint?beat.hint[lang]:""}</p></div></div>
    </section>:<section className="finish">
      <img src="./happy.png" width="78" height="78" alt="Yoppo"/><h2 ref={head} tabIndex={-1}>{mode==="guided"?scenario.finish[lang]:isHotel?t("Malentendu résolu !","Mix-up resolved!","¡Malentendido resuelto!"):t("Défi relevé !","Challenge complete!","¡Reto superado!")}</h2>
      <p>{mode==="guided"?scenario.outcome[lang]:memory.corrected?t("Défi réussi après correction.","Completed after a correction.","Completado tras una corrección."):t("Défi réussi du premier coup.","Completed on your first try.","Completado a la primera.")}</p>
      {mode==="guided"&&(unlock?<button className="main-action" onClick={()=>setMode("tomorrow")}>{t("Ouvrir le défi","Open the challenge","Abrir el reto")}<ArrowRight size={18}/></button>:<p className="tomorrow"><Repeat2 size={18}/>{t("Reviens demain sur cet appareil pour une nouvelle situation, sans indices.","Return tomorrow on this device for a different situation, without hints.","Vuelve mañana en este dispositivo para otra situación, sin pistas.")}</p>)}
      <details><summary><BookOpen size={17}/>{isHotel?t("Carnet de réception","Front-desk phrasebook","Frases de recepción"):t("Carnet de phrases","Phrasebook","Cuaderno de frases")}</summary>{lines.filter(l=>l.isLearner).map(l=><div className="entry" key={l.id}><b lang={targetLang}>{l.target}</b>{lang!==targetLang.split("-")[0]&&<small>{l.translation[lang]}</small>}{listen(l.id,t("Réécouter","Listen again","Volver a escuchar"))}</div>)}</details>
    </section>}
    {audioError&&<p role="status">{t("Audio indisponible. La réplique écrite reste accessible.","Audio unavailable. The written line is still available.","Audio no disponible. Puedes leer la frase.")}</p>}
    {fault&&<p role="alert">{t("Sauvegarde indisponible sur cet appareil.","Progress could not be saved on this device.","No se pudo guardar el progreso en este dispositivo.")}</p>}
    <footer role="status">{pack==="ready"?<CheckCheck size={16}/>:<Check size={16}/>} {pack==="ready"?t("Disponible hors ligne","Available offline","Disponible sin conexión"):pack==="saving"?t("Téléchargement…","Downloading…","Descargando…"):t("Téléchargement incomplet","Download incomplete","Descarga incompleta")}
      {pack==="failed"&&<button className="link" onClick={()=>{setPack("saving");setRetry(x=>x+1);}}>{t("Réessayer","Retry","Reintentar")}</button>}</footer>
    </div>
  </main>;
}
createRoot(document.getElementById("root")!).render(<App/>);
}
