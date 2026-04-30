"use client";

/**
 * TeacherQuiz — 5-step matching modal
 *
 * Step 1 — Subject (Musique / Langues / Académique)
 * Step 2 — Format  (Online / Home / Studio)
 * Step 3 — Level   (Beginner / Intermediate / Advanced)
 * Step 4 — Budget  (optional slider)
 * Step 5 — Email   (optional lead capture)
 * Step 6 — Results (Top 3 teachers from Supabase)
 */

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, ArrowLeft, ArrowRight, Star, Sparkles, Music, BookOpen, Languages, Monitor, Home, Building2, ChevronRight, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import { getSupabaseClient } from "@/lib/supabase";
import { TEACHER_QUIZ_SELECT } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";
import { VerificationBadge } from "@/components/VerificationBadge";
import type { VerificationLevel } from "@/lib/verification";
import { useAuth } from "@/components/AuthProvider";
import { teacherStudentPrefScoreFromQuizRow, type QuizTeacherMatchRow, type StudentLocationPrefs } from "@/lib/studentLocationSearch";

// ── Types ─────────────────────────────────────────────────────────────────────
type QuizAnswers = {
  subject: string | null;
  format: string | null;
  level: string | null;
  budget: number | null;
  email: string;
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
  diploma_verified: boolean | null;
  is_verified: boolean | null;
  identity_status?: string | null;
  country_code?: string | null;
  city?: string | null;
  region?: string | null;
  timezone?: string | null;
  location?: unknown;
};

type Step = "subject" | "format" | "level" | "budget" | "email" | "results";

const STEPS: Step[] = ["subject", "format", "level", "budget", "email", "results"];
const QUESTION_STEPS: Step[] = ["subject", "format", "level", "budget", "email"];
const INITIAL_ANSWERS: QuizAnswers = {
  subject: null,
  format: null,
  level: null,
  budget: null,
  email: "",
};

function foldAscii(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

function subjectMatchesRow(subject: string | null, discipline: string | null | undefined, category: string | null | undefined): boolean {
  if (!subject) return true;
  const d = foldAscii(discipline || "");
  const c = foldAscii(category || "");
  if (subject === "music") {
    return (
      c.includes("musique") ||
      d.includes("musique") ||
      d.includes("music") ||
      d.includes("piano") ||
      d.includes("violon") ||
      d.includes("guitare") ||
      d.includes("chant")
    );
  }
  if (subject === "languages") {
    return (
      c.includes("langue") ||
      d.includes("espagnol") ||
      d.includes("spanish") ||
      d.includes("ingles") ||
      d.includes("anglais") ||
      d.includes("english") ||
      d.includes("francais") ||
      d.includes("italien") ||
      d.includes("allemand") ||
      d.includes("mandarin") ||
      d.includes("latin")
    );
  }
  // academic — tolerant: DB category/discipline wording varies (math, sciences, tutoring, etc.)
  return (
    c.includes("scolaire") ||
    c.includes("academ") ||
    c.includes("science") ||
    c.includes("math") ||
    d.includes("math") ||
    d.includes("physique") ||
    d.includes("chimie") ||
    d.includes("biologie") ||
    d.includes("espagnol") ||
    d.includes("spanish") ||
    d.includes("francais") ||
    d.includes("anglais")
  );
}

function teachingModeAllowsOnline(mode: string | null): boolean {
  const m = foldAscii(mode || "");
  return m === "online" || m === "both" || m === "all" || m === "hybrid";
}

function teachingModeAllowsInPerson(mode: string | null): boolean {
  const m = foldAscii(mode || "");
  return m === "person" || m === "both" || m === "all" || m === "hybrid" || m === "home";
}

// ── Main component ─────────────────────────────────────────────────────────────
export function TeacherQuiz({ onClose }: { onClose: () => void }) {
  const { t, formatPrice } = useLocale();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("subject");
  const [answers, setAnswers] = useState<QuizAnswers>(INITIAL_ANSWERS);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<TeacherMatch[]>([]);

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

      const budgetedQuery = () => {
        let q = supabase
          .from("teachers")
          .select(TEACHER_QUIZ_SELECT)
          .neq("identity_status", "failed")
          .order("rating", { ascending: false });
        if (answers.budget && answers.budget > 0) {
          q = q.lte("price_per_lesson", answers.budget);
        }
        return q;
      };

      function applySubject(rows: TeacherMatch[]): TeacherMatch[] {
        if (!answers.subject) return rows;
        const matched = rows.filter((t) => subjectMatchesRow(answers.subject, t.discipline, t.category));
        return matched.length >= 1 ? matched : rows;
      }

      function applyFormat(rows: TeacherMatch[]): TeacherMatch[] {
        let filtered = rows;
        if (answers.format === "online") {
          // DB uses online | person | both | home | all (legacy "hybrid" kept for tolerance).
          const online = filtered.filter((t) => teachingModeAllowsOnline(t.teaching_mode));
          if (online.length >= 1) filtered = online;
        } else if (answers.format === "home") {
          const home = filtered.filter((t) => t.home_lesson_enabled);
          if (home.length >= 1) filtered = home;
        } else if (answers.format === "studio") {
          const studio = filtered.filter(
            (t) => teachingModeAllowsInPerson(t.teaching_mode) && foldAscii(t.teaching_mode || "") !== "online",
          );
          if (studio.length >= 1) filtered = studio;
        }
        return filtered;
      }

      const stripFailed = (rows: TeacherMatch[]) =>
        rows.filter((t) => foldAscii(String(t.identity_status ?? "none")) !== "failed");

      const { data, error } = await budgetedQuery().limit(48);
      let pool = stripFailed((data ?? []) as TeacherMatch[]);

      pool = applySubject(pool);
      pool = applyFormat(pool);

      const scoreRow = (row: TeacherMatch) => teacherStudentPrefScoreFromQuizRow(row as QuizTeacherMatchRow, studentPrefs);
      pool = [...pool].sort((x, y) => scoreRow(y) - scoreRow(x));

      if (error || pool.length === 0) {
        const { data: fb } = await budgetedQuery().limit(36);
        let broad = stripFailed((fb ?? []) as TeacherMatch[]);
        broad = applyFormat(broad);
        broad = [...broad].sort((x, y) => scoreRow(y) - scoreRow(x));
        setMatches(broad.slice(0, 3));
      } else {
        setMatches(pool.slice(0, 3));
      }
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [answers, user?.id]);

  const handleEmailSubmit = () => {
    void fetchMatches();
  };

  const restart = () => {
    setAnswers(INITIAL_ANSWERS);
    setDirection(-1);
    setStep("subject");
  };

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
            <Sparkles size={16} className="text-[#1D9E75]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#1D9E75]">
              {t("quizStepOfLabel")} {Math.min(questionStepIndex + 1, QUESTION_STEPS.length)} {t("quizProgress")} {QUESTION_STEPS.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#6B6760] hover:bg-[#F1EFE8] transition-colors"
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
                className="h-full rounded-full bg-[#1D9E75]"
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
              {/* ── STEP 1: SUBJECT ───────────────────────────────────── */}
              {step === "subject" && (
                <StepLayout title={t("quizStep1Title")}>
                  <OptionGrid>
                    <OptionCard
                      icon={<Music size={28} />}
                      label={t("quizSubjectMusic")}
                      emoji="🎵"
                      selected={answers.subject === "music"}
                      color="#8B5CF6"
                      onClick={() => {
                        setAnswers((a) => ({ ...a, subject: "music" }));
                        goNext("format");
                      }}
                    />
                    <OptionCard
                      icon={<Languages size={28} />}
                      label={t("quizSubjectLanguages")}
                      emoji="🌍"
                      selected={answers.subject === "languages"}
                      color="#3B82F6"
                      onClick={() => {
                        setAnswers((a) => ({ ...a, subject: "languages" }));
                        goNext("format");
                      }}
                    />
                    <OptionCard
                      icon={<BookOpen size={28} />}
                      label={t("quizSubjectAcademic")}
                      emoji="📚"
                      selected={answers.subject === "academic"}
                      color="#F59E0B"
                      onClick={() => {
                        setAnswers((a) => ({ ...a, subject: "academic" }));
                        goNext("format");
                      }}
                    />
                  </OptionGrid>
                </StepLayout>
              )}

              {/* ── STEP 2: FORMAT ────────────────────────────────────── */}
              {step === "format" && (
                <StepLayout title={t("quizStep2Title")}>
                  <OptionGrid>
                    <OptionCard
                      icon={<Monitor size={28} />}
                      label={t("quizFormatOnline")}
                      emoji="💻"
                      selected={answers.format === "online"}
                      color="#1D9E75"
                      onClick={() => {
                        setAnswers((a) => ({ ...a, format: "online" }));
                        goNext("level");
                      }}
                    />
                    <OptionCard
                      icon={<Home size={28} />}
                      label={t("quizFormatHome")}
                      emoji="🏠"
                      selected={answers.format === "home"}
                      color="#EC4899"
                      onClick={() => {
                        setAnswers((a) => ({ ...a, format: "home" }));
                        goNext("level");
                      }}
                    />
                    <OptionCard
                      icon={<Building2 size={28} />}
                      label={t("quizFormatStudio")}
                      emoji="🎓"
                      selected={answers.format === "studio"}
                      color="#F97316"
                      onClick={() => {
                        setAnswers((a) => ({ ...a, format: "studio" }));
                        goNext("level");
                      }}
                    />
                  </OptionGrid>
                </StepLayout>
              )}

              {/* ── STEP 3: LEVEL ─────────────────────────────────────── */}
              {step === "level" && (
                <StepLayout title={t("quizStep3Title")}>
                  <OptionGrid cols={1}>
                    {(["beginner", "intermediate", "advanced"] as const).map((lvl, i) => {
                      const labels = [t("quizLevelBeginner"), t("quizLevelIntermediate"), t("quizLevelAdvanced")];
                      const emojis = ["🌱", "🌿", "🌳"];
                      const colors = ["#22C55E", "#1D9E75", "#0F6E56"];
                      return (
                        <LevelCard
                          key={lvl}
                          label={labels[i]!}
                          emoji={emojis[i]!}
                          color={colors[i]!}
                          selected={answers.level === lvl}
                          onClick={() => {
                            setAnswers((a) => ({ ...a, level: lvl }));
                            goNext("budget");
                          }}
                        />
                      );
                    })}
                  </OptionGrid>
                </StepLayout>
              )}

              {/* ── STEP 4: BUDGET ────────────────────────────────────── */}
              {step === "budget" && (
                <StepLayout title={t("quizStep4Title")}>
                  <BudgetStep
                    value={answers.budget}
                    label={t("quizBudgetLabel")}
                    anyLabel={t("quizBudgetAny")}
                    onChange={(v) => setAnswers((a) => ({ ...a, budget: v }))}
                    formatPrice={formatPrice}
                  />
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setAnswers((a) => ({ ...a, budget: null }));
                        goNext("email");
                      }}
                      className="flex-1 h-11 rounded-2xl border border-[#E8E6DF] text-sm font-semibold text-[#6B6760] hover:border-[#1D9E75]/40 transition-colors"
                    >
                      {t("quizSkip")}
                    </button>
                    <button
                      type="button"
                      onClick={() => goNext("email")}
                      className="flex-1 h-11 rounded-2xl bg-[#1D9E75] text-sm font-bold text-white hover:brightness-105 transition-all flex items-center justify-center gap-1.5"
                    >
                      {t("quizNext")} <ArrowRight size={14} />
                    </button>
                  </div>
                </StepLayout>
              )}

              {/* ── STEP 5: EMAIL ─────────────────────────────────────── */}
              {step === "email" && (
                <StepLayout title={t("quizStep5Title")}>
                  <p className="text-xs text-[#6B6760] mb-4">{t("quizEmailHelper")}</p>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[#2C2C2A]">{t("quizEmailLabel")}</span>
                    <input
                      type="email"
                      value={answers.email}
                      onChange={(e) => setAnswers((a) => ({ ...a, email: e.target.value }))}
                      placeholder={t("quizEmailPlaceholder")}
                      className="w-full h-11 rounded-xl border border-[#E8E6DF] px-4 text-sm focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/30 transition-all"
                    />
                  </label>
                  <div className="flex gap-3 mt-5">
                    <button
                      type="button"
                      onClick={handleEmailSubmit}
                      className="flex-1 h-11 rounded-2xl border border-[#E8E6DF] text-sm font-semibold text-[#6B6760] hover:border-[#1D9E75]/40 transition-colors"
                    >
                      {t("quizSkip")}
                    </button>
                    <button
                      type="button"
                      onClick={handleEmailSubmit}
                      className="flex-1 h-11 rounded-2xl bg-[#1D9E75] text-sm font-bold text-white hover:brightness-105 transition-all flex items-center justify-center gap-1.5"
                    >
                      {t("quizSeeResults")} <ArrowRight size={14} />
                    </button>
                  </div>
                </StepLayout>
              )}

              {/* ── STEP 6: RESULTS ───────────────────────────────────── */}
              {step === "results" && (
                <div>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <div className="h-10 w-10 rounded-full border-2 border-[#1D9E75] border-t-transparent animate-spin" />
                      <p className="text-sm text-[#6B6760]">{t("quizLoading")}</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#1D9E75]/12 px-2.5 py-0.5 text-[11px] font-bold text-[#1D9E75] uppercase tracking-wide">
                              <Sparkles size={10} /> {t("quizTopPicksLabel")}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-[#2C2C2A]">{t("quizResultsTitle")}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={restart}
                          className="flex items-center gap-1 text-[11px] text-[#6B6760] hover:text-[#2C2C2A] transition-colors"
                        >
                          <RefreshCw size={11} /> {t("quizRestart")}
                        </button>
                      </div>

                      {matches.length === 0 ? (
                        <div className="py-10 text-center">
                          <p className="text-sm text-[#6B6760] mb-4">{t("quizNoResults")}</p>
                          <Link
                            href="/student/search"
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-[#1D9E75] hover:underline"
                          >
                            {t("quizSeeAll")} <ChevronRight size={13} />
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {matches.map((teacher, idx) => (
                            <MatchCard
                              key={teacher.id}
                              teacher={teacher}
                              rank={idx + 1}
                              formatPrice={formatPrice}
                              bookLabel={t("quizBookNow")}
                              profileLabel={t("quizSeeProfile")}
                              onClose={onClose}
                            />
                          ))}
                          <Link
                            href="/student/search"
                            onClick={onClose}
                            className="flex items-center justify-center gap-1 text-sm font-semibold text-[#1D9E75] hover:underline pt-1"
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
        {step !== "subject" && step !== "results" && (
          <div className="px-5 pb-5 shrink-0">
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#6B6760] hover:text-[#2C2C2A] transition-colors"
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
    <div className={cn("grid gap-3", cols === 1 ? "grid-cols-1" : "grid-cols-3")}>
      {children}
    </div>
  );
}

function OptionCard({
  icon, label, emoji, selected, color, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  emoji: string;
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
          ? "border-[#1D9E75] bg-[rgba(29,158,117,0.08)] shadow-sm"
          : "border-[#E8E6DF] bg-white hover:border-[#1D9E75]/40 hover:bg-[#FAFAF8]"
      )}
    >
      <span className="text-2xl">{emoji}</span>
      <span
        className="text-xs font-bold leading-tight"
        style={{ color: selected ? "#0F6E56" : "#2C2C2A" }}
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
          ? "border-[#1D9E75] bg-[rgba(29,158,117,0.08)] shadow-sm"
          : "border-[#E8E6DF] bg-white hover:border-[#1D9E75]/40 hover:bg-[#FAFAF8]"
      )}
    >
      <span className="text-xl">{emoji}</span>
      <span className={cn("font-bold text-sm", selected ? "text-[#0F6E56]" : "text-[#2C2C2A]")}>
        {label}
      </span>
      {selected && <ChevronRight size={14} className="ml-auto text-[#1D9E75]" />}
    </button>
  );
}

function BudgetStep({
  value, label, anyLabel, onChange, formatPrice,
}: {
  value: number | null;
  label: string;
  anyLabel: string;
  onChange: (v: number | null) => void;
  formatPrice: (n: number) => string;
}) {
  const budgetOptions = [25, 40, 60, 80, 100];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {budgetOptions.map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => onChange(value === amt ? null : amt)}
            className={cn(
              "rounded-xl border-2 py-3 text-sm font-bold transition-all",
              value === amt
                ? "border-[#1D9E75] bg-[rgba(29,158,117,0.1)] text-[#0F6E56]"
                : "border-[#E8E6DF] text-[#2C2C2A] hover:border-[#1D9E75]/40"
            )}
          >
            ≤ {formatPrice(amt)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "rounded-xl border-2 py-3 text-xs font-bold transition-all col-span-1",
            value === null
              ? "border-[#1D9E75] bg-[rgba(29,158,117,0.1)] text-[#0F6E56]"
              : "border-[#E8E6DF] text-[#6B6760] hover:border-[#1D9E75]/40"
          )}
        >
          {anyLabel}
        </button>
      </div>
      <p className="text-center text-xs text-[#6B6760]">
        {value != null ? `${label}: ${formatPrice(value)}` : anyLabel}
      </p>
    </div>
  );
}

function MatchCard({
  teacher, rank, formatPrice, bookLabel, profileLabel, onClose,
}: {
  teacher: TeacherMatch;
  rank: number;
  formatPrice: (n: number) => string;
  bookLabel: string;
  profileLabel: string;
  onClose: () => void;
}) {
  const initials = teacher.name
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() ?? "")
    .join("");

  const verificationLevel = (teacher.verification_level ?? 0) as VerificationLevel;

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
            className="rounded-full object-cover border-2 border-[rgba(29,158,117,0.25)]"
          />
        ) : (
          <div
            className="h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#1D9E75,#0f6e56)" }}
          >
            {initials}
          </div>
        )}
        {verificationLevel > 0 && (
          <span className="absolute -bottom-0.5 -right-0.5">
            <VerificationBadge level={verificationLevel} size="sm" showLabel={false} />
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="font-bold text-sm text-[#2C2C2A] truncate">{teacher.name}</p>
            <p className="text-[11px] text-[#6B6760] truncate">{teacher.discipline}</p>
          </div>
          {teacher.rating != null && teacher.rating > 0 && (
            <span className="shrink-0 flex items-center gap-0.5 text-[11px] font-bold text-[#2C2C2A]">
              <Star size={10} className="fill-amber-400 text-amber-400" />
              {teacher.rating.toFixed(1)}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2">
          {teacher.price_per_lesson != null && teacher.price_per_lesson > 0 && (
            <span className="text-xs font-bold text-[#1D9E75]">
              {formatPrice(teacher.price_per_lesson)}/h
            </span>
          )}
        </div>

        {/* CTAs */}
        <div className="mt-3 flex items-center gap-2">
          <Link
            href={`/teacher/profile/${encodeURIComponent(teacher.id)}`}
            onClick={onClose}
            className="flex-1 h-8 rounded-xl bg-[#1D9E75] flex items-center justify-center text-xs font-bold text-white hover:brightness-105 transition-all"
          >
            {bookLabel}
          </Link>
          <Link
            href={`/teacher/profile/${encodeURIComponent(teacher.id)}`}
            onClick={onClose}
            className="h-8 px-3 rounded-xl border border-[#E8E6DF] flex items-center justify-center text-xs font-semibold text-[#6B6760] hover:border-[#1D9E75]/40 transition-colors whitespace-nowrap"
          >
            {profileLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
