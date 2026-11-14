"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cafeCopy, type CafeLocale } from "@/lib/cafe/copy";
import type { CafePublicSession } from "@/lib/cafe/publicTypes";
import { CafeSessionCard } from "@/components/cafe/CafeSessionCard";
import { CafeHeroMedia } from "@/components/cafe/CafeHeroMedia";
import styles from "./cafe.module.css";

type View = "door" | "choice" | "groups";

function viewFromStep(step: string | null): View {
  if (step === "format") return "choice";
  if (step === "groups") return "groups";
  return "door";
}

function normalizeCafeLocale(value: string): CafeLocale {
  return value === "en" || value === "es" ? value : "fr";
}

export function CafeFrontDoor({ heroVideoSrc = null }: { heroVideoSrc?: string | null }) {
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cafeLocale = normalizeCafeLocale(locale);
  const copy = cafeCopy[cafeLocale];
  const view = viewFromStep(searchParams.get("step"));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [sessions, setSessions] = useState<CafePublicSession[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "opening" | "error">("idle");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    headingRef.current?.focus();
  }, [view]);

  useEffect(() => {
    if (view !== "groups") return;
    let active = true;
    const controller = new AbortController();
    // A request is scoped to entering the list or explicitly retrying it.
    // Its own status changes must not clean up and invalidate its response.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Starting an external request resets its visible state.
    setStatus("loading");
    const timeout = setTimeout(() => {
      if (!active) return;
      active = false;
      controller.abort();
      setStatus("error");
    }, 10_000);
    void (async () => {
      try {
        const response = await fetch("/api/cafe/sessions", { cache: "no-store", signal: controller.signal });
        if (!active) return;
        if (response.status === 404) {
          setSessions([]);
          setStatus("opening");
          return;
        }
        if (!response.ok) throw new Error("cafe listing unavailable");
        const body = await response.json() as { ok?: boolean; sessions?: CafePublicSession[] } | null;
        if (!active) return;
        if (body?.ok !== true || !Array.isArray(body.sessions)) throw new Error("invalid cafe listing");
        setSessions(body.sessions);
        setStatus("ready");
      } catch {
        if (active) setStatus("error");
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [view, retryCount]);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [sessions],
  );

  return (
    <main className={styles.shell} lang={cafeLocale}>
      {view === "door" ? (
        <section className={`${styles.stage} ${styles.fadeIn}`} aria-labelledby="cafe-title">
          <div className={`${styles.panel} ${styles.doorPanel}`}>
            <div className={styles.doorUtility}>
              <div className={styles.languageSwitch} aria-label={copy.languageLabel}>
                {(["fr", "en", "es"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    className={lang === cafeLocale ? styles.languageButtonActive : styles.languageButton}
                    aria-pressed={lang === cafeLocale}
                    onClick={() => setLocale(lang)}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
              <Link className={styles.privacyLink} href="/legal/confidentialite">
                {copy.privacy}
              </Link>
            </div>
            <CafeHeroMedia className={styles.cafePhoto} locale={cafeLocale} videoSrc={heroVideoSrc} />
            <h1 id="cafe-title" ref={headingRef} tabIndex={-1} className={styles.title}>{copy.title}</h1>
            <p className={styles.subtitle}>{copy.subtitle}</p>
            <button type="button" className={styles.primaryButton} onClick={() => router.push("/cafe?step=format")}>
              {copy.enter}
            </button>
          </div>
        </section>
      ) : null}

      {view === "choice" ? (
        <section className={`${styles.stage} ${styles.fadeIn}`} aria-labelledby="cafe-choice-title">
          <div className={styles.panel}>
            <button type="button" className={styles.backButton} onClick={() => router.push("/cafe")}>
              ← {copy.back}
            </button>
            <h2 id="cafe-choice-title" ref={headingRef} tabIndex={-1} className={styles.choiceHeading}>{copy.choose}</h2>
            <div className={styles.choiceGrid}>
              <button
                type="button"
                className={`${styles.choiceButton} ${styles.choiceButtonActive}`}
                onClick={() => router.push("/cafe?step=groups")}
              >
                <span className={styles.choiceTitle}>{copy.group}</span>
                <span className={styles.choiceHint}>{copy.groupHint}</span>
              </button>
              <div className={`${styles.choiceButton} ${styles.choiceButtonDisabled}`} aria-disabled="true">
                <span className={styles.soonBadge}>{copy.soon}</span>
                <span className={styles.choiceTitle}>{copy.pair}</span>
                <span className={styles.choiceHint}>{copy.pairHint}</span>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {view === "groups" ? (
        <section className={`${styles.stage} ${styles.fadeIn}`} aria-labelledby="cafe-groups-title">
          <div className={styles.panel}>
            <div className={styles.topRow}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => router.push("/cafe?step=format")}
              >
                ← {copy.back}
              </button>
            </div>
            <h2 id="cafe-groups-title" ref={headingRef} tabIndex={-1} className={styles.listHeading}>{copy.sessionsTitle}</h2>
            <div role="status" aria-live="polite" aria-atomic="true">
              {status === "loading" ? <div className={styles.noticeCard}>{copy.loading}</div> : null}
              {status === "opening" ? <div className={styles.noticeCard}>{copy.openingSoon}</div> : null}
              {status === "error" ? <div className={styles.noticeCard}>
                <p>{copy.error}</p>
                <button type="button" className={styles.secondaryButton} onClick={() => setRetryCount(count => count + 1)}>
                  {copy.roomRetry}
                </button>
              </div> : null}
              {status === "ready" && sortedSessions.length === 0 ? (
                <div className={styles.noticeCard}>{copy.empty}</div>
              ) : null}
            </div>
            {status === "ready" && sortedSessions.length > 0 ? (
              <div className={styles.sessionList}>
                {sortedSessions.map((session) => (
                  <CafeSessionCard key={session.slug} session={session} locale={cafeLocale} />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
