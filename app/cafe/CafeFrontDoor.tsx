"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CafeBrandRootWords } from "@/components/cafe/CafeBrandRootWords";
import { CafeEntranceMedia } from "@/components/cafe/CafeEntranceMedia";
import { CafeLanguagePicker } from "@/components/cafe/CafeLanguagePicker";
import { CafeLiveRoom } from "@/components/cafe/CafeLiveRoom";
import { CafeSessionCard } from "@/components/cafe/CafeSessionCard";
import { cafeCopy, type CafeLocale } from "@/lib/cafe/copy";
import {
  CAFE_PRACTICE_LANGUAGE_STORAGE_KEY,
  isCafePracticeLanguageCode,
  type CafePracticeLanguageCode,
} from "@/lib/cafe/practiceLanguages";
import type { CafePublicSession } from "@/lib/cafe/publicTypes";
import type { CafeSocialFlags } from "@/lib/cafe/socialFeatureFlags";
import styles from "./cafe.module.css";

type LegacyView = "door" | "choice" | "groups";
type SocialView = "door" | "language" | "live";

function legacyViewFromStep(step: string | null): LegacyView {
  if (step === "format") return "choice";
  if (step === "groups") return "groups";
  return "door";
}

function socialViewFromStep(step: string | null): SocialView {
  if (step === "language") return "language";
  if (step === "live") return "live";
  return "door";
}

function normalizeCafeLocale(value: string): CafeLocale {
  return value === "en" || value === "es" ? value : "fr";
}

function readStoredPracticeLanguage(): CafePracticeLanguageCode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CAFE_PRACTICE_LANGUAGE_STORAGE_KEY);
    return raw && isCafePracticeLanguageCode(raw) ? raw : null;
  } catch {
    return null;
  }
}

function storePracticeLanguage(code: CafePracticeLanguageCode) {
  try {
    window.localStorage.setItem(CAFE_PRACTICE_LANGUAGE_STORAGE_KEY, code);
  } catch {
    /* Ignore quota / private mode. */
  }
}

type Props = {
  socialFlags: CafeSocialFlags;
};

export function CafeFrontDoor({ socialFlags }: Props) {
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cafeLocale = normalizeCafeLocale(locale);
  const copy = cafeCopy[cafeLocale];
  const social = socialFlags.socialV1;
  const legacyView = legacyViewFromStep(searchParams.get("step"));
  const socialView = socialViewFromStep(searchParams.get("step"));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [sessions, setSessions] = useState<CafePublicSession[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "opening" | "error">("idle");
  const [practiceLanguage, setPracticeLanguage] = useState<CafePracticeLanguageCode | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, [legacyView, socialView]);

  useEffect(() => {
    const stored = readStoredPracticeLanguage();
    if (stored) setPracticeLanguage(stored);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const needsSessions =
    (social && socialView === "live") || (!social && legacyView === "groups");

  useEffect(() => {
    if (!needsSessions || status !== "idle") return;
    let active = true;
    setStatus("loading");
    void fetch("/api/cafe/sessions", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 404) return { opening: true, sessions: [] };
        if (!response.ok) throw new Error("cafe listing unavailable");
        return response.json() as Promise<{ ok?: boolean; sessions?: CafePublicSession[] }>;
      })
      .then((body) => {
        if (!active) return;
        if ("opening" in body && body.opening === true) {
          setSessions([]);
          setStatus("opening");
          return;
        }
        setSessions(Array.isArray(body.sessions) ? body.sessions : []);
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [needsSessions, status]);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [sessions],
  );

  function go(step?: string) {
    router.push(step ? `/cafe?step=${step}` : "/cafe");
  }

  function selectPracticeLanguage(code: CafePracticeLanguageCode) {
    setPracticeLanguage(code);
    storePracticeLanguage(code);
  }

  function enterLive() {
    if (!practiceLanguage) return;
    setStatus("idle");
    go("live");
  }

  if (social) {
    return (
      <main className={styles.shell} lang={cafeLocale}>
        {socialView === "door" ? (
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
              <CafeEntranceMedia />
              <CafeBrandRootWords reducedMotion={reducedMotion} />
              <h1 id="cafe-title" ref={headingRef} tabIndex={-1} className={styles.title}>
                {copy.title}
              </h1>
              <p className={styles.subtitle}>{copy.subtitle}</p>
              <p className={styles.brandLine}>{copy.brandLine}</p>
              <button type="button" className={styles.primaryButton} onClick={() => go("language")}>
                {copy.enter}
              </button>
            </div>
          </section>
        ) : null}

        {socialView === "language" ? (
          <CafeLanguagePicker
            locale={cafeLocale}
            selected={practiceLanguage}
            onSelect={selectPracticeLanguage}
            onContinue={enterLive}
            onBack={() => go()}
          />
        ) : null}

        {socialView === "live" && practiceLanguage ? (
          <CafeLiveRoom
            locale={cafeLocale}
            practiceLanguage={practiceLanguage}
            flags={socialFlags}
            sessions={sessions}
            sessionsStatus={status}
            onChangeLanguage={() => go("language")}
            onBack={() => go("language")}
          />
        ) : null}

        {socialView === "live" && !practiceLanguage ? (
          <CafeLanguagePicker
            locale={cafeLocale}
            selected={null}
            onSelect={selectPracticeLanguage}
            onContinue={enterLive}
            onBack={() => go()}
          />
        ) : null}
      </main>
    );
  }

  return (
    <main className={styles.shell} lang={cafeLocale}>
      {legacyView === "door" ? (
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
            <CafeEntranceMedia />
            <h1 id="cafe-title" ref={headingRef} tabIndex={-1} className={styles.title}>{copy.title}</h1>
            <p className={styles.subtitle}>{copy.subtitle}</p>
            <button type="button" className={styles.primaryButton} onClick={() => go("format")}>
              {copy.enter}
            </button>
          </div>
        </section>
      ) : null}

      {legacyView === "choice" ? (
        <section className={`${styles.stage} ${styles.fadeIn}`} aria-labelledby="cafe-choice-title">
          <div className={styles.panel}>
            <button type="button" className={styles.backButton} onClick={() => go()}>
              ← {copy.back}
            </button>
            <h2 id="cafe-choice-title" ref={headingRef} tabIndex={-1} className={styles.choiceHeading}>{copy.choose}</h2>
            <div className={styles.choiceGrid}>
              <button
                type="button"
                className={`${styles.choiceButton} ${styles.choiceButtonActive}`}
                onClick={() => go("groups")}
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

      {legacyView === "groups" ? (
        <section className={`${styles.stage} ${styles.fadeIn}`} aria-labelledby="cafe-groups-title">
          <div className={styles.panel}>
            <div className={styles.topRow}>
              <button type="button" className={styles.backButton} onClick={() => go("format")}>
                ← {copy.back}
              </button>
            </div>
            <h2 id="cafe-groups-title" ref={headingRef} tabIndex={-1} className={styles.listHeading}>{copy.sessionsTitle}</h2>
            <div role="status" aria-live="polite" aria-atomic="true">
              {status === "loading" ? <div className={styles.noticeCard}>{copy.loading}</div> : null}
              {status === "opening" ? <div className={styles.noticeCard}>{copy.openingSoon}</div> : null}
              {status === "error" ? <div className={styles.noticeCard}>{copy.error}</div> : null}
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
