"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, MapPin, Stamp } from "lucide-react";
import { WordBankPrintButton } from "@/components/yo/personalized/WordBankPrintButton";
import { GUIDED_PROGRESS_KEY } from "@/lib/yo/personalized/profile";
import { parseCourseProgress } from "@/lib/yo/italian/course/courseProgress";
import { italianCourseHref } from "@/lib/yo/italian/course/courseLinks";
import type { CourseCatalog, CourseUnitSummary } from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";
import { italianWorldForUnit } from "@/lib/yo/italian/worlds";

type Status = { ready: boolean; mastered: boolean; best: number | null; practiced: number; total: number };
export function ItalianAchievementPrintable({ unit, catalog, locale }: {
  unit: CourseUnitSummary; catalog: CourseCatalog; locale: YoLocale;
}) {
  const [status, setStatus] = useState<Status>({ ready: false, mastered: false, best: null, practiced: 0, total: unit.activityIds.length });
  useEffect(() => {
    const read = () => {
      try {
        const data = parseCourseProgress(localStorage.getItem(GUIDED_PROGRESS_KEY), catalog);
        const exam = catalog.assessments.find(item => item.id === unit.quizId);
        const best = data.assessments[unit.quizId]?.bestIndependent ?? null;
        setStatus({ ready: true, best, mastered: exam !== undefined && best !== null && best >= exam.passPercent,
          practiced: unit.activityIds.filter(id => data.activities[id]?.completed).length, total: unit.activityIds.length });
      } catch { setStatus(state => ({ ...state, ready: true })); }
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, [catalog, unit]);
  const c = {
    fr: { heading: "Mon bilan de voyage", city: "Ville explorée", subtitle: "Ce que j'ai appris à pratiquer", earned: "Défi validé · tampon obtenu", pending: "Le défi final n'est pas encore validé sans aide", score: "Meilleur défi sans aide", done: "Activités pratiquées", advice: "Continue d'étudier !", review: "Reviens à ces expressions et exerce-toi régulièrement dans ton carnet pour mieux les retenir.", disclaimer: "Bilan pédagogique personnel fondé sur les exercices validés. Ce document ne constitue pas une certification de niveau.", notebook: "Ma fiche de mots", back: "Retour à la ville", loading: "Chargement de mes acquis…" },
    en: { heading: "My journey achievements", city: "City explored", subtitle: "What I have learned to practise", earned: "Challenge passed · stamp earned", pending: "The final challenge is not yet passed independently", score: "Best independent challenge", done: "Activities practised", advice: "Keep studying!", review: "Review these expressions and practise them regularly in your word notebook for better retention.", disclaimer: "Personal learning summary based on completed assessments. This is not a language-level certificate.", notebook: "My word sheet", back: "Back to the city", loading: "Loading my results…" },
    es: { heading: "Mis logros de viaje", city: "Ciudad explorada", subtitle: "Lo que he aprendido a practicar", earned: "Reto superado · sello obtenido", pending: "Aún no has superado el reto final sin ayuda", score: "Mejor reto sin ayuda", done: "Actividades practicadas", advice: "¡Sigue estudiando!", review: "Repasa estas expresiones y practícalas regularmente en tu cuaderno para recordarlas mejor.", disclaimer: "Balance personal basado en evaluaciones completadas. No es un certificado oficial de nivel.", notebook: "Mi ficha de palabras", back: "Volver a la ciudad", loading: "Cargando mis logros…" },
  }[locale];
  const city = italianWorldForUnit(unit.id)?.cities.find(item => item.unitId === unit.id)?.name ?? unit.title[locale];
  const link = italianCourseHref(locale, unit.id);
  return <main lang={locale} className="mx-auto min-h-screen max-w-3xl bg-white px-5 pb-12 pt-8 text-stone-900 sm:px-10" data-yoppo-achievement-print>
    <nav aria-label={c.heading} className="yo-achievement-controls mb-8 flex flex-wrap items-center gap-3 border-b border-stone-200 pb-5">
      <WordBankPrintButton locale={locale} />
      <Link className="min-h-11 rounded-xl px-3 py-3 text-sm font-semibold text-emerald-900 underline" href={link}>{c.back}</Link>
      <Link className="min-h-11 rounded-xl px-3 py-3 text-sm font-semibold text-emerald-900 underline" href={`/yo/langues/italien/parcours/${unit.id}/vocabulaire?lang=${locale}`}>{c.notebook}</Link>
    </nav>
    <header className="border-b-2 border-emerald-800 pb-6">
      <p className="text-xs font-black uppercase tracking-widest text-emerald-800">YoPratiqo · Italiano · {c.city}</p>
      <h1 className="mt-3 font-serif text-4xl font-bold">{c.heading}</h1>
      <p className="mt-4 flex items-center gap-2 text-xl font-bold text-emerald-950"><MapPin size={20} aria-hidden />{city}</p>
      <p className="mt-2 text-base text-stone-700">{unit.title[locale]}</p>
    </header>
    {!status.ready ? <p role="status" className="mt-6">{c.loading}</p> : <>
      <section className="mt-7">
        <p className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${status.mastered ? "bg-emerald-50 text-emerald-950" : "bg-stone-100 text-stone-700"}`}>
          {status.mastered ? <Stamp size={20} aria-hidden /> : <BookOpen size={20} aria-hidden />}
          {status.mastered ? c.earned : c.pending}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-stone-200 p-4"><p className="text-xs text-stone-600">{c.done}</p><p className="mt-2 text-2xl font-bold">{status.practiced} / {status.total}</p></div>
          <div className="rounded-xl border border-stone-200 p-4"><p className="text-xs text-stone-600">{c.score}</p><p className="mt-2 text-2xl font-bold">{status.best === null ? "—" : `${status.best} %`}</p></div>
        </div>
      </section>
      <section className="mt-8">
        <h2 className="font-serif text-2xl font-bold">{c.subtitle}</h2>
        <ul className="mt-5 space-y-4">
          {unit.objectives.map((goal, index) => <li key={index} className="flex items-start gap-3"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-800" aria-hidden /><span className="leading-7">{goal[locale]}</span></li>)}
        </ul>
      </section>
    </>}
    <section className="mt-10 rounded-2xl bg-emerald-50 p-5">
      <h2 className="font-bold text-emerald-950">{c.advice}</h2>
      <p className="mt-2 text-sm leading-7">{c.review}</p>
    </section>
    <footer className="mt-10 border-t border-stone-200 pt-5 text-xs leading-5 text-stone-600">{c.disclaimer}</footer>
    <style>{`@media print{@page{size:auto;margin:14mm}body{background:white!important}.yo-achievement-controls{display:none!important}[data-yoppo-achievement-print]{width:100%;max-width:none;padding:0!important;min-height:auto}a{color:inherit!important}}`}</style>
  </main>;
}
