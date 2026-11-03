"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { L } from "@/lib/yo/mandarin/types";
import { control } from "./MandarinExercise";

/** Manual steps respect reduced motion; observing and recalling never awards handwriting mastery. */
export function MandarinCharacter({
  character,
  locale,
}: {
  character: string;
  locale: YoLocale;
}) {
  const [strokes, setStrokes] = useState<string[]>([]);
  const [count, setCount] = useState(1);
  const [hidden, setHidden] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(
      `/yo/mandarin-strokes/${character.codePointAt(0)!.toString(16)}.json`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw Error("stroke-data");
        const data = (await response.json()) as { strokes?: unknown };
        if (
          !Array.isArray(data.strokes) ||
          !data.strokes.length ||
          !data.strokes.every((path) => typeof path === "string")
        )
          throw Error("stroke-data");
        if (!controller.signal.aborted) {
          setStrokes(data.strokes);
          setCount(1);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [character, retry]);
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">
        {
          L(
            "Observer, rappeler, comparer",
            "Observe, recall, compare",
            "Observar, recordar, comparar",
          )[locale]
        }
      </h2>
      {failed ? (
        <div role="status">
          <p>
            {
              L(
                "Le modèle de traits est indisponible.",
                "Stroke model unavailable.",
                "Modelo de trazos no disponible.",
              )[locale]
            }
          </p>
          <button
            type="button"
            className={control}
            onClick={() => {
              setFailed(false);
              setRetry((value) => value + 1);
            }}
          >
            {L("Réessayer", "Try again", "Reintentar")[locale]}
          </button>
        </div>
      ) : !strokes.length ? (
        <p role="status">
          {
            L("Chargement des traits…", "Loading strokes…", "Cargando trazos…")[
              locale
            ]
          }
        </p>
      ) : (
        <svg
          viewBox="0 0 1024 1024"
          role="img"
          aria-label={`${character} · ${count}/${strokes.length}`}
          className="mx-auto aspect-square w-full max-w-72 border border-gray-300 bg-white"
        >
          <path
            d="M512 0V1024M0 512H1024"
            stroke="#d1d5db"
            strokeDasharray="12"
            fill="none"
          />
          {!hidden && (
            <g transform="translate(0,900) scale(1,-1)">
              {strokes.slice(0, count).map((path, index) => (
                <path
                  key={index}
                  d={path}
                  fill={index === count - 1 ? "#0f766e" : "#1f2937"}
                />
              ))}
            </g>
          )}
        </svg>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className={control}
          disabled={count <= 1}
          aria-label={
            L("Trait précédent", "Previous stroke", "Trazo anterior")[locale]
          }
          onClick={() => setCount((value) => value - 1)}
        >
          <ChevronLeft />
        </button>
        <span className="p-3">
          {strokes.length ? count : 0} / {strokes.length}
        </span>
        <button
          type="button"
          className={control}
          disabled={count >= strokes.length}
          aria-label={
            L("Trait suivant", "Next stroke", "Trazo siguiente")[locale]
          }
          onClick={() => setCount((value) => value + 1)}
        >
          <ChevronRight />
        </button>
        <button
          type="button"
          className={control}
          aria-label={
            L(
              "Masquer ou montrer le modèle",
              "Hide or show model",
              "Ocultar o mostrar modelo",
            )[locale]
          }
          onClick={() => setHidden(!hidden)}
        >
          {hidden ? <Eye /> : <EyeOff />}
        </button>
      </div>
      <p className="text-sm text-gray-600">
        {
          L(
            "Trace sur papier ou décris les traits, puis compare. Autoévaluation seulement : aucune note de calligraphie.",
            "Trace on paper or describe the strokes, then compare. Self-assessment only: no handwriting grade.",
            "Traza en papel o describe los trazos y compara. Solo autoevaluación: sin nota de caligrafía.",
          )[locale]
        }
      </p>
      <a href="/yo/mandarin-strokes/LICENSE.txt" className="text-xs underline">
        Make Me a Hanzi / Arphic · Hanzi Writer data
      </a>
    </section>
  );
}
