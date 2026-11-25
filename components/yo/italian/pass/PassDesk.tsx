"use client";
import {useEffect,useEffectEvent,useState,type FormEvent} from "react";
import Image from "next/image";
import {Ticket,MapPin,Headphones,ArrowRight} from "lucide-react";
import {ItalianCityArtwork} from "@/components/yo/italian/guided/ItalianCityArtwork";
import {LearningAudio} from "@/components/yo/personalized/LearningAudio";
import {passCities, type PassCity} from "@/lib/yo/passPilot/cities";
import {pilotPath,submitRounds} from "@/lib/yo/passPilot/proof.client";
import type {Order,Sku} from "@/lib/yo/passPilot/wallet";
import type {RailRun} from "@/lib/yo/passPilot/rail";
import {trackPassPilot} from "@/lib/analytics/events";
const api="/api/yo/pass-pilot",home="/yo/langues/italien/parcours";
const money=(n:number)=>(n/100).toLocaleString("fr-CA",{style:"currency",currency:"CAD"});
type State={balance:number;italy:boolean;access:boolean;eligible:boolean;final:boolean;half:boolean;upgrade:number;best:{amount:number};whole:{amount:number;kind:string};waiting?:Order;run?:RailRun;beat?:{prompt:string;options:string[];audio?:string;transcript?:string};feedback:string;complete:boolean};
const btn="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-900 px-4 py-3 font-bold text-white disabled:opacity-60",alt="block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-4 py-2 text-left text-stone-900";
async function call(values:Record<string,unknown>){
  const r=await fetch(api,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values),cache:"no-store"});
  const data=await r.json();if(!r.ok)throw Error(data.error??"temporarily_unavailable");return data as State;
}
export function PassDesk({city}:{city:PassCity}){
 const nextCity = passCities[passCities.indexOf(city) + 1];
 const [s,set]=useState<State|null>(null),[busy,lock]=useState(true),[login,ask]=useState(false),[error,fail]=useState(""),[interest,pick]=useState("travel");
 async function act(values:Record<string,unknown>){
  lock(true);fail("");try{
   let state=await call({...values, city: city.unit});
   if(values.action==="login"||values.action==="state"){await submitRounds(async(round,answers)=>{const previous=state;state=await call({action:"evidence",round,answers,city:city.unit});if(!previous.final&&state.final)trackPassPilot("free_final");if(!previous.half&&state.half)trackPassPilot("checkpoint_win");return true;});}
   if(values.action==="redeem"&&s&&!s.access&&state.access)trackPassPilot("pass_redeemed");
   if(values.action==="order"&&state.waiting&&!s?.waiting)trackPassPilot("checkout_start",state.waiting.sku);
   if(values.action==="confirm"&&s?.waiting&&!state.waiting)trackPassPilot("purchase_confirmed",s.waiting.sku);
   if(values.action==="play"&&s&&!s.run&&state.run)trackPassPilot("covered_mission_started");
   if(values.action==="answer"&&s&&!s.complete&&state.complete)trackPassPilot("covered_mission_completed");
   set(state);ask(false);
  }catch(e){if(e instanceof Error&&e.message==="login"){ask(true);set(null);}else fail("Impossible de confirmer cette étape. Ta progression est conservée. Réessaie ou reconnecte-toi.");}
  finally{lock(false);}
 }
 const load=useEffectEvent(()=>{void act({action:"state"});});
 useEffect(()=>{const timer=setTimeout(load,0);return()=>clearTimeout(timer);},[]);
 function signIn(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);void act({action:"login",email:f.get("email"),password:f.get("password")});}
 const buy=(sku:Sku)=>act({action:"order",sku,id:crypto.randomUUID()});
 return <main lang="fr" className="mx-auto max-w-xl bg-white pb-10 text-stone-900">
  <div className="relative h-44 overflow-hidden bg-emerald-950">{city.round === "parma" ? <Image priority fill src="/images/yo/italian/culture/bologna-porticoes.webp" alt="Les portiques de Bologne" className="object-cover"/> : <ItalianCityArtwork unitId={city.unit} locale="fr" className="h-full w-full"/>}<Image src="/companion/travel/companion-travel-map.png" alt="Yoppo" width={92} height={110} className="absolute bottom-1 right-4 h-28 w-auto"/></div>
  <div className="space-y-4 px-5 pt-5"><p className="flex items-center gap-2 text-sm font-bold text-emerald-800"><MapPin size={19}/> Italie · {city.city}</p>
  <h1 className="text-3xl font-bold">{city.title}</h1><p>{city.goal}</p>
  <label className="block text-sm font-semibold">Étape du voyage
    <select className={alt} value={city.unit} disabled={busy} onChange={event=>{window.location.assign(pilotPath + "?city=" + event.target.value);}}>
      {passCities.map(stop=><option key={stop.unit} value={stop.unit}>{stop.city} · {stop.title}</option>)}
    </select>
  </label>
  <p className="text-sm text-stone-600">Aperçu Web au Canada · Paiements simulés avec Stripe test. Aucune carte réelle.</p>
  {error&&<p role="alert">{error}</p>}
  {login&&<form onSubmit={signIn} className="space-y-3"><label className="block">Courriel du compte d’essai<input className={alt} name="email" type="email" required autoComplete="username"/></label><label className="block">Mot de passe<input className={alt} name="password" type="password" required autoComplete="current-password"/></label><button className={btn} disabled={busy}>Ouvrir mon voyage</button></form>}
  {busy&&<p role="status">Un instant…</p>}
  {s&&<><p className="flex items-center gap-2 border-y border-stone-200 py-3"><Ticket size={20}/><strong>{s.balance} Yoppo Pass</strong> · toutes langues</p>
  {s.waiting?<section className="space-y-3"><h2 className="font-bold">Confirmer l’essai</h2><p>Sous-total : {money(s.waiting.amount)}. Taxes de simulation : {money(0)}. Total de test : {money(s.waiting.amount)}.</p><button className={btn} disabled={busy} onClick={()=>act({action:"confirm",id:s.waiting!.id})}>Payer avec la carte de test Stripe</button><button className={alt} disabled={busy} onClick={()=>act({action:"cancel",id:s.waiting!.id})}>Annuler et garder mon résultat</button></section>
  :s.access&&s.eligible&&s.beat&&s.run?<section className="space-y-3"><p>Mission · {s.run.step+1}/4</p><h2 className="text-lg font-semibold">{s.beat.prompt}</h2>
   {(s.beat.audio || s.beat.transcript) && <div className="space-y-2">
     {s.beat.audio ? <><p><Headphones size={16} className="inline"/> Écouter en italien</p><audio key={s.beat.audio} controls preload="none" src={"/practice/it/bologna/"+s.beat.audio+".mp3"}/></> :
       <LearningAudio text={s.beat.transcript!} label="la phrase en italien" locale="fr" />}
     {s.beat.transcript && <details><summary>Lire la phrase</summary><p lang="it">{s.beat.transcript}</p></details>}
   </div>}
   {s.beat.options.map((v,i)=><button key={v} disabled={busy} className={alt} onClick={()=>act({action:"answer",choice:i,step:s.run!.step,attempt:s.run!.attempt})}>{v}</button>)}<p role="status">{s.feedback}</p></section>
  :s.eligible&&s.access?<><h2 className="font-bold">{s.complete?"Mission réussie à " + city.city + " !":"Ta mission est ouverte."}</h2>{city.round === "parma" && <label>À Parme, tu veux… <select value={interest} onChange={e=>pick(e.target.value)}><option value="travel">retrouver ton hôte</option><option value="art">visiter un musée</option><option value="history">découvrir le centre historique</option></select></label>}<button className={btn} disabled={busy} onClick={()=>act({action:"play",interest})}>{s.complete?"Rejouer gratuitement":"Continuer mon voyage"} <ArrowRight size={17}/></button>{s.complete && nextCity && <a className={alt} href={home + "/" + nextCity.unit}>Continuer à {nextCity.city}</a>}</>
  :!s.eligible?<><p>{s.final?"Défi de Bologne confirmé. Termine les deux premières leçons à " + city.city + " et gagne la halte Trivia.":"Bologne est entièrement gratuite : les trois leçons, la halte Trivia et le défi final. Aucun Pass à utiliser."}</p><a className={btn} href={home + "/" + (s.final ? city.unit : "u01")}>{s.final?"Aller à "+city.city:"Commencer à Bologne"}</a></>
  :<><p>Checkpoint gagné et enregistré. Un Pass ouvre la mission et permet de la rejouer pendant 12 mois.</p><button className={btn} disabled={busy} onClick={()=>s.balance?act({action:"redeem"}):buy("single")}>{s.balance?"Utiliser 1 Yoppo Pass":"Un Pass · "+money(349)}</button></>}
  {!s.waiting&&<><p className="text-sm">Option la moins chère pour cette étape : <strong>{money(s.best.amount)}</strong> avant taxes, une fois le défi réussi.</p>
  {!s.italy&&<details onToggle={e=>{if(e.currentTarget.open)trackPassPilot("offer_view","italy");}}><summary className="cursor-pointer py-3 font-bold">L’itinéraire italien au complet · {money(s.upgrade)}</summary><p>12 mois, paiement unique, sans renouvellement. Les défis restent requis. Aucun autre Pass à dépenser pour les étapes couvertes.</p><ol className="my-3 list-decimal pl-5">{passCities.map(stop=><li key={stop.unit}>{stop.city} · {stop.goal}</li>)}</ol><p>Prix : {money(1999)}. Pass achetés et utilisés sur ce parcours déduits : {money(1999-s.upgrade)}. Le forfait conserve tes Pass pour d’autres étapes.</p><button className={btn} disabled={busy} onClick={()=>buy("italy")}>Essayer l’itinéraire · {money(s.upgrade)}</button></details>}
  <p className="text-sm">Au moindre coût, couvrir les onze missions avec les accès et les Pass de ton compte demande encore <strong>{money(s.whole.amount)} avant taxes</strong>
    {s.whole.kind === "italy" ? " avec le forfait italien." : s.whole.kind === "free" ? "." : " en Pass."}</p>
  <details><summary className="cursor-pointer py-3">Autres façons de continuer</summary><button className={alt} disabled={busy} onClick={()=>buy("single")}>1 Pass · {money(349)}</button><button className={alt} disabled={busy} onClick={()=>buy("explorer")}>Explorateur · 3 Pass · {money(899)}</button></details></>}</>}
  <a href={home} className="inline-block py-3 underline">Retour à ma carte</a></div></main>;
}
