/**
 * DominicanModulePrintables — premium server-rendered worksheet block.
 *
 * Renders the printable exercise pack of any RD module in the same
 * trilingual, mobile-first, premium visual language as the rest of
 * the country/module pages. Every exercise is real reinforcement —
 * vocabulary match, fill-in-the-blank, scenario multiple choice,
 * production prompts, and (Module 3) singular-verb practice — with
 * a collapsible answer key at the bottom of each sheet.
 *
 * Design contract:
 *   - Server component. No client state, no Stripe, no Supabase, no
 *     audio generation. Plain HTML + Tailwind.
 *   - Spanish stays the visual focus: target text uses larger weight
 *     and `lang="es"` so screen readers and search engines treat it
 *     correctly. FR/EN/ES gloss is rendered as helper copy.
 *   - Print-friendly: every worksheet card uses `print:break-inside-
 *     avoid` so a learner who hits Cmd-P / Ctrl-P gets a clean
 *     printout with one exercise per page section.
 *   - Locale-aware: every UI string is resolved through `t(...)` so
 *     FR/EN/ES learners see their own scaffolding while practising
 *     Spanish.
 */

import { Sparkles, FileText, ClipboardCheck } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { t } from "@/lib/yo/localize";
import type {
  PrintableExercise,
  PrintableFillBlankExercise,
  PrintableMatchExercise,
  PrintableMultipleChoiceExercise,
  PrintableProductionExercise,
  PrintableVerbFormExercise,
  PrintableWorksheetPack,
} from "@/lib/yo/dominicanRepublicPrintables";

interface DominicanModulePrintablesProps {
  pack: PrintableWorksheetPack;
  locale: YoLocale;
}

/** Public entry point — wires the section header + every worksheet. */
export function DominicanModulePrintables({
  pack,
  locale,
}: DominicanModulePrintablesProps) {
  return (
    <section
      aria-labelledby={pack.headingId}
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
      {...{ [pack.dataAttribute]: pack.exercises.length }}
    >
      <div className="flex flex-col gap-3 sm:gap-4">
        <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
          <ClipboardCheck className="size-4 text-[#1D9E75]" aria-hidden />
          {t(pack.sectionEyebrow, locale)}
        </p>
        <h2
          id={pack.headingId}
          className="text-2xl font-semibold tracking-tight text-[#0F6E56] sm:text-3xl"
        >
          {t(pack.sectionTitle, locale)}
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-[#0F6E56]/75 sm:text-base">
          {t(pack.sectionBlurb, locale)}
        </p>
      </div>

      <div
        className="mt-6 grid gap-4 md:grid-cols-2 print:grid-cols-1"
        data-yo-printable-exercise-count={pack.exercises.length}
      >
        {pack.exercises.map((exercise) => (
          <PrintableCard
            key={exercise.id}
            exercise={exercise}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}

/** Per-exercise card. Dispatches on `kind`. */
function PrintableCard({
  exercise,
  locale,
}: {
  exercise: PrintableExercise;
  locale: YoLocale;
}) {
  return (
    <article
      className="rounded-3xl border border-[#0F6E56]/12 bg-white p-5 shadow-[0_10px_26px_rgba(15,58,52,0.05)] print:break-inside-avoid sm:p-6"
      data-yo-printable-worksheet
      data-yo-printable-kind={exercise.kind}
    >
      <header className="flex items-start justify-between gap-3 border-b border-dashed border-[#0F6E56]/20 pb-3">
        <div className="flex flex-col">
          <span className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#1D9E75]">
            {t(exercise.eyebrow, locale)}
          </span>
          <h3 className="mt-1 text-lg font-black leading-snug text-[#0F6E56]">
            {t(exercise.title, locale)}
          </h3>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#FFF4D6] px-3 py-1 text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#8a5a17]">
          <Sparkles className="size-3" aria-hidden />
          {kindBadge(exercise.kind, locale)}
        </span>
      </header>

      <p className="mt-3 text-sm leading-relaxed text-[#0F6E56]/75">
        {t(exercise.instructions, locale)}
      </p>

      <div className="mt-4">{renderBody(exercise, locale)}</div>

      <details className="group mt-5 rounded-2xl bg-[#F4FBF9] px-4 py-3 print:open">
        <summary className="cursor-pointer list-none text-xs font-black uppercase tracking-[0.12em] text-[#0F6E56] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="size-3.5" aria-hidden />
            {t(
              {
                fr: "Solutions",
                en: "Answer key",
                es: "Soluciones",
              },
              locale,
            )}
            <span className="text-[#1D9E75] transition group-open:rotate-180">
              ▾
            </span>
          </span>
        </summary>
        <div className="mt-3 text-sm leading-relaxed text-[#0F6E56]/85">
          {renderAnswerKey(exercise, locale)}
        </div>
      </details>
    </article>
  );
}

function kindBadge(kind: PrintableExercise["kind"], locale: YoLocale): string {
  switch (kind) {
    case "match":
      return t({ fr: "vocabulaire", en: "vocabulary", es: "vocabulario" }, locale);
    case "fill_blank":
      return t({ fr: "à compléter", en: "fill in", es: "completar" }, locale);
    case "multiple_choice":
      return t({ fr: "choix de phrase", en: "phrase choice", es: "elegir frase" }, locale);
    case "production":
      return t({ fr: "production", en: "production", es: "producción" }, locale);
    case "verb_form":
      return t({ fr: "verbes", en: "verb forms", es: "verbos" }, locale);
  }
}

// ─── Body renderers ─────────────────────────────────────────────────────

function renderBody(exercise: PrintableExercise, locale: YoLocale) {
  switch (exercise.kind) {
    case "match":
      return <MatchBody exercise={exercise} locale={locale} />;
    case "fill_blank":
      return <FillBlankBody exercise={exercise} locale={locale} />;
    case "multiple_choice":
      return <MultipleChoiceBody exercise={exercise} locale={locale} />;
    case "production":
      return <ProductionBody exercise={exercise} locale={locale} />;
    case "verb_form":
      return <VerbFormBody exercise={exercise} locale={locale} />;
  }
}

function MatchBody({
  exercise,
  locale,
}: {
  exercise: PrintableMatchExercise;
  locale: YoLocale;
}) {
  // Render Spanish targets in column A and the meanings in column B,
  // shuffled deterministically so a learner has to actually work.
  const meanings = exercise.pairs.map((pair, idx) => ({
    letter: String.fromCharCode(65 + idx),
    pairId: pair.id,
    label: t(pair.meaning, locale),
  }));
  const shuffled = stableShuffle(meanings, exercise.id);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ol className="space-y-1.5 text-sm">
        {exercise.pairs.map((pair, idx) => (
          <li key={pair.id} className="flex items-baseline gap-2">
            <span className="w-6 shrink-0 text-[0.7rem] font-black text-[#1D9E75]">
              {idx + 1}.
            </span>
            <span className="text-base font-black text-[#0F6E56]" lang="es">
              {pair.spanish}
            </span>
            <span
              className="ml-auto inline-block min-w-[2rem] border-b border-dashed border-[#0F6E56]/40 pb-0.5 text-center text-xs text-[#0F6E56]/60"
              aria-hidden
            >
              ___
            </span>
          </li>
        ))}
      </ol>
      <ol className="space-y-1.5 text-sm">
        {shuffled.map((entry) => (
          <li key={entry.pairId} className="flex items-baseline gap-2">
            <span className="w-6 shrink-0 text-[0.7rem] font-black text-[#8a5a17]">
              {entry.letter}.
            </span>
            <span className="text-[#0F6E56]/85">{entry.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FillBlankBody({
  exercise,
  locale,
}: {
  exercise: PrintableFillBlankExercise;
  locale: YoLocale;
}) {
  return (
    <ol className="space-y-3 text-sm">
      {exercise.items.map((item, idx) => (
        <li key={item.id} className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-[#0F6E56]/65">
            {idx + 1}. {t(item.scenario, locale)}
          </p>
          <p
            className="rounded-xl bg-[#F4FBF9] px-3 py-2 text-base font-black leading-relaxed text-[#0F6E56]"
            lang="es"
          >
            {item.prompt}
          </p>
        </li>
      ))}
    </ol>
  );
}

function MultipleChoiceBody({
  exercise,
  locale,
}: {
  exercise: PrintableMultipleChoiceExercise;
  locale: YoLocale;
}) {
  return (
    <ol className="space-y-3 text-sm">
      {exercise.items.map((item, idx) => (
        <li key={item.id} className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-[#0F6E56]/65">
            {idx + 1}. {t(item.scenario, locale)}
          </p>
          <ul className="grid gap-1.5">
            {item.options.map((option) => (
              <li
                key={option.id}
                className="flex items-baseline gap-2 rounded-xl bg-[#F4FBF9] px-3 py-1.5"
              >
                <span
                  aria-hidden
                  className="grid size-5 shrink-0 place-items-center rounded-full border border-[#0F6E56]/30 text-[0.6rem] font-black uppercase text-[#0F6E56]/60"
                >
                  {option.id}
                </span>
                <span className="text-base font-black text-[#0F6E56]" lang="es">
                  {option.spanish}
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function ProductionBody({
  exercise,
  locale,
}: {
  exercise: PrintableProductionExercise;
  locale: YoLocale;
}) {
  return (
    <ol className="space-y-3 text-sm">
      {exercise.items.map((item, idx) => (
        <li key={item.id} className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-[#0F6E56]/65">
            {idx + 1}. {t(item.situation, locale)}
          </p>
          <p
            className="border-b border-dashed border-[#0F6E56]/30 pb-1 text-xs italic text-[#0F6E56]/45"
            aria-hidden
          >
            ____________________________
          </p>
        </li>
      ))}
    </ol>
  );
}

function VerbFormBody({
  exercise,
  locale,
}: {
  exercise: PrintableVerbFormExercise;
  locale: YoLocale;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#1D9E75]">
          <th className="py-1 pr-2">
            {t(
              { fr: "Infinitif", en: "Infinitive", es: "Infinitivo" },
              locale,
            )}
          </th>
          <th className="py-1 pr-2">
            {t({ fr: "Personne", en: "Person", es: "Persona" }, locale)}
          </th>
          <th className="py-1 pr-2">
            {t({ fr: "Sens", en: "Meaning", es: "Significado" }, locale)}
          </th>
          <th className="py-1">
            {t({ fr: "Forme", en: "Form", es: "Forma" }, locale)}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-dashed divide-[#0F6E56]/15">
        {exercise.items.map((item) => (
          <tr key={item.id} className="align-baseline">
            <td className="py-2 pr-2 text-base font-black text-[#0F6E56]" lang="es">
              {item.infinitive}
            </td>
            <td className="py-2 pr-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#0F6E56]/65">
              {item.person}
            </td>
            <td className="py-2 pr-2 text-xs text-[#0F6E56]/75">
              {t(item.meaning, locale)}
            </td>
            <td
              className="py-2 text-xs italic text-[#0F6E56]/45"
              aria-hidden
            >
              ___________
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Answer-key renderers ───────────────────────────────────────────────

function renderAnswerKey(exercise: PrintableExercise, locale: YoLocale) {
  switch (exercise.kind) {
    case "match":
      return <MatchAnswerKey exercise={exercise} locale={locale} />;
    case "fill_blank":
      return <FillBlankAnswerKey exercise={exercise} locale={locale} />;
    case "multiple_choice":
      return <MultipleChoiceAnswerKey exercise={exercise} locale={locale} />;
    case "production":
      return <ProductionAnswerKey exercise={exercise} locale={locale} />;
    case "verb_form":
      return <VerbFormAnswerKey exercise={exercise} locale={locale} />;
  }
}

function MatchAnswerKey({
  exercise,
  locale,
}: {
  exercise: PrintableMatchExercise;
  locale: YoLocale;
}) {
  // The "shuffled" list above carries (letter, pairId). Inverting that
  // map gives every Spanish row its correct meaning letter.
  const meanings = exercise.pairs.map((pair, idx) => ({
    letter: String.fromCharCode(65 + idx),
    pairId: pair.id,
    label: t(pair.meaning, locale),
  }));
  const shuffled = stableShuffle(meanings, exercise.id);
  const letterByPair = new Map(shuffled.map((m) => [m.pairId, m.letter]));

  return (
    <ol className="space-y-1">
      {exercise.pairs.map((pair, idx) => (
        <li key={pair.id} className="flex items-baseline gap-2">
          <span className="w-6 shrink-0 text-[0.7rem] font-black text-[#1D9E75]">
            {idx + 1}.
          </span>
          <span className="text-sm font-black text-[#0F6E56]" lang="es">
            {pair.spanish}
          </span>
          <span className="text-[#0F6E56]/65">→ {letterByPair.get(pair.id)}</span>
          <span className="text-[#0F6E56]/65">· {t(pair.meaning, locale)}</span>
        </li>
      ))}
    </ol>
  );
}

function FillBlankAnswerKey({
  exercise,
  locale,
}: {
  exercise: PrintableFillBlankExercise;
  locale: YoLocale;
}) {
  return (
    <ol className="space-y-2">
      {exercise.items.map((item, idx) => (
        <li key={item.id} className="flex flex-col gap-0.5">
          <p>
            <span className="font-black text-[#1D9E75]">{idx + 1}.</span>{" "}
            <span lang="es" className="font-black text-[#0F6E56]">
              {item.answer}
            </span>
          </p>
          {item.gloss ? (
            <p className="text-xs text-[#0F6E56]/65">{t(item.gloss, locale)}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function MultipleChoiceAnswerKey({
  exercise,
  locale,
}: {
  exercise: PrintableMultipleChoiceExercise;
  locale: YoLocale;
}) {
  return (
    <ol className="space-y-2">
      {exercise.items.map((item, idx) => {
        const correct = item.options.find((o) => o.id === item.correctOptionId);
        return (
          <li key={item.id} className="flex flex-col gap-0.5">
            <p>
              <span className="font-black text-[#1D9E75]">{idx + 1}.</span>{" "}
              <span className="font-black uppercase text-[#0F6E56]">
                {item.correctOptionId}
              </span>{" "}
              ·{" "}
              {correct ? (
                <span lang="es" className="font-black text-[#0F6E56]">
                  {correct.spanish}
                </span>
              ) : null}
            </p>
            <p className="text-xs text-[#0F6E56]/65">
              {t(item.rationale, locale)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function ProductionAnswerKey({
  exercise,
  locale,
}: {
  exercise: PrintableProductionExercise;
  locale: YoLocale;
}) {
  return (
    <ol className="space-y-2">
      {exercise.items.map((item, idx) => (
        <li key={item.id} className="flex flex-col gap-0.5">
          <p>
            <span className="font-black text-[#1D9E75]">{idx + 1}.</span>{" "}
            <span lang="es" className="font-black text-[#0F6E56]">
              {item.modelAnswer}
            </span>
          </p>
          <p className="text-xs text-[#0F6E56]/65">{t(item.modelGloss, locale)}</p>
        </li>
      ))}
    </ol>
  );
}

function VerbFormAnswerKey({
  exercise,
  locale,
}: {
  exercise: PrintableVerbFormExercise;
  locale: YoLocale;
}) {
  return (
    <ol className="space-y-2">
      {exercise.items.map((item, idx) => (
        <li key={item.id} className="flex flex-col gap-0.5">
          <p>
            <span className="font-black text-[#1D9E75]">{idx + 1}.</span>{" "}
            <span lang="es" className="font-black text-[#0F6E56]">
              {item.infinitive} ({item.person}) → {item.answer}
            </span>
          </p>
          <p className="text-xs text-[#0F6E56]/65" lang="es">
            {t(item.exampleSentence, locale)}
          </p>
        </li>
      ))}
    </ol>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Deterministic Fisher-Yates so the answer key always lines up with
 * the rendered worksheet, even between server renders. The seed is
 * derived from the exercise id (a stable string) so the same pack
 * always produces the same shuffle.
 */
function stableShuffle<T>(items: T[], seed: string): T[] {
  const rand = mulberry32(hashSeed(seed));
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i]!, arr[j]!] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
