"use client";

import Link from "next/link";
import { BookOpen, CheckCircle2, FileText, Printer } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { YoLocale } from "@/lib/yo/types";

/**
 * Real, pre-existing printable routes. No PDF download is promised:
 * each opens a print-ready page with a working browser print/save control.
 * The achievement page derives stamps and results from canonical progress.
 */
export function ItalianPrintableMenu({ locale, unitId, mastered }: {
  locale: YoLocale; unitId: string; mastered: boolean;
}) {
  const c = {
    fr: {
      title: "Mes fiches à imprimer",
      intro: "Avant de partir, emporte tes mots. Après la mission, reviens voir ce que tu as réellement appris !",
      words: "Fiche de vocabulaire",
      wordsDetail: "Tous les mots, expressions et verbes du module. Disponible dès le départ.",
      report: "Mon bilan de voyage",
      achieved: "Tes activités, ton meilleur défi et ton tampon obtenu.",
      pending: "Ton bilan actuel, sans tampon tant que le défi n'est pas réussi.",
      open: "Ouvrir et imprimer",
      tip: "Chaque document s'ouvre dans une page imprimable. Choisis Imprimer / enregistrer en PDF.",
    },
    en: {
      title: "My printable sheets",
      intro: "Take your vocabulary with you before setting off. After the mission, review what you've really learned!",
      words: "Vocabulary sheet",
      wordsDetail: "Every word, expression and verb in this module. Available from the start.",
      report: "My journey summary",
      achieved: "Your practice, best challenge result and earned stamp.",
      pending: "Your progress so far; no stamp unless you pass the final challenge.",
      open: "Open and print",
      tip: "Each link opens a print-ready page. Select Print / save as PDF.",
    },
    es: {
      title: "Mis fichas para imprimir",
      intro: "Llévate el vocabulario antes de salir. Después de la misión, revisa lo que aprendiste de verdad.",
      words: "Ficha de vocabulario",
      wordsDetail: "Todas las palabras, expresiones y verbos del módulo. Disponible desde el inicio.",
      report: "Mi resumen de viaje",
      achieved: "Tus actividades, mejor resultado y sello obtenido.",
      pending: "Tu progreso actual, sin sello mientras no superes el reto final.",
      open: "Abrir e imprimir",
      tip: "Cada enlace abre una página preparada para imprimir. Elige Imprimir / guardar en PDF.",
    },
  }[locale];
  const bankHref = `/yo/langues/italien/parcours/${unitId}/vocabulaire?lang=${locale}`;
  const reportHref = `/yo/langues/italien/parcours/${unitId}/bilan?lang=${locale}`;
  return <section data-yoppo-printables-menu className="mt-4 space-y-3">
    <div className="flex items-start gap-3 rounded-2xl bg-[#e8f3e9] p-3 text-emerald-950">
      <CompanionAvatar visualId="travel" state="teacher_ready" size="xs" locale={locale} compact/>
      <p className="text-sm leading-6">{c.intro}</p>
    </div>
    <Link href={bankHref} target="_blank" rel="noopener" data-yoppo-printable-vocabulary
      className="flex min-h-20 items-center gap-3 rounded-2xl border-2 border-[#c2dfc5] bg-white p-4 text-stone-900 hover:border-emerald-700 focus-visible:outline-4 focus-visible:outline-amber-500">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-900"><BookOpen size={25} aria-hidden/></span>
      <span className="min-w-0 flex-1"><span className="block font-bold">{c.words}</span><span className="mt-1 block text-xs leading-5 text-stone-600">{c.wordsDetail}</span><span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-800"><Printer size={14} aria-hidden/>{c.open}</span></span>
    </Link>
    <Link href={reportHref} target="_blank" rel="noopener" data-yoppo-printable-achievement
      className="flex min-h-20 items-center gap-3 rounded-2xl border-2 border-[#e9d3ab] bg-white p-4 text-stone-900 hover:border-amber-700 focus-visible:outline-4 focus-visible:outline-amber-500">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-900">
        {mastered ? <CheckCircle2 size={25} aria-hidden/> : <FileText size={25} aria-hidden/>}
      </span>
      <span className="min-w-0 flex-1"><span className="block font-bold">{c.report}</span><span className="mt-1 block text-xs leading-5 text-stone-600">{mastered ? c.achieved : c.pending}</span><span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-800"><Printer size={14} aria-hidden/>{c.open}</span></span>
    </Link>
    <p className="text-xs leading-5 text-stone-600">{c.tip}</p>
  </section>;
}
