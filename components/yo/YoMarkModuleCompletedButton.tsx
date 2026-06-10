"use client";

/**
 * YoMarkModuleCompletedButton
 *
 * Minimal, opt-in "I finished this YoPratiqo module" action. Used at the
 * end of a YoPratiqo module page so a logged-in student can record
 * completion to `yopratiqo_progress_snapshots`. The recorded snapshot is
 * NEVER shared with a teacher automatically — it only becomes visible to
 * a teacher when the student explicitly grants per-booking consent inside
 * the BookingModal.
 *
 * What this component does
 * ------------------------
 *   • Reads the current Supabase session on the client.
 *   • If unauthenticated, shows a soft sign-in prompt instead of faking
 *     persistence.
 *   • If authenticated, POSTs a sanitized payload (no quiz answers, no
 *     attempt logs, no metadata blob) to /api/yo/progress.
 *   • Surfaces FR/EN/ES feedback strings; never blocks lesson content
 *     when the API call fails.
 *   • Idempotent on the server (the API upserts on user+course+module).
 *
 * What this component does NOT do
 * -------------------------------
 *   • It does NOT auto-share with teachers — that is a separate consent
 *     step inside the booking flow.
 *   • It does NOT touch checkout / pricing / tax.
 *   • It does NOT generate AI summaries.
 *   • It does NOT send raw quiz answers, attempt logs, or keystroke
 *     history (the server hard-rejects those names anyway).
 *   • It does NOT block lesson content if the call fails.
 */

import { useCallback, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase";
import type { YoLocale } from "@/lib/yo/types";
import type {
  ProgressState,
  ScoreBand,
} from "@/lib/yopratiqo/progressSnapshotPersistence";

type SafePayload = {
  course_id: string;
  module_id: string;
  module_title: string;
  discipline: string;
  level_label?: string;
  progress_state?: ProgressState;
  skill_tags?: string[];
  difficulty_tags?: string[];
  score_band?: ScoreBand;
  companion_stage?: string;
};

const COPY: Record<
  YoLocale,
  {
    cta: string;
    saving: string;
    saved: string;
    failed: string;
    signedOut: string;
    privacy: string;
  }
> = {
  fr: {
    cta: "J'ai terminé ce module",
    saving: "Enregistrement en cours…",
    saved: "Progrès YoPratiqo enregistré.",
    failed: "Sauvegarde indisponible pour le moment.",
    signedOut: "Connecte-toi pour enregistrer ton progrès YoPratiqo.",
    privacy: "Aucune réponse de quiz n'est partagée avec ton professeur.",
  },
  en: {
    cta: "I finished this module",
    saving: "Saving…",
    saved: "YoPratiqo progress saved.",
    failed: "Saving is temporarily unavailable.",
    signedOut: "Sign in to save your YoPratiqo progress.",
    privacy: "No quiz answers are shared with your teacher.",
  },
  es: {
    cta: "Terminé este módulo",
    saving: "Guardando…",
    saved: "Progreso de YoPratiqo guardado.",
    failed: "Guardar no está disponible por ahora.",
    signedOut: "Inicia sesión para guardar tu progreso de YoPratiqo.",
    privacy: "Ninguna respuesta del cuestionario se comparte con tu profesor.",
  },
};

function safeLocale(locale: YoLocale): YoLocale {
  return (["fr", "en", "es"] as const).includes(locale) ? locale : "fr";
}

export type YoMarkModuleCompletedButtonProps = {
  locale: YoLocale;
  payload: SafePayload;
  className?: string;
};

type ButtonState =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "saved" }
  | { phase: "signedOut" }
  | { phase: "failed" };

export function YoMarkModuleCompletedButton({
  locale,
  payload,
  className,
}: YoMarkModuleCompletedButtonProps): React.JSX.Element {
  const l = safeLocale(locale);
  const copy = COPY[l];
  const [state, setState] = useState<ButtonState>({ phase: "idle" });

  const handleClick = useCallback(async () => {
    setState({ phase: "saving" });
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setState({ phase: "signedOut" });
        return;
      }

      const res = await fetch("/api/yo/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...payload,
          // Force the completion lifecycle here — callers can still pass
          // a narrower state for review/started flows.
          progress_state: payload.progress_state ?? "completed",
        }),
      });
      if (!res.ok) {
        setState({ phase: "failed" });
        return;
      }
      setState({ phase: "saved" });
    } catch {
      // Never block lesson content on a transient failure.
      setState({ phase: "failed" });
    }
  }, [payload]);

  const isBusy = state.phase === "saving";
  const isDone = state.phase === "saved";

  let statusLine: string | null = null;
  if (state.phase === "saving") statusLine = copy.saving;
  else if (state.phase === "saved") statusLine = copy.saved;
  else if (state.phase === "failed") statusLine = copy.failed;
  else if (state.phase === "signedOut") statusLine = copy.signedOut;

  return (
    <div
      data-testid="yo-mark-module-completed"
      data-yo-mark-module-completed-state={state.phase}
      className={cn("flex flex-col items-start gap-2", className)}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={isBusy || isDone}
        aria-busy={isBusy ? true : undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          isDone
            ? "bg-[#E8F5EE] text-[#0F6E56] focus-visible:ring-[#0F6E56]"
            : "bg-[#0F6E56] text-white hover:bg-[#0b5b47] focus-visible:ring-[#0F6E56]",
          (isBusy || isDone) && "cursor-default opacity-90",
        )}
      >
        {isBusy ? (
          <Loader2 aria-hidden className="size-4 animate-spin" />
        ) : isDone ? (
          <CheckCircle2 aria-hidden className="size-4" />
        ) : null}
        <span>{copy.cta}</span>
      </button>
      {statusLine ? (
        <p
          role="status"
          aria-live="polite"
          className="text-xs font-semibold text-[#0F6E56]/85"
        >
          {statusLine}
        </p>
      ) : null}
      <p className="text-[11px] leading-relaxed text-[#0F6E56]/65">
        {copy.privacy}
      </p>
    </div>
  );
}
