"use client";

/**
 * YoBookingTeacherBridgeConsent
 *
 * Booking-modal-specific wrapper around `YoTeacherBridgeConsentCard`. It
 * owns three responsibilities the bare consent card does not:
 *
 *   1. Render a soft "Start YoPratiqo to bring your progress to future
 *      lessons" empty-state when the student has no YoPratiqo progress
 *      yet, instead of suggesting that something useful would be shared.
 *
 *   2. Render a short, honest "what the teacher will see" recap when the
 *      checkbox is checked, so the student sees in the booking modal
 *      (PART F of the launch brief) exactly what is being shared and what
 *      is not.
 *
 *   3. Keep the consent surface fully optional inside the booking flow —
 *      it never blocks the confirm button, never affects checkout or
 *      pricing math, and never inserts fake progress.
 *
 * Locale-aware (FR / EN / ES) via the existing `teacherBridgeCopy.ts`
 * source of truth. No new i18n keys are introduced.
 */

import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { YoLocale } from "@/lib/yo/types";
import { YoTeacherBridgeConsentCard } from "@/components/yo/YoTeacherBridgeConsentCard";
import { CompanionBridgeCard } from "@/components/companion/CompanionBridgeCard";

const EMPTY_STATE_COPY: Record<YoLocale, { title: string; body: string; status: string }> = {
  fr: {
    title: "Apporter mes progrès YoPratiqo à ce cours",
    body: "Commence YoPratiqo pour apporter tes progrès à tes prochains cours.",
    status: "Aucun résumé partagé pour l'instant.",
  },
  en: {
    title: "Bring my YoPratiqo progress to this lesson",
    body: "Start YoPratiqo to bring your progress to future lessons.",
    status: "No summary will be shared for now.",
  },
  es: {
    title: "Llevar mi progreso de YoPratiqo a esta clase",
    body: "Empieza YoPratiqo para llevar tu progreso a tus próximas clases.",
    status: "No se compartirá ningún resumen por ahora.",
  },
};

const CHECKED_RECAP_COPY: Record<YoLocale, { title: string; bodyShared: string; bodyNotShared: string }> = {
  fr: {
    title: "Ce que ton professeur verra pour ce cours",
    bodyShared:
      "Un résumé pédagogique consenti pour cette réservation. Les réponses brutes aux quiz, les notes privées et toute donnée de paiement ne sont jamais partagées.",
    bodyNotShared:
      "Rien ne sera partagé pour ce cours. Tu peux cocher la case ci-dessus si tu changes d'avis avant de confirmer.",
  },
  en: {
    title: "What your teacher will see for this lesson",
    bodyShared:
      "A consent-based learning summary for this booking only. Raw quiz answers, private notes, and any payment data are never shared.",
    bodyNotShared:
      "Nothing will be shared for this lesson. You can tick the box above if you change your mind before confirming.",
  },
  es: {
    title: "Lo que tu profesor verá para esta clase",
    bodyShared:
      "Un resumen pedagógico autorizado solo para esta reserva. Las respuestas brutas de los cuestionarios, las notas privadas y cualquier dato de pago nunca se comparten.",
    bodyNotShared:
      "No se compartirá nada para esta clase. Puedes marcar la casilla de arriba si cambias de opinión antes de confirmar.",
  },
};

export type YoBookingTeacherBridgeConsentProps = {
  locale: YoLocale;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /**
   * Whether the student has any persisted YoPratiqo progress to share.
   * When false, the soft empty state is shown instead of the consent card.
   */
  hasYoPratiqoProgress?: boolean;
  /** Optional companion name for the teaser inside the full consent card. */
  companionName?: string | null;
  /** Optional completed-modules count for the stats strip. */
  completedModulesCount?: number;
  /** Optional CEFR-style level label. */
  currentLevelLabel?: string;
  className?: string;
};

function safeLocale(locale: YoLocale): YoLocale {
  return (["fr", "en", "es"] as const).includes(locale) ? locale : "fr";
}

export function YoBookingTeacherBridgeConsent(
  props: YoBookingTeacherBridgeConsentProps,
): React.JSX.Element {
  const locale = safeLocale(props.locale);
  const hasProgress = props.hasYoPratiqoProgress === true;

  if (!hasProgress) {
    const copy = EMPTY_STATE_COPY[locale];
    return (
      <section
        data-testid="yo-booking-teacher-bridge-empty"
        data-yo-teacher-bridge="booking-empty"
        className={cn(
          "rounded-2xl border border-[#DDF4F1] bg-[#FAFCFB] px-4 py-3 text-sm text-[#0F6E56]/85",
          props.className,
        )}
      >
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-[#0F6E56]" aria-hidden />
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
              {copy.title}
            </p>
            <p className="mt-1 leading-relaxed">{copy.body}</p>
            <p className="mt-2 text-[11px] font-semibold text-[#0F6E56]/65">{copy.status}</p>
          </div>
        </div>
      </section>
    );
  }

  const recap = CHECKED_RECAP_COPY[locale];

  return (
    <div
      data-testid="yo-booking-teacher-bridge-wrapper"
      data-yo-teacher-bridge="booking-wrapper"
      className={cn("space-y-3", props.className)}
    >
      <CompanionBridgeCard
        locale={locale}
        companionName={props.companionName ?? null}
        state="teacher_ready"
        compact
      />
      <YoTeacherBridgeConsentCard
        locale={locale}
        checked={props.checked}
        onCheckedChange={props.onCheckedChange}
        disabled={props.disabled}
        comingSoon={false}
        companionName={props.companionName}
        completedModulesCount={props.completedModulesCount}
        currentLevelLabel={props.currentLevelLabel}
      />
      <p
        data-testid="yo-booking-teacher-bridge-share-recap"
        data-yo-teacher-bridge-share={props.checked ? "true" : "false"}
        className="rounded-2xl border border-[#DDF4F1] bg-white px-4 py-3 text-xs leading-relaxed text-[#0F6E56]/80"
      >
        <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
          {recap.title}
        </span>
        <span className="mt-1 block">
          {props.checked ? recap.bodyShared : recap.bodyNotShared}
        </span>
      </p>
    </div>
  );
}
