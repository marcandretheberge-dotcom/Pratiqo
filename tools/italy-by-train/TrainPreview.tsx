import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowRight, Check, CheckCheck, ChevronRight, CircleHelp, Download, Headphones, Languages, MapPin, Ticket, TrainFront, Volume2 } from "lucide-react";
import { answer, eligible, fresh, key, restore, submit, trips, type Memory, type Mode } from "../../lib/yo/train/mission";
import "./train.css";
import { italianCourseHref } from "../../lib/yo/italian/course/courseLinks";

type Lang = "fr"|"en"|"es";
const languages: Lang[]=["fr","en","es"];
const numbers=["","uno","due","tre","quattro","cinque","sei"];
const translations=[
  ["Les départs","Departures","Salidas"],["Au guichet","At the counter","En la taquilla"],["Changement de voie","Platform change","Cambio de vía"],
];
function App(){
  const [lang,setLang]=useState<Lang>(()=>{const requested=new URLSearchParams(location.search).get("lang") as Lang;if(languages.includes(requested))return requested;try {const choice=localStorage.getItem(key+".lang") || navigator.language.slice(0,2);return languages.includes(choice as Lang)?choice as Lang:"en";}catch{return "fr";}});
  const ix=languages.indexOf(lang), t=(fr:string,en:string,es:string)=>[fr,en,es][ix];
  const [m,setM]=useState<Memory>(()=>{try{return restore(localStorage.getItem(key));}catch{return fresh();}});
  const [mode,setMode]=useState<Mode>(()=>m.guided.step===3 && eligible(m,Date.now()) && m.tomorrow.step<3?"tomorrow":"guided");
  const [practice,setPractice]=useState(0),[hint,setHint]=useState(false),[wrong,setWrong]=useState(""),[spoken,setSpoken]=useState(""),[text,setText]=useState(false);
  const [readAnnouncement,setReadAnnouncement]=useState(false),[soundProblem,setSoundProblem]=useState(false),[storageProblem,setStorageProblem]=useState(false),[pack,setPack]=useState<"saving"|"ready"|"failed">("saving"),[packTry,retryPack]=useState(0),[now,setNow]=useState(Date.now);
  const player=useRef<HTMLAudioElement|null>(null), heading=useRef<HTMLHeadingElement>(null), first=useRef(true);
  const step=mode==="rehearsal"?practice:m[mode].step, done=step===3, trip=trips[mode];
  const train=trip.board.find(row=>row[2]===trip.train)!;
  useEffect(()=>{document.documentElement.lang=lang;try{localStorage.setItem(key+".lang",lang);const url=new URL(location.href);url.searchParams.set("lang",lang);history.replaceState(null,"",url);}catch{/* optional */}},[lang]);
  useEffect(()=>{
    let alive=true;
    async function save(){
      if(!("serviceWorker" in navigator)) throw Error("unsupported");
      const reg=await navigator.serviceWorker.register("./sw.js",{scope:"./"});
      // navigator.serviceWorker.ready may refer to the broader Pratiqo worker.
      const worker=reg.installing??reg.waiting??reg.active;
      if(!worker) throw Error("pack unavailable");
      await new Promise<void>((resolve,reject)=>{
        function check(){if(worker!.state!=="activated"&&worker!.state!=="redundant")return;worker!.removeEventListener("statechange",check);if(worker!.state==="activated")resolve();else reject(Error("pack unavailable"));}
        worker.addEventListener("statechange",check);check();
      });
      const ok=await new Promise<boolean>((resolve)=>{
        const ch=new MessageChannel(), timer=setTimeout(()=>{ch.port1.close();resolve(false);},6000);
        ch.port1.onmessage=e=>{clearTimeout(timer);ch.port1.close();resolve(e.data==="complete");};worker.postMessage("check-pack",[ch.port2]);
      });
      if(!ok) throw Error("incomplete");
    }
    setPack("saving");
    const timeout=setTimeout(()=>{if(alive)setPack("failed");},45000);
    save().then(()=>alive&&setPack("ready")).catch(()=>alive&&setPack("failed")).finally(()=>clearTimeout(timeout));
    return()=>{alive=false;clearTimeout(timeout);};
  },[packTry]);
  useEffect(()=>{
    const update=()=>setNow(Date.now()), id=setInterval(update,15000);window.addEventListener("pageshow",update);document.addEventListener("visibilitychange",update);
    const sync=(e:StorageEvent)=>{if(e.key===key)setM(restore(e.newValue));}; window.addEventListener("storage",sync);
    return()=>{clearInterval(id);window.removeEventListener("pageshow",update);document.removeEventListener("visibilitychange",update);window.removeEventListener("storage",sync);player.current?.pause();};
  },[]);
  useEffect(()=>{
    if(!first.current) heading.current?.focus({preventScroll:true});first.current=false;
    player.current?.pause();player.current=null;setSpoken("");setText(false);setReadAnnouncement(false);setSoundProblem(false);setWrong("");setHint(false);
  },[mode,step]);
  function play(file:string){
    if(spoken===file){player.current?.pause();setSpoken("");return;}
    player.current?.pause();const a=new Audio("./"+file+".mp3");player.current=a;setSoundProblem(false);setSpoken(file);
    const end=()=>{if(player.current===a)setSpoken("");};
    a.onended=()=>{end();if(player.current===a&&file==="platform")setReadAnnouncement(true);};
    const unavailable=()=>{if(player.current===a){end();setSoundProblem(true);setText(true);if(file==="platform")setReadAnnouncement(true);}};
    a.onerror=unavailable;void a.play().catch(unavailable);
  }
  function choose(value:string){
    const correct=value===answer(mode,step);setWrong(correct?"":value);
    if(mode==="rehearsal"){if(correct)setPractice(s=>Math.min(3,s+1));return;}
    const date=Date.now();let current=m;
    try{const disk=localStorage.getItem(key);if(disk){const other=restore(disk);if(other[mode].step>m[mode].step){setM(other);return;}if(other[mode].step===m[mode].step && other[mode].missed)current=other;}}catch{/* memory fallback */}
    const next=submit(current,mode,value,date);if(next===current)return;
    try{localStorage.setItem(key,JSON.stringify(next));}catch{setStorageProblem(true);}setM(next);setNow(date);
  }
  const enter=(target:Mode)=>{setWrong("");setPractice(0);setMode(target);};
  const available=eligible(m,now);
  const listen=(file:string,label:string)=><button className="listen" type="button" onClick={()=>play(file)} aria-pressed={spoken===file}><Volume2 size={17}/>{spoken===file?t("Arrêter","Stop","Detener"):label}</button>;
  const hints=[t("Deux trains peuvent aller au même endroit. Compare aussi l’heure de départ.","Two trains can go to the same place. Match the departure time too.","Dos trenes pueden ir al mismo lugar. Compara también la hora de salida."),
    t("Binario signifie « voie ». Quanto dura demande la durée.","Binario means platform. Quanto dura asks how long.","Binario significa vía. Quanto dura pregunta por la duración."),
    t("Dal binario tre signifie « de la voie trois ». L’annonce remplace la voie imprimée.","Dal binario tre means “from platform three”. The announcement replaces the printed platform.","Dal binario tre significa «de la vía tres». El aviso sustituye la vía impresa.")];
  const prompts=[t("Quel est ton train ?","Which train is yours?","¿Cuál es tu tren?"),
    t("Demande de quelle voie il part.","Ask which platform it leaves from.","Pregunta de qué vía sale."),
    t("Où vas-tu maintenant ?","Where do you go now?","¿Adónde vas ahora?")];
  const station="Bologna Centrale";
  return <main>
    <header><span className="brand"><img src="./icon.png" width="28" height="28" alt=""/>YoPratiqo</span><label><Languages size={15}/><select aria-label={t("Langue de l’interface","Interface language","Idioma de la interfaz")} value={lang} onChange={e=>setLang(e.target.value as Lang)}><option value="fr">FR</option><option value="en">EN</option><option value="es">ES</option></select></label></header>
    <section className="cover"><img className="city" src="./bologna.webp" alt=""/><div><span><MapPin size={14}/>{station}</span><h1>{t("L’Italie en train","Italy by train","Italia en tren")}</h1></div><img className="hero-yoppo" src={done?"./happy.png":"./map.png"} alt="Yoppo" width="140" height="140"/></section>
    <div className="paper">
      <div className="kicker"><span>{mode==="rehearsal"?t("Répétition · sans score","Rehearsal · unscored","Ensayo · sin puntuación"):mode==="tomorrow"?t("Jour 2 · Défi sans indice","Day 2 · No-hint challenge","Día 2 · Reto sin pistas"):t("Jour 1 · Mission guidée","Day 1 · Guided mission","Día 1 · Misión guiada")}</span><span>{Math.min(step+1,3)} / 3</span></div>
      <div className="progress" aria-hidden="true">{[0,1,2].map(i=><i key={i} className={step>=i?"filled":""}/>)}</div>
      {done?<section className="finish"><span className="stamp"><CheckCheck size={30}/></span><h2 ref={heading} tabIndex={-1}>{mode==="rehearsal"?t("Répétition terminée","Rehearsal complete","Ensayo terminado"):t("À bord pour ","On board for ","A bordo hacia ")+trip.to+"!"}</h2>
        <p>{mode==="rehearsal"?t("Ton véritable défi n’a pas été modifié.","Your real challenge hasn’t changed.","Tu reto real no ha cambiado."):t("Tu as repéré ton train, demandé la voie et suivi un changement de quai.","You found your train, asked for its platform and followed a platform change.","Encontraste tu tren, preguntaste la vía y seguiste un cambio de andén.")}</p>
        {mode==="tomorrow"&&<strong>{m.tomorrow.missed?t("Réussi après correction","Completed after correction","Completado tras corregir"):t("Réussi du premier coup, sans indice","First-time success, without hints","A la primera, sin pistas")}</strong>}
        <hr/>{mode==="guided"? <><h3>{t("Le prochain départ","Next departure","La próxima salida")}</h3><p>{m.tomorrow.step===3?t("Défi du lendemain terminé.","Next-day challenge completed.","Reto del día siguiente completado."):available?t("Une nouvelle destination, sans indice de Yoppo.","A new destination, without Yoppo’s hints.","Un destino nuevo, sin pistas de Yoppo."):t("Ton défi s’ouvre demain. Reviens sur ce même appareil.","Your challenge opens tomorrow. Return on this same device.","Tu reto se abre mañana. Vuelve en este dispositivo.")}</p>
          {available&&<button className="primary" onClick={()=>enter("tomorrow")}>{m.tomorrow.step===3?t("Voir mon résultat","See my result","Ver mi resultado"):t("Entrer dans le défi","Start the challenge","Entrar en el reto")}<ArrowRight/></button>}
          <button className="secondary" onClick={()=>enter("rehearsal")}>{t("Essayer une autre ligne · sans score","Try another line · unscored","Probar otra línea · sin puntuación")}<ChevronRight size={16}/></button></>:<button className="secondary" onClick={()=>enter("guided")}>{t("Retour au billet","Back to my ticket","Volver a mi billete")}<ArrowRight size={16}/></button>}
      </section>:<>
        <div className="ticket"><Ticket size={22}/><div><small>{t("Ton billet","Your ticket","Tu billete")}</small><b lang="it">Bologna <ArrowRight size={14}/> {trip.to}</b></div><time>{trip.time}</time></div>
        <div className="prompt"><span>{translations[step][ix]}</span><h2 ref={heading} tabIndex={-1}>{prompts[step]}</h2></div>
        {step===0?<div className="board"><div className="board-head"><TrainFront size={17}/>PARTENZE <small>{t("Simulation","Simulation","Simulación")}</small></div>
          <div className="columns" lang="it"><span>ORA</span><span>DESTINAZIONE</span><span>BIN.</span></div>
          {trip.board.map(([time,city,id,bin])=><button key={id} className={wrong===id?"miss":""} onClick={()=>choose(id)} aria-label={time+" "+city+" · "+id+" · "+bin}><time>{time}</time><span>{city}<small>{id}</small></span><b>{bin}</b></button>)}</div>:
         step===1?<div className="options" lang="it">{trip.phrases.map((p,i)=><button className={wrong===p?"miss":""} key={p} onClick={()=>choose(p)}><span>{String.fromCharCode(65+i)}</span>{p}<ChevronRight size={17}/></button>)}</div>:
         <><section className="notice"><div><Headphones size={16}/><b lang="it">Cambio di binario</b><small>{train[2]}</small></div>
           {mode==="guided"?<>{listen("platform",t("Écouter l’annonce","Play announcement","Escuchar el aviso"))}<button className="transcript" onClick={()=>{setText(!text);setReadAnnouncement(true);}} aria-expanded={text}>{t("Lire l’annonce","Read announcement","Leer el aviso")}</button>{text&&<p lang="it">Il treno parte dal binario tre.</p>}</>:<p lang="it">Il treno per {trip.to} parte dal binario <strong>{numbers[trip.changed]}</strong>, non dal binario {numbers[train[3]]}.</p>}</section>
           <div className="platforms">{trip.platforms.map(n=><button key={n} disabled={mode==="guided"&&!readAnnouncement} className={wrong===String(n)?"miss":""} onClick={()=>choose(String(n))}><small lang="it">Binario</small><b>{n}</b></button>)}</div></>}
        <p className="feedback" role="status">{wrong?(mode==="guided"?hints[step]:t("Pas cette fois. Vérifie le billet et réessaie.","Not quite. Check your ticket and try again.","Todavía no. Revisa el billete e inténtalo de nuevo.")):""}</p>
        {mode==="guided"&&<aside><div className="coach"><img src="./idle.png" width="44" height="44" alt=""/><b>Yoppo</b><button onClick={()=>setHint(!hint)} aria-expanded={hint}><CircleHelp size={15}/>{t("Un indice","Hint","Una pista")}</button></div>
        {hint&&<p>{hints[step]}</p>}
        {step===1&&<div className="phrase"><span lang="it">Da quale binario parte il treno?</span>{listen("ask",t("Écouter","Listen","Escuchar"))}</div>}
        {step===2&&<details><summary>{t("Les numéros de voie","Platform numbers","Los números de vía")}</summary><p lang="it">1 · uno　2 · due　3 · tre　4 · quattro　5 · cinque　6 · sei</p></details>}
        </aside>}
      </>}
      {soundProblem&&<p role="status">{t("Son indisponible. Le texte reste accessible.","Audio unavailable. You can use the text instead.","Audio no disponible. Puedes leer el texto.")}</p>}
      {storageProblem&&<p role="alert">{t("Sauvegarde indisponible : la reprise n’est pas garantie.","Storage unavailable: resume is not guaranteed.","No se puede guardar; no se garantiza la reanudación.")}</p>}
      <a className="secondary" href={italianCourseHref(lang,"u01")}>{t("Retour à la carte","Back to the map","Volver al mapa")}</a>
      <footer role="status">{pack==="ready"?<Check size={15}/>:<Download size={15}/>} {pack==="ready"?t("Disponible hors ligne sur cet appareil","Available offline on this device","Disponible sin conexión en este dispositivo"):pack==="failed"?t("Téléchargement incomplet","Download incomplete","Descarga incompleta"):t("Enregistrement hors ligne…","Saving for offline use…","Guardando para uso sin conexión…")}
      {pack==="failed"&&<button onClick={()=>retryPack(v=>v+1)}>{t("Réessayer","Retry","Reintentar")}</button>}</footer>
    </div>
  </main>;
}
createRoot(document.getElementById("root")!).render(<App/>);
