"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, CheckCircle2, Compass, Laptop, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { DAILY_LANGUAGES, DAILY_LANGUAGE_KEY, dailyCourseHref, dailyHref, dailyLanguageInfo, readDailyNavigation, type DailyCourse, type DailyNavigation } from "@/lib/yo/daily/learningHome";
import { learningHomeCopy } from "@/lib/yo/daily/learningHomeCopy";
import { t } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";
import { useReviewQueue } from "../review/useReviewQueue";
import { LearningFeedbackProvider } from "../feedback/LearningFeedback";
import { TodayAccountProgress } from "./TodayAccountProgress";
import styles from "./learningToday.module.css";

const InterestPracticeCard = dynamic(() => import("../interests/InterestPracticeCard").then(module => module.InterestPracticeCard));
const CourseDueReview = dynamic(() => import("../review/CourseDueReview").then(module => module.CourseDueReview));
const EasternDueReview = dynamic(() => import("../review/EasternDueReview").then(module => module.EasternDueReview));
type View = "today" | "review" | "progress";

export function YoLearningToday({ course, locale, restoreLanguage = false }: { course: DailyCourse; locale: YoLocale; restoreLanguage?: boolean }) {
  const c = learningHomeCopy[locale], router = useRouter();
  const [view, setView] = useState<View>("today");
  const [local, setLocal] = useState<{ status: "loading" } | { status: "unavailable" } | { status: "ready"; navigation: DailyNavigation }>({ status: "loading" });
  const queue = useReviewQueue(course.language, course.reviewIds);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DAILY_LANGUAGE_KEY);
      const previous = DAILY_LANGUAGES.find(value => value === saved);
      if (restoreLanguage && previous && previous !== course.language) {
        router.replace(dailyHref(locale, previous), { scroll: false });
        return;
      }
      localStorage.setItem(DAILY_LANGUAGE_KEY, course.language);
    } catch { /* An optional language preference must never block practice. */ }
  }, [course.language, locale, restoreLanguage, router]);
  useEffect(() => {
    const read = () => {
      try { setLocal({ status: "ready", navigation: readDailyNavigation(course, locale, key => localStorage.getItem(key)) }); }
      catch { setLocal({ status: "unavailable" }); }
    };
    const frame = requestAnimationFrame(read);
    window.addEventListener("focus", read);
    window.addEventListener("pageshow", read);
    window.addEventListener("storage", read);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("focus", read); window.removeEventListener("pageshow", read); window.removeEventListener("storage", read); };
  }, [course, locale]);
  const navigation = local.status === "ready" ? local.navigation : null;
  const kind = navigation?.kind;
  const title = local.status === "unavailable" ? c.next : navigation?.unit ? t(navigation.unit.title, locale)
    : kind === "final" ? c.final : kind === "complete" ? c.complete : kind === "introduction" ? c.introduction : c.start;
  const body = navigation?.unit ? t(navigation.unit.objectives[0] ?? navigation.unit.subtitle, locale)
    : kind === "final" ? c.finalBody : kind === "complete" ? c.completeBody : kind === "introduction" ? c.introductionBody : c.startBody;
  const celebrate = Boolean(navigation?.total && navigation.passed === navigation.total);
  const language = dailyLanguageInfo(course.language);
  return <LearningFeedbackProvider><main className={styles.page} lang={locale} data-testid="yo-learning-today">
    <div className={styles.top}>
      <div><h1>{c.today}</h1><p>{c.intro}</p></div>
      <label className={styles.language}><span>{c.language}</span><select value={course.language} onChange={event => {
        const next = DAILY_LANGUAGES.find(value => value === event.target.value);
        if (next) router.push(dailyHref(locale, next), { scroll: false });
      }}>{DAILY_LANGUAGES.map(value => <option value={value} key={value}>{dailyLanguageInfo(value).name[locale]}</option>)}</select></label>
    </div>
    <nav className={styles.views} aria-label={c.today}>
      <button type="button" aria-pressed={view === "today"} onClick={() => setView("today")}><Compass size={17} aria-hidden />{c.today}</button>
      <button type="button" aria-pressed={view === "review"} onClick={() => setView("review")}><RotateCcw size={17} aria-hidden />{c.review}{queue.ready && queue.dueIds.length > 0 && <span className={styles.badge}>{queue.dueIds.length}</span>}</button>
      <button className={styles.mobileProgress} type="button" aria-pressed={view === "progress"} onClick={() => setView("progress")}><Trophy size={17} aria-hidden />{c.progress}</button>
    </nav>
    <div className={styles.workspace} data-view={view}>
      <section className={`${styles.panel} ${styles.todayPanel}`} aria-label={c.today}>
        <article className={styles.continueCard} aria-labelledby="today-continue-heading">
          <div className={styles.continueTop}><div><p className={styles.eyebrow}>{language.name[locale]} · {c.next}</p><h2 id="today-continue-heading">{local.status === "loading" ? c.loading : title}</h2></div><div className={styles.companion} aria-hidden><CompanionAvatar state={celebrate ? "celebrating" : "map"} size="md" locale={locale} compact /></div></div>
          <p className={styles.continueBody}>{local.status === "unavailable" ? c.storage : local.status === "ready" ? body : c.local}</p>
          {navigation && navigation.passed > 0 && <p className={styles.earned}><CheckCircle2 size={16} aria-hidden />{navigation.passed}/{navigation.total} {c.checkpoint}</p>}
          {local.status === "loading" ? <div className={styles.loadingButton} role="status">{c.loading}</div>
            : <Link className={styles.primary} prefetch={false} href={navigation?.href ?? dailyCourseHref(course.language, locale)}>{c.continue}<ArrowRight size={20} aria-hidden /></Link>}
          <Link className={styles.courseLink} href={dailyCourseHref(course.language, locale)} prefetch={false}><BookOpen size={15} aria-hidden />{c.course}</Link>
        </article>
        <div className={styles.mission}>
          <p className={styles.eyebrow}><Sparkles size={16} aria-hidden />{c.mission}</p>
          <p className={styles.note}>{c.missionBody}</p>
          <InterestPracticeCard language={course.language} locale={locale} />
          <p className={styles.practice}>{c.practice}</p>
        </div>
      </section>
      <section className={`${styles.panel} ${styles.reviewPanel}`} aria-labelledby="today-review-heading">
        <div className={styles.reviewIntro}><RotateCcw size={24} aria-hidden /><h2 id="today-review-heading">{c.reviewTitle}</h2><p>{c.reviewBody}</p><p className={styles.practice}>{c.practice}</p></div>
        {queue.ready && !queue.persistent && <p className={styles.note} role="status">{c.reviewStorage}</p>}
        {!queue.ready ? <p className={styles.note} role="status">{c.loadingReview}</p> : queue.total === 0
          ? <div className={styles.empty}><BookOpen size={30} aria-hidden /><h3>{queue.persistent ? c.noReview : c.reviewUnavailable}</h3><p>{queue.persistent ? c.noReviewBody : c.reviewUnavailableBody}</p>{queue.persistent
            ? <button className={styles.secondary} type="button" onClick={() => setView("today")}>{c.today}<ArrowRight size={17} aria-hidden /></button>
            : <Link className={styles.secondary} href={dailyCourseHref(course.language, locale)} prefetch={false}>{c.course}<ArrowRight size={17} aria-hidden /></Link>}</div>
          : <>
            <p className={styles.due}>{queue.dueIds.length} {c.due}</p>
            {view === "review" && (course.kind === "text" ? <CourseDueReview language={course.language} catalog={course.catalog} locale={locale} /> : <EasternDueReview language={course.language} itemIds={course.reviewIds} locale={locale} />)}
          </>}
      </section>
      <aside className={`${styles.panel} ${styles.progressPanel}`} aria-label={c.progress}>
        <TodayAccountProgress locale={locale} language={course.language} />
        <section className={styles.deviceCard}><Laptop size={18} aria-hidden /><div><h2>{c.local}</h2><p>{c.localBody}</p><p>{c.reviewNotice}</p></div></section>
      </aside>
    </div>
  </main></LearningFeedbackProvider>;
}
