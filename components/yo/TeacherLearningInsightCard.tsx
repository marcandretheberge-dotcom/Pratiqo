import { BookOpenCheck, GraduationCap, Lock, ShieldCheck, Sparkles } from "lucide-react";

import { t } from "@/lib/yo/localize";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";
import {
  TEACHER_BRIDGE_SAFE_SUMMARY_NOTICE,
  isTeacherBridgeConsentGranted,
  type TeacherLearningInsight,
} from "@/lib/yopratiqo/teacherBridge";
import {
  TEACHER_INSIGHT_FOCUS_LABEL_LOCALIZED,
  TEACHER_INSIGHT_TITLE_LOCALIZED,
  getInsightCardCopy,
} from "@/lib/yopratiqo/teacherBridgeCopy";
import { CompanionBridgeCard } from "@/components/companion/CompanionBridgeCard";

const COPY = {
  // The shared title now reads from the canonical bridge copy file so the
  // student-side consent card and the teacher-side insight card stay in
  // sync. The previous "Résumé YoPratiqo partagé" wording is preserved as
  // a fallback inside `teacherBridgeCopy.ts`.
  title: TEACHER_INSIGHT_TITLE_LOCALIZED,
  noConsent: {
    fr: "Non partagé avec ce professeur",
    en: "Not shared with this teacher",
    es: "No compartido con este profesor",
  },
  consent: {
    fr: "Partagé avec le consentement de l'élève",
    en: "Shared with student consent",
    es: "Compartido con el consentimiento del estudiante",
  },
  completed: {
    fr: "Modules complétés",
    en: "Completed modules",
    es: "Módulos completados",
  },
  strengths: {
    fr: "Forces",
    en: "Strengths",
    es: "Fortalezas",
  },
  practice: {
    fr: "À pratiquer",
    en: "Needs practice",
    es: "Para practicar",
  },
  // The "Pistes utiles pour le cours" wording matches the launch brief
  // verbatim and lives in `teacherBridgeCopy.ts`.
  focus: TEACHER_INSIGHT_FOCUS_LABEL_LOCALIZED,
  companion: {
    fr: "Compagnon",
    en: "Companion",
    es: "Compañero",
  },
} as const satisfies Record<string, YoLocalizedString>;

function humanizeTag(value: string): string {
  return value.replace(/_/g, " ");
}

export function TeacherLearningInsightCard({
  insight,
  locale,
}: {
  insight: TeacherLearningInsight;
  locale: YoLocale;
}) {
  const summary = insight.progressSummary;
  const hasConsent = insight.sharedByStudentConsent && isTeacherBridgeConsentGranted(summary.consentState);

  // Locked / empty state. When the student has not granted consent the
  // teacher must NOT see any progress data. We render an explicit locked
  // placeholder instead of the data grid so the absence of consent is
  // visually obvious. This is asserted by the consent-card test suite.
  if (!hasConsent) {
    const lockedCopy = getInsightCardCopy(locale);
    return (
      <article
        data-testid="teacher-learning-insight-card-locked"
        data-yo-teacher-bridge="insight-card-locked"
        className="overflow-hidden rounded-3xl border border-[#DDF4F1] bg-white shadow-[0_12px_32px_rgba(15,58,52,0.08)]"
      >
        <header className="border-b border-[#DDF4F1] bg-[#FAFCFB] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-[#DDF4F1] text-[#0F6E56]">
                <Lock className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0F6E56]/65">YoPratiqo</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#0F6E56]">
                  {lockedCopy.lockedTitle}
                </h2>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#0F6E56]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#0F6E56]/75">
              <ShieldCheck className="size-3.5" aria-hidden />
              {t(COPY.noConsent, locale)}
            </span>
          </div>
        </header>
        <div className="p-5">
          <p className="text-sm leading-relaxed text-[#0F6E56]/74">{lockedCopy.lockedBody}</p>
        </div>
        <footer className="border-t border-[#DDF4F1] bg-[#FFF4D6]/55 p-5 text-xs leading-relaxed text-[#0F6E56]/68">
          {t(TEACHER_BRIDGE_SAFE_SUMMARY_NOTICE, locale)}
        </footer>
      </article>
    );
  }

  const completed = summary.completedModules.length > 0 ? summary.completedModules : ["-"];
  const strengths = summary.strengths.length > 0 ? summary.strengths.map(humanizeTag) : ["-"];
  const difficulties = summary.difficultyTags.length > 0 ? summary.difficultyTags.map(humanizeTag) : ["-"];
  const focus = summary.suggestedTeacherFocus.length > 0 ? summary.suggestedTeacherFocus : ["-"];

  return (
    <article
      data-testid="teacher-learning-insight-card-unlocked"
      data-yo-teacher-bridge="insight-card-unlocked"
      className="overflow-hidden rounded-3xl border border-[#DDF4F1] bg-white shadow-[0_12px_32px_rgba(15,58,52,0.08)]"
    >
      <header className="border-b border-[#DDF4F1] bg-[#FAFCFB] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1D9E75]">
              {summary.product}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#0F6E56]">
              {t(COPY.title, locale)}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#0F6E56]/72">
              {summary.courseTitle} · {summary.currentLevel}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#F4B400]/45 bg-[#FFF4D6] px-3 py-1.5 text-xs font-bold text-[#0F6E56]">
            <ShieldCheck className="size-3.5" aria-hidden />
            {hasConsent ? t(COPY.consent, locale) : t(COPY.noConsent, locale)}
          </span>
        </div>
      </header>

      <div className="grid gap-4 p-5 md:grid-cols-2">
        <InsightList icon="completed" title={t(COPY.completed, locale)} items={completed} />
        <InsightList icon="strengths" title={t(COPY.strengths, locale)} items={strengths} />
        <InsightList icon="practice" title={t(COPY.practice, locale)} items={difficulties} />
        <InsightList icon="focus" title={t(COPY.focus, locale)} items={focus} />
      </div>

      {summary.companion ? (
        <footer className="space-y-3 border-t border-[#DDF4F1] bg-[#FFF4D6]/55 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a5a17]">
                {t(COPY.companion, locale)}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#0F6E56]">
                {summary.companion.companionName} · {summary.companion.stageName}
              </p>
            </div>
            <p className="text-sm font-bold text-[#0F6E56]">
              {summary.companion.progressPercent}%
            </p>
          </div>
          <CompanionBridgeCard
            locale={locale}
            companionName={summary.companion.companionName}
            stageName={summary.companion.stageName}
            state="teacher_ready"
            compact
          />
          <p className="text-xs leading-relaxed text-[#0F6E56]/68">
            {t(TEACHER_BRIDGE_SAFE_SUMMARY_NOTICE, locale)}
          </p>
        </footer>
      ) : (
        <footer className="border-t border-[#DDF4F1] bg-[#FFF4D6]/55 p-5 text-xs leading-relaxed text-[#0F6E56]/68">
          {t(TEACHER_BRIDGE_SAFE_SUMMARY_NOTICE, locale)}
        </footer>
      )}
    </article>
  );
}

function InsightList({
  icon,
  title,
  items,
}: {
  icon: "completed" | "strengths" | "practice" | "focus";
  title: string;
  items: string[];
}) {
  const Icon =
    icon === "completed"
      ? BookOpenCheck
      : icon === "strengths"
        ? Sparkles
        : GraduationCap;

  return (
    <section className="rounded-2xl border border-[#DDF4F1] bg-[#FAFCFB] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex size-8 items-center justify-center rounded-xl bg-[#DDF4F1] text-[#0F6E56]">
          <Icon className="size-4" aria-hidden />
        </span>
        <h3 className="text-sm font-bold text-[#0F6E56]">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm leading-relaxed text-[#0F6E56]/74">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
