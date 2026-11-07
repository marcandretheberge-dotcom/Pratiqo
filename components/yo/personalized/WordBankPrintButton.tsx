"use client";
import type { YoLocale } from "@/lib/yo/types";
export function WordBankPrintButton({locale}:{locale:YoLocale}){return <button type="button" onClick={()=>window.print()} className="min-h-12 rounded-2xl bg-emerald-800 px-5 py-3 font-bold text-white">{{fr:"Imprimer / enregistrer en PDF",en:"Print / save as PDF",es:"Imprimir / guardar en PDF"}[locale]}</button>;}
