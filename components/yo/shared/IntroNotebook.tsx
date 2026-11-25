"use client";
import { useState } from "react";
import Link from "next/link";
import type { IntroCourse } from "@/lib/yo/shared/types";
import { L } from "@/lib/yo/shared/types";
import type { YoLocale } from "@/lib/yo/types";
import { IntroAudio } from "./IntroAudio";
import { secondary } from "../italian/guided/copy";
export function IntroNotebook({course,locale,audio}:{course:IntroCourse;locale:YoLocale;audio:Record<string,string>}) {
  const [translated,setTranslated]=useState(true);
  return <div data-intro-notebook>
    <Link prefetch={false} className={`${secondary} underline`} href={`/yo/langues/${course.slug}/demarrer/vocabulaire?lang=${locale}`} target="_blank" rel="noopener">{L("Imprimer les mots et verbes","Print words and verbs","Imprimir palabras y verbos")[locale]}</Link>
    <button type="button" className={secondary} aria-pressed={translated} onClick={()=>setTranslated(!translated)}>{translated?L("Masquer les traductions","Hide translations","Ocultar traducciones")[locale]:L("Afficher les traductions","Show translations","Mostrar traducciones")[locale]}</button>
    {course.phrases.map(p=><div key={p.id} className="border-b border-stone-200 py-4"><p lang={course.language} className="text-lg font-semibold">{p.text}</p>{p.reading&&<p className="text-sm text-stone-600">{p.reading}</p>}{translated&&p.meaning[locale]!==p.text&&<p className="my-2 leading-6">{p.meaning[locale]}</p>}<IntroAudio text={p.text} speechLocale={course.speechLocale} path={audio[p.text]} locale={locale}/></div>)}
    {course.glossary.map((p,i)=><div key={i} className="border-b border-stone-200 py-3"><p lang={course.language} className="font-semibold">{p.text}</p>{translated&&<p className="mt-2 text-sm leading-6">{p.meaning[locale]}</p>}</div>)}
  </div>;
}
