"use client";

/**
 * TeacherQuiz — guided matching (category → subject → audience → format → priority → comfort preference → results).
 * Uses shared {@link filterTeacherPool} / {@link TeacherSearchCriteria} for consistent marketplace matching.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, ArrowLeft, ArrowRight, Star, Sparkles, Music, BookOpen, Languages, Monitor, Home, MapPin, LayoutGrid, ChevronRight, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import { getSupabaseClient } from "@/lib/supabase";
import { TEACHER_QUIZ_SELECT, TEACHERS_PUBLIC_TABLE } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { teacherStudentPrefScoreFromQuizRow, type QuizTeacherMatchRow, type StudentLocationPrefs } from "@/lib/studentLocationSearch";
import { filterTeacherPool } from "@/lib/teacherSearchEngine";
import type { TeacherSearchCriteria } from "@/lib/teacherSearchCriteria";
import type { Teacher } from "@/types";
import { teacherRowToTeacher, type TeacherRow } from "@/lib/teacherMapper";
import { publicFirstNameWithInitial } from "@/lib/identity/displayName";
import { logSearchEvent } from "@/lib/searchAnalytics";
import type { TranslationKey } from "@/lib/i18n/types";
import { PriceDisplay } from "@/components/PriceDisplay";
import { TeacherBadgePill } from "@/components/TeacherBadgePill";
import { getCompactTeacherBadges } from "@/lib/teachers/badges";

// ── Types ─────────────────────────────────────────────────────────────────────
type QuizAnswers = {
  category: "music" | "languages" | "academic" | null;
  subcategory: string | null;
  whoFor: "me" | "child" | "someone_else" | null;
  format: "at_home" | "in_person" | "online" | "hybrid" | "no_preference" | null;
  priority: "closest" | "best_rated" | "available_soon" | "budget_friendly" | null;
  teacherPreference: "no_preference" | "female_preferred" | "male_preferred" | null;
};

type TeacherMatch = {
  id: string;
  name: string;
  discipline: string;
  category: string;
  image_url: string | null;
  rating: number | null;
  reviews: number | null;
  price_per_lesson: number | null;
  teaching_mode: string | null;
  home_lesson_enabled: boolean | null;
  verification_level: number | null;
  identity_verified: boolean | null;
  identity_verified_manually: boolean | null;
  diploma_verified: boolean | null;
  verified_experience_active: boolean | null;
  is_verified: boolean | null;
  identity_status?: string | null;
  country_code?: string | null;
  city?: string | null;
  region?: string | null;
  timezone?: string | null;
  currency?: string | null;
  location?: unknown;
};

type Step = "category" | "subcategory" | "who_for" | "format" | "priority" | "teacher_pref" | "results";

const STEPS: Step[] = ["category", "subcategory", "who_for", "format", "priority", "teacher_pref", "results"];
const QUESTION_STEPS: Step[] = ["category", "subcategory", "who_for", "format", "priority", "teacher_pref"];
const INITIAL_ANSWERS: QuizAnswers = {
  category: null,
  subcategory: null,
  whoFor: null,
  format: null,
  priority: null,
  teacherPreference: null,
};

function foldAscii(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

const SUBJECT_TOKEN: Record<string, string> = {
  m_piano: "piano",
  m_guitar: "guit",
  m_violin: "viol",
  l_en: "anglais",
  l_fr: "fran",
  l_es: "espan",
  a_math: "math",
  a_fr: "fran",
  a_en: "anglais",
  a_sci: "science",
};

function quizSubjectToken(sub: string | null): string | undefined {
  if (!sub || sub === "other") return undefined;
  return SUBJECT_TOKEN[sub];
}

function quizSearchCriteria(answers: QuizAnswers): TeacherSearchCriteria {
  const subject = quizSubjectToken(answers.subcategory);
  return {
    category: answers.category ?? undefined,
    subject,
    format: answers.format ?? undefined,
    teacherPreference: answers.teacherPreference ?? undefined,
  };
}

function teachingModeAllowsOnline(mode: string | null): boolean {
  const m = foldAscii(mode || "");
  return m === "online" || m === "both" || m === "all" || m === "hybrid";
}

function teacherToMatchRow(t: Teacher): TeacherMatch {
  return {
    id: t.id,
    name: t.name,
    discipline: t.discipline,
    category: String(t.category),
    image_url: t.imageUrl || null,
    rating: t.rating,
    reviews: t.reviews,
    price_per_lesson: t.pricePerLesson,
    teaching_mode: t.teachingMode,
    home_lesson_enabled: t.homeLessonEnabled ?? null,
    verification_level: t.verificationLevel ?? null,
    identity_verified: t.identityVerified ?? null,
    identity_verified_manually: t.identityVerifiedManually ?? null,
    diploma_verified: t.diplomaVerified ?? null,
    verified_experience_active: t.verifiedExperience ?? null,
    is_verified: t.isVerified,
    country_code: t.countryCode ?? null,
    city: t.city ?? null,
    region: t.region ?? null,
    timezone: t.timezone ?? null,
    location: t.location,
  };
}

function regionMatchScore(row: TeacherMatch, prefs: StudentLocationPrefs | null): number {
  if (!prefs?.country_code) return 0;
  let s = 0;
  if (row.country_code && prefs.country_code && row.country_code === prefs.country_code) s += 3;
  const pc = foldAscii(prefs.city || "");
  const rc = foldAscii(row.city || "");
  if (pc && rc && (rc.includes(pc) || pc.includes(rc))) s += 4;
  const pr = foldAscii(prefs.region || "");
  const rr = foldAscii(row.region || "");
  if (pr && rr && (rr.includes(pr) || pr.includes(rr))) s += 2;
  return s;
}

function sortQuizTeachers(
  rows: TeacherMatch[],
  priority: QuizAnswers["priority"],
  studentPrefs: StudentLocationPrefs | null,
): TeacherMatch[] {
  const scoreRow = (row: TeacherMatch) => teacherStudentPrefScoreFromQuizRow(row as QuizTeacherMatchRow, studentPrefs);
  const copy = [...rows];
  if (priority === "best_rated") {
    copy.sort((a, b) => (Number(b.rating ?? 0) - Number(a.rating ?? 0)) || scoreRow(b) - scoreRow(a));
    return copy;
  }
  if (priority === "budget_friendly") {
    copy.sort(
      (a, b) =>
        (Number(a.price_per_lesson ?? 1e9) - Number(b.price_per_lesson ?? 1e9)) ||
        scoreRow(b) - scoreRow(a) ||
        (Number(b.rating ?? 0) - Number(a.rating ?? 0)),
    );
    return copy;
  }
  if (priority === "available_soon") {
    copy.sort(
      (a, b) =>
        (Number(b.verification_level ?? 0) - Number(a.verification_level ?? 0)) ||
        scoreRow(b) - scoreRow(a) ||
        (Number(b.rating ?? 0) - Number(a.rating ?? 0)),
    );
    return copy;
  }
  copy.sort((a, b) => scoreRow(b) - scoreRow(a) || regionMatchScore(b, studentPrefs) - regionMatchScore(a, studentPrefs));
  return copy;
}

type QuizBuckets = { best: TeacherMatch[]; closest: TeacherMatch[]; week: TeacherMatch[]; online: TeacherMatch[] };

function buildQuizBuckets(ordered: TeacherMatch[], prefs: StudentLocationPrefs | null): QuizBuckets {
  const used = new Set<string>();
  const take = (candidates: TeacherMatch[], n: number) => {
    const out: TeacherMatch[] = [];
    for (const row of candidates) {
      if (out.length >= n) break;
      if (used.has(row.id)) continue;
      used.add(row.id);
      out.push(row);
    }
    return out;
  };

  const best = take(ordered, 3);

  const closestSorted = [...ordered].sort(
    (a, b) => regionMatchScore(b, prefs) - regionMatchScore(a, prefs) || (Number(b.rating ?? 0) - Number(a.rating ?? 0)),
  );
  const closest = take(closestSorted, 3);

  const weekSorted = [...ordered].sort(
    (a, b) =>
      (Number(b.verification_level ?? 0) - Number(a.verification_level ?? 0)) ||
      (Number(b.rating ?? 0) - Number(a.rating ?? 0)),
  );
  const week = take(weekSorted, 3);

  const onlinePool = ordered.filter((t) => teachingModeAllowsOnline(t.teaching_mode));
  const onlineSorted = [...onlinePool].sort((a, b) => (Number(b.rating ?? 0) - Number(a.rating ?? 0)));
  const online = take(onlineSorted, 3);

  return { best, closest, week, online };
}

type SubOption = { value: string; labelKey: TranslationKey; emoji: string; color: string };

function getSubcategoryOptions(cat: QuizAnswers["category"]): SubOption[] {
  if (cat === "music") {
    return [
      { value: "m_piano", labelKey: "quizInstrumentPiano", emoji: "🎹", color: "#8B5CF6" },
      { value: "m_guitar", labelKey: "quizInstrumentGuitar", emoji: "🎸", color: "#F59E0B" },
      { value: "m_violin", labelKey: "quizInstrumentViolin", emoji: "🎻", color: "#EC4899" },
      { value: "other", labelKey: "quizSubOther", emoji: "✨", color: "#64748B" },
    ];
  }
  if (cat === "languages") {
    return [
      { value: "l_en", labelKey: "quizLangEnglish", emoji: "🇬🇧", color: "#3B82F6" },
      { value: "l_fr", labelKey: "quizLangFrench", emoji: "🇫🇷", color: "#6366F1" },
      { value: "l_es", labelKey: "quizLangSpanish", emoji: "🇪🇸", color: "#F97316" },
      { value: "other", labelKey: "quizSubOther", emoji: "✨", color: "#64748B" },
    ];
  }
  if (cat === "academic") {
    return [
      { value: "a_math", labelKey: "quizAcadMath", emoji: "📐", color: "#0EA5E9" },
      { value: "a_fr", labelKey: "quizAcadFrench", emoji: "📘", color: "#8B5CF6" },
      { value: "a_en", labelKey: "quizAcadEnglish", emoji: "📗", color: "#22C55E" },
      { value: "a_sci", labelKey: "quizAcadScience", emoji: "🔬", color: "#F59E0B" },
      { value: "other", labelKey: "quizSubOther", emoji: "✨", color: "#64748B" },
    ];
  }
  return [];
}

// ── Main component ─────────────────────────────────────────────────────────────
export function TeacherQuiz({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const { user } = useAuth();
  const studentSearchBrowseHref = user ? "/student/search" : "/login?next=/student/search";
  const [step, setStep] = useState<Step>("category");
  const [answers, setAnswers] = useState<QuizAnswers>(INITIAL_ANSWERS);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<TeacherMatch[]>([]);
  const [matchPrefs, setMatchPrefs] = useState<StudentLocationPrefs | null>(null);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const stepIndex = STEPS.indexOf(step);
  const questionStepIndex = QUESTION_STEPS.indexOf(step);

  const goNext = useCallback((nextStep: Step) => {
    setDirection(1);
    setStep(nextStep);
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]!);
  }, [step]);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setStep("results");
    try {
      const supabase = getSupabaseClient();

      let studentPrefs: StudentLocationPrefs | null = null;
      if (user?.id) {
        const { data: profRow } = await supabase
          .from("profiles")
          .select("country_code, timezone, currency, city, region, preferred_learning_format")
          .eq("id", user.id)
          .maybeSingle();
        const pr = profRow as {
          country_code?: string | null;
          timezone?: string | null;
          currency?: string | null;
          city?: string | null;
          region?: string | null;
          preferred_learning_format?: string | null;
        } | null;
        studentPrefs = pr
          ? {
              country_code: pr.country_code ?? null,
              timezone: pr.timezone ?? null,
              currency: pr.currency ?? null,
              city: pr.city ?? null,
              region: pr.region ?? null,
              preferred_learning_format: pr.preferred_learning_format ?? null,
            }
          : null;
      }

      // Failed Stripe Identity verifications are filtered out at the view level
      // by public.teachers_public (migration 070). The previous client-side
      // .neq("identity_status", "failed") and JS stripFailed are no longer
      // needed and would fail to compile against the safe-public column list.
      const { data, error } = await supabase
        .from(TEACHERS_PUBLIC_TABLE)
        .select(TEACHER_QUIZ_SELECT)
        .order("rating", { ascending: false })
        .limit(96);

      const rows = (data ?? []) as TeacherRow[];
      const teachers = rows.map((r) => teacherRowToTeacher(r));

      const crit = quizSearchCriteria(answers);
      let filtered = filterTeacherPool(teachers, crit);
      if (filtered.length < 4 && crit.subject) {
        filtered = filterTeacherPool(teachers, { ...crit, subject: undefined });
      }
      if (filtered.length < 2) {
        filtered = filterTeacherPool(teachers, { format: crit.format, category: crit.category });
      }
      if (filtered.length === 0) {
        filtered = teachers.slice(0, 24);
      }

      const matchRows = filtered.map(teacherToMatchRow);
      const sorted = sortQuizTeachers(matchRows, answers.priority, studentPrefs);
      const ordered = sorted.slice(0, 36);
      setMatches(ordered);

      logSearchEvent({
        source: "quiz",
        category: answers.category,
        subject: answers.subcategory,
        format: answers.format ?? null,
        city: studentPrefs?.city ?? null,
        region: studentPrefs?.region ?? null,
        country_code: studentPrefs?.country_code ?? null,
        timezone: studentPrefs?.timezone ?? null,
        result_count: ordered.length,
        filters: {
          whoFor: answers.whoFor,
          priority: answers.priority,
          teacherPreference: answers.teacherPreference,
        },
      });
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [answers, user?.id]);

  const restart = () => {
    setAnswers(INITIAL_ANSWERS);
    setMatchPrefs(null);
    setDirection(-1);
    setStep("category");
  };

  const resultBuckets = useMemo(() => buildQuizBuckets(matches, matchPrefs), [matches, matchPrefs]);

  // ── Slide variants ────────────────────────────────────────────────────────
  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:  (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  const transition = { duration: 0.22, ease: "easeInOut" as const };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative z-10 w-full sm:max-w-lg mx-0 sm:mx-4 rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "90dvh" }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-teal-700" />
            <span className="text-xs font-bold uppercase tracking-widest text-teal-700">
              {t("quizStepOfLabel")} {Math.min(questionStepIndex + 1, QUESTION_STEPS.length)} {t("quizProgress")} {QUESTION_STEPS.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-700 hover:bg-[#F1EFE8] transition-colors"
            aria-label={t("quizClose")}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Progress bar ───────────────────────────────────────────────── */}
        {step !== "results" && (
          <div className="px-5 pb-4 shrink-0">
            <div className="h-1.5 w-full rounded-full bg-[#F1EFE8] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-teal-600"
                animate={{ width: `${((questionStepIndex + 1) / QUESTION_STEPS.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* ── Step content ───────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className="px-5 pb-6"
            >
              {step === "category" && (
                <StepLayout title={t("quizStep1Title")}>
                  <OptionGrid>
                    <OptionCard
                      icon={<Music size={28} />}
                      label={t("quizSubjectMusic")}
                      emoji="🎵"
                      selected={answers.category === "music"}
                      color="#8B5CF6"
                      onClick={() => {
                        setAnswers((a) => ({ ...a, category: "music", subcategory: null }));
                        goNext("subcategory");
                      }}
                    />
                    <OptionCard
                      icon={<Languages size={28} />}
                      label={t("quizSubjectLanguages")}
                      emoji="🌍"
                      selected={answers.category === "languages"}
                      color="#3B82F6"
                      onClick={() => {
                        setAnswers((a) => ({ ...a, category: "languages", subcategory: null }));
                        goNext("subcategory");
                      }}
                    />
                    <OptionCard
                      icon={<BookOpen size={28} />}
                      label={t("quizSubjectAcademic")}
                      emoji="📚"
                      selected={answers.category === "academic"}
                      color="#F59E0B"
                      onClick={() => {
                        setAnswers((a) => ({ ...a, category: "academic", subcategory: null }));
                        goNext("subcategory");
                      }}
                    />
                  </OptionGrid>
                </StepLayout>
              )}

              {step === "subcategory" && (
                <StepLayout title={t("quizSubcategoryTitle")}>
                  <OptionGrid cols={2}>
                    {getSubcategoryOptions(answers.category).map((opt) => (
                      <OptionCard
                        key={opt.value}
                        label={t(opt.labelKey)}
                        emoji={opt.emoji}
                        selected={answers.subcategory === opt.value}
                        color={opt.color}
                        onClick={() => {
                          setAnswers((a) => ({ ...a, subcategory: opt.value }));
                          goNext("who_for");
                        }}
                      />
                    ))}
                  </OptionGrid>
                </StepLayout>
              )}

              {step === "who_for" && (
                <StepLayout title={t("quizWhoFor")}>
                  <OptionGrid cols={1}>
                    <LevelCard
                      label={t("quizForMe")}
                      emoji="🙋"
                      color="var(--palette-teal-500)"
                      selected={answers.whoFor === "me"}
                      onClick={() => {
                        setAnswers((a) => ({ ...a, whoFor: "me" }));
                        goNext("format");
                      }}
                    />
                    <LevelCard
                      label={t("quizForChild")}
                      emoji="👧"
                      color="#EC4899"
                      selected={answers.whoFor === "child"}
                      onClick={() => {
                        setAnswers((a) => ({ ...a, whoFor: "child" }));
                        goNext("format");
                      }}
                    />
                    <LevelCard
                      label={t("quizForSomeoneElse")}
                      emoji="🤝"
                      color="#6366F1"
                      selected={answers.whoFor === "someone_else"}
                      onClick={() => {
                        setAnswers((a) => ({ ...a, whoFor: "someone_else" }));
                        goNext("format");
                      }}
                    />
                  </OptionGrid>
                </StepLayout>
              )}

              {step === "format" && (
                <StepLayout title={t("quizStep2Title")}>
                  <OptionGrid cols={2}>
                    <OptionCard
                      icon={<Home size={28} />}
                      label={t("quizFormatHome")}
                      emoji="🏠"
                      selected={answers.format === "at_home"}
                      color="#EC4899"
                      onClick={() => {
                        setAnswers((a) => ({ ...a, format: "at_home" }));
                        goNext("priority");
                      }}
                    />
                    <OptionCard
                      icon={<MapPin size={28} />}
                      label={t("quizFormatInPersonNearby")}
                      emoji="📍"
                      selected={answers.format === "in_person"}
                      color="#F97316"
                      onClick={() => {
                        setAnswers((a) => ({ ...a, format: "in_person" }));
                        goNext("priority");
                      }}
                    />
                    <OptionCard
                      icon={<Monitor size={28} />}
                      label={t("quizFormatOnline")}
                      emoji="💻"
                      selected={answers.format === "online"}
                      color="var(--palette-teal-500)"
                      onClick={() => {
                        setAnswers((a) => ({ ...a, format: "online" }));
                        goNext("priority");
                      }}
                    />
                    <OptionCard
                      icon={<LayoutGrid size={28} />}
                      label={t("quizFormatHybridNoPreference")}
                      emoji="🔀"
                      selected={answers.format === "no_preference" || answers.format === "hybrid"}
                      color="#64748B"
                      onClick={() => {
                        setAnswers((a) => ({ ...a, format: "no_preference" }));
                        goNext("priority");
                      }}
                    />
                  </OptionGrid>
                </StepLayout>
              )}

              {step === "priority" && (
                <StepLayout title={t("quizPriority")}>
                  <OptionGrid cols={2}>
                    <OptionCard
                      icon={<MapPin size={28} />}
                      label={t("priorityClosest")}
                      emoji="📍"
                      selected={answers.priority === "closest"}
                      color="#0EA5E9"
                      onClick={() => {
                        setAnswers((a) => ({ ...a, priority: "closest" }));
                        goNext("teacher_pref");
                      }}
                    />
                    <OptionCard
                      icon={<Star size={28} />}
                      label={t("priorityBestRated")}
                      emoji="⭐"
                      color="#F59E0B"
                      selected={answers.priority === "best_rated"}
                      onClick={() => {
                        setAnswers((a) => ({ ...a, priority: "best_rated" }));
                        goNext("teacher_pref");
                      }}
                    />
                    <OptionCard
                      icon={<Sparkles size={28} />}
                      label={t("priorityAvailableSoon")}
                      emoji="⏳"
                      color="#8B5CF6"
                      selected={answers.priority === "available_soon"}
                      onClick={() => {
                        setAnswers((a) => ({ ...a, priority: "available_soon" }));
                        goNext("teacher_pref");
                      }}
                    />
                    <OptionCard
                      label={t("priorityBudgetFriendly")}
                      emoji="💰"
                      color="#22C55E"
                      selected={answers.priority === "budget_friendly"}
                      onClick={() => {
                        setAnswers((a) => ({ ...a, priority: "budget_friendly" }));
                        goNext("teacher_pref");
                      }}
                    />
                  </OptionGrid>
                </StepLayout>
              )}

              {step === "teacher_pref" && (
                <StepLayout title={t("teacherPreference")}>
                  <p className="text-xs text-neutral-700 mb-4">{t("teacherPreferenceComfortHint")}</p>
                  <OptionGrid cols={1}>
                    <LevelCard
                      label={t("teacherPreferenceNone")}
                      emoji="✨"
                      color="#64748B"
                      selected={answers.teacherPreference === "no_preference" || answers.teacherPreference === null}
                      onClick={() => setAnswers((a) => ({ ...a, teacherPreference: "no_preference" }))}
                    />
                    <LevelCard
                      label={t("teacherPreferenceFemale")}
                      emoji="👩‍🏫"
                      color="#EC4899"
                      selected={answers.teacherPreference === "female_preferred"}
                      onClick={() => setAnswers((a) => ({ ...a, teacherPreference: "female_preferred" }))}
                    />
                    <LevelCard
                      label={t("teacherPreferenceMale")}
                      emoji="👨‍🏫"
                      color="#3B82F6"
                      selected={answers.teacherPreference === "male_preferred"}
                      onClick={() => setAnswers((a) => ({ ...a, teacherPreference: "male_preferred" }))}
                    />
                  </OptionGrid>
                  <button
                    type="button"
                    onClick={() => void fetchMatches()}
                    className="mt-6 w-full h-11 rounded-2xl bg-teal-600 text-sm font-bold text-white hover:brightness-105 transition-all flex items-center justify-center gap-1.5"
                  >
                    {t("quizSeeResults")} <ArrowRight size={14} />
                  </button>
                </StepLayout>
              )}

              {step === "results" && (
                <div>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <div className="h-10 w-10 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
                      <p className="text-sm text-neutral-700">{t("quizLoading")}</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-[#2C2C2A]">{t("quizResultsTitle")}</h3>
                        <button
                          type="button"
                          onClick={restart}
                          className="flex items-center gap-1 text-[11px] text-neutral-700 hover:text-[#2C2C2A] transition-colors"
                        >
                          <RefreshCw size={11} /> {t("quizRestart")}
                        </button>
                      </div>

                      {!user ? (
                        <p className="text-xs text-neutral-700 mb-4 rounded-xl bg-[#F1EFE8] px-3 py-2">{t("signInToSaveMatches")}</p>
                      ) : null}

                      {matches.length === 0 ? (
                        <div className="py-10 text-center">
                          <p className="text-sm text-neutral-700 mb-4">{t("quizNoResults")}</p>
                          <Link
                            href={studentSearchBrowseHref}
                            prefetch={false}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline"
                          >
                            {t("quizSeeAll")} <ChevronRight size={13} />
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <QuizBucketSection
                            title={t("bestMatch")}
                            teachers={resultBuckets.best}
                            bookLabel={t("quizBookNow")}
                            profileLabel={t("quizSeeProfile")}
                            onClose={onClose}
                            isLoggedIn={Boolean(user)}
                          />
                          <QuizBucketSection
                            title={t("closestMatch")}
                            teachers={resultBuckets.closest}
                            bookLabel={t("quizBookNow")}
                            profileLabel={t("quizSeeProfile")}
                            onClose={onClose}
                            isLoggedIn={Boolean(user)}
                          />
                          <QuizBucketSection
                            title={t("availableThisWeekMatch")}
                            teachers={resultBuckets.week}
                            bookLabel={t("quizBookNow")}
                            profileLabel={t("quizSeeProfile")}
                            onClose={onClose}
                            isLoggedIn={Boolean(user)}
                          />
                          <QuizBucketSection
                            title={t("bestOnlineMatch")}
                            teachers={resultBuckets.online}
                            bookLabel={t("quizBookNow")}
                            profileLabel={t("quizSeeProfile")}
                            onClose={onClose}
                            isLoggedIn={Boolean(user)}
                          />
                          <Link
                            href={studentSearchBrowseHref}
                            prefetch={false}
                            onClick={onClose}
                            className="flex items-center justify-center gap-1 text-sm font-semibold text-teal-700 hover:underline pt-1"
                          >
                            {t("quizSeeAll")} <ChevronRight size={13} />
                          </Link>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Back button (for question steps only) ──────────────────────── */}
        {step !== "category" && step !== "results" && (
          <div className="px-5 pb-5 shrink-0">
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-[#2C2C2A] transition-colors"
            >
              <ArrowLeft size={13} /> {t("quizBack")}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StepLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-[#2C2C2A] mb-5 leading-snug">{title}</h2>
      {children}
    </div>
  );
}

function OptionGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div
      className={cn(
        "grid gap-3",
        cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-2" : "grid-cols-3",
      )}
    >
      {children}
    </div>
  );
}

function OptionCard({
  icon,
  label,
  emoji,
  selected,
  color: _color,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  emoji?: string;
  selected: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 py-5 text-center transition-all",
        selected
          ? "border-teal-500 bg-teal-500/10 shadow-sm"
          : "border-[#E8E6DF] bg-white hover:border-teal-500/40 hover:bg-[#FAFAF8]",
      )}
    >
      <span className="flex min-h-9 items-center justify-center text-2xl text-[#2C2C2A]">
        {emoji ? emoji : icon}
      </span>
      <span
        className="text-xs font-bold leading-tight"
                    style={{ color: selected ? "var(--palette-teal-700)" : "#2C2C2A" }}
      >
        {label}
      </span>
    </button>
  );
}

function LevelCard({
  label, emoji, color, selected, onClick,
}: {
  label: string;
  emoji: string;
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-all",
        selected
          ? "border-teal-500 bg-teal-500/10 shadow-sm"
          : "border-[#E8E6DF] bg-white hover:border-teal-500/40 hover:bg-[#FAFAF8]"
      )}
    >
      <span className="text-xl">{emoji}</span>
      <span className={cn("font-bold text-sm", selected ? "text-teal-700" : "text-[#2C2C2A]")}>
        {label}
      </span>
      {selected && <ChevronRight size={14} className="ml-auto text-teal-700" />}
    </button>
  );
}

function QuizBucketSection({
  title,
  teachers,
  bookLabel,
  profileLabel,
  onClose,
  isLoggedIn,
}: {
  title: string;
  teachers: TeacherMatch[];
  bookLabel: string;
  profileLabel: string;
  onClose: () => void;
  isLoggedIn: boolean;
}) {
  if (!teachers.length) return null;
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-700">{title}</p>
      <div className="space-y-2">
        {teachers.map((teacher, idx) => (
          <MatchCard
            key={`${title}-${teacher.id}`}
            teacher={teacher}
            rank={idx + 1}
            bookLabel={bookLabel}
            profileLabel={profileLabel}
            onClose={onClose}
            isLoggedIn={isLoggedIn}
          />
        ))}
      </div>
    </div>
  );
}

function MatchCard({
  teacher, rank, bookLabel, profileLabel, onClose, isLoggedIn,
}: {
  teacher: TeacherMatch;
  rank: number;
  bookLabel: string;
  profileLabel: string;
  onClose: () => void;
  isLoggedIn: boolean;
}) {
  const initials = teacher.name
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() ?? "")
    .join("");

  const badges = getCompactTeacherBadges({
    teacherId: teacher.id,
    identityVerified: teacher.identity_verified,
    identityVerifiedManually: teacher.identity_verified_manually,
    identityStatus: teacher.identity_status,
    diplomaVerified: teacher.diploma_verified,
    verifiedExperience: teacher.verified_experience_active,
    reviewCount: teacher.reviews,
  });
  const profilePath = `/teacher/profile/${encodeURIComponent(teacher.id)}`;
  const bookHref = isLoggedIn ? profilePath : `/login?next=${encodeURIComponent(profilePath)}`;

  return (
    <div className="rounded-2xl border border-[#E8E6DF] bg-white p-4 flex items-start gap-3">
      {/* Rank badge */}
      <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
        <span
          className={cn(
            "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white",
            rank === 1 ? "bg-amber-400" : rank === 2 ? "bg-slate-400" : "bg-[#CD7F32]"
          )}
        >
          {rank}
        </span>
      </div>

      {/* Avatar */}
      <div className="relative shrink-0">
        {teacher.image_url ? (
          <Image
            src={teacher.image_url}
            alt={teacher.name}
            width={44}
            height={44}
            className="rounded-full object-cover border-2 border-teal-500/25"
          />
        ) : (
          <div
            className="h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,var(--palette-teal-500),var(--palette-teal-700))" }}
          >
            {initials}
          </div>
        )}
        {badges[0] ? (
          <span className="absolute -bottom-0.5 -right-0.5">
            <TeacherBadgePill badge={badges[0]} compact className="shadow-sm" />
          </span>
        ) : null}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="font-bold text-sm text-[#2C2C2A] truncate">{publicFirstNameWithInitial(teacher.name)}</p>
            <p className="text-[11px] text-neutral-700 truncate">{teacher.discipline}</p>
          </div>
          {teacher.rating != null && teacher.rating > 0 && teacher.reviews != null && teacher.reviews > 0 && (
            <span className="shrink-0 flex items-center gap-0.5 text-[11px] font-bold text-[#2C2C2A]">
              <Star size={10} className="fill-amber-400 text-amber-400" />
              {teacher.rating.toFixed(1)}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2">
          {teacher.price_per_lesson != null && teacher.price_per_lesson > 0 && (
            <span className="text-xs font-bold text-teal-700">
              <PriceDisplay
                amount={teacher.price_per_lesson}
                sourceCurrency={teacher.currency ?? "CAD"}
                perHour
                primaryClassName="font-bold text-teal-700"
                secondaryClassName="block text-[9px] font-semibold text-slate-500"
              />
            </span>
          )}
        </div>

        {/* CTAs */}
        <div className="mt-3 flex items-center gap-2">
          <Link
            href={bookHref}
            prefetch={false}
            onClick={onClose}
            className="flex-1 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-xs font-bold text-white hover:brightness-105 transition-all"
          >
            {bookLabel}
          </Link>
          <Link
            href={profilePath}
            prefetch={false}
            onClick={onClose}
            className="h-8 px-3 rounded-xl border border-[#E8E6DF] flex items-center justify-center text-xs font-semibold text-neutral-700 hover:border-teal-500/40 transition-colors whitespace-nowrap"
          >
            {profileLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
