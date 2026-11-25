"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, X } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { recordReviewAttempt } from "@/lib/yo/review/store";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { useReviewQueue } from "./useReviewQueue";

export interface ReviewExerciseActions {
  onAttempt: (result: { correct: boolean; assisted: boolean }) => void;
  onContinue: () => void;
}

function ReviewExerciseRenderer({ itemId, actions, render }: {
  itemId: string; actions: ReviewExerciseActions; render: (itemId: string, actions: ReviewExerciseActions) => ReactNode;
}) {
  return render(itemId, actions);
}

/** A short, optional review session. A renderer must check the actual answer, never a self-rating. */
export function YoDueReviewPanel({ language, locale, itemIds, renderExercise }: {
  language: string;
  locale: YoLocale;
  itemIds: readonly string[];
  renderExercise: (itemId: string, actions: ReviewExerciseActions) => ReactNode;
}) {
  const queue = useReviewQueue(language, itemIds);
  const [session, setSession] = useState<{ run: number; language: string; ids: string[]; index: number } | null>(null);
  const [finishedLanguage, setFinishedLanguage] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null), summaryHeading = useRef<HTMLHeadingElement>(null);
  const accepted = useRef(false), run = useRef(0), titleId = useId();
  const currentId = session?.language === language ? session.ids[session.index] ?? null : null;
  const token = currentId && session ? `${session.run}:${currentId}` : null;
  const current = useRef<string | null>(null);
  const say = (fr: string, en: string, es: string) => ({ fr, en, es })[locale];

  useLayoutEffect(() => {
    const previous = current.current;
    current.current = token;
    if (currentId) heading.current?.focus();
    else if (previous) summaryHeading.current?.focus();
  }, [currentId, token]);
  useEffect(() => () => { if (current.current) stopLessonAudio(); }, []);

  function close() {
    accepted.current = false;
    stopLessonAudio();
    setSession(null);
  }

  function start() {
    if (!queue.dueIds.length) return;
    stopLessonAudio();
    accepted.current = false;
    setFinishedLanguage(null);
    run.current++;
    setSession({ run: run.current, language, ids: queue.dueIds.slice(0, 3), index: 0 });
  }

  const actions: ReviewExerciseActions = {
    onAttempt(result) {
      if (!currentId || current.current !== token) return;
      recordReviewAttempt({ language, itemId: currentId, ...result });
      accepted.current = result.correct;
    },
    onContinue() {
      if (!currentId || current.current !== token || !accepted.current || !session) return;
      accepted.current = false;
      stopLessonAudio();
      if (session.index + 1 < session.ids.length) setSession({ ...session, index: session.index + 1 });
      else { setFinishedLanguage(language); setSession(null); }
    },
  };
  const nextDate = queue.nextAt === null ? null : new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(queue.nextAt);

  return <section aria-labelledby={titleId} data-yo-due-review={language} className="my-6 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 ref={summaryHeading} tabIndex={-1} id={titleId} className="flex items-center gap-2 text-xl font-bold text-stone-950 outline-none"><BookOpen size={22} aria-hidden />{say("Retrouver mes phrases", "Recall my phrases", "Recordar mis frases")}</h2>
        <p className="mt-1 text-sm text-stone-600">{say("Révision enregistrée sur cet appareil et ce navigateur.", "Review saved on this device and browser.", "Repaso guardado en este dispositivo y navegador.")}</p>
      </div>
      {currentId && <button type="button" onClick={close} aria-label={say("Fermer la révision", "Close review", "Cerrar el repaso")} className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-800"><X size={20} aria-hidden /></button>}
    </div>
    {!queue.persistent && <p role="status" className="mt-3 rounded-xl bg-amber-100 p-3 text-sm text-amber-950">{say("Le navigateur ne peut pas enregistrer toutes ces révisions. Les résultats gardés pour cette session seront perdus à la fermeture de la page.", "The browser cannot save all these reviews. Results kept for this session will be lost when the page closes.", "El navegador no puede guardar todos estos repasos. Los resultados de esta sesión se perderán al cerrar la página.")}</p>}
    {session && currentId ? <div className="mt-5" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
      <h3 ref={heading} tabIndex={-1} className="mb-4 text-sm font-semibold text-emerald-950 outline-none">{say("Phrase", "Phrase", "Frase")} {session.index + 1} / {session.ids.length}</h3>
      <div key={currentId} className="rounded-2xl bg-white p-4 sm:p-5"><ReviewExerciseRenderer itemId={currentId} actions={actions} render={renderExercise} /></div>
    </div> : <>
      <p role="status" className="mt-4 leading-7 text-stone-800">{!queue.ready ? say("Chargement de tes révisions…", "Loading your reviews…", "Cargando tus repasos…") : finishedLanguage === language
        ? say("Ces phrases ont été revues. Les bonnes réponses espacées fixent le prochain rappel.", "You reviewed these phrases. Spaced correct answers set the next reminder.", "Has repasado estas frases. Los aciertos espaciados fijan el próximo repaso.")
        : queue.dueIds.length ? say(`${queue.dueIds.length} phrase(s) à retrouver. Une courte révision reprend tes erreurs et les réponses où tu as utilisé une aide.`, `${queue.dueIds.length} phrase(s) to recall. A short review revisits mistakes and answers where you used help.`, `${queue.dueIds.length} frase(s) para recordar. Un repaso breve retoma errores y respuestas con ayuda.`)
        : nextDate ? say(`Tes phrases sont revues pour le moment. Prochaine révision : ${nextDate}.`, `Your phrases are reviewed for now. Next review: ${nextDate}.`, `Tus frases están repasadas por ahora. Próximo repaso: ${nextDate}.`)
        : say("Les phrases qui demandent une nouvelle tentative apparaîtront ici, après tes exercices.", "Phrases that need another attempt will appear here after your exercises.", "Las frases que necesiten otro intento aparecerán aquí después de tus ejercicios.")}</p>
      {queue.dueIds.length > 0 && <button type="button" onClick={start} className="mt-4 min-h-12 rounded-2xl bg-emerald-900 px-5 py-3 font-semibold text-white focus-visible:outline-4 focus-visible:outline-offset-2">{say("Revoir jusqu’à 3 phrases", "Review up to 3 phrases", "Repasar hasta 3 frases")}</button>}
      {queue.total > 0 && <p className="mt-3 text-sm leading-6 text-stone-600">{say("Rappels à 1, 3, 7 et 14 jours selon tes réponses sans aide. Reviens quand tu veux : tes acquis restent à toi.", "Reminders after 1, 3, 7 and 14 days based on unassisted answers. Return when you like: your progress stays yours.", "Repasos a 1, 3, 7 y 14 días según tus respuestas sin ayuda. Vuelve cuando quieras: conservas tus avances.")}</p>}
    </>}
  </section>;
}
