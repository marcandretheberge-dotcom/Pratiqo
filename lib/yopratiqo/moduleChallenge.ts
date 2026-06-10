import type {
  LearningDifficultyTag,
  LearningShareConsentState,
  LearningSkillTag,
} from "@/lib/yopratiqo/teacherBridge";

export type ModuleChallengeLanguageFamily =
  | "romance_or_english"
  | "japanese"
  | "chinese"
  | "korean";

export type RomanceOrEnglishChallengeKind =
  | "verb_forms"
  | "singular_plural"
  | "grammar_pattern"
  | "reading_comprehension"
  | "listening_comprehension"
  | "scenario_response"
  | "writing_prompt";

export type JapaneseChallengeKind =
  | "kana_script_recognition"
  | "particles"
  | "polite_form"
  | "listening_comprehension"
  | "short_reading";

export type ChineseChallengeKind =
  | "pinyin_tone_awareness"
  | "character_recognition"
  | "measure_words"
  | "word_order"
  | "listening_comprehension";

export type KoreanChallengeKind =
  | "hangul_recognition"
  | "particles"
  | "polite_endings"
  | "pronunciation_awareness"
  | "listening_comprehension";

export type ModuleChallengeSectionKind =
  | RomanceOrEnglishChallengeKind
  | JapaneseChallengeKind
  | ChineseChallengeKind
  | KoreanChallengeKind;

export type ModuleChallengeSection = {
  id: string;
  kind: ModuleChallengeSectionKind;
  languageFamily: ModuleChallengeLanguageFamily;
  title: string;
  instructions: string;
  skillTags: LearningSkillTag[];
  maxScore: number;
  estimatedMinutes?: number;
};

export type ModuleChallenge = {
  id: string;
  moduleId: string;
  courseId?: string | null;
  languageFamily: ModuleChallengeLanguageFamily;
  targetLanguage: string;
  title: string;
  sections: ModuleChallengeSection[];
  passingScorePercent?: number;
  teacherSummaryEnabled: boolean;
};

export type SkillScore = {
  skillTag: LearningSkillTag;
  scorePercent: number;
  confidence: "low_signal" | "medium_signal" | "high_signal";
  difficultyTags: LearningDifficultyTag[];
};

export type TeacherReadyRecommendation = {
  id: string;
  priority: "low" | "medium" | "high";
  focusArea: LearningSkillTag | LearningDifficultyTag;
  suggestedLessonPlan: string;
  suggestedHomework?: string;
  shareWithTeacherOnlyAfterConsent: true;
};

export type ModuleChallengeResult = {
  id: string;
  userId: string;
  moduleId: string;
  challengeId: string;
  completedAt: string;
  scorePercent: number;
  passed: boolean;
  sectionScores: Array<{
    sectionId: string;
    kind: ModuleChallengeSectionKind;
    scorePercent: number;
  }>;
  skillScores: SkillScore[];
  teacherReadyRecommendations: TeacherReadyRecommendation[];
  consentState: LearningShareConsentState;
};

export const CHALLENGE_KIND_BY_LANGUAGE_FAMILY = {
  romance_or_english: [
    "verb_forms",
    "singular_plural",
    "grammar_pattern",
    "reading_comprehension",
    "listening_comprehension",
    "scenario_response",
    "writing_prompt",
  ],
  japanese: [
    "kana_script_recognition",
    "particles",
    "polite_form",
    "listening_comprehension",
    "short_reading",
  ],
  chinese: [
    "pinyin_tone_awareness",
    "character_recognition",
    "measure_words",
    "word_order",
    "listening_comprehension",
  ],
  korean: [
    "hangul_recognition",
    "particles",
    "polite_endings",
    "pronunciation_awareness",
    "listening_comprehension",
  ],
} as const satisfies Record<ModuleChallengeLanguageFamily, readonly ModuleChallengeSectionKind[]>;
