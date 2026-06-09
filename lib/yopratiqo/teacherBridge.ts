import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";

export type LearningSkillTag =
  | "greetings"
  | "pronunciation"
  | "listening"
  | "vocabulary"
  | "grammar"
  | "culture"
  | "conversation"
  | "teacher_practice";

export type LearningDifficultyTag =
  | "needs_speaking_practice"
  | "needs_listening_repetition"
  | "needs_pronunciation_support"
  | "needs_vocabulary_review"
  | "needs_cultural_context"
  | "not_enough_signal";

export type LearningShareConsentStatus =
  | "not_requested"
  | "pending"
  | "granted"
  | "revoked"
  | "expired";

export type LearningShareConsentState = {
  status: LearningShareConsentStatus;
  grantedAt?: string | null;
  revokedAt?: string | null;
  scope?: "summary_only" | "module_summary_only";
  teacherId?: string | null;
  bookingId?: string | null;
};

export type CompanionBridgeSummary = {
  companionId: string;
  companionName: string;
  stageName: string;
  stageIndex: number;
  progressPercent: number;
};

export type YoPratiqoProgressSummary = {
  product: "YoPratiqo";
  discipline: string;
  courseTitle: string;
  completedModules: string[];
  currentLevel: string;
  strengths: LearningSkillTag[];
  difficultyTags: LearningDifficultyTag[];
  suggestedTeacherFocus: string[];
  lastActivityDate: string | null;
  companion: CompanionBridgeSummary | null;
  consentState: LearningShareConsentState;
};

export type TeacherLearningInsight = {
  id: string;
  learnerDisplayName?: string | null;
  progressSummary: YoPratiqoProgressSummary;
  sharedByStudentConsent: boolean;
  generatedAt: string;
};

export const YO_TEACHER_BRIDGE_CONSENT_COPY = {
  fr: "Partager mes progrès YoPratiqo avec ce professeur afin qu'il puisse personnaliser mon cours.",
  en: "Share my YoPratiqo progress with this teacher so they can personalize my lesson.",
  es: "Compartir mi progreso de YoPratiqo con este profesor para que pueda personalizar mi clase.",
} as const satisfies Record<YoLocale, string>;

export const YO_TEACHER_BRIDGE_COMING_SOON_COPY = {
  fr: {
    eyebrow: "Pont professeur",
    title: "Apporte tes progrès YoPratiqo à un vrai professeur",
    body:
      "Bientôt, tu pourras choisir de partager un résumé clair de tes progrès quand tu réserves un cours. Rien n'est partagé automatiquement.",
    status: "Partage avec consentement seulement",
  },
  en: {
    eyebrow: "Teacher bridge",
    title: "Bring your YoPratiqo progress to a real teacher",
    body:
      "Soon, you will be able to choose to share a clear progress summary when booking a lesson. Nothing is shared automatically.",
    status: "Consent-based sharing only",
  },
  es: {
    eyebrow: "Puente con profesor",
    title: "Lleva tu progreso de YoPratiqo a un profesor real",
    body:
      "Pronto podrás elegir compartir un resumen claro de tu progreso al reservar una clase. Nada se comparte automáticamente.",
    status: "Solo con consentimiento",
  },
} as const satisfies Record<YoLocale, {
  eyebrow: string;
  title: string;
  body: string;
  status: string;
}>;

export const TEACHER_BRIDGE_SAFE_SUMMARY_NOTICE: YoLocalizedString = {
  fr: "Le professeur voit seulement un résumé pédagogique consenti, jamais les réponses détaillées aux quiz.",
  en: "The teacher sees only a consent-based learning summary, never detailed quiz responses.",
  es: "El profesor ve solo un resumen pedagógico autorizado, nunca respuestas detalladas de los cuestionarios.",
};

export function getTeacherBridgeConsentCopy(locale: YoLocale): string {
  return YO_TEACHER_BRIDGE_CONSENT_COPY[locale] ?? YO_TEACHER_BRIDGE_CONSENT_COPY.fr;
}

export function isTeacherBridgeConsentGranted(
  consentState: LearningShareConsentState,
): boolean {
  return consentState.status === "granted";
}
