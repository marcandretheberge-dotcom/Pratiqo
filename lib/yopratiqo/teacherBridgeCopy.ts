/**
 * Shared FR/EN/ES copy for the YoPratiqo → Pratiqo teacher bridge UI.
 *
 * Purpose
 * -------
 * The bridge lets a YoPratiqo learner explicitly choose to share a SAFE
 * pedagogical summary with a real Pratiqo teacher so the teacher can
 * personalize an upcoming lesson. The two visible surfaces are:
 *
 *   1. The student-side consent card (`YoTeacherBridgeConsentCard`).
 *   2. The teacher-side insight card (`TeacherLearningInsightCard`).
 *
 * Both surfaces share the same vocabulary so the experience feels coherent
 * across the bridge.
 *
 * Constraints reflected in this file
 * ----------------------------------
 *  - All strings exist in FR / EN / ES — no UI is allowed to be French-only.
 *  - The privacy note explicitly says raw quiz answers are NOT shared.
 *  - The consent label uses the wording the launch brief mandates verbatim.
 *  - This file ships ZERO runtime behavior. It is just constants — safe to
 *    import from server components, client components, and tests.
 */

import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";

// ─────────────────────────────────────────────────────────────────────────
// Student-facing consent card
// ─────────────────────────────────────────────────────────────────────────

/** Card title — one line, action-oriented. */
export const STUDENT_CONSENT_TITLE: Record<YoLocale, string> = {
  fr: "Apporter mes progrès YoPratiqo à ce cours",
  en: "Bring my YoPratiqo progress to this lesson",
  es: "Llevar mi progreso de YoPratiqo a esta clase",
};

/**
 * Checkbox label. This is the legally meaningful consent string and must
 * match the launch brief verbatim — DO NOT shorten or paraphrase.
 */
export const STUDENT_CONSENT_CHECKBOX_LABEL: Record<YoLocale, string> = {
  fr: "Je consens à partager un résumé de mes progrès YoPratiqo avec ce professeur afin qu'il puisse personnaliser mon cours.",
  en: "I agree to share a summary of my YoPratiqo progress with this teacher so they can personalize my lesson.",
  es: "Acepto compartir un resumen de mi progreso de YoPratiqo con este profesor para que pueda personalizar mi clase.",
};

/**
 * Privacy note — printed under the checkbox.
 *
 * The phrase "Raw quiz answers are not shared." is asserted verbatim by
 * `tests/yo/yopratiqoTeacherBridgeConsentCard.test.ts`. Keep that exact
 * sentence in the EN string.
 */
export const STUDENT_CONSENT_PRIVACY_NOTE: Record<YoLocale, string> = {
  fr: "Le professeur reçoit seulement un résumé utile. Les réponses brutes aux quiz ne sont pas partagées.",
  en: "The teacher receives only a useful summary. Raw quiz answers are not shared.",
  es: "El profesor recibe solo un resumen útil. Las respuestas brutas de los cuestionarios no se comparten.",
};

/**
 * Coming-soon status copy used when the consent card is mounted before the
 * bridge persistence layer is ready. The card stays interactive (so the
 * student can preview the consent UX) but no real sharing is created.
 */
export const STUDENT_CONSENT_COMING_SOON_NOTE: Record<YoLocale, string> = {
  fr: "Bientôt disponible : la sauvegarde du consentement et le partage réel arriveront avec la prochaine mise à jour. Cette case ne crée pas encore de partage.",
  en: "Coming soon: consent persistence and real sharing arrive with the next update. Checking this box does not yet create a share.",
  es: "Próximamente: el guardado del consentimiento y el envío real llegarán en la próxima actualización. Marcar esta casilla aún no genera ningún envío.",
};

// ─────────────────────────────────────────────────────────────────────────
// Teacher-facing insight card
// ─────────────────────────────────────────────────────────────────────────

/** Title rendered when the insight card is unlocked by student consent. */
export const TEACHER_INSIGHT_TITLE: Record<YoLocale, string> = {
  fr: "Résumé YoPratiqo partagé par l'élève",
  en: "YoPratiqo summary shared by the student",
  es: "Resumen de YoPratiqo compartido por el estudiante",
};

/** Label for the suggested-focus list. */
export const TEACHER_INSIGHT_FOCUS_LABEL: Record<YoLocale, string> = {
  fr: "Pistes utiles pour le cours",
  en: "Useful lesson focus",
  es: "Enfoques útiles para la clase",
};

/** Label for the companion bridge sub-card on either side of the bridge. */
export const COMPANION_BRIDGE_LABEL: Record<YoLocale, string> = {
  fr: "Compagnon d'apprentissage",
  en: "Learning companion",
  es: "Compañero de aprendizaje",
};

/**
 * Locked-state title shown on the teacher card when consent has NOT been
 * granted. The companion message reinforces that nothing was shared
 * automatically.
 */
export const TEACHER_INSIGHT_LOCKED_TITLE: Record<YoLocale, string> = {
  fr: "Aucun résumé partagé pour ce cours",
  en: "No summary shared for this lesson",
  es: "No se ha compartido ningún resumen para esta clase",
};

export const TEACHER_INSIGHT_LOCKED_BODY: Record<YoLocale, string> = {
  fr: "L'élève peut décider de partager un résumé YoPratiqo lors de la réservation. Aucun partage n'est créé automatiquement.",
  en: "The student can choose to share a YoPratiqo summary at booking time. No sharing is created automatically.",
  es: "El estudiante puede decidir compartir un resumen de YoPratiqo al reservar. No se crea ningún envío automáticamente.",
};

// ─────────────────────────────────────────────────────────────────────────
// Companion teaser line (used inside the consent card)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Single-line teaser — interpolates the companion's display name. The
 * `{name}` token is intentionally simple so the runtime doesn't need a
 * format library.
 */
export const COMPANION_TEASER_TEMPLATE: Record<YoLocale, string> = {
  fr: "{name} fait partie de ton apprentissage. Le professeur verra son étape, jamais ses détails privés.",
  en: "{name} is part of your learning. The teacher sees its stage, never its private details.",
  es: "{name} forma parte de tu aprendizaje. El profesor ve su etapa, nunca sus detalles privados.",
};

/** Default companion display name when no specific companion is provided. */
export const COMPANION_DEFAULT_NAME: Record<YoLocale, string> = {
  fr: "Ton compagnon",
  en: "Your companion",
  es: "Tu compañero",
};

/**
 * Resolve `{name}` inside the companion teaser. Tiny helper to keep the
 * card render readable.
 */
export function formatCompanionTeaser(locale: YoLocale, companionName?: string | null): string {
  const tmpl = COMPANION_TEASER_TEMPLATE[locale] ?? COMPANION_TEASER_TEMPLATE.fr;
  const name =
    typeof companionName === "string" && companionName.trim().length > 0
      ? companionName.trim()
      : COMPANION_DEFAULT_NAME[locale] ?? COMPANION_DEFAULT_NAME.fr;
  return tmpl.replace(/\{name\}/g, name);
}

// ─────────────────────────────────────────────────────────────────────────
// Localized labels used by both surfaces (kept as YoLocalizedString so the
// existing `t(value, locale)` helper works without conversion)
// ─────────────────────────────────────────────────────────────────────────

export const STUDENT_CONSENT_TITLE_LOCALIZED: YoLocalizedString = {
  fr: STUDENT_CONSENT_TITLE.fr,
  en: STUDENT_CONSENT_TITLE.en,
  es: STUDENT_CONSENT_TITLE.es,
};

export const TEACHER_INSIGHT_TITLE_LOCALIZED: YoLocalizedString = {
  fr: TEACHER_INSIGHT_TITLE.fr,
  en: TEACHER_INSIGHT_TITLE.en,
  es: TEACHER_INSIGHT_TITLE.es,
};

export const TEACHER_INSIGHT_FOCUS_LABEL_LOCALIZED: YoLocalizedString = {
  fr: TEACHER_INSIGHT_FOCUS_LABEL.fr,
  en: TEACHER_INSIGHT_FOCUS_LABEL.en,
  es: TEACHER_INSIGHT_FOCUS_LABEL.es,
};

export const COMPANION_BRIDGE_LABEL_LOCALIZED: YoLocalizedString = {
  fr: COMPANION_BRIDGE_LABEL.fr,
  en: COMPANION_BRIDGE_LABEL.en,
  es: COMPANION_BRIDGE_LABEL.es,
};

/**
 * Convenience helper used by tests + components: returns every consent-card
 * string for one locale in a single object.
 */
export function getConsentCardCopy(locale: YoLocale): {
  title: string;
  checkboxLabel: string;
  privacyNote: string;
  comingSoonNote: string;
  companionLabel: string;
} {
  const safe: YoLocale = (["fr", "en", "es"] as const).includes(locale) ? locale : "fr";
  return {
    title: STUDENT_CONSENT_TITLE[safe],
    checkboxLabel: STUDENT_CONSENT_CHECKBOX_LABEL[safe],
    privacyNote: STUDENT_CONSENT_PRIVACY_NOTE[safe],
    comingSoonNote: STUDENT_CONSENT_COMING_SOON_NOTE[safe],
    companionLabel: COMPANION_BRIDGE_LABEL[safe],
  };
}

/** Convenience helper for the insight card. */
export function getInsightCardCopy(locale: YoLocale): {
  title: string;
  focusLabel: string;
  companionLabel: string;
  lockedTitle: string;
  lockedBody: string;
} {
  const safe: YoLocale = (["fr", "en", "es"] as const).includes(locale) ? locale : "fr";
  return {
    title: TEACHER_INSIGHT_TITLE[safe],
    focusLabel: TEACHER_INSIGHT_FOCUS_LABEL[safe],
    companionLabel: COMPANION_BRIDGE_LABEL[safe],
    lockedTitle: TEACHER_INSIGHT_LOCKED_TITLE[safe],
    lockedBody: TEACHER_INSIGHT_LOCKED_BODY[safe],
  };
}
