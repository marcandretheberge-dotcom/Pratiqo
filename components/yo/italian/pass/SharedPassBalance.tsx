"use client";
import {useEffect,useState} from "react";
import type {YoLocale} from "@/lib/yo/types";
import {pilotPath} from "@/lib/yo/passPilot/proof.client";
export function SharedPassBalance({locale}:{locale:YoLocale}){
  const [n,set]=useState<number|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/yo/pass-pilot",{method:"POST",headers:{"Content-Type":"application/json"},body:'{"action":"balance"}',signal:controller.signal})
      .then(async r=>{if(r.ok){const value=(await r.json()).balance;if(Number.isInteger(value))set(value);}}).catch(()=>{});
    return ()=>controller.abort();
  },[]);
  if(n===null)return null;
  return <a className="inline-flex min-h-11 items-center font-semibold text-emerald-900 underline" href={pilotPath}>{n} Yoppo Pass · {{fr:"toutes langues",en:"all languages",es:"todos los idiomas"}[locale]}</a>;
}
