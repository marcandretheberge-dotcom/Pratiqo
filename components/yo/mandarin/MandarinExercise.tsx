"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import { RotateCcw, Lightbulb, Check, Undo2 } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import {
  L,
  type Attempt,
  type Exercise,
  type Phrase,
  type Result,
} from "@/lib/yo/mandarin/types";
import {
  evaluate,
  checkAnswer,
  restartMandarinAttempt,
  visibleMandarinHelp,
} from "@/lib/yo/mandarin/progress";
import { MandarinAudio } from "./MandarinAudio";
import images from "@/lib/yo/mandarin/imageAssets.json";
import toneAssets from "@/lib/yo/mandarin/toneAssets.json";

export const control =
  "min-h-11 rounded-xl border border-[#d5ccbd] bg-white px-4 py-2 text-sm text-[#302f27] hover:border-[#245a46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245a46] disabled:opacity-50";
export function PhraseView({
  phrase,
  locale,
  pinyin,
  translation,
}: {
  phrase: Phrase;
  locale: YoLocale;
  pinyin: boolean;
  translation: boolean;
}) {
  return (
    <span className="block min-w-0">
      <span
        lang="zh-Hans"
        className="block break-words text-xl leading-relaxed"
      >
        {phrase.hanzi}
      </span>
      {pinyin && (
        <span
          lang="zh-Latn-pinyin"
          className="mt-1 block text-sm text-teal-800"
        >
          {phrase.pinyin}
        </span>
      )}
      {translation && (
        <span className="mt-1 block text-sm text-gray-600">
          {phrase.meaning[locale]}
        </span>
      )}
    </span>
  );
}
export function MandarinExercise({
  exercise,
  state,
  previous,
  locale,
  pinyin,
  translation = false,
  onChange,
  onResult,
  onAudio,
  onRestartWithoutHelp,
}: {
  exercise: Exercise;
  state: Attempt;
  previous?: Result;
  locale: YoLocale;
  pinyin: boolean;
  translation?: boolean;
  onChange: (state: Attempt) => void;
  onResult: (result: Result) => void | boolean;
  onAudio?: (playing: boolean) => void;
  onRestartWithoutHelp?: () => void;
}) {
  const feedback = useRef<HTMLDivElement>(null);
  const submitted = useRef(false);
  const composing = useRef(false);
  const revealedHelp = visibleMandarinHelp(exercise, pinyin, translation);
  useEffect(() => {
    if (!state.checked) submitted.current = false;
  }, [state.checked]);
  useEffect(() => {
    if (revealedHelp && !state.checked && !state.assisted) onChange({ ...state, assisted: true });
  }, [revealedHelp, state, onChange]);
  const patch = (change: Partial<Attempt>) => onChange({ ...state, ...change });
  const list = Array.isArray(state.answer) ? state.answer : [];
  const pairs =
    typeof state.answer === "object" && !Array.isArray(state.answer)
      ? state.answer
      : {};
  const chosen = typeof state.answer === "string" ? state.answer : "";
  const ready =
    exercise.kind === "build"
      ? list.length === exercise.tokens.length
      : exercise.kind === "match"
        ? Object.keys(pairs).length === exercise.pairs.length
        : Boolean(chosen.trim());
  const listening = exercise.kind === "listen" || exercise.kind === "tone";
  const choices = "choices" in exercise ? exercise.choices : [];
  const offset =
    [...exercise.id].reduce(
      (sum, character) => sum + character.charCodeAt(0),
      0,
    ) % (choices.length || 1);
  const orderedChoices =
    exercise.kind === "map"
      ? choices
      : [...choices.slice(offset), ...choices.slice(0, offset)];
  function check() {
    if (submitted.current || state.checked || !ready || composing.current)
      return;
    const assisted = state.assisted || revealedHelp;
    const next = evaluate(exercise, { ...state, assisted }, previous);
    if (!next) return;
    submitted.current = true;
    if (onResult(next) === false) { submitted.current = false; return; }
    patch({ checked: true, correct: checkAnswer(exercise, state.answer), assisted });
    requestAnimationFrame(() => feedback.current?.focus());
  }
  return (
    <section aria-label={exercise.prompt[locale]} className="space-y-5">
      <h2 className="text-lg font-semibold leading-relaxed sm:text-xl">
        {exercise.prompt[locale]}
      </h2>
      {exercise.stimulus && (
        <article className="space-y-3 rounded-xl border border-[#c9d8bd] bg-[#edf2e6] p-4" aria-label={L("Message à lire", "Message to read", "Mensaje para leer")[locale]}>
          <p className="text-sm font-semibold text-teal-900">{L("Message à lire", "Message to read", "Mensaje para leer")[locale]}</p>
          <PhraseView phrase={exercise.stimulus} locale={locale} pinyin={pinyin} translation={translation} />
        </article>
      )}
      {!state.checked && (revealedHelp || state.assisted) && <p className="text-sm text-amber-900">{L("Une aide a été affichée pour cet essai. Après la vérification, tu pourras recommencer sans aide.", "Help has been displayed for this attempt. After checking, you can start again without help.", "Se mostró ayuda en este intento. Después de verificar, podrás empezar sin ayuda.")[locale]}</p>}
      {exercise.scene && (
        <Image
          src={images[exercise.scene as keyof typeof images].src}
          width={720}
          height={270}
          alt=""
          className="aspect-[8/3] w-full rounded-lg object-cover"
        />
      )}
      {"audio" in exercise && exercise.audio && (
        <MandarinAudio
          text={exercise.audio.hanzi}
          tone={exercise.tone}
          label={L("le message", "the message", "el mensaje")[locale]}
          locale={locale}
          onHeard={() => patch({ heard: true })}
          onPlaying={onAudio}
        />
      )}
      {"choices" in exercise && (
        <div
          className={
            exercise.kind === "map"
              ? "grid grid-cols-3 gap-2 border-y-8 border-gray-300 py-4"
              : "grid gap-3 sm:grid-cols-2"
          }
        >
          {orderedChoices.map((choice) => (
            <button
              type="button"
              key={choice.id}
              aria-pressed={chosen === choice.id}
              disabled={state.checked}
              className={`${control} min-w-0 text-left ${exercise.kind === "map" ? "!px-2" : ""} ${chosen === choice.id ? "ring-2 ring-teal-700 bg-teal-50" : ""}`}
              onClick={() => patch({ answer: choice.id })}
            >
              {choice.image && (
                <Image
                  src={choice.image}
                  width={400}
                  height={260}
                  alt={
                    choice.label?.[locale] ??
                    choice.phrase?.meaning[locale] ??
                    ""
                  }
                  className="mb-3 aspect-[4/3] w-full rounded object-cover"
                />
              )}
              {choice.phrase ? (
                <PhraseView
                  phrase={choice.phrase}
                  locale={locale}
                  pinyin={pinyin}
                  translation={false}
                />
              ) : (
                choice.label?.[locale]
              )}
              {choice.detail && (
                <span className="mt-2 block text-sm font-semibold">
                  {choice.detail[locale]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {exercise.kind === "build" && (
        <>
          <div
            className="min-h-24 rounded-lg border-2 border-dashed border-teal-300 p-4"
            lang="zh-Hans"
            aria-live="polite"
          >
            {list.join(" ") || "…"}
          </div>
          <div className="flex flex-wrap gap-2">
            {exercise.tokens.map((token, index) => {
              const used =
                list.filter((word) => word === token).length >=
                exercise.tokens
                  .slice(0, index + 1)
                  .filter((word) => word === token).length;
              return (
                <button
                  type="button"
                  key={index}
                  lang="zh-Hans"
                  disabled={used || state.checked}
                  className={control}
                  onClick={() => patch({ answer: [...list, token] })}
                >
                  {token}
                </button>
              );
            })}
            <button
              type="button"
              className={control}
              disabled={state.checked || !list.length}
              title={L("Annuler", "Undo", "Deshacer")[locale]}
              aria-label={L("Annuler", "Undo", "Deshacer")[locale]}
              onClick={() => patch({ answer: list.slice(0, -1) })}
            >
              <Undo2 size={18} />
            </button>
          </div>
        </>
      )}
      {exercise.kind === "write" && (
        <label className="block space-y-2">
          <span>{L("Ta réponse", "Your answer", "Tu respuesta")[locale]}</span>
          <input
            lang="zh-Hans"
            value={chosen}
            disabled={state.checked}
            autoComplete="off"
            maxLength={500}
            className="min-h-12 w-full rounded-xl border border-[#bfb5a4] bg-white p-3 text-xl leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245a46] disabled:bg-[#f6f2e8]"
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onChange={(event) => patch({ answer: event.target.value })}
          />
        </label>
      )}
      {exercise.kind === "match" && (
        <div className="space-y-3">
          {exercise.pairs.map((phrase, index) => (
            <label
              key={phrase.hanzi}
              className="grid items-center gap-2 sm:grid-cols-2"
            >
              {phrase.image ? (
                <Image
                  src={phrase.image}
                  width={400}
                  height={260}
                  alt={phrase.meaning[locale]}
                  className="aspect-[4/3] w-full max-w-48 rounded object-cover"
                />
              ) : (
                <PhraseView
                  phrase={phrase}
                  locale={locale}
                  pinyin={pinyin}
                  translation={false}
                />
              )}
              <select
                className={control}
                disabled={state.checked}
                aria-label={
                  phrase.image ? phrase.meaning[locale] : phrase.hanzi
                }
                value={pairs[String(index)] ?? ""}
                onChange={(event) =>
                  patch({
                    answer: { ...pairs, [String(index)]: event.target.value },
                  })
                }
              >
                <option value="">
                  {L("Choisir", "Choose", "Elegir")[locale]}
                </option>
                {exercise.pairs
                  .map((item, i) => ({ item, i }))
                  .reverse()
                  .map(({ item, i }) => (
                    <option key={i} value={i}>
                      {phrase.image
                        ? `${item.hanzi}${pinyin ? ` · ${item.pinyin}` : ""}`
                        : item.meaning[locale]}
                    </option>
                  ))}
              </select>
            </label>
          ))}
        </div>
      )}
      {state.hint && (
        <aside className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed">
          {exercise.hint[locale]}
          <PhraseView
            phrase={exercise.model}
            locale={locale}
            pinyin
            translation
          />
        </aside>
      )}
      {!state.checked ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={`${control} inline-flex items-center gap-2`}
            disabled={!ready || (listening && !state.heard)}
            onClick={check}
          >
            <Check size={18} />
            {L("Vérifier", "Check", "Verificar")[locale]}
          </button>
          <button
            type="button"
            className={`${control} inline-flex items-center gap-2`}
            onClick={() => patch({ hint: true, assisted: true })}
          >
            <Lightbulb size={18} />
            {L("Un indice", "A hint", "Una pista")[locale]}
          </button>
        </div>
      ) : (
        <div
          ref={feedback}
          tabIndex={-1}
          role="status"
          className={`space-y-3 rounded-xl border p-4 outline-none ${state.correct ? "border-[#b7cfaa] bg-[#edf2e6]" : "border-amber-300 bg-amber-50"}`}
        >
          <strong>
            {state.correct
              ? state.assisted
                ? L(
                    "Réussi avec aide",
                    "Completed with help",
                    "Completado con ayuda",
                  )[locale]
                : L("Bonne réponse", "Correct answer", "Respuesta correcta")[
                    locale
                  ]
              : L(
                  "Pas encore. Compare et réessaie.",
                  "Not yet. Compare and try again.",
                  "Todavía no. Compara y reintenta.",
                )[locale]}
          </strong>
          <p>{!state.correct && "choices" in exercise ? exercise.choices.find(choice => choice.id === chosen)?.feedback[locale] ?? exercise.explanation[locale] : exercise.explanation[locale]}</p>
          <PhraseView
            phrase={exercise.model}
            locale={locale}
            pinyin
            translation
          />
          {"tone" in exercise && exercise.tone && (
            <a
              href={toneAssets[exercise.tone].source}
              className="block text-xs underline"
              target="_blank"
              rel="noreferrer"
            >
              {toneAssets[exercise.tone].credit} ·{" "}
              {toneAssets[exercise.tone].license}
            </a>
          )}
          <button
            className={`${control} inline-flex items-center gap-2`}
            type="button"
            onClick={() => {
              submitted.current = false;
              onChange(restartMandarinAttempt(exercise, state));
            }}
          >
            <RotateCcw size={16} />
            {L("Réessayer", "Try again", "Reintentar")[locale]}
          </button>
          {onRestartWithoutHelp && <button type="button" className={`${control} inline-flex items-center gap-2`} onClick={() => { submitted.current = false; onRestartWithoutHelp(); }}>
            <RotateCcw size={16} />{L("Recommencer sans aide", "Start again without help", "Empezar sin ayuda")[locale]}
          </button>}
        </div>
      )}
    </section>
  );
}
