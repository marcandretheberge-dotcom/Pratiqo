"use client";

/**
 * YoTeacherBridgeConsentCard
 *
 * Student-facing card that surfaces the explicit consent for sharing a
 * YoPratiqo progress SUMMARY with a Pratiqo teacher.
 *
 * Privacy contract (do not soften without legal review):
 *   • The checkbox is unchecked by default.
 *   • The privacy note explicitly states raw quiz answers are not shared.
 *   • Toggling the checkbox does NOT itself share anything — it just emits
 *     `onCheckedChange(boolean)` to the parent. The parent decides whether
 *     to call a real share endpoint, mark a coming-soon state, etc.
 *   • In `comingSoon` mode the checkbox stays interactive (so the student
 *     can preview the UX) but a visible badge says no share is created
 *     yet, and `onCheckedChange` may be omitted by the parent.
 *
 * The card is locale-aware (FR / EN / ES) and never hardcodes French
 * strings inside JSX — every sentence is read from `teacherBridgeCopy.ts`.
 */

import { useId } from "react";
import { GraduationCap, ShieldCheck, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { YoLocale } from "@/lib/yo/types";
import {
  formatCompanionTeaser,
  getConsentCardCopy,
} from "@/lib/yopratiqo/teacherBridgeCopy";

export type YoTeacherBridgeConsentCardProps = {
  /** UI locale. Falls back to "fr" if a non-supported value is passed. */
  locale: YoLocale;
  /** Controlled checkbox state. */
  checked: boolean;
  /** Called when the user toggles the checkbox. Optional in coming-soon previews. */
  onCheckedChange?: (checked: boolean) => void;
  /** Visually + functionally disabled checkbox (e.g. submitting / not eligible). */
  disabled?: boolean;
  /**
   * Coming-soon mode. The checkbox stays clickable so the student can
   * preview the feel, but a visible badge labels the surface as not yet
   * persisted. The parent should treat the checked state as ephemeral.
   */
  comingSoon?: boolean;
  /** Companion display name used inside the companion teaser. */
  companionName?: string | null;
  /** Optional headline numbers for the bridge value-prop strip. */
  completedModulesCount?: number;
  /** Optional CEFR label, e.g. "A1". */
  currentLevelLabel?: string;
  /** Optional className passthrough for layout adjustments. */
  className?: string;
};

const STATUS_BADGE_COPY: Record<YoLocale, { eyebrow: string; comingSoon: string }> = {
  fr: { eyebrow: "Pont professeur", comingSoon: "Bientôt" },
  en: { eyebrow: "Teacher bridge", comingSoon: "Coming soon" },
  es: { eyebrow: "Puente con profesor", comingSoon: "Próximamente" },
};

const STATS_COPY: Record<YoLocale, { modules: string; level: string }> = {
  fr: { modules: "Modules complétés", level: "Niveau actuel" },
  en: { modules: "Completed modules", level: "Current level" },
  es: { modules: "Módulos completados", level: "Nivel actual" },
};

function safeLocale(locale: YoLocale): YoLocale {
  return (["fr", "en", "es"] as const).includes(locale) ? locale : "fr";
}

export function YoTeacherBridgeConsentCard(props: YoTeacherBridgeConsentCardProps): React.JSX.Element {
  const {
    checked,
    onCheckedChange,
    disabled = false,
    comingSoon = false,
    companionName,
    completedModulesCount,
    currentLevelLabel,
    className,
  } = props;

  const locale = safeLocale(props.locale);
  const copy = getConsentCardCopy(locale);
  const companionLine = formatCompanionTeaser(locale, companionName);
  const statusCopy = STATUS_BADGE_COPY[locale];
  const statsCopy = STATS_COPY[locale];
  const checkboxId = useId();
  const noteId = useId();

  const handleChange = (next: boolean) => {
    if (disabled) return;
    onCheckedChange?.(next);
  };

  return (
    <article
      data-testid="yo-teacher-bridge-consent-card"
      data-yo-teacher-bridge="consent-card"
      data-coming-soon={comingSoon ? "true" : "false"}
      data-checked={checked ? "true" : "false"}
      className={cn(
        "rounded-3xl border border-[#DDF4F1] bg-gradient-to-br from-[#FAFCFB] via-white to-[#FFF4D6] p-5 shadow-[0_12px_32px_rgba(15,58,52,0.08)] sm:p-6",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#F4B400]/45 bg-[#FFF4D6] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#0F6E56]">
            <GraduationCap className="size-3.5" aria-hidden />
            {statusCopy.eyebrow}
          </span>
          <h3
            data-testid="yo-teacher-bridge-consent-title"
            className="mt-3 text-xl font-semibold tracking-tight text-[#0F6E56]"
          >
            {copy.title}
          </h3>
        </div>
        {comingSoon ? (
          <span
            data-testid="yo-teacher-bridge-consent-coming-soon-badge"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#0F6E56]/15 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F6E56]/70"
          >
            <Sparkles className="size-3" aria-hidden />
            {statusCopy.comingSoon}
          </span>
        ) : null}
      </header>

      {(typeof completedModulesCount === "number" && completedModulesCount >= 0) ||
      (typeof currentLevelLabel === "string" && currentLevelLabel.trim()) ? (
        <dl
          data-testid="yo-teacher-bridge-consent-stats"
          className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-[#DDF4F1] bg-white/85 p-3 sm:grid-cols-2"
        >
          {typeof completedModulesCount === "number" && completedModulesCount >= 0 ? (
            <div>
              <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0F6E56]/65">
                {statsCopy.modules}
              </dt>
              <dd className="mt-0.5 text-lg font-bold text-[#0F6E56]">{completedModulesCount}</dd>
            </div>
          ) : null}
          {typeof currentLevelLabel === "string" && currentLevelLabel.trim() ? (
            <div>
              <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0F6E56]/65">
                {statsCopy.level}
              </dt>
              <dd className="mt-0.5 text-lg font-bold text-[#0F6E56]">{currentLevelLabel.trim()}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="mt-4 rounded-2xl border border-[#DDF4F1] bg-[#FAFCFB] p-4">
        <p
          data-testid="yo-teacher-bridge-consent-companion-teaser"
          className="text-sm leading-relaxed text-[#0F6E56]/80"
        >
          <span className="mr-2 inline-flex items-center gap-1.5 rounded-full bg-[#FFF4D6] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a5a17]">
            {copy.companionLabel}
          </span>
          {companionLine}
        </p>
      </div>

      <label
        htmlFor={checkboxId}
        data-testid="yo-teacher-bridge-consent-checkbox-label"
        className="mt-4 flex items-start gap-3 rounded-2xl border border-[#DDF4F1] bg-white px-4 py-3 text-sm leading-relaxed text-[#0F6E56]"
      >
        <input
          id={checkboxId}
          data-testid="yo-teacher-bridge-consent-checkbox"
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => handleChange(e.target.checked)}
          aria-describedby={noteId}
          className="mt-0.5 size-4 shrink-0 rounded border-[#0F6E56]/30 text-[#0F6E56] focus:ring-[#1D9E75]"
        />
        <span>{copy.checkboxLabel}</span>
      </label>

      <p
        id={noteId}
        data-testid="yo-teacher-bridge-consent-privacy-note"
        className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[#0F6E56]/72"
      >
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#1D9E75]" aria-hidden />
        <span>{copy.privacyNote}</span>
      </p>

      {comingSoon ? (
        <p
          data-testid="yo-teacher-bridge-consent-coming-soon-note"
          className="mt-3 rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6]/70 px-3 py-2 text-xs leading-relaxed text-[#8a5a17]"
        >
          {copy.comingSoonNote}
        </p>
      ) : null}
    </article>
  );
}
