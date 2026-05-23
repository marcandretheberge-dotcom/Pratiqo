"use client";

/**
 * ProfileAiAssistant
 * -----------------
 * Reusable AI helper for teacher profile copy (bio, headline, teaching style,
 * student-friendly course description).
 *
 * UX rules (intentional — do not auto-trigger AI):
 * - Teacher types rough notes into a controlled textarea (notes are owned by
 *   the parent so the teacher's draft is never lost on re-render).
 * - AI runs only when the teacher clicks an explicit button. No
 *   keystroke-driven or debounced auto-generation.
 * - Suggestion appears in a separate preview block. The teacher's current
 *   value is never silently overwritten — they must press "Use this" to
 *   accept, or edit the suggestion inline first.
 * - Regenerate / Shorter / Warmer / More professional are explicit buttons.
 * - Rate-limited server-side (10/hour/user); we surface a friendly
 *   "try again in a moment" message on 429.
 */

import { useCallback, useMemo, useState } from "react";
import { Loader2, Sparkles, RotateCw } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "warm" | "professional" | "shorter";

export type ProfileAiAssistantProps = {
  /** Subject/discipline (required by the AI route — always send a value). */
  discipline: string;
  /** Optional specialty (e.g. "Piano classique"). */
  specialty?: string | null;
  /** Current notes text — controlled by the parent so it survives re-renders. */
  notes: string;
  /** Notes change handler — the parent owns persistence (e.g. to localStorage). */
  onNotesChange: (next: string) => void;
  /**
   * Called when the teacher explicitly accepts a suggestion. The parent
   * decides whether to replace, append, or copy to clipboard.
   */
  onAccept: (suggestion: string) => void;
  /**
   * Visible-only when true. Lets pages embed the assistant behind a toggle
   * (e.g. "Improve with Pratiqo" link) without unmounting it.
   */
  open?: boolean;
  /** Override the notes textarea placeholder (translated by caller). */
  notesPlaceholder?: string;
  /** Compact mode for narrow surfaces (cards, sidebars). */
  compact?: boolean;
  /** Optional className for the outer container. */
  className?: string;
};

type ApiResponse = {
  description?: string;
  error?: string;
};

export function ProfileAiAssistant({
  discipline,
  specialty,
  notes,
  onNotesChange,
  onAccept,
  open = true,
  notesPlaceholder,
  compact = false,
  className,
}: ProfileAiAssistantProps) {
  const { t, locale } = useLocale();
  const [suggestion, setSuggestion] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanDiscipline = useMemo(() => discipline.trim(), [discipline]);
  const cleanSpecialty = useMemo(() => (specialty ?? "").trim(), [specialty]);
  const canCall = cleanDiscipline.length > 0;

  const callAi = useCallback(
    async (tone: Tone) => {
      if (!canCall || busy) return;
      setBusy(true);
      setError(null);
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          setError(t("aiAssistantErrorAuth"));
          return;
        }

        const res = await fetch("/api/ai/description", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            discipline: cleanDiscipline,
            specialite: cleanSpecialty || undefined,
            notes: notes.trim() || undefined,
            tone,
            locale,
          }),
        });

        if (res.status === 429) {
          setError(t("aiAssistantRateLimited"));
          return;
        }

        const payload = (await res.json().catch(() => ({}))) as ApiResponse;
        if (!res.ok) {
          setError(payload.error || t("aiAssistantErrorGeneric"));
          return;
        }
        const next = (payload.description ?? "").trim();
        if (!next) {
          setError(t("aiAssistantErrorGeneric"));
          return;
        }
        setSuggestion(next);
      } catch {
        setError(t("aiAssistantErrorGeneric"));
      } finally {
        setBusy(false);
      }
    },
    [busy, canCall, cleanDiscipline, cleanSpecialty, notes, locale, t],
  );

  if (!open) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-teal-500/25 bg-teal-500/5 p-4 sm:p-5 space-y-3",
        compact ? "text-sm" : "",
        className,
      )}
      data-testid="profile-ai-assistant"
    >
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 shrink-0 text-teal-700" size={18} aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-teal-800">{t("aiAssistantHeadline")}</p>
          <p className="text-xs text-[var(--p-text-muted)] mt-0.5">
            {t("aiAssistantHelpText")}
          </p>
        </div>
      </div>

      <div>
        <label className="block">
          <span className="sr-only">{t("aiAssistantNotesLabel")}</span>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value.slice(0, 800))}
            rows={compact ? 3 : 4}
            className="w-full rounded-xl border border-[var(--p-border-light)] bg-white px-3 py-2 text-sm"
            placeholder={notesPlaceholder ?? t("aiAssistantNotesPlaceholder")}
            data-testid="profile-ai-notes"
          />
        </label>
        <p className="mt-1 text-[11px] text-[var(--p-text-subtle)]">
          {notes.length}/800
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void callAi("neutral")}
          disabled={!canCall || busy}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-bold text-white",
            "bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          data-testid="profile-ai-improve"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {busy ? t("aiAssistantBusy") : t("aiAssistantImproveBtn")}
        </button>

        {suggestion ? (
          <>
            <button
              type="button"
              onClick={() => void callAi("shorter")}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-teal-500/30 bg-white px-3 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
            >
              {t("aiAssistantShorterBtn")}
            </button>
            <button
              type="button"
              onClick={() => void callAi("warm")}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-teal-500/30 bg-white px-3 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
            >
              {t("aiAssistantWarmerBtn")}
            </button>
            <button
              type="button"
              onClick={() => void callAi("professional")}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-teal-500/30 bg-white px-3 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
            >
              {t("aiAssistantProBtn")}
            </button>
            <button
              type="button"
              onClick={() => void callAi("neutral")}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RotateCw size={12} />
              {t("aiAssistantRegenerateBtn")}
            </button>
          </>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : null}

      {suggestion ? (
        <div className="rounded-xl border border-teal-500/30 bg-white p-3 sm:p-4 space-y-3" data-testid="profile-ai-suggestion">
          <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700">
            {t("aiAssistantSuggestionLabel")}
          </p>
          <textarea
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            rows={compact ? 4 : 6}
            className="w-full rounded-lg border border-[var(--p-border-light)] bg-white px-3 py-2 text-sm leading-relaxed"
            aria-label={t("aiAssistantSuggestionLabel")}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onAccept(suggestion.trim())}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-teal-600 px-4 text-xs font-bold text-white hover:bg-teal-700"
              data-testid="profile-ai-accept"
            >
              {t("aiAssistantAcceptBtn")}
            </button>
            <button
              type="button"
              onClick={() => setSuggestion("")}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t("aiAssistantDismissBtn")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ProfileAiAssistant;
