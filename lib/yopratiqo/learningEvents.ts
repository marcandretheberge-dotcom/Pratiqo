import type {
  LearningDifficultyTag,
  LearningShareConsentState,
  LearningSkillTag,
} from "@/lib/yopratiqo/teacherBridge";

export type LearningEventSourceProduct =
  | "yopratiqo"
  | "marketplace"
  | "companion"
  | "credits";

export type YoPratiqoLearningEventType =
  | "yo_module_started"
  | "yo_lesson_completed"
  | "yo_flashcard_reviewed"
  | "yo_quiz_completed"
  | "yo_final_challenge_completed"
  | "yo_printable_opened"
  | "yo_audio_practiced";

export type MarketplaceLearningEventType =
  | "marketplace_lesson_booked"
  | "marketplace_lesson_completed"
  | "teacher_feedback_received"
  | "homework_completed";

export type CompanionLearningEventType =
  | "companion_xp_awarded"
  | "companion_level_up"
  | "companion_badge_unlocked";

export type PratiqoCreditLearningEventType =
  | "pratiqo_credit_earned"
  | "pratiqo_credit_spent";

export type LearningEventType =
  | YoPratiqoLearningEventType
  | MarketplaceLearningEventType
  | CompanionLearningEventType
  | PratiqoCreditLearningEventType;

export type LearningScoreSummary = {
  scorePercent?: number | null;
  correctCount?: number | null;
  totalCount?: number | null;
  passed?: boolean | null;
  attemptNumber?: number | null;
};

export type SafeLearningEventMetadata = Record<
  string,
  string | number | boolean | null | string[] | number[] | boolean[]
>;

export type LearningEventBase = {
  id: string;
  type: LearningEventType;
  userId: string;
  sourceProduct: LearningEventSourceProduct;
  subjectArea?: string | null;
  discipline?: string | null;
  courseId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  bookingId?: string | null;
  teacherId?: string | null;
  assignmentId?: string | null;
  companionId?: string | null;
  creditLedgerEntryId?: string | null;
  skillTags: LearningSkillTag[];
  difficultyTags: LearningDifficultyTag[];
  scoreSummary?: LearningScoreSummary | null;
  metadata?: SafeLearningEventMetadata;
  createdAt: string;
};

export type YoPratiqoLearningEvent = LearningEventBase & {
  sourceProduct: "yopratiqo";
  type: YoPratiqoLearningEventType;
  moduleId: string;
};

export type MarketplaceLearningEvent = LearningEventBase & {
  sourceProduct: "marketplace";
  type: MarketplaceLearningEventType;
  bookingId?: string | null;
};

export type CompanionLearningEvent = LearningEventBase & {
  sourceProduct: "companion";
  type: CompanionLearningEventType;
  companionId: string;
};

/**
 * Design-only event shape. This is not a financial ledger, not a cash
 * balance, and not connected to money movement. A future money-moving
 * implementation must use a separate accounting-reviewed ledger.
 */
export type PratiqoCreditLearningEvent = LearningEventBase & {
  sourceProduct: "credits";
  type: PratiqoCreditLearningEventType;
  creditKind: "promotional" | "paid" | "refund" | "goodwill";
};

export type LearningEvent =
  | YoPratiqoLearningEvent
  | MarketplaceLearningEvent
  | CompanionLearningEvent
  | PratiqoCreditLearningEvent;

export type TeacherShareableLearningSummary = {
  userId: string;
  summaryId: string;
  consentState: LearningShareConsentState;
  completedModules: string[];
  finalChallengeResult?: LearningScoreSummary | null;
  strengths: LearningSkillTag[];
  needsPractice: LearningDifficultyTag[];
  suggestedLessonPlan: string[];
  suggestedHomework: string[];
  generatedAt: string;
};
