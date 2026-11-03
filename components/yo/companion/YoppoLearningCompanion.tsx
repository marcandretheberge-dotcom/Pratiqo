"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Compass,
  EyeOff,
  Gamepad2,
  GripHorizontal,
  Lightbulb,
  Minus,
  RotateCcw,
  X,
} from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import {
  BreakSession,
  nextQuestion,
  readTriviaHistory,
  TRIVIA_HISTORY_KEY,
  type BreakPolicy,
} from "@/lib/yo/companion/breakPolicy";
import { yoppoTrivia, triviaCategories } from "@/lib/yo/companion/trivia";
import { L, type Localized } from "@/lib/yo/mandarin/types";
import type { YoLocale } from "@/lib/yo/types";

const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";
type GameProps = {
  game: string;
  questionKey: number;
  onComplete: () => void;
  onAudio: (playing: boolean) => void;
};
const activeClock = () => performance.now();
/** A reserved bottom rail keeps the movable companion outside answers and course navigation. */
export function YoppoLearningCompanion({
  locale,
  lesson,
  help,
  onHelp,
  onStopAudio,
  onTrivia,
  games,
  renderGame,
  clock = activeClock,
  policy,
}: {
  locale: YoLocale;
  lesson: Localized;
  help: ReactNode;
  onHelp: () => void;
  onStopAudio: () => void;
  onTrivia: () => void;
  games: { id: string; label: Localized }[];
  renderGame: (props: GameProps) => ReactNode;
  clock?: () => number;
  policy?: BreakPolicy;
}) {
  const [hidden, setHidden] = useState(false);
  const [position, setPosition] = useState(0);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "help" | "play" | "discover">(
    "menu",
  );
  const [invitation, setInvitation] = useState(false);
  const [questionKey, setQuestionKey] = useState(0);
  const [game, setGame] = useState(games[0]?.id ?? "");
  const [triviaId, setTriviaId] = useState(yoppoTrivia[0].id);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const session = useRef(new BreakSession(clock, policy));
  const seen = useRef<string[]>([]);
  const historyLoaded = useRef(false);
  const completed = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const restoreScroll = useRef(0);
  const drag = useRef<{ x: number; origin: number } | null>(null);
  const current = yoppoTrivia.find((item) => item.id === triviaId)!;

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
    const visibility = () =>
      session.current.visible(
        open &&
          document.visibilityState === "visible" &&
          (mode === "play" || mode === "discover") &&
          !invitation,
      );
    visibility();
    document.addEventListener("visibilitychange", visibility);
    const timer = window.setInterval(() => session.current.tick(), 1000);
    return () => {
      session.current.visible(false);
      document.removeEventListener("visibilitychange", visibility);
      clearInterval(timer);
    };
  }, [open, mode, invitation]);
  useEffect(() => () => session.current.returnToLesson(), []);
  function show() {
    restoreFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : opener.current;
    restoreScroll.current = window.scrollY;
    onStopAudio();
    setOpen(true);
  }
  function minimize() {
    onStopAudio();
    session.current.visible(false);
    setOpen(false);
    requestAnimationFrame(() => opener.current?.focus());
  }
  function returnToLesson() {
    onStopAudio();
    session.current.returnToLesson();
    setOpen(false);
    setMode("menu");
    setInvitation(false);
    requestAnimationFrame(() => {
      window.scrollTo({ top: restoreScroll.current, behavior: "instant" });
      restoreFocus.current?.focus({ preventScroll: true });
    });
  }
  function next(nextMode = mode) {
    if (nextMode === "discover") {
      const ids = yoppoTrivia.map((item) => item.id);
      if (!historyLoaded.current) {
        try {
          seen.current = readTriviaHistory(
            localStorage.getItem(TRIVIA_HISTORY_KEY),
            ids,
          );
        } catch {
          /* Session-only history when storage is unavailable. */
        }
        historyLoaded.current = true;
      }
      const picked = nextQuestion(ids, seen.current, seen.current.at(-1));
      seen.current = picked.seen;
      if (picked.id) setTriviaId(picked.id);
      try {
        localStorage.setItem(TRIVIA_HISTORY_KEY, JSON.stringify(seen.current));
      } catch {
        /* Keep the in-memory history. */
      }
    }
    setQuestionKey((value) => value + 1);
    setAnswer("");
    setChecked(false);
    setGameCompleted(false);
    completed.current = false;
  }
  function begin(value: "play" | "discover") {
    onStopAudio();
    session.current.start();
    setMode(value);
    setInvitation(false);
    next(value);
  }
  function complete() {
    if (completed.current) return;
    completed.current = true;
    session.current.questionCompleted();
    setGameCompleted(true);
  }
  function advance() {
    if (audioPlaying || !completed.current) return;
    if (session.current.afterExplanation(false) === "return")
      setInvitation(true);
    else next();
  }
  const returnLabel = L(
    "Revenir à ma leçon",
    "Back to my lesson",
    "Volver a mi lección",
  )[locale];
  return (
    <>
      <div
        data-testid="yoppo-reserved-rail"
        className="pointer-events-none fixed inset-x-0 bottom-16 z-40 h-28 border-t border-teal-100 bg-[#f6f9f8]"
      >
        {hidden ? (
          <button
            type="button"
            className={`${button} pointer-events-auto absolute bottom-3 right-3`}
            onClick={() => setHidden(false)}
          >
            {L("Afficher Yoppo", "Show Yoppo", "Mostrar a Yoppo")[locale]}
          </button>
        ) : (
          <div
            style={{
              left: `clamp(12px, calc(100% - 108px + ${position}px), calc(100% - 108px))`,
            }}
            className="pointer-events-auto absolute bottom-1 flex flex-col items-center"
          >
            <button
              ref={opener}
              type="button"
              aria-label={
                L("Ouvrir Yoppo", "Open Yoppo", "Abrir Yoppo")[locale]
              }
              onClick={show}
              className="rounded-lg bg-white/95 shadow-sm focus-visible:outline-2 focus-visible:outline-teal-700"
            >
              <CompanionAvatar
                visualId="travel"
                state="idle"
                locale={locale}
                size="sm"
                compact
              />
            </button>
            <button
              type="button"
              aria-label={
                L("Déplacer Yoppo", "Move Yoppo", "Mover a Yoppo")[locale]
              }
              title={L("Déplacer Yoppo", "Move Yoppo", "Mover a Yoppo")[locale]}
              className="min-h-9 w-20 touch-none rounded-lg bg-white"
              onPointerDown={(event) => {
                drag.current = { x: event.clientX, origin: position };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (drag.current)
                  setPosition(
                    Math.max(
                      -window.innerWidth + 120,
                      Math.min(
                        0,
                        drag.current.origin + event.clientX - drag.current.x,
                      ),
                    ),
                  );
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
              onKeyDown={(event) => {
                if (["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) {
                  event.preventDefault();
                  setPosition((value) =>
                    event.key === "Home"
                      ? 0
                      : Math.max(
                          -window.innerWidth + 120,
                          Math.min(
                            0,
                            value + (event.key === "ArrowLeft" ? -40 : 40),
                          ),
                        ),
                  );
                }
              }}
            >
              <GripHorizontal size={20} className="mx-auto" />
            </button>
          </div>
        )}
      </div>
      <dialog
        ref={dialog}
        onCancel={(event) => {
          event.preventDefault();
          minimize();
        }}
        className="m-auto max-h-[90dvh] w-[min(94vw,640px)] overflow-y-auto rounded-lg border border-teal-200 bg-white p-5 text-gray-900 shadow-xl backdrop:bg-black/30"
      >
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CompanionAvatar
              visualId="travel"
              state="idle"
              locale={locale}
              size="xs"
              compact
            />
            <h2 className="text-xl font-bold">Yoppo</h2>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              className={button}
              aria-label={L("Réduire", "Minimize", "Minimizar")[locale]}
              onClick={minimize}
            >
              <Minus size={18} />
            </button>
            <button
              type="button"
              className={button}
              aria-label={
                L("Masquer Yoppo", "Hide Yoppo", "Ocultar a Yoppo")[locale]
              }
              onClick={() => {
                minimize();
                setHidden(true);
              }}
            >
              <EyeOff size={18} />
            </button>
          </div>
        </header>
        <p className="mb-4 text-sm text-gray-600">{lesson[locale]}</p>
        {mode === "menu" && (
          <div className="grid gap-3">
            <button
              type="button"
              className={button}
              onClick={() => {
                onHelp();
                setMode("help");
              }}
            >
              <Lightbulb size={20} />
              {L("Aide-moi", "Help me", "Ayúdame")[locale]}
            </button>
            <button
              type="button"
              className={button}
              onClick={() => begin("play")}
            >
              <Gamepad2 size={20} />
              {L("On joue ?", "Let's play", "¿Jugamos?")[locale]}
            </button>
            <button
              type="button"
              className={button}
              onClick={() => begin("discover")}
            >
              <Compass size={20} />
              {
                L(
                  "Découvrir quelque chose",
                  "Discover something",
                  "Descubrir algo",
                )[locale]
              }
            </button>
          </div>
        )}
        {mode === "help" && (
          <div className="space-y-4">
            {help}
            <button
              className={button}
              type="button"
              onClick={() => setMode("menu")}
            >
              <RotateCcw size={18} />
              {L("Autre chose", "Something else", "Otra cosa")[locale]}
            </button>
          </div>
        )}
        {invitation ? (
          <section className="space-y-5">
            <h3 className="text-xl font-semibold">
              {
                L(
                  "Une belle pause ! On reprend ?",
                  "That was a good break! Ready to return?",
                  "¡Una buena pausa! ¿Volvemos?",
                )[locale]
              }
            </h3>
            <p>{lesson[locale]}</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className={button} onClick={returnToLesson}>
                {returnLabel}
              </button>
              <button
                type="button"
                className={button}
                onClick={() => {
                  session.current.oneMore();
                  setInvitation(false);
                  next();
                }}
              >
                {
                  L(
                    "Encore une question",
                    "One more question",
                    "Una pregunta más",
                  )[locale]
                }
              </button>
            </div>
          </section>
        ) : (
          <>
            {mode === "discover" && (
              <section className="space-y-4">
                <p className="text-xs font-semibold text-teal-800">
                  {triviaCategories[current.category][locale]}
                </p>
                <h3 className="text-xl font-semibold">
                  {current.question[locale]}
                </h3>
                <div className="grid gap-3">
                  {current.choices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      aria-pressed={answer === choice.id}
                      disabled={checked}
                      onClick={() => setAnswer(choice.id)}
                      className={`${button} ${answer === choice.id ? "ring-2 ring-teal-700" : ""}`}
                    >
                      {choice.label[locale]}
                    </button>
                  ))}
                </div>
                {checked ? (
                  <div
                    role="status"
                    className="space-y-2 border-l-4 border-teal-600 pl-4"
                  >
                    <strong>
                      {answer === current.answer
                        ? L("Bien vu !", "Good thinking!", "¡Bien visto!")[
                            locale
                          ]
                        : current.choices.find(
                            (choice) => choice.id === current.answer,
                          )!.label[locale]}
                    </strong>
                    <p>{current.explanation[locale]}</p>
                    <a
                      href={current.source}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline"
                    >
                      {
                        L(
                          "Source vérifiée",
                          "Verified source",
                          "Fuente verificada",
                        )[locale]
                      }{" "}
                      · {current.verifiedAt}
                    </a>
                  </div>
                ) : (
                  <button
                    className={button}
                    type="button"
                    disabled={!answer}
                    onClick={() => {
                      setChecked(true);
                      complete();
                      onTrivia();
                    }}
                  >
                    {L("Vérifier", "Check", "Verificar")[locale]}
                  </button>
                )}
              </section>
            )}
            {mode === "play" && (
              <>
                <label className="mb-4 block text-sm">
                  {L("Ton mini-jeu", "Your mini-game", "Tu minijuego")[locale]}
                  <select
                    className={`${button} mt-2 w-full`}
                    value={game}
                    onChange={(event) => {
                      onStopAudio();
                      setGame(event.target.value);
                      next();
                    }}
                  >
                    {games.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label[locale]}
                      </option>
                    ))}
                  </select>
                </label>
                {renderGame({
                  game,
                  questionKey,
                  onComplete: complete,
                  onAudio: setAudioPlaying,
                })}
              </>
            )}
            {(mode === "play" || mode === "discover") && gameCompleted && (
              <button
                type="button"
                disabled={audioPlaying}
                className={`${button} mt-5`}
                onClick={advance}
              >
                {L("Continuer", "Continue", "Continuar")[locale]}
              </button>
            )}
          </>
        )}
        <footer className="mt-6 border-t pt-4">
          <button type="button" className={button} onClick={returnToLesson}>
            <X size={16} />
            {returnLabel}
          </button>
        </footer>
      </dialog>
    </>
  );
}
