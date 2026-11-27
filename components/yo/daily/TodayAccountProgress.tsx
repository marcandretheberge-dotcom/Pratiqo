"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, LockKeyhole, RefreshCw, Target, Trophy, Users } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { productLoginHref } from "@/lib/auth/productReturn";
import { rankingRequest, readRankingSnapshot, RankingClientError } from "@/lib/yo/rankings/uiClient";
import type { RankingLanguage, RankingSnapshot } from "@/lib/yo/rankings/contract";
import { learningHomeCopy } from "@/lib/yo/daily/learningHomeCopy";
import { dailyHref } from "@/lib/yo/daily/learningHome";
import type { YoLocale } from "@/lib/yo/types";
import styles from "./learningToday.module.css";

type State = { status: "loading" } | { status: "error"; error: unknown } | { status: "ready"; snapshot: RankingSnapshot };
const goals = [0, 50, 100, 200, 500] as const;
const goalKey = (userId: string) => `yo.learning-home.weekly-goal.v1.${userId}`;

export function TodayAccountProgress({ locale, language }: { locale: YoLocale; language: RankingLanguage }) {
  const { user, loading } = useAuth();
  const c = learningHomeCopy[locale];
  return <section className={styles.accountCard} aria-labelledby="today-xp-heading">
    <p className={styles.eyebrow}><Trophy size={16} aria-hidden />{c.progress}</p>
    <h2 id="today-xp-heading">{c.xpTitle}</h2>
    {loading ? <p className={styles.note} role="status">{c.loadingXp}</p> : user
      ? <Account key={user.id} userId={user.id} locale={locale} language={language} />
      : <div className={styles.signIn}>
        <LockKeyhole size={28} aria-hidden /><h3>{c.signInTitle}</h3><p>{c.signInBody}</p>
        <Link className={styles.secondary} href={productLoginHref(dailyHref(locale, language))}>{c.signIn}</Link>
      </div>}
  </section>;
}

/** Unmounting on account change removes every private total and in-flight request. */
function Account({ userId, locale, language }: { userId: string; locale: YoLocale; language: RankingLanguage }) {
  const c = learningHomeCopy[locale];
  const [state, setState] = useState<State>({ status: "loading" });
  const [revision, setRevision] = useState(0);
  const [goal, setGoal] = useState(0), [goalReady, setGoalReady] = useState(false), [persistent, setPersistent] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    void rankingRequest(userId, "?scope=everyone&period=week&language=all", { signal: controller.signal }).then(value => {
      const snapshot = readRankingSnapshot(value);
      if (snapshot.scope !== "everyone" || snapshot.period !== "week" || snapshot.language !== "all") throw new RankingClientError(503, "unavailable");
      if (!controller.signal.aborted) setState({ status: "ready", snapshot });
    }).catch(error => { if (!controller.signal.aborted) setState({ status: "error", error }); });
    return () => controller.abort();
  }, [userId, revision]);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("yo:ranking-award", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    // Also advance the confirmed week if this screen stays open across a boundary.
    const timer = window.setInterval(visible, 60_000);
    return () => { window.removeEventListener("yo:ranking-award", refresh); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", visible); window.clearInterval(timer); };
  }, []);
  useEffect(() => {
    const read = () => {
      try {
        const value = Number(localStorage.getItem(goalKey(userId)));
        setGoal(goals.some(item => item === value) ? value : 0);
        setPersistent(true);
      } catch { setPersistent(false); }
      setGoalReady(true);
    };
    read();
    const changed = (event: StorageEvent) => { if (event.key === null || event.key === goalKey(userId)) read(); };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [userId]);
  const saveGoal = (value: number) => {
    if (!goals.some(item => item === value)) return;
    setGoal(value);
    try { localStorage.setItem(goalKey(userId), String(value)); setPersistent(true); }
    catch { setPersistent(false); }
  };
  if (state.status === "loading") return <p className={styles.note} role="status">{c.loadingXp}</p>;
  if (state.status === "error") return <div className={styles.signIn}>
    <p role="status">{c.xpError}</p>
    {state.error instanceof RankingClientError && state.error.status === 401
      ? <Link className={styles.secondary} href={productLoginHref(dailyHref(locale, language))}>{c.signIn}</Link>
      : <button className={styles.secondary} type="button" onClick={() => { setState({ status: "loading" }); setRevision(value => value + 1); }}><RefreshCw size={16} aria-hidden />{c.retry}</button>}
  </div>;
  const { profile, weekStartsAt } = state.snapshot;
  const count = (n: number) => new Intl.NumberFormat(locale).format(n);
  const start = new Date(weekStartsAt);
  const weekLabel = Number.isNaN(start.getTime()) ? null : new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(start);
  return <>
    <dl className={styles.xpStats}>
      <div><dt>{c.week}</dt><dd>{count(profile.weekXp)} <span>XP</span></dd></div>
      <div><dt>{c.total}</dt><dd>{count(profile.totalXp)} <span>XP</span></dd></div>
    </dl>
    {weekLabel && <p className={styles.note}>{c.weekOf} {weekLabel}</p>}
    <div className={styles.goal}>
      <label htmlFor="today-weekly-goal"><Target size={16} aria-hidden />{c.goal}</label>
      <select id="today-weekly-goal" value={goal} disabled={!goalReady} onChange={event => saveGoal(Number(event.target.value))}>
        {goals.map(value => <option key={value} value={value}>{value ? `${count(value)} XP` : c.goalOff}</option>)}
      </select>
      {goal > 0 && <>
        <progress value={Math.min(goal, profile.weekXp)} max={goal} aria-label={`${c.week}: ${count(profile.weekXp)} / ${count(goal)} XP`} />
        <p className={styles.goalStatus} role="status">{profile.weekXp >= goal ? <><CheckCircle2 size={17} aria-hidden />{c.goalReached}</> : `${count(goal - profile.weekXp)} ${c.goalRemaining}`}</p>
      </>}
      <p className={styles.note}>{persistent ? c.goalNote : c.goalSession}</p>
    </div>
    <p className={styles.note}>{c.xpNote}</p>
    <p className={styles.privacy}><LockKeyhole size={14} aria-hidden />{c.private}</p>
    <Link className={styles.friends} href={`/yo/classement${locale === "fr" ? "" : `?lang=${locale}`}`} prefetch={false}><Users size={18} aria-hidden />{c.friends}</Link>
    <p className={styles.note}>{c.friendsBody}</p>
  </>;
}
