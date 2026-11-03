"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  RotateCcw,
} from "lucide-react";
import { buildYoLocaleHref } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";
import {
  L,
  type Exercise,
  type Progress,
  type Unit,
} from "@/lib/yo/mandarin/types";
import { initialAttempt, MANDARIN_PATH } from "@/lib/yo/mandarin/progress";
import images from "@/lib/yo/mandarin/imageAssets.json";
import { sceneDescriptions } from "@/lib/yo/mandarin/visuals";
import { YoppoLearningCompanion } from "../companion/YoppoLearningCompanion";
import { MandarinAudio, stopMandarinAudio } from "./MandarinAudio";
import { MandarinExercise, PhraseView, control } from "./MandarinExercise";
import { MandarinCharacter } from "./MandarinCharacter";
import { MandarinToneStudy } from "./MandarinToneStudy";
import {
  pictureListening,
  pictureMatching,
  practiceBuild,
  toneExercise,
} from "@/lib/yo/mandarin/activities";
import { useMandarinProgress } from "./useMandarinProgress";

export function mandarinStages(unit: Unit) {
  return unit.id === "bilan"
    ? [...unit.exercises.map((exercise) => exercise.id), "summary"]
    : [
        "scene",
        "dialogue",
        "words",
        "grammar",
        "character",
        ...unit.exercises.map((exercise) => exercise.id),
        "culture",
        "summary",
      ];
}
function PracticeGame({
  exercise,
  locale,
  onComplete,
  onAudio,
}: {
  exercise: Exercise;
  locale: YoLocale;
  onComplete: () => void;
  onAudio: (playing: boolean) => void;
}) {
  const [state, setState] = useState(() => initialAttempt(exercise));
  return (
    <MandarinExercise
      exercise={exercise}
      state={state}
      locale={locale}
      pinyin
      onChange={setState}
      onResult={() => onComplete()}
      onAudio={onAudio}
    />
  );
}
export function MandarinCoursePlayer({
  unit,
  locale,
}: {
  unit: Unit;
  locale: YoLocale;
}) {
  const { progress, ready, stored, update: persist } = useMandarinProgress();
  const update = (change: (value: Progress) => Progress) =>
    persist((value) => ({ ...change(value), unit: unit.id }));
  const stages = mandarinStages(unit);
  const step = Math.min(progress.steps[unit.id] ?? 0, stages.length - 1);
  const stage = stages[step];
  const currentExercise = unit.exercises.find(
    (exercise) => exercise.id === stage,
  );
  const state = currentExercise
    ? (progress.drafts[stage] ?? initialAttempt(currentExercise))
    : null;
  const main = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const image = images[unit.scene as keyof typeof images];
  const labels: Record<string, string> = {
    scene: L("Mission", "Mission", "Misión")[locale],
    dialogue: L("Rencontre", "Encounter", "Encuentro")[locale],
    words: L("Carnet de mots", "Word notebook", "Cuaderno de palabras")[locale],
    grammar: L("Les petites clés", "Small keys", "Pequeñas claves")[locale],
    character: L("Traits chinois", "Chinese strokes", "Trazos chinos")[locale],
    culture: L("Découverte", "Discovery", "Descubrimiento")[locale],
    summary: L("Bilan", "Review", "Balance")[locale],
  };
  const title =
    labels[stage] ?? L("À toi de jouer", "Your turn", "Tu turno")[locale];
  const allPassed = unit.exercises.every(
    (exercise) => progress.results[exercise.id]?.passed,
  );
  function go(index: number) {
    stopMandarinAudio();
    update((value) => ({
      ...value,
      unit: unit.id,
      steps: { ...value.steps, [unit.id]: index },
    }));
    requestAnimationFrame(() => {
      main.current?.scrollTo({ top: 0, behavior: "instant" });
      heading.current?.focus({ preventScroll: true });
    });
  }
  function assist() {
    if (state && currentExercise && !state.checked)
      update((value) => ({
        ...value,
        drafts: {
          ...value.drafts,
          [stage]: { ...state, assisted: true, hint: true },
        },
      }));
  }
  const nextPath =
    unit.id === "bilan"
      ? MANDARIN_PATH
      : unit.number === 8
        ? `${MANDARIN_PATH}/bilan`
        : `${MANDARIN_PATH}/u${String(unit.number + 1).padStart(2, "0")}`;
  const games = [
    {
      id: "picture",
      label: L("Écoute et image", "Listen and picture", "Escucha e imagen"),
    },
    {
      id: "tone",
      label: L("Les quatre tons", "The four tones", "Los cuatro tonos"),
    },
    {
      id: "match",
      label: L("Les mots ensemble", "Words together", "Palabras juntas"),
    },
    {
      id: "build",
      label: L(
        "Construis ta phrase",
        "Build your sentence",
        "Construye tu frase",
      ),
    },
    {
      id: "roleplay",
      label: L("Une rencontre", "An encounter", "Un encuentro"),
    },
  ];
  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-[#f6f9f8] text-gray-900"
      data-testid="mandarin-player"
    >
      <header className="border-b border-teal-100 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <Link
            href={buildYoLocaleHref(MANDARIN_PATH, locale)}
            className="inline-flex min-h-11 items-center gap-2 text-teal-900"
          >
            <ArrowLeft size={18} />
            {
              L(
                "Mandarin · Fondations",
                "Mandarin · Foundations",
                "Mandarín · Fundamentos",
              )[locale]
            }
          </Link>
          <span className="text-sm">
            {unit.number} · {unit.title[locale]}
          </span>
          <div className="flex gap-2">
            {(["fr", "en", "es"] as const).map((lang) => (
              <Link
                key={lang}
                href={buildYoLocaleHref(`${MANDARIN_PATH}/${unit.id}`, lang)}
                lang={lang}
                aria-current={lang === locale ? "page" : undefined}
                className="min-h-11 p-3 text-xs underline"
              >
                {lang.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>
      </header>
      <div
        ref={main}
        className="mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto px-4 pb-8 pt-6 sm:px-6"
      >
        {!stored && (
          <p role="status" className="mb-4 text-sm text-amber-900">
            {
              L(
                "Sauvegarde indisponible : garde cette séance ouverte pour conserver tes réponses.",
                "Storage unavailable: keep this session open to retain your answers.",
                "Guardado no disponible: mantén esta sesión abierta para conservar tus respuestas.",
              )[locale]
            }
          </p>
        )}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <label className="min-w-0 flex-1">
            <span className="sr-only">
              {L("Étape", "Step", "Etapa")[locale]}
            </span>
            <select
              value={step}
              disabled={!ready}
              onChange={(event) => go(Number(event.target.value))}
              className={`${control} w-full max-w-md`}
            >
              {stages.map((item, index) => (
                <option key={item} value={index}>
                  {index + 1}.{" "}
                  {labels[item] ??
                    `${L("Pratique", "Practice", "Práctica")[locale]} ${unit.exercises.findIndex((exercise) => exercise.id === item) + 1}`}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={progress.pinyin}
                onChange={(event) => {
                  assist();
                  update((value) => ({
                    ...value,
                    pinyin: event.target.checked,
                  }));
                }}
              />
              Pinyin
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={progress.translation}
                onChange={(event) => {
                  assist();
                  update((value) => ({
                    ...value,
                    translation: event.target.checked,
                  }));
                }}
              />
              {L("Traduction", "Translation", "Traducción")[locale]}
            </label>
          </div>
        </div>
        <h1
          ref={heading}
          tabIndex={-1}
          className="mb-6 text-2xl font-bold outline-none"
        >
          {title}
        </h1>
        <div className="min-h-80">
          {stage === "scene" && (
            <section className="space-y-6">
              <figure>
                <Image
                  src={image.src}
                  alt={
                    sceneDescriptions[
                      unit.scene as keyof typeof sceneDescriptions
                    ][locale]
                  }
                  width={image.width}
                  height={image.height}
                  priority
                  className="aspect-[16/7] w-full rounded-lg object-cover"
                />
                <figcaption className="mt-2 text-xs text-gray-500">
                  <a
                    href={image.source}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {image.credit} · {image.license}
                  </a>
                </figcaption>
              </figure>
              <h2 className="text-3xl font-bold">{unit.title[locale]}</h2>
              <p className="max-w-2xl leading-relaxed">
                {unit.setting[locale]}
              </p>
              <ul className="grid gap-3 sm:grid-cols-3">
                {unit.goals.map((goal) => (
                  <li
                    key={goal.fr}
                    className="flex gap-2 text-sm leading-relaxed"
                  >
                    <Check size={18} className="shrink-0 text-teal-700" />
                    {goal[locale]}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {stage === "dialogue" && (
            <section className="space-y-4">
              {unit.dialogue.map((phrase, index) => (
                <article
                  key={index}
                  className={`border-l-4 p-4 ${index % 2 ? "border-amber-400 bg-amber-50" : "border-teal-500 bg-teal-50"}`}
                >
                  <p className="mb-2 text-sm font-semibold">{phrase.speaker}</p>
                  <PhraseView
                    phrase={phrase}
                    locale={locale}
                    pinyin={progress.pinyin}
                    translation={progress.translation}
                  />
                  <div className="mt-3">
                    <MandarinAudio text={phrase.hanzi} locale={locale} />
                  </div>
                </article>
              ))}
            </section>
          )}
          {stage === "words" && (
            <section className="grid gap-4 sm:grid-cols-2">
              {unit.vocabulary.map((phrase) => (
                <article
                  key={phrase.hanzi}
                  className="rounded-lg border border-gray-200 bg-white p-5"
                >
                  <PhraseView
                    phrase={phrase}
                    locale={locale}
                    pinyin={progress.pinyin}
                    translation={progress.translation}
                  />
                  <div className="mt-3">
                    <MandarinAudio text={phrase.hanzi} locale={locale} />
                  </div>
                </article>
              ))}
            </section>
          )}
          {stage === "grammar" && (
            <section className="space-y-8">
              <p className="border-l-4 border-amber-500 pl-4 leading-relaxed">
                {unit.pronunciation[locale]}
              </p>
              <MandarinToneStudy locale={locale} />
              {unit.grammar.map((item) => (
                <article key={item.title.fr} className="space-y-3">
                  <h2 className="text-xl font-semibold">
                    {item.title[locale]}
                  </h2>
                  <p className="max-w-3xl leading-relaxed">
                    {item.text[locale]}
                  </p>
                  <PhraseView
                    phrase={item.example}
                    locale={locale}
                    pinyin={progress.pinyin}
                    translation={progress.translation}
                  />
                  <MandarinAudio text={item.example.hanzi} locale={locale} />
                </article>
              ))}
            </section>
          )}
          {stage === "character" && (
            <MandarinCharacter character={unit.character} locale={locale} />
          )}
          {currentExercise && state && (
            <MandarinExercise
              key={stage}
              exercise={currentExercise}
              state={state}
              previous={progress.results[stage]}
              locale={locale}
              pinyin={progress.pinyin}
              onChange={(draft) =>
                update((value) => ({
                  ...value,
                  drafts: { ...value.drafts, [stage]: draft },
                }))
              }
              onResult={(result) =>
                update((value) => ({
                  ...value,
                  results: { ...value.results, [stage]: result },
                }))
              }
            />
          )}
          {stage === "culture" && (
            <section className="space-y-5">
              <h2 className="text-xl font-semibold">
                {unit.culture.title[locale]}
              </h2>
              <p className="max-w-3xl leading-relaxed">
                {unit.culture.text[locale]}
              </p>
              <a
                href={unit.culture.source}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline"
              >
                {L("Référence", "Reference", "Referencia")[locale]}
              </a>
              <p className="text-sm text-teal-900">
                {
                  L(
                    "Qu’aimerais-tu demander à une personne qui vit sur place ?",
                    "What would you ask someone who lives there?",
                    "¿Qué preguntarías a alguien que vive allí?",
                  )[locale]
                }
              </p>
            </section>
          )}
          {stage === "summary" && (
            <section className="space-y-5">
              <h2 className="text-xl font-semibold">
                {allPassed
                  ? L(
                      "Les exercices sont réussis",
                      "Exercises completed",
                      "Ejercicios completados",
                    )[locale]
                  : L(
                      "Ce qui reste à pratiquer",
                      "What to practise next",
                      "Qué practicar ahora",
                    )[locale]}
              </h2>
              <p>
                {
                  unit.exercises.filter(
                    (exercise) => progress.results[exercise.id]?.passed,
                  ).length
                }{" "}
                / {unit.exercises.length} ·{" "}
                {L("réussis", "completed", "completados")[locale]} ·{" "}
                {
                  unit.exercises.filter(
                    (exercise) => progress.results[exercise.id]?.independent,
                  ).length
                }{" "}
                {
                  L(
                    "sans aide affichée",
                    "without displayed help",
                    "sin ayuda mostrada",
                  )[locale]
                }
              </p>
              <div className="flex flex-wrap gap-2">
                {unit.exercises
                  .filter(
                    (exercise) =>
                      !progress.results[exercise.id]?.passed ||
                      progress.results[exercise.id]?.review,
                  )
                  .map((exercise) => (
                    <button
                      key={exercise.id}
                      type="button"
                      className={`${control} inline-flex items-center gap-2`}
                      onClick={() => go(stages.indexOf(exercise.id))}
                    >
                      <RotateCcw size={16} />
                      {unit.exercises.indexOf(exercise) + 1}
                    </button>
                  ))}
              </div>
              <h3 className="font-semibold">
                {
                  L(
                    "Mon autoévaluation",
                    "My self-assessment",
                    "Mi autoevaluación",
                  )[locale]
                }
              </h3>
              {unit.canDos.map((goal, index) => {
                const id = `zh-${unit.id === "bilan" ? "final" : unit.id}-self-${index}`;
                return (
                  <label key={id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(progress.selfAssessment[id])}
                      onChange={(event) =>
                        update((value) => ({
                          ...value,
                          selfAssessment: {
                            ...value.selfAssessment,
                            [id]: event.target.checked,
                          },
                        }))
                      }
                    />
                    {goal[locale]}
                  </label>
                );
              })}
              <Link
                href={buildYoLocaleHref(nextPath, locale)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal-800 px-5 text-white"
              >
                <BookOpen size={18} />
                {
                  L(
                    "Continuer le parcours",
                    "Continue the course",
                    "Continuar el curso",
                  )[locale]
                }
              </Link>
            </section>
          )}
        </div>
      </div>
      <div className="h-44 shrink-0" aria-hidden />
      <nav
        aria-label={
          L(
            "Navigation de la leçon",
            "Lesson navigation",
            "Navegación de la lección",
          )[locale]
        }
        className="fixed inset-x-0 bottom-0 z-40 h-16 border-t border-gray-200 bg-white p-2"
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
          <button
            type="button"
            className={control}
            disabled={!ready || step === 0}
            onClick={() => go(step - 1)}
            aria-label={L("Précédent", "Previous", "Anterior")[locale]}
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-sm">
            {step + 1} / {stages.length}
          </span>
          <button
            type="button"
            className={control}
            disabled={!ready || step === stages.length - 1}
            onClick={() => go(step + 1)}
            aria-label={L("Suivant", "Next", "Siguiente")[locale]}
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </nav>
      {ready && (
        <YoppoLearningCompanion
          locale={locale}
          lesson={unit.title}
          games={games}
          onHelp={assist}
          onStopAudio={stopMandarinAudio}
          onTrivia={() =>
            update((value) => ({ ...value, trivia: value.trivia + 1 }))
          }
          help={
            <div className="space-y-4">
              <p>
                {currentExercise?.hint[locale] ?? unit.pronunciation[locale]}
              </p>
              <p>{currentExercise?.explanation[locale]}</p>
              {currentExercise && (
                <p>
                  {L("Essais", "Attempts", "Intentos")[locale]} :{" "}
                  {progress.results[stage]?.attempts ?? 0}
                </p>
              )}
              <PhraseView
                phrase={currentExercise?.model ?? unit.grammar[0].example}
                locale={locale}
                pinyin
                translation
              />
              <MandarinAudio
                text={(currentExercise?.model ?? unit.grammar[0].example).hanzi}
                tone={
                  currentExercise && "tone" in currentExercise
                    ? currentExercise.tone
                    : undefined
                }
                locale={locale}
              />
              {currentExercise && (
                <button
                  className={control}
                  type="button"
                  onClick={() =>
                    update((value) => ({
                      ...value,
                      drafts: {
                        ...value.drafts,
                        [stage]: {
                          ...initialAttempt(currentExercise),
                          assisted: true,
                        },
                      },
                    }))
                  }
                >
                  {
                    L(
                      "Réessayer l’exercice",
                      "Retry exercise",
                      "Reintentar ejercicio",
                    )[locale]
                  }
                </button>
              )}
            </div>
          }
          renderGame={({ game, questionKey, onComplete, onAudio }) => {
            const pool = unit.exercises.filter(
              (exercise) => exercise.kind === game,
            );
            const exercise =
              game === "picture"
                ? pictureListening("practice-picture", questionKey % 3)
                : game === "tone"
                  ? toneExercise("practice-tone", questionKey % 4)
                  : game === "match"
                    ? pictureMatching
                    : (pool[questionKey % pool.length] ?? practiceBuild);
            return (
              <PracticeGame
                key={`${game}-${questionKey}`}
                exercise={exercise}
                locale={locale}
                onComplete={onComplete}
                onAudio={onAudio}
              />
            );
          }}
        />
      )}
    </div>
  );
}
