import type { CompanionType } from "@/lib/companions";
import type {
  LearningDifficultyTag,
  LearningSkillTag,
} from "@/lib/yopratiqo/teacherBridge";

export type CompanionXPSource =
  | "yo_module_progress"
  | "yo_final_challenge"
  | "marketplace_lesson_completed"
  | "teacher_feedback"
  | "homework_completed"
  | "streak"
  | "skill_improvement";

export type CompanionDisciplineTrack =
  | "languages"
  | "music"
  | "academic"
  | "general";

export type CompanionSubjectTrack = {
  disciplineTrack: CompanionDisciplineTrack;
  subjectArea: string;
  currentXp: number;
  level: number;
  skillTags: LearningSkillTag[];
};

export type CompanionBadge = {
  id: string;
  label: string;
  source: CompanionXPSource;
  disciplineTrack: CompanionDisciplineTrack;
  unlockedAt?: string | null;
};

export type CompanionGrowthEvent = {
  id: string;
  userId: string;
  companionType: CompanionType;
  source: CompanionXPSource;
  xpDelta: number;
  subjectArea?: string | null;
  disciplineTrack: CompanionDisciplineTrack;
  skillTags: LearningSkillTag[];
  difficultyTags: LearningDifficultyTag[];
  referenceId?: string | null;
  createdAt: string;
};

export type CompanionGrowthSummary = {
  userId: string;
  companionType: CompanionType;
  totalXp: number;
  level: number;
  disciplineTracks: CompanionSubjectTrack[];
  badges: CompanionBadge[];
  recentSources: CompanionXPSource[];
  deterministicInputs: {
    yoModulesCompleted: number;
    finalChallengesCompleted: number;
    liveTeacherLessonsCompleted: number;
    teacherFeedbackCount: number;
    homeworkCompletedCount: number;
    currentStreakDays: number;
    skillImprovementSignals: number;
  };
  generatedAt: string;
};

export const COMPANION_XP_SOURCE_WEIGHTS: Record<CompanionXPSource, number> = {
  yo_module_progress: 20,
  yo_final_challenge: 50,
  marketplace_lesson_completed: 40,
  teacher_feedback: 15,
  homework_completed: 15,
  streak: 5,
  skill_improvement: 25,
};
