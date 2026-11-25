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
  initialAttempt,
} from "@/lib/yo/mandarin/progress";
import { MandarinAudio } from "./MandarinAudio";
import images from "@/lib/yo/mandarin/imageAssets.json";
import toneAssets from "@/lib/yo/mandarin/toneAssets.json";

export const control =
  "min-h-11 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 hover:border-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-50";
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
  onChange,
  onResult,
  onAudio,
}: {
  exercise: Exercise;
  state: Attempt;
  previous?: Result;
  locale: YoLocale;
  pinyin: boolean;
  onChange: (state: Attempt) => void;
  onResult: (result: Result) => void;
  onAudio?: (playing: boolean) => void;
}) {
  const feedback = useRef<HTMLDivElement>(null);
  const submitted = useRef(false);
  const composing = useRef(false);
  useEffect(() => {
    if (!state.checked) submitted.current = false;
  }, [state.checked]);
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
    const next = evaluate(exercise, state, previous);
    if (!next) return;
    submitted.current = true;
    onResult(next);
    patch({ checked: true, correct: checkAnswer(exercise, state.answer) });
    requestAnimationFrame(() => feedback.current?.focus());
  }
  return (
    <section aria-label={exercise.prompt[locale]} className="space-y-5">
      <h2 className="text-xl font-semibold leading-relaxed">
        {exercise.prompt[locale]}
      </h2>
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
            className="min-h-12 w-full rounded-lg border border-gray-400 p-3 text-xl"
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
        <aside className="border-l-4 border-amber-500 pl-4 text-sm leading-relaxed">
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
          className="space-y-3 border-l-4 border-teal-700 pl-4"
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
          <p>{exercise.explanation[locale]}</p>
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
              onChange({ ...initialAttempt(exercise), assisted: true });
            }}
          >
            <RotateCcw size={16} />
            {L("Réessayer", "Try again", "Reintentar")[locale]}
          </button>
        </div>
      )}
    </section>
  );
}
