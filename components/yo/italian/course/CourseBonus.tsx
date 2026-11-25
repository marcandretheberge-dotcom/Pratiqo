"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Sparkles } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import type { CoursePhrase } from "@/lib/yo/italian/course/courseTypes";
import { BreakSession, DEFAULT_BREAK_POLICY } from "@/lib/yo/companion/breakPolicy";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { useCourseLanguage } from "../ItalianAudioProvider";
import { C, courseButton, courseOutline, CoursePanel } from "./CourseShared";

const breakCopy = {
  fr: {
    invitation: "Une belle pause ! On reprend ?",
    return: "Revenir à ma leçon",
    oneMore: "Encore une question",
    empty: "Aucune expression n’est disponible pour ce défi.",
  },
  en: {
    invitation: "That was a good break! Ready to return?",
    return: "Back to my lesson",
    oneMore: "One more question",
    empty: "No expressions are available for this challenge.",
  },
  es: {
    invitation: "¡Una buena pausa! ¿Volvemos?",
    return: "Volver a mi lección",
    oneMore: "Una pregunta más",
    empty: "No hay expresiones disponibles para este reto.",
  },
} as const;

/** An optional vocabulary break. Its session never writes lesson results or progress. */
export function CourseBonus({
  locale,
  phrases,
  onClose,
}: {
  locale: YoLocale;
  phrases: CoursePhrase[];
  onClose: () => void;
}) {
  const copy = C[locale];
  const pauseCopy = breakCopy[locale];
  const language = useCourseLanguage();
  const [round, setRound] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [invitation, setInvitation] = useState(false);
  const [session] = useState(
    () => new BreakSession(() => performance.now(), DEFAULT_BREAK_POLICY),
  );
  const answered = useRef(false);
  const closed = useRef(false);
  const title = useRef<HTMLHeadingElement>(null);
  const stepTitle = useRef<HTMLHeadingElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const restoreScroll = useRef({ left: 0, top: 0 });

  const close = useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    const panel = title.current?.closest("section");
    const opener = restoreFocus.current;
    const scroll = restoreScroll.current;
    session.returnToLesson();
    stopLessonAudio();
    onClose();
    requestAnimationFrame(() => {
      const active = document.activeElement;
      // Some callers deliberately focus the lesson heading in their own frame.
      // Restore only when focus is still in the bonus or was lost on its removal.
      if (
        active instanceof HTMLElement &&
        active !== document.body &&
        active !== document.documentElement &&
        active.isConnected &&
        !panel?.contains(active)
      ) return;
      if (
        opener?.isConnected &&
        !opener.closest("[hidden], [inert], [aria-hidden='true']") &&
        !opener.matches(":disabled")
      ) {
        opener.focus({ preventScroll: true });
        window.scrollTo({ ...scroll, behavior: "instant" });
      }
    });
  }, [onClose, session]);

  useEffect(() => {
    stopLessonAudio();
    session.start();
    const visibility = () => {
      session.visible(
        !closed.current &&
          session.phase === "break" &&
          document.visibilityState === "visible",
      );
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    const rememberPosition = () => {
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        active !== document.body &&
        active !== document.documentElement &&
        !title.current?.closest("section")?.contains(active)
      ) restoreFocus.current = active;
      restoreScroll.current = { left: window.scrollX, top: window.scrollY };
    };
    rememberPosition();
    const frame = requestAnimationFrame(() => {
      // The coach may return focus to its opener while it closes its menu.
      rememberPosition();
      title.current?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
      session.returnToLesson();
    };
  }, [session]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      close();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [close]);

  const pool = phrases.filter(
    (phrase, index) =>
      phrases.findIndex((other) => other.meaning[locale] === phrase.meaning[locale]) === index,
  );
  const target = pool.length ? pool[round % pool.length] : undefined;
  const options = target
    ? pool.filter((phrase) => phrase.meaning[locale] !== target.meaning[locale]).slice(0, 2)
    : [];
  if (target) options.splice(round % (options.length + 1), 0, target);

  function focusStep() {
    requestAnimationFrame(() => stepTitle.current?.focus());
  }

  function next() {
    answered.current = false;
    setAnswer(null);
    setRound((value) => value + 1);
    focusStep();
  }

  function choose(index: number) {
    // A rapid second click must not complete a second question before React renders.
    if (closed.current || answered.current || !target) return;
    answered.current = true;
    session.questionCompleted();
    setAnswer(index);
  }

  function advance() {
    if (closed.current || !answered.current || session.phase !== "break") return;
    // This vocabulary break has no audio of its own. At the learner's explicit
    // explanation boundary, stop any lesson clip before inviting them to return.
    stopLessonAudio();
    if (session.afterExplanation(false) === "return") {
      session.visible(false);
      setInvitation(true);
      focusStep();
    } else {
      next();
    }
  }

  function oneMore() {
    if (closed.current || session.phase !== "return") return;
    session.oneMore();
    session.visible(document.visibilityState === "visible");
    setInvitation(false);
    next();
  }

  return (
    <CoursePanel className="mb-6 border-[#c6dac9] bg-[#eef5e9]">
      <div className="flex justify-between gap-4">
        <h2 ref={title} tabIndex={-1} className="flex items-center gap-2 font-serif text-2xl outline-none">
          <Sparkles size={20} aria-hidden />
          {copy.bonus}
        </h2>
        <button type="button" onClick={close} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-white" aria-label={copy.close}>
          <X size={19} aria-hidden />
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed">{copy.bonusNote}</p>
      {invitation ? (
        <h3 ref={stepTitle} tabIndex={-1} className="mt-5 font-serif text-2xl outline-none">
          {pauseCopy.invitation}
        </h3>
      ) : target ? (
        <>
          <h3 ref={stepTitle} tabIndex={-1} lang={language} className="my-5 font-serif text-3xl text-[#245a46] outline-none">
            {target.it}
          </h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {options.map((phrase, index) => (
              <button key={`${round}-${index}`} type="button" aria-pressed={answer === index} disabled={answer !== null} onClick={() => choose(index)} className={`${courseOutline} ${answer === index ? "border-[#245a46] bg-[#e0eddd]" : ""}`}>
                {phrase.meaning[locale]}
              </button>
            ))}
          </div>
          {answer !== null ? (
            <div role="status" className="mt-4">
              <p className="font-semibold">{options[answer] === target ? copy.correct : copy.wrong}</p>
              <p><span lang={language}>{target.it}</span> — {target.meaning[locale]}</p>
              <button type="button" className={`${courseOutline} mt-3`} onClick={advance}>{copy.next}</button>
            </div>
          ) : null}
        </>
      ) : (
        <p role="status" className="mt-5">{pauseCopy.empty}</p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className={invitation ? courseButton : courseOutline} onClick={close}>
          {pauseCopy.return}
        </button>
        {invitation && target ? (
          <button type="button" className={courseOutline} onClick={oneMore}>
            {pauseCopy.oneMore}
          </button>
        ) : null}
      </div>
    </CoursePanel>
  );
}
