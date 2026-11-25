import { useId } from "react";
import type { CourseLesson } from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";
import { firstMeetingGrammar, type StudySection, type StudyExample } from "@/lib/yo/pedagogy/firstMeetingGrammar";

const labels = {
  fr: { section: "Comprendre la langue", examples: "Des exemples pour comprendre", remember: "À retenir", more: "Pour aller plus loin", optional: "Facultatif" },
  en: { section: "Understand the language", examples: "Examples to make it clear", remember: "Remember", more: "A closer look", optional: "Optional" },
  es: { section: "Entender la lengua", examples: "Ejemplos para entender", remember: "Recuerda", more: "Para profundizar", optional: "Opcional" },
};

/** Layout only: preserve every authored sentence; never infer or generate a grammar rule. */
export function explanationParagraphs(body: string, locale: YoLocale): string[] {
  const paragraphs = body.split(/\n\s*\n/).filter(p => p.trim());
  if (typeof Intl.Segmenter !== "function") return paragraphs;
  return paragraphs.flatMap(paragraph => {
    const sentences = Array.from(new Intl.Segmenter(locale, { granularity: "sentence" }).segment(paragraph), s => s.segment.trim()).filter(Boolean);
    const groups: string[] = [];
    for (const sentence of sentences) {
      const previous = groups.at(-1);
      if (previous && previous.length + sentence.length < 240) groups[groups.length - 1] += ` ${sentence}`;
      else groups.push(sentence);
    }
    return groups;
  });
}

function Examples({ examples, locale }: { examples: StudyExample[]; locale: YoLocale }) {
  return <dl className="mt-4 space-y-3" data-language-examples>
    {examples.map((item, index) => <div key={`${item.text}:${index}`} className="min-w-0 rounded-2xl bg-emerald-50/70 px-4 py-3">
      <dt lang="it" className="break-words text-lg font-semibold leading-relaxed text-emerald-950">{item.text}</dt>
      <dd className="mt-1 break-words text-base leading-relaxed text-stone-700">{item.meaning[locale]}</dd>
    </div>)}
  </dl>;
}

function TeachingSection({ section, locale }: { section: StudySection; locale: YoLocale }) {
  return <section className="min-w-0" data-language-concept>
    <h3 className="text-lg font-bold leading-snug text-stone-900">{section.title[locale]}</h3>
    <p className="mt-3 text-[1.0625rem] leading-[1.8] text-stone-700">{section.explanation[locale]}</p>
    <Examples examples={section.examples} locale={locale}/>
  </section>;
}

/** Human-readable explanation inside the existing step: no extra navigation or mastery claims. */
export function LanguageExplanation({ lesson, locale }: { lesson: Pick<CourseLesson, "id" | "grammar">; locale: YoLocale }) {
  const id = useId(), copy = labels[locale], guide = firstMeetingGrammar[lesson.id];
  return <section lang={locale} aria-labelledby={id} data-language-explanation={lesson.id} className="mx-auto min-w-0 max-w-[62ch]">
    <p className="mb-2 text-sm font-semibold text-emerald-800">{copy.section}</p>
    <h2 id={id} className="text-2xl font-bold leading-tight tracking-tight text-stone-900">{guide?.title[locale] ?? lesson.grammar.title[locale]}</h2>
    {guide ? <>
      <p className="mt-4 text-[1.0625rem] leading-[1.8] text-stone-700">{guide.introduction[locale]}</p>
      <div className="mt-7 space-y-7 divide-y divide-stone-200 [&>section:not(:first-child)]:pt-7">{guide.sections.map((section, i) => <TeachingSection key={i} section={section} locale={locale}/>)}</div>
      <aside className="mt-7 rounded-2xl border-l-4 border-emerald-700 bg-emerald-50 p-4" aria-label={copy.remember}>
        <h3 className="font-bold text-emerald-950">{copy.remember}</h3>
        <p className="mt-2 text-[1.0625rem] leading-[1.8] text-emerald-950">{guide.remember[locale]}</p>
      </aside>
      {guide.more.length ? <details className="mt-6 rounded-2xl border border-stone-200 p-4" data-language-deeper>
        <summary className="min-h-11 cursor-pointer rounded-lg py-2 font-semibold leading-relaxed text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-4">{copy.more}<span className="ml-2 text-sm font-normal text-stone-600">· {copy.optional}</span></summary>
        <div className="mt-5 space-y-7">{guide.more.map((section, i) => <TeachingSection key={i} section={section} locale={locale}/>)}</div>
      </details> : null}
    </> : <>
      <div className="mt-5 space-y-4" data-preserved-explanation>{explanationParagraphs(lesson.grammar.body[locale], locale).map((paragraph, i) => <p key={i} className="text-[1.0625rem] leading-[1.8] text-stone-700">{paragraph}</p>)}</div>
      <h3 className="mt-7 text-lg font-bold">{copy.examples}</h3>
      <Examples examples={lesson.grammar.examples.map(p => ({ text: p.it, meaning: p.meaning }))} locale={locale}/>
    </>}
  </section>;
}
