import Link from "next/link";
import type { Metadata } from "next";
import { getYoLocale, buildYoLocaleHref, htmlLangFor } from "@/lib/yo/localize";
import { japaneseCourseUnits, japaneseCourseSources } from "@/lib/yo/japaneseCourse";
import { JAPANESE_COURSE_PATH } from "@/lib/yo/japaneseCourseProgress";
import { JapanesePrintButton } from "@/components/yo/japanese/JapanesePrintButton";

export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }): Promise<Metadata> {
  const locale = getYoLocale((await searchParams).lang);
  const title = { fr: "Carnet de cours", en: "Course notebook", es: "Cuaderno del curso" }[locale];
  return { title: "日本語 · " + title + " | YoPratiqo", robots: { index: false, follow: true } };
}
export default async function JapaneseNotebookPage({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const locale = getYoLocale((await searchParams).lang);
  const c = {
    fr: { title: "Japonais · Carnet de fondation", back: "Retour au parcours", intro: "Objectifs, mots en contexte et ateliers d’écriture. Utilise les scènes et les exercices interactifs du parcours pour préparer ce travail personnel.", goals: "Objectifs", words: "Lexique en contexte", structures: "Structures à réutiliser", kanji: "Kanji à observer et copier", writing: "Atelier d’écriture", model: "Modèle de comparaison", culture: "Réflexion interculturelle", sources: "Références", scope: "Support original de YoPratiqo, sans crédit universitaire ni équivalence JLPT. Les textes libres et la pratique orale se travaillent avec un professeur.", meaning: "Sens", word: "Mot", reading: "Lecture", notes: "Mes notes" },
    en: { title: "Japanese · Foundation notebook", back: "Back to course", intro: "Goals, words in context and writing workshops. Use the course’s scenes and interactive exercises to prepare this personal work.", goals: "Goals", words: "Vocabulary in context", structures: "Structures to reuse", kanji: "Kanji to observe and copy", writing: "Writing workshop", model: "Comparison model", culture: "Intercultural reflection", sources: "References", scope: "Original YoPratiqo material, without university credit or JLPT equivalence. Work on free writing and speaking with a teacher.", meaning: "Meaning", word: "Word", reading: "Reading", notes: "My notes" },
    es: { title: "Japonés · Cuaderno de fundamentos", back: "Volver al curso", intro: "Objetivos, palabras en contexto y talleres de escritura. Usa las escenas y ejercicios del curso para preparar este trabajo personal.", goals: "Objetivos", words: "Léxico en contexto", structures: "Estructuras para reutilizar", kanji: "Kanji para observar y copiar", writing: "Taller de escritura", model: "Modelo de comparación", culture: "Reflexión intercultural", sources: "Referencias", scope: "Material original de YoPratiqo, sin créditos universitarios ni equivalencia JLPT. Trabaja la escritura libre y la expresión oral con un profesor.", meaning: "Significado", word: "Palabra", reading: "Lectura", notes: "Mis notas" },
  }[locale];
  return <main lang={htmlLangFor(locale)} className="min-h-screen bg-[#f7f5ef] px-4 py-8 text-slate-800 print:bg-white print:p-0">
    <style>{"@media print { @page { margin: 18mm; } .jp-notebook-unit { break-before: page; } .jp-notebook-keep { break-inside: avoid; } a { text-decoration: none; } }"}</style>
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 print:hidden"><Link href={buildYoLocaleHref(JAPANESE_COURSE_PATH, locale)} className="text-sm font-semibold text-indigo-800 underline">{c.back}</Link><JapanesePrintButton locale={locale} /></div>
      <header className="mb-10"><p lang="ja" className="mb-5 text-5xl">日本語</p><h1 className="text-3xl font-semibold">{c.title}</h1><p className="mt-4 text-sm leading-relaxed">{c.intro}</p><p className="mt-3 text-xs leading-relaxed text-slate-500">{c.scope}</p></header>
      {japaneseCourseUnits.map((unit) => <section key={unit.id} className="jp-notebook-unit mb-12 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 print:rounded-none print:border-0 print:p-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">{{ fr: "Module", en: "Module", es: "Módulo" }[locale]} {unit.number}</p><h2 className="mt-2 text-2xl font-semibold">{unit.title[locale]}</h2><p className="mt-3 text-sm">{unit.subtitle[locale]}</p>
        <h3 className="mt-6 font-semibold">{c.goals}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{unit.goals.map((goal, i) => <li key={i}>{goal[locale]}</li>)}</ul>
        <h3 className="mt-6 font-semibold">{c.words}</h3><table className="mt-3 w-full border-collapse text-left text-sm"><thead><tr><th className="border-b p-2">{c.word}</th><th className="border-b p-2">{c.reading}</th><th className="border-b p-2">{c.meaning}</th></tr></thead><tbody>{unit.vocabulary.map((word) => <tr key={word.id}><td lang="ja" className="border-b border-slate-100 p-2 text-base">{word.ja}</td><td lang="ja" className="border-b border-slate-100 p-2">{word.kana}</td><td className="border-b border-slate-100 p-2">{word.meaning[locale]}</td></tr>)}</tbody></table>
        <h3 className="mt-6 font-semibold">{c.structures}</h3>{unit.grammar.map((point) => <article key={point.id} className="jp-notebook-keep mt-3 rounded-xl bg-slate-50 p-4 print:bg-white"><h4 className="text-sm font-semibold">{point.title[locale]}</h4><p className="mt-2 text-sm leading-relaxed">{point.explanation[locale]}</p><p lang="ja" className="mt-3 text-lg">{point.example.ja}</p><p className="mt-1 text-xs">{point.example.meaning[locale]}</p></article>)}
        <div className="jp-notebook-keep"><h3 className="mt-6 font-semibold">{c.kanji}</h3><div className="mt-3 grid grid-cols-5 gap-2">{unit.kanji.map((character) => <div key={character} className="space-y-2"><div lang="ja" className="border border-slate-300 p-3 text-center text-3xl">{character}</div><div aria-hidden className="h-16 border border-dashed border-slate-300" /><div aria-hidden className="h-16 border border-dashed border-slate-300" /></div>)}</div></div>
        <h3 className="mt-6 font-semibold">{c.writing}</h3><p className="mt-2 text-sm leading-relaxed">{unit.writing.prompt[locale]}</p><div aria-label={c.notes} className="my-4 h-36 border-y border-slate-300" /><ul className="space-y-2 text-sm">{unit.writing.checklist.map((check, i) => <li key={i}>□ {check[locale]}</li>)}</ul>
        <div className="jp-notebook-keep mt-6 border-l-2 border-indigo-200 pl-4"><h4 className="text-xs font-semibold uppercase text-indigo-600">{c.model}</h4><p lang="ja" className="mt-2 text-lg leading-relaxed">{unit.writing.model.ja}</p><p lang="ja" className="mt-2 text-sm">{unit.writing.model.kana}</p><p className="mt-2 text-sm text-slate-600">{unit.writing.model.meaning[locale]}</p></div>
        <div className="jp-notebook-keep"><h3 className="mt-6 font-semibold">{c.culture}</h3><p className="mt-2 text-sm leading-relaxed">{unit.culture.reflection[locale]}</p><div aria-label={c.notes} className="mt-4 h-24 border-y border-slate-300" /></div>
      </section>)}
      <section className="jp-notebook-unit"><h2 className="text-2xl font-semibold">{c.sources}</h2><p className="my-4 text-sm">{c.scope}</p><ul className="space-y-4 text-sm">{japaneseCourseSources.map((source) => <li key={source.id}><a href={source.url} className="font-semibold text-indigo-800 underline">{source.publisher} · {source.title}</a><p className="mt-1 text-xs leading-relaxed">{source.purpose[locale]}</p><p className="mt-1 break-all text-xs text-slate-500">{source.url}</p></li>)}</ul></section>
    </div>
  </main>;
}
