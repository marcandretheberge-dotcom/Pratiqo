/**
 * CompanionBridgeCard
 *
 * Small, presentational card that surfaces the YoPratiqo companion in
 * bridge contexts (booking-time consent UI, teacher learning insight
 * card). It DOES NOT control consent — it only describes the companion
 * and how it relates to the consent-based YoPratiqo → teacher bridge.
 *
 * Why a dedicated card
 * --------------------
 *   • `YoTeacherBridgeConsentCard` and `TeacherLearningInsightCard`
 *     both want a consistent companion visual + one-sentence story. A
 *     shared card avoids divergence and keeps the FR/EN/ES copy in one
 *     source of truth.
 *
 * Privacy contract reflected in the copy
 * --------------------------------------
 *   • The card never claims AI tutoring is implemented.
 *   • The card never claims the teacher sees raw quiz answers or
 *     keystroke history — every sentence explicitly scopes sharing to
 *     "summary only" and "only when you agree".
 *   • The card never displays per-user numeric scores; only a generic
 *     stage label that the caller can pass in.
 *
 * The component is a pure render (no hooks, no browser APIs) and is
 * safe to import from server components.
 */

import { cn } from "@/lib/utils";
import {
  CompanionAvatar,
  type CompanionAvatarProps,
} from "@/components/companion/CompanionAvatar";
import type {
  CompanionVisualId,
  CompanionVisualState,
} from "@/lib/companion/companionVisuals";

const COPY: Record<
  "fr" | "en" | "es",
  {
    eyebrow: string;
    title: string;
    body: string;
    stageLabel: string;
  }
> = {
  fr: {
    eyebrow: "Compagnon d'apprentissage",
    title: "Ton compagnon YoPratiqo",
    body: "Ton compagnon apprend avec toi. Il aide à résumer tes progrès pour préparer un meilleur cours, seulement si tu consens au partage.",
    stageLabel: "Étape",
  },
  en: {
    eyebrow: "Learning companion",
    title: "Your YoPratiqo companion",
    body: "Your companion learns with you. It helps summarize your progress for a better lesson, only when you agree to share it.",
    stageLabel: "Stage",
  },
  es: {
    eyebrow: "Compañero de aprendizaje",
    title: "Tu compañero YoPratiqo",
    body: "Tu compañero aprende contigo. Ayuda a resumir tu progreso para preparar una mejor clase, solo si aceptas compartirlo.",
    stageLabel: "Etapa",
  },
};

export type CompanionBridgeCardProps = {
  /** UI locale. Defaults to "fr" if a non-supported value is passed. */
  locale: "fr" | "en" | "es";
  /** Visual identity. Defaults to the YoPratiqo travel companion. */
  visualId?: CompanionVisualId;
  /** Pose / mood state. Defaults to `teacher_ready` in bridge contexts. */
  state?: CompanionVisualState;
  /** Optional display name for the companion (e.g. "Yo"). */
  companionName?: string | null;
  /**
   * Optional stage name surfaced as a small chip (e.g. "Explorer",
   * "Teacher-ready"). Pure cosmetic — never a numeric score.
   */
  stageName?: string | null;
  /**
   * Render in compact mode (no header eyebrow, smaller avatar). Used by
   * `TeacherLearningInsightCard` where the surrounding card already
   * provides framing.
   */
  compact?: boolean;
  /** Override the avatar size; defaults follow `compact`. */
  avatarSize?: CompanionAvatarProps["size"];
  className?: string;
};

function safeLocale(locale: CompanionBridgeCardProps["locale"]): "fr" | "en" | "es" {
  if (locale === "en" || locale === "es") return locale;
  return "fr";
}

export function CompanionBridgeCard({
  locale,
  visualId = "travel",
  state = "teacher_ready",
  companionName,
  stageName,
  compact = false,
  avatarSize,
  className,
}: CompanionBridgeCardProps): React.JSX.Element {
  const l = safeLocale(locale);
  const copy = COPY[l];
  const size = avatarSize ?? (compact ? "sm" : "md");

  const trimmedName = typeof companionName === "string" ? companionName.trim() : "";
  const trimmedStage = typeof stageName === "string" ? stageName.trim() : "";

  return (
    <section
      data-testid="companion-bridge-card"
      data-companion-bridge-compact={compact ? "true" : "false"}
      className={cn(
        "rounded-3xl border border-[#DDF4F1] bg-gradient-to-br from-[#FAFCFB] via-white to-[#FFF4D6]",
        compact ? "p-3" : "p-4 sm:p-5",
        "shadow-[0_10px_28px_rgba(15,58,52,0.07)]",
        className,
      )}
    >
      <div className={cn("flex items-start gap-3", compact ? "gap-2" : "gap-4")}>
        <CompanionAvatar
          visualId={visualId}
          state={state}
          locale={l}
          size={size}
        />
        <div className="min-w-0 flex-1">
          {!compact ? (
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
              {copy.eyebrow}
            </p>
          ) : null}
          <h3
            data-testid="companion-bridge-card-title"
            className={cn(
              "font-semibold tracking-tight text-[#0F6E56]",
              compact ? "mt-0 text-sm" : "mt-1 text-base sm:text-lg",
            )}
          >
            {trimmedName ? `${copy.title} · ${trimmedName}` : copy.title}
          </h3>
          {trimmedStage ? (
            <p
              data-testid="companion-bridge-card-stage"
              className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#FFF4D6] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a5a17]"
            >
              {copy.stageLabel} · {trimmedStage}
            </p>
          ) : null}
          <p
            data-testid="companion-bridge-card-body"
            className={cn(
              "leading-relaxed text-[#0F6E56]/80",
              compact ? "mt-1 text-xs" : "mt-2 text-sm",
            )}
          >
            {copy.body}
          </p>
        </div>
      </div>
    </section>
  );
}
