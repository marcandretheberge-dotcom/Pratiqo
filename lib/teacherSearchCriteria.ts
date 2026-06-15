import type { TranslationKey } from "@/lib/i18n/types";
import type { DayKey, PeriodKey } from "@/lib/slots";

export type TeacherSearchFormat = "at_home" | "in_person" | "online" | "hybrid" | "no_preference";

export type TeacherPreference = "no_preference" | "female_preferred" | "male_preferred";

/**
 * Shared search criteria across landing / student search / guided quiz.
 * Keep fields optional so each surface can supply only what it knows.
 */
export type TeacherSearchCriteria = {
  /** Marketplace category group (quiz uses this); optional surfaces may use searchQuery instead. */
  category?: "music" | "languages" | "academic" | string;
  /** Sub-subject (quiz) or freeform subject text. */
  subject?: string;
  /** Freeform search query (SmartSearchInput). */
  searchQuery?: string;
  /** Location string typed by the user (not stored for analytics). */
  locationText?: string;
  city?: string;
  region?: string;
  countryCode?: string;
  timezone?: string;
  format?: TeacherSearchFormat;
  maxPrice?: number;
  minRating?: number;
  verifiedOnly?: boolean;
  language?: string;
  level?: string;
  /**
   * Structured weekly-availability filter — replaces the previous free-text
   * `availability` field which couldn't reliably reason about day/time
   * windows. Either or both may be omitted; matching widens accordingly.
   * Backed by `lib/slots.ts#teacherMatchesAvailabilityWindow` which reads
   * the same `teacher.availability` JSON the booking modal already parses,
   * so search and booking cannot disagree.
   */
  availabilityDay?: DayKey;
  availabilityPeriod?: PeriodKey;
  teacherPreference?: TeacherPreference;
};

export const QUIZ_CATEGORY_LABEL_KEY: Record<"music" | "languages" | "academic", TranslationKey> = {
  music: "marketplaceCategoryMusic",
  languages: "marketplaceCategoryLanguages",
  academic: "marketplaceCategoryAcademic",
};

