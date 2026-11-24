"use client";
import {useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {ArrowRight,Ticket} from "lucide-react";

import {ItalianCityArtwork} from "@/components/yo/italian/guided/ItalianCityArtwork";
import type {PassCity} from "@/lib/yo/passPilot/cities";
import {LearningAudio} from "@/components/yo/personalized/LearningAudio";
import type {SituationBeat} from "@/lib/yo/passPilot/situations";
import {pilotPath} from "@/lib/yo/passPilot/proof.client";

// Public PR sample. No Auth, account, checkout, trackers or simulated balance.
export function RailSample({city, sample}:{city?:PassCity; sample?:SituationBeat | null}){
  const [answer,set]=useState<string|null>(null);
  return <main lang="fr" className="mx-auto max-w-lg space-y-4 bg-white pb-8 text-stone-900">
    <div className="relative h-52">{city ? <ItalianCityArtwork unitId={city.unit} locale="fr" className="h-full w-full"/> : <Image fill priority className="object-cover" src="/images/yo/italian/culture/bologna-porticoes.webp" alt="Portiques de Bologne"/>}<Image width={115} height={130} className="absolute bottom-0 right-4 h-32 w-auto" src="/companion/travel/companion-travel-map.png" alt="Yoppo"/></div>
    <section className="space-y-4 px-5"><p className="font-bold text-emerald-800">Italie · {sample ? city?.city : "Bologna Centrale"}</p>{sample ? <>
    <h1 className="text-3xl font-bold">{city?.title}</h1><p>{sample.prompt}</p>
    <LearningAudio text={sample.transcript!} locale="fr" label="le montant en italien" /><details><summary>Lire la phrase</summary><span lang="it">{sample.transcript}</span></details>
    <div className="grid gap-2">{sample.options.map((option,i)=><button key={option} className="min-h-12 rounded-lg border border-emerald-900 p-2 text-left aria-pressed:bg-emerald-900 aria-pressed:text-white" aria-pressed={answer===String(i)} onClick={()=>set(String(i))}>{option}</button>)}</div>
    {answer !== null && <p aria-live="polite">{Number(answer) === sample.answer ? "Oui, exactement !" : sample.hint}</p>}
    </> : <><h1 className="text-3xl font-bold">Ton train a changé de voie.</h1><p>Ton billet indique la voie 5. Écoute l’annonce : où dois-tu aller ?</p>
    <audio controls preload="none" src="/practice/it/bologna/platform.mp3"/><details><summary>Lire l’annonce</summary><span lang="it">Il treno parte dal binario tre.</span></details>
    <div className="grid grid-cols-3 gap-2">{["2","3","5"].map(n=><button key={n} aria-pressed={answer===n} onClick={()=>set(n)} className="min-h-12 rounded-lg border border-emerald-900 bg-white font-bold text-emerald-950 aria-pressed:bg-emerald-900 aria-pressed:text-white">Voie {n}</button>)}</div>
    {answer&&<p aria-live="polite">{answer==="3"?"Oui ! « Dal binario tre » : ton train part de la voie 3.":"Écoute le nombre après « binario ». L’annonce est plus récente que le billet."}</p>}</>}
    <Link prefetch={false} className="inline-block py-2 font-bold text-emerald-800 underline" href={pilotPath+(sample?"":"?city=u05")}>{sample ? "Essayer le train pour Parme" : "Essayer le café à Naples"}</Link>
    <p className="border-t pt-4"><Ticket className="mr-1 inline" size={18}/> Bologne : premier module, halte et défi gratuits.</p>
    <Link prefetch={false} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-emerald-900 px-4 font-bold text-white" href="/yo/langues/italien/parcours/u01?lang=fr">Commencer à Bologne <ArrowRight size={17}/></Link>
    <details><summary className="min-h-11 py-2">Offre à l’essai au Canada</summary><p>1 Pass : 3,49 $ CA. 3 Pass : 8,99 $ CA. Itinéraire italien : 19,99 $ CA pour 12 mois, sans renouvellement. Avant taxes. Aucun achat ni portefeuille sur cet aperçu public.</p></details></section></main>;
}
