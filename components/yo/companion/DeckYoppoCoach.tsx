"use client";

import { useState } from "react";
import type { YoLocale } from "@/lib/yo/types";
import type { YoLessonDeckScreen } from "@/lib/yo/lessonDeckTypes";
import { YoppoLearningCompanion } from "./YoppoLearningCompanion";
import { yoppoTrivia } from "@/lib/yo/companion/trivia";

const L = (fr: string, en: string, es: string) => ({ fr, en, es });
const hints = {
  mission: L("Repère ce que tu veux réussir, puis essaie une première phrase.", "Identify what you want to accomplish, then try a first phrase.", "Identifica lo que quieres lograr e intenta una primera frase."),
  phrase: L("Écoute, répète, puis essaie de retrouver le sens sans regarder.", "Listen, repeat, then recall the meaning without looking.", "Escucha, repite e intenta recordar el significado sin mirar."),
  dialogue: L("Qui parle ? Que veut cette personne ? Rejoue une réplique à voix haute.", "Who is speaking? What do they want? Say one line aloud.", "¿Quién habla? ¿Qué quiere? Repite una intervención en voz alta."),
  culture: L("Relie cette découverte à une situation où tu pourrais utiliser la langue.", "Connect this discovery with a situation where you could use the language.", "Relaciona este descubrimiento con una situación en la que usarías el idioma."),
  practice: L("Essaie de mémoire. Utilise ensuite les indices de l’exercice pour vérifier ton raisonnement.", "Try from memory. Then use the exercise hints to check your reasoning.", "Inténtalo de memoria. Después usa las pistas del ejercicio para comprobar tu razonamiento."),
  summary: L("Choisis une chose que tu peux maintenant faire et explique-la avec tes propres mots.", "Choose something you can now do and explain it in your own words.", "Elige algo que ya puedes hacer y explícalo con tus propias palabras."),
};

/** A short break never writes to lesson completion or assessment scores. */
function QuickTrivia({ locale, questionKey, onComplete }: { locale: YoLocale; questionKey: number; onComplete: () => void }) {
  const question = yoppoTrivia[questionKey % yoppoTrivia.length];
  const [answer, setAnswer] = useState<string | null>(null);
  return <section className="space-y-3">
    <h3 className="font-semibold">{question.question[locale]}</h3>
    {question.choices.map(choice => <button key={choice.id} type="button" disabled={answer !== null}
      aria-pressed={answer === choice.id}
      className="block min-h-11 w-full rounded-xl border border-teal-200 px-4 py-3 text-left disabled:opacity-75"
      onClick={() => { setAnswer(choice.id); onComplete(); }}>{choice.label[locale]}</button>)}
    {answer !== null ? <div role="status" className="rounded-xl bg-teal-50 p-4">
      <p className="font-semibold">{answer === question.answer ? L("Bien joué !", "Well done!", "¡Bien hecho!")[locale] : L("Découvrons la réponse.", "Let's discover the answer.", "Descubramos la respuesta.")[locale]}</p>
      <p>{question.choices.find(choice => choice.id === question.answer)?.label[locale]}</p>
      <p className="mt-2">{question.explanation[locale]}</p>
      <a href={question.source} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block underline">{L("Source", "Source", "Fuente")[locale]}</a>
    </div> : null}
  </section>;
}

function stopLessonAudio() {
  for (const event of ["yo-audio-stop", "yo-italian-audio-stop", "yo-japanese-audio-stop", "yo-speech-cancel"]) window.dispatchEvent(new Event(event));
  window.speechSynthesis?.cancel();
}

export function DeckYoppoCoach({ locale, screen }: { locale: YoLocale; screen: YoLessonDeckScreen }) {
  // Strategy hints reveal no checked answers, so they do not alter assessment scoring.
  const hint = hints[screen.kind === "quiz" ? "practice" : screen.kind === "completion" ? "summary" : screen.kind];
  return <YoppoLearningCompanion locale={locale} dock="inline"
    lesson={L(screen.title, screen.title, screen.title)}
    help={<p>{hint[locale]}</p>} onHelp={() => {}} onStopAudio={stopLessonAudio} onTrivia={() => {}}
    games={[{ id: "quick-trivia", label: L("Quiz découverte", "Discovery quiz", "Quiz de descubrimientos") }]}
    renderGame={({ questionKey, onComplete }) => <QuickTrivia key={questionKey} locale={locale} questionKey={questionKey} onComplete={onComplete} />}
  />;
}
